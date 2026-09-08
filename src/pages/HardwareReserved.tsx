import { Link } from "react-router-dom";
import { useHardwareReservationReturn } from "../hooks/useHardwarePreorder";
import "./Pages.css";

export function HardwareReserved() {
  const { state, error } = useHardwareReservationReturn();

  return (
    <div className="doc-page">
      <article className="doc hardware-success">
        {state === "busy" ? (
          <>
            <p className="doc-updated">Donna Device</p>
            <h1>Confirming your reservation…</h1>
            <p>Hold on while we check the payment with Razorpay.</p>
          </>
        ) : null}

        {state === "paid" ? (
          <>
            <p className="doc-updated">Donna Device</p>
            <h1>Reservation confirmed</h1>
            <p>
              Thank you. Your ₹4,900 first-batch reservation is in. Razorpay
              will email a receipt. We&apos;ll email you again before we ship to
              confirm your address.
            </p>
            <p>
              Full refund if we cannot ship within 6 months, or if we cannot
              deliver to your region.
            </p>
            <p>
              <Link to="/hardware" className="hardware-cta">
                Back to Donna Device
              </Link>
            </p>
          </>
        ) : null}

        {state === "error" ? (
          <>
            <p className="doc-updated">Donna Device</p>
            <h1>We couldn&apos;t confirm automatically</h1>
            <p>
              {error || "Razorpay did not return a verifiable payment."} If you
              were charged, you are still reserved — check your email for a
              Razorpay receipt, or write{" "}
              <a href="mailto:kishansagathiya@gmail.com">
                kishansagathiya@gmail.com
              </a>
              .
            </p>
            <p>
              <Link to="/hardware" className="hardware-cta">
                Back to Donna Device
              </Link>
            </p>
          </>
        ) : null}
      </article>
    </div>
  );
}
