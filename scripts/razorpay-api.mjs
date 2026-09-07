/**
 * Razorpay Standard Checkout API for donna-web.
 * Used by Vite (dev) and scripts/serve.mjs (production).
 * KEY_SECRET stays server-side only.
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Razorpay from "razorpay";

const MIN_AMOUNT_PAISE = 100;
const API_PATHS = new Set(["/api/create-order", "/api/verify-payment"]);

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

export function expectedSignature(orderId, paymentId, keySecret) {
  return createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

function razorpayStatus(err) {
  const code = err?.statusCode ?? err?.status;
  if (code === 401 || code === 403) return 401;
  if (code === 400) return 400;
  return 500;
}

async function createOrder(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch (err) {
    json(res, err.status || 400, { error: err.message || "Invalid JSON" });
    return;
  }

  const fallbackAmount = configuredAmount();
  const fallbackCurrency = configuredCurrency();
  const amount = Number(body.amount ?? fallbackAmount);
  const currency = String(body.currency || fallbackCurrency).toUpperCase();
  const receipt = String(body.receipt || `donna-hw-${Date.now()}`).slice(0, 40);

  if (!Number.isInteger(amount) || amount < MIN_AMOUNT_PAISE) {
    json(res, 400, { error: "amount must be an integer of at least 100 paise" });
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

  try {
    const instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await instance.orders.create({
      amount,
      currency,
      receipt,
    });
    json(res, 200, {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
    });
  } catch (err) {
    const status = razorpayStatus(err);
    json(res, status, {
      error: status === 401 ? "Razorpay authentication failed" : "Failed to create order",
    });
  }
}

async function verifyPayment(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch (err) {
    json(res, err.status || 400, { error: err.message || "Invalid JSON" });
    return;
  }

  const orderId = body.razorpay_order_id;
  const paymentId = body.razorpay_payment_id;
  const signature = body.razorpay_signature;
  if (!orderId || !paymentId || !signature) {
    json(res, 400, {
      error: "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required",
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

  const expected = expectedSignature(orderId, paymentId, keySecret);
  if (expected !== signature) {
    json(res, 400, { error: "Signature mismatch", paid: false });
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

  if (path === "/api/create-order") {
    await createOrder(req, res);
    return true;
  }
  await verifyPayment(req, res);
  return true;
}
