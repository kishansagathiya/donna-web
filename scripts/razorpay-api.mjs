/**
 * Razorpay Payment Link API for Donna Device reservations.
 * Used by Vite (dev) and scripts/serve.mjs (production).
 * KEY_SECRET stays server-side only.
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MIN_AMOUNT_PAISE = 100;
const API_PATHS = new Set(["/api/create-preorder", "/api/verify-preorder"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

loadDotEnv();

function loadDotEnv() {
  const envPath = join(dirname(fileURLToPath(import.meta.url)), "..", ".env");
  let text = "";
  try {
    text = readFileSync(envPath, "utf8");
  } catch {
    return;
  }
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error("Invalid JSON"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    const err = new Error("Razorpay is not configured");
    err.status = 500;
    throw err;
  }
  return { keyId, keySecret };
}

function configuredAmount() {
  const amount = Number(process.env.RAZORPAY_PREORDER_AMOUNT_PAISE || 490000);
  return Number.isFinite(amount) ? amount : 490000;
}

function configuredCurrency() {
  return (process.env.RAZORPAY_PREORDER_CURRENCY || "INR").toUpperCase();
}

export function normalizePreorder(input) {
  const name = String(input?.name || "").trim();
  const email = String(input?.email || "").trim().toLowerCase();
  const phone = String(input?.phone || "").replace(/[^\d+]/g, "");
  const address = String(input?.address || "").replace(/\s+/g, " ").trim();
  const digits = phone.replace(/\D/g, "");

  if (name.length < 2) {
    return { error: "Name is required" };
  }
  if (!EMAIL_RE.test(email)) {
    return { error: "A valid email is required" };
  }
  if (digits.length < 8 || digits.length > 15) {
    return { error: "A valid phone number is required" };
  }
  if (address.length < 10) {
    return { error: "Shipping address is required" };
  }

  return {
    name: name.slice(0, 120),
    email: email.slice(0, 120),
    phone: phone.startsWith("+") ? phone.slice(0, 16) : digits.slice(0, 15),
    address: address.slice(0, 500),
  };
}

export function expectedPaymentLinkSignature(
  paymentLinkId,
  paymentLinkReferenceId,
  paymentLinkStatus,
  paymentId,
  keySecret,
) {
  return createHmac("sha256", keySecret)
    .update(
      `${paymentLinkId}|${paymentLinkReferenceId}|${paymentLinkStatus}|${paymentId}`,
    )
    .digest("hex");
}

function noteChunks(address) {
  const notes = {
    product: "donna-device",
    kind: "first-batch-reservation",
  };
  const part1 = address.slice(0, 256);
  notes.address = part1;
  if (address.length > 256) {
    notes.address_2 = address.slice(256, 512);
  }
  return notes;
}

function callbackOrigin(req) {
  const configured = process.env.PREORDER_CALLBACK_ORIGIN?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const origin = req.headers.origin;
  if (typeof origin === "string" && /^https?:\/\//.test(origin)) {
    return origin.replace(/\/$/, "");
  }
  const host = req.headers.host;
  const protoHeader = req.headers["x-forwarded-proto"];
  const proto = typeof protoHeader === "string" ? protoHeader.split(",")[0] : "https";
  if (typeof host === "string" && host) {
    return `${proto}://${host}`;
  }
  return "https://donnadoesit.com";
}

function razorpayStatus(status) {
  if (status === 401 || status === 403) return 401;
  if (status === 400) return 400;
  return 500;
}

async function razorpayFetch(path, { method, keyId, keySecret, body }) {
  const res = await fetch(`https://api.razorpay.com${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const jsonBody = await res.json().catch(() => ({}));
  return { status: res.status, json: jsonBody };
}

async function createPreorder(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch (err) {
    json(res, err.status || 400, { error: err.message || "Invalid JSON" });
    return;
  }

  const parsed = normalizePreorder(body);
  if (parsed.error) {
    json(res, 400, { error: parsed.error });
    return;
  }

  let keyId;
  let keySecret;
  try {
    ({ keyId, keySecret } = credentials());
  } catch (err) {
    json(res, 500, { error: err.message });
    return;
  }

  const amount = configuredAmount();
  const currency = configuredCurrency();
  if (!Number.isInteger(amount) || amount < MIN_AMOUNT_PAISE) {
    json(res, 500, { error: "Reservation amount is not configured" });
    return;
  }

  const referenceId = `dhw-${Date.now()}`.slice(0, 40);
  const { status, json: link } = await razorpayFetch("/v1/payment_links", {
    method: "POST",
    keyId,
    keySecret,
    body: {
      amount,
      currency,
      accept_partial: false,
      reference_id: referenceId,
      description:
        "Donna Device first-batch reservation. Not a ship date. One unit, ₹4,900.",
      customer: {
        name: parsed.name,
        email: parsed.email,
        contact: parsed.phone,
      },
      notify: { sms: false, email: true },
      reminder_enable: false,
      notes: noteChunks(parsed.address),
      callback_url: `${callbackOrigin(req)}/hardware`,
      callback_method: "get",
    },
  });

  if (status >= 400 || !link.short_url) {
    json(res, razorpayStatus(status), {
      error:
        status === 401
          ? "Razorpay authentication failed"
          : "Could not start reservation",
    });
    return;
  }

  json(res, 200, { checkout_url: link.short_url });
}

async function verifyPreorder(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch (err) {
    json(res, err.status || 400, { error: err.message || "Invalid JSON" });
    return;
  }

  const paymentLinkId = String(body.razorpay_payment_link_id || "");
  const referenceId = String(body.razorpay_payment_link_reference_id || "");
  const linkStatus = String(body.razorpay_payment_link_status || "");
  const paymentId = String(body.razorpay_payment_id || "");
  const signature = String(body.razorpay_signature || "");

  if (!paymentLinkId || !linkStatus || !paymentId || !signature) {
    json(res, 400, {
      error: "Missing Razorpay payment-link callback fields",
    });
    return;
  }

  let keySecret;
  try {
    ({ keySecret } = credentials());
  } catch (err) {
    json(res, 500, { error: err.message });
    return;
  }

  const expected = expectedPaymentLinkSignature(
    paymentLinkId,
    referenceId,
    linkStatus,
    paymentId,
    keySecret,
  );
  if (expected !== signature || linkStatus !== "paid") {
    json(res, 400, { error: "Payment was not verified", paid: false });
    return;
  }

  json(res, 200, { success: true, paid: true });
}

/**
 * @returns {Promise<boolean>} true if the request was handled
 */
export async function handleRazorpayApi(req, res) {
  const path = (req.url || "/").split("?")[0];
  if (!API_PATHS.has(path)) {
    return false;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return true;
  }

  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed" });
    return true;
  }

  if (path === "/api/create-preorder") {
    await createPreorder(req, res);
    return true;
  }
  await verifyPreorder(req, res);
  return true;
}
