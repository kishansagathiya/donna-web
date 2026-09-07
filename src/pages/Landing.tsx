import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { LOGO_LANDING } from "../lib/logo";
import { APP_STORE_URL, RAZORPAY_KEY_ID, PREORDER_AMOUNT_PAISE } from "../config";
import { openRazorpayCheckout } from "../lib/razorpay";
import { useAuth } from "../hooks/useAuth";
import { hasAiDataConsent } from "../services/privacyConsent";
import "../App.css";

export function Landing() {
  const { isAuthenticated, loading } = useAuth();
  const [preorderState, setPreorderState] = useState<
    "idle" | "busy" | "paid" | "error"
  >("idle");
  const [preorderError, setPreorderError] = useState("");

  if (!loading && isAuthenticated) {
    return (
      <Navigate
        to={hasAiDataConsent() ? "/app" : "/consent"}
        replace
      />
    );
  }

  async function startPreorder() {
    setPreorderError("");
    setPreorderState("busy");
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
        onDismiss: () => setPreorderState("idle"),
        onFailed: (message) => {
          setPreorderError(message);
          setPreorderState("error");
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
            setPreorderState("paid");
          } catch (err) {
            setPreorderError(
              err instanceof Error ? err.message : "Payment verification failed",
            );
            setPreorderState("error");
          }
        },
      });
    } catch (err) {
      setPreorderError(err instanceof Error ? err.message : "Could not start checkout");
      setPreorderState("error");
    }
  }

  return (
    <div className="page">
      <main className="landing">
        <img
          className="landing-logo"
          src={LOGO_LANDING}
          alt="Donna"
          width={112}
          height={112}
        />
        <p className="landing-eyebrow">Now on the App Store</p>
        <h1>
          AI Personal Assistant for Founders, but the <em>BEST</em>
        </h1>
        <p className="landing-tagline">
          Donna is your AI personal assistant
          - It learns and remembersyou through memory,
          - It executes tasks on your behalf,
          - Web and iOS,
          - Faster and Better LLM Chat,
        </p>
        <div className="landing-actions">
          <a
            href={APP_STORE_URL}
            className="landing-cta"
            target="_blank"
            rel="noopener noreferrer"
          >
            <AppleIcon />
            Download on the App Store
          </a>
          <Link to="/app" className="landing-secondary">
            Open on the web
          </Link>
          <button
            type="button"
            className="landing-secondary"
            onClick={() => void startPreorder()}
            disabled={preorderState === "busy" || preorderState === "paid"}
          >
            {preorderState === "busy"
              ? "Opening checkout…"
              : preorderState === "paid"
                ? "Reservation received"
                : "Pre-order hardware"}
          </button>
        </div>
        <p className="landing-footnote">
          Free on iPhone &amp; iPad.{" "}
          <Link to="/login">Sign in</Link> to sync across devices.
          {" "}
          ₹4,900 reservation. We will email you when it is ready to ship.
        </p>
        {preorderError ? (
          <p className="landing-footnote" role="alert">
            {preorderError}
          </p>
        ) : null}
      </main>
    </div>
  );
}

function AppleIcon() {
  return (
    <svg
      className="landing-cta-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}
