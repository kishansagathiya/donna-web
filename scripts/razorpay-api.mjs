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
const CALLBACK_PATHS = new Set(["/hardware/reserved", "/hardware/reserved/"]);
const CALLBACK_FIELDS = [
  "razorpay_payment_id",
  "razorpay_order_id",
  "razorpay_signature",
  "razorpay_payment_link_id",
  "razorpay_payment_link_reference_id",
  "razorpay_payment_link_status",
];
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

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function readBody(req) {
  return readRawBody(req).then((raw) => {
    const text = raw.trim();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw Object.assign(new Error("Invalid JSON"), { status: 400 });
    }
  });
}

export function parseCallbackFields(raw, contentType) {
  const text = String(raw || "").trim();
  if (!text) return {};
  if (String(contentType || "").includes("application/json")) {
    try {
      const parsed = JSON.parse(text);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return Object.fromEntries(new URLSearchParams(text));
}

export function callbackRedirectLocation(fields) {
  const params = new URLSearchParams();
  for (const key of CALLBACK_FIELDS) {
    const value = fields?.[key];
    if (value) params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `/hardware/reserved?${query}` : "/hardware/reserved";
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

export function expectedOrderSignature(orderId, paymentId, keySecret) {
  return createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

function noteChunks(parsed) {
  const notes = {
    product: "donna-device",
    kind: "first-batch-reservation",
    name: parsed.name.slice(0, 256),
    email: parsed.email.slice(0, 256),
    phone: String(parsed.phone).slice(0, 256),
  };
  notes.address = parsed.address.slice(0, 256);
  if (parsed.address.length > 256) {
    notes.address_2 = parsed.address.slice(256, 512);
  }
  return notes;
}

const CALLBACK_PATH = "/hardware/reserved";
const PRODUCTION_ORIGIN = "https://donnadoesit.com";

function hostAllowed(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "donnadoesit.com" ||
    hostname === "www.donnadoesit.com" ||
    hostname.endsWith(".up.railway.app")
  );
}

export function parseAllowedOrigin(raw) {
  if (typeof raw !== "string" || !raw.trim()) return "";
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (!hostAllowed(url.hostname)) return "";
    if (url.hostname === "donnadoesit.com" || url.hostname === "www.donnadoesit.com") {
      return `https://${url.hostname}`;
    }
    return url.origin;
  } catch {
    return "";
  }
}

export function resolvePreorderCallbackUrl(req, bodyOrigin) {
  const configured = parseAllowedOrigin(process.env.PREORDER_CALLBACK_ORIGIN || "");
  const fromBody = parseAllowedOrigin(bodyOrigin);
  const fromHeader = parseAllowedOrigin(
    typeof req?.headers?.origin === "string" ? req.headers.origin : "",
  );
  const origin = fromBody || fromHeader || configured;
  if (origin) return `${origin}${CALLBACK_PATH}`;

  const host = typeof req?.headers?.host === "string" ? req.headers.host : "";
  const hostname = host.split(":")[0];
  if (host && hostAllowed(hostname)) {
    const protoHeader = req.headers["x-forwarded-proto"];
    const proto =
      hostname === "localhost" || hostname === "127.0.0.1"
        ? "http"
        : typeof protoHeader === "string"
          ? protoHeader.split(",")[0]
          : "https";
    return `${proto}://${host}${CALLBACK_PATH}`;
  }
  return `${PRODUCTION_ORIGIN}${CALLBACK_PATH}`;
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
  const callbackUrl = resolvePreorderCallbackUrl(req, body.origin);
  const { status, json: order } = await razorpayFetch("/v1/orders", {
    method: "POST",
    keyId,
    keySecret,
    body: {
      amount,
      currency,
      receipt: referenceId,
      notes: noteChunks(parsed),
    },
  });

  if (status >= 400 || !order.id) {
    json(res, razorpayStatus(status), {
      error:
        status === 401
          ? "Razorpay authentication failed"
          : "Could not start reservation",
    });
    return;
  }

  json(res, 200, {
    key_id: keyId,
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    callback_url: callbackUrl,
  });
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
  const orderId = String(body.razorpay_order_id || "");

  if (!paymentId || !signature) {
    json(res, 400, {
      error: "Missing Razorpay callback fields",
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

  if (orderId) {
    const expected = expectedOrderSignature(orderId, paymentId, keySecret);
    if (expected !== signature) {
      json(res, 400, { error: "Payment was not verified", paid: false });
      return;
    }
    json(res, 200, { success: true, paid: true });
    return;
  }

  if (!paymentLinkId || !linkStatus) {
    json(res, 400, {
      error: "Missing Razorpay callback fields",
    });
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

async function handleCallbackPost(req, res) {
  const raw = await readRawBody(req);
  const fields = parseCallbackFields(raw, req.headers["content-type"]);
  res.writeHead(303, {
    Location: callbackRedirectLocation(fields),
    "Cache-Control": "no-store",
  });
  res.end();
}

/**
 * @returns {Promise<boolean>} true if the request was handled
 */
export async function handleRazorpayApi(req, res) {
  const path = (req.url || "/").split("?")[0];

  if (CALLBACK_PATHS.has(path) && req.method === "POST") {
    await handleCallbackPost(req, res);
    return true;
  }

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
