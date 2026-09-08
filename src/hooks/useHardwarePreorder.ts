import { useState } from "react";
import { PREORDER_AMOUNT_PAISE, RAZORPAY_KEY_ID } from "../config";
import { openRazorpayCheckout } from "../lib/razorpay";

export type PreorderState = "idle" | "busy" | "paid" | "error";

export function useHardwarePreorder() {
  const [state, setState] = useState<PreorderState>("idle");
  const [error, setError] = useState("");

  async function start() {
    setError("");
    setState("busy");
    try {
      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: PREORDER_AMOUNT_PAISE,
          currency: "INR",
          receipt: `donna-hw-${Date.now()}`,
        }),
      });
      const orderBody = (await orderRes.json()) as {
        order_id?: string;
        amount?: number;
        currency?: string;
        key_id?: string;
        error?: string;
      };
      if (!orderRes.ok || !orderBody.order_id) {
        throw new Error(orderBody.error || "Could not start checkout");
      }

      const key = RAZORPAY_KEY_ID || orderBody.key_id;
      if (!key) {
        throw new Error("Razorpay is not configured");
      }

      await openRazorpayCheckout({
        key,
        orderId: orderBody.order_id,
        amount: Number(orderBody.amount ?? PREORDER_AMOUNT_PAISE),
        currency: orderBody.currency || "INR",
        onDismiss: () => setState("idle"),
        onFailed: (message) => {
          setError(message);
          setState("error");
        },
        onSuccess: async (response) => {
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
            const verifyBody = (await verifyRes.json()) as {
              success?: boolean;
              error?: string;
            };
            if (!verifyRes.ok || !verifyBody.success) {
              throw new Error(verifyBody.error || "Payment verification failed");
            }
            setState("paid");
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Payment verification failed",
            );
            setState("error");
          }
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout");
      setState("error");
    }
  }

  return { state, error, start };
}
