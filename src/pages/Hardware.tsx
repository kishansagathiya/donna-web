import { FormEvent, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { APP_STORE_URL } from "../config";
import { useHardwarePreorder } from "../hooks/useHardwarePreorder";
import "./Pages.css";

function ReserveForm({
  state,
  error,
  onSubmit,
}: {
  state: ReturnType<typeof useHardwarePreorder>["state"];
  error: string;
  onSubmit: (fields: {
    name: string;
    email: string;
    phone: string;
    address: string;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const busy = state === "busy";

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit({ name, email, phone, address });
  }

  return (
    <form className="hardware-form" onSubmit={handleSubmit}>
      <label>
        Full name
        <input
          name="name"
          autoComplete="name"
          required
          minLength={2}
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={busy}
        />
      </label>
      <label>
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={busy}
        />
      </label>
      <label>
        Phone
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          disabled={busy}
        />
      </label>
      <label>
        Shipping address
        <textarea
          name="address"
          autoComplete="street-address"
          required
          minLength={10}
          rows={3}
          placeholder="Street, city, state, PIN, country"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          disabled={busy}
        />
      </label>
      <button type="submit" className="hardware-cta" disabled={busy}>
        {busy ? "Opening Razorpay…" : "Reserve for ₹4,900"}
      </button>
      {error ? (
        <p className="hardware-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function Hardware() {
  const { state, error, start } = useHardwarePreorder();
  const [searchParams] = useSearchParams();
  if (searchParams.get("razorpay_payment_id")) {
    return (
      <Navigate
        to={{ pathname: "/hardware/reserved", search: searchParams.toString() }}
        replace
      />
    );
  }

  return (
    <div className="doc-page">
      <article className="doc">
        <p className="doc-updated">First batch · Limited reservation</p>
        <h1>Donna Device</h1>
        <p>
          A one-button voice capture device for Donna. Hold REC, speak, release.
          It stores the recording on the device and syncs to the Donna iOS app
          when your phone is nearby — so you can capture thoughts, meetings, and
          follow-ups without unlocking a screen.
        </p>

        <figure className="hardware-video">
          <div className="hardware-video-frame">
            <iframe
              src="https://www.youtube.com/embed/7bZaKViLs-s"
              title="Meet Donna: A Simple Hardware Voice Recorder for iOS"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </figure>

        <div className="hardware-buy" id="reserve">
          <p className="hardware-price">₹4,900</p>
          <p className="hardware-price-note">
            Reservation for one device from the first batch. Not a ship date.
            Pay on Razorpay after you enter your details. You&apos;ll come back
            here when it succeeds.
          </p>
          <ReserveForm
            state={state}
            error={error}
            onSubmit={(fields) => void start(fields)}
          />
        </div>

        <h2>What it does</h2>
        <p>
          Donna Device is not a speaker, not a chat gadget, and not an always-on
          microphone. It is a capture button:
        </p>
        <ul>
          <li>
            <strong>Hold REC to record.</strong> Release to stop. Recording
            auto-stops at 5 minutes.
          </li>
          <li>
            <strong>The clip stays on the device</strong> until the Donna iOS
            app can sync it.
          </li>
          <li>
            <strong>Donna transcribes and remembers</strong> in the app — not on
            the hardware. The device does not reply, transcribe, or run models
            itself.
          </li>
          <li>
            <strong>E-paper screen</strong> shows idle, recording, saved,
            battery, and pairing status.
          </li>
        </ul>

        <h2>How sync works</h2>
        <p>
          Pair once from Donna on iPhone: Profile → Pair Device, then choose
          &ldquo;Donna Device&rdquo;. After that:
        </p>
        <ul>
          <li>
            <strong>Phone unlocked, app in foreground:</strong> a short-lived
            Wi-Fi path pulls captures in seconds.
          </li>
          <li>
            <strong>Phone locked or Wi-Fi unavailable:</strong> Bluetooth
            fallback sends the clip when you&apos;re in range.
          </li>
        </ul>
        <p>
          You need the{" "}
          <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
            Donna iOS app
          </a>
          . Android and web cannot pair the device today.
        </p>

        <h2>Specs</h2>
        <table>
          <tbody>
            <tr>
              <th>Capture</th>
              <td>Hold-to-record, release to stop; 5 minute auto-stop</td>
            </tr>
            <tr>
              <th>Storage</th>
              <td>On-device SD card until synced</td>
            </tr>
            <tr>
              <th>Display</th>
              <td>1.54&quot; e-paper</td>
            </tr>
            <tr>
              <th>Processor</th>
              <td>ESP32-S3 (8 MB flash, 8 MB PSRAM)</td>
            </tr>
            <tr>
              <th>Wireless</th>
              <td>Bluetooth LE pairing and sync; Wi-Fi fast path via the iOS app</td>
            </tr>
            <tr>
              <th>Power</th>
              <td>Rechargeable battery; USB charging; on-screen battery status</td>
            </tr>
            <tr>
              <th>Enclosure</th>
              <td>First-batch printed case (desk / handheld)</td>
            </tr>
            <tr>
              <th>Software</th>
              <td>Donna iOS app required for pairing, sync, and transcription</td>
            </tr>
          </tbody>
        </table>

        <h2>What&apos;s in the box</h2>
        <ul>
          <li>One Donna Device (assembled first-batch unit)</li>
          <li>USB charging cable</li>
          <li>Pairing instructions for the Donna iOS app</li>
        </ul>
        <p>
          The Donna app stays free to download. This reservation is for the
          hardware only.
        </p>

        <h2>Expected delivery</h2>
        <p>
          This is a <strong>reservation</strong>, not a guaranteed ship date.
          The device exists as a working prototype. First-batch units ship after
          we lock the enclosure, battery, and pairing flow for a small run.
        </p>
        <ul>
          <li>
            Checkout collects your name, email, phone, and shipping address. We
            will email you before shipping to confirm we can deliver to that
            address.
          </li>
          <li>
            We are aiming for the first batch in late 2026. That is a target,
            not a promise.
          </li>
          <li>
            If your unit has not shipped within <strong>6 months</strong> of
            payment, you get a full refund.
          </li>
          <li>
            If we cannot ship to your region, you get a full refund.
          </li>
        </ul>

        <details className="hardware-fold">
          <summary>Terms of purchase</summary>
          <ol>
            <li>
              <strong>Price.</strong> ₹4,900 INR today reserves one first-batch
              Donna Device. Payment is processed by Razorpay.
            </li>
            <li>
              <strong>What you are buying.</strong> A hardware reservation, not
              software, not a subscription, and not a guaranteed delivery date.
            </li>
            <li>
              <strong>Cancellation.</strong> Email{" "}
              <a href="mailto:kishansagathiya@gmail.com">
                kishansagathiya@gmail.com
              </a>{" "}
              before we ship and we will refund the ₹4,900 in full.
            </li>
            <li>
              <strong>If we cannot deliver.</strong> If we cancel the batch,
              cannot ship to you, or miss the 6-month window, you get a full
              refund.
            </li>
            <li>
              <strong>After shipping.</strong> Once a unit has shipped, refunds
              follow standard defective-on-arrival handling. Contact us within
              14 days of delivery if the device does not power on or cannot
              pair.
            </li>
            <li>
              <strong>Early hardware.</strong> This is a first batch. Finish,
              battery life, and enclosure may change slightly from the prototype
              as we assemble units. Core behavior stays the same: hold to
              record, sync to Donna on iPhone.
            </li>
            <li>
              <strong>Requirements.</strong> An iPhone or iPad with the Donna
              app. You are responsible for your own Apple account, network, and
              app use.
            </li>
            <li>
              <strong>Privacy.</strong> Recordings live on the device until they
              sync through the Donna app. After sync, they follow the{" "}
              <Link to="/privacy">Donna privacy policy</Link>. Razorpay processes
              payment and stores the details you submit for this reservation; we
              do not store your card number.
            </li>
          </ol>
        </details>

        <details className="hardware-fold">
          <summary>FAQ</summary>
          <h3>Does the device listen all the time?</h3>
          <p>
            No. It records only while you hold REC (or until the 5-minute cap).
          </p>
          <h3>Will it work without my phone?</h3>
          <p>
            It will record and store clips on its own. Transcription, memory,
            and tasks happen after it syncs to the Donna iOS app.
          </p>
          <h3>Is Android supported?</h3>
          <p>Not for pairing. iOS only for this batch.</p>
          <h3>Is this the final retail price?</h3>
          <p>
            ₹4,900 is the first-batch reservation price. Later batches may cost
            more. Your reservation price will not increase for this unit.
          </p>
        </details>

        <div className="support-card">
          <h2>Reserve a first-batch unit</h2>
          <p>
            ₹4,900 today. Enter your shipping details, then pay on Razorpay.
            Full refund if we don&apos;t ship.
          </p>
          {state === "paid" ? (
            <p>Reservation received.</p>
          ) : (
            <a className="hardware-cta" href="#reserve">
              Reserve for ₹4,900
            </a>
          )}
        </div>
      </article>
    </div>
  );
}
