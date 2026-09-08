import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export type PreorderState = "idle" | "busy" | "paid" | "error";

export function useHardwarePreorder() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<PreorderState>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const paymentLinkId = searchParams.get("razorpay_payment_link_id");
    const paymentId = searchParams.get("razorpay_payment_id");
    const signature = searchParams.get("razorpay_signature");
    const linkStatus = searchParams.get("razorpay_payment_link_status");
    if (!paymentLinkId || !paymentId || !signature) {
      return;
    }

    let cancelled = false;
    setState("busy");
    setError("");
    void fetch("/api/verify-preorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpay_payment_link_id: paymentLinkId,
        razorpay_payment_link_reference_id:
          searchParams.get("razorpay_payment_link_reference_id") || "",
        razorpay_payment_link_status: linkStatus || "",
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      }),
    })
      .then(async (res) => {
        const body = (await res.json()) as { success?: boolean; error?: string };
        if (cancelled) return;
        if (!res.ok || !body.success) {
          throw new Error(body.error || "Payment was not verified");
        }
        setState("paid");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Payment was not verified");
        setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  async function start(fields: {
    name: string;
    email: string;
    phone: string;
    address: string;
  }) {
    setError("");
    setState("busy");
    try {
      const res = await fetch("/api/create-preorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const body = (await res.json()) as {
        checkout_url?: string;
        error?: string;
      };
      if (!res.ok || !body.checkout_url) {
        throw new Error(body.error || "Could not start reservation");
      }
      window.location.assign(body.checkout_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start reservation");
      setState("error");
    }
  }

  return { state, error, start, returning: Boolean(searchParams.get("razorpay_payment_id")) };
}
