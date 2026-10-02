import { useEffect } from "react";
import "./Pages.css";

export function Privacy() {
  useEffect(() => {
    document.title = "Privacy Policy — Donna";
  }, []);

  return (
    <div className="doc-page">
      <article className="doc">
        <h1>Privacy Policy</h1>
        <p className="doc-updated">Last updated: September 28, 2026</p>

        <p>
          Donna (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is a
          voice-powered AI assistant. This policy explains how we handle
          information when you use the Donna iOS app, this website, and the
          Donna Firefox add-on.
        </p>

        <h2>Information we collect</h2>
        <p>
          <strong>Account information.</strong> When you sign in with Apple or
          Google, we receive an account identifier and, if you choose to share
          it, your email address and name. This is used to keep your data
          separate from other users and to maintain your session.
        </p>
        <p>
          <strong>Voice audio.</strong> When you tap the microphone and speak,
          Donna records audio only during that active session. Audio is sent to
          our servers to transcribe your speech, generate a reply, and return
          spoken audio to the app.
        </p>
        <p>
          <strong>Transcripts and replies.</strong> Text transcripts of what you
          say and Donna&apos;s responses may be stored on our servers to
          operate the service and improve reliability.
        </p>
        <p>
          <strong>Memory content.</strong> Links, documents, and photos you add
          to Donna&apos;s memory are uploaded to our servers so Donna can recall
          them in future conversations.
        </p>
        <p>
          <strong>Firefox add-on.</strong> If you install the Donna Firefox
          add-on and choose to fill a form, the add-on sends that page&apos;s
          origin, title, and form field labels to our servers so Donna can
          suggest values from your memory. It does not send values already on
          the page, passwords, or payment fields. Nothing is written into the
          page until you confirm. The add-on does not submit the form and does
          not save the page into memory.
        </p>
        <p>
          <strong>Hardware pre-order.</strong> If you pre-order Donna hardware
          on this site, you submit your name, email, phone, and shipping
          address. Those details are sent to Razorpay with your payment. We
          email a reservation confirmation to the address you entered, and we
          use it again when the first batch is ready to ship.
        </p>
        <p>
          <strong>Subscriptions.</strong> If you subscribe to Donna Pro in the
          iOS app, Apple processes the payment. We receive a subscription
          identifier, the plan you chose, and whether it is active so we can
          provide the service. We do not receive your card number.
        </p>
        <p>
          We do not collect your contacts or precise location.
        </p>

        <h2>How we use information</h2>
        <ul>
          <li>To authenticate you and maintain your account</li>
          <li>To transcribe your speech and generate AI responses</li>
          <li>To deliver spoken replies through the app</li>
          <li>To store and recall content you add to memory</li>
          <li>
            To suggest form values from your memory when you use the Firefox
            add-on
          </li>
          <li>
            To process hardware reservations, send a confirmation email, and
            email you when the device is ready
          </li>
          <li>To provide Donna Pro while your App Store subscription is active</li>
          <li>To maintain, secure, and improve Donna</li>
        </ul>
        <p>
          We do not use your data for advertising. We do not sell your personal
          information. We do not track you across other companies&apos; apps or
          websites for advertising purposes.
        </p>

        <h2>Third-party services</h2>
        <p>
          Donna uses the following third-party services to operate the app. Data
          is sent to these providers only as needed to provide the service:
        </p>
        <ul>
          <li>
            <strong>OpenRouter</strong> — speech transcription and AI text
            generation
          </li>
          <li>
            <strong>OpenAI, Cartesia, or ElevenLabs</strong> — text-to-speech
            synthesis (one provider is used depending on configuration)
          </li>
          <li>
            <strong>Supabase</strong> — authentication, database, and file
            storage
          </li>
          <li>
            <strong>Resend</strong> — reservation confirmation email
          </li>
          <li>
            <strong>Apple</strong> — App Store subscription payments for Donna
            Pro
          </li>
          <li>
            <strong>Razorpay</strong> — payment processing for hardware
            reservations
          </li>
        </ul>
        <p>
          These providers process data under their own privacy policies. Before
          your first use of voice or memory features, the Donna app asks for
          your permission to share data with these services.
        </p>

        <h2>Data retention</h2>
        <p>
          Voice audio and conversation data are retained on our servers as needed
          to operate the service until you delete your account or we no longer
          need the data to provide Donna.
        </p>
        <p>
          Imported meeting snapshots from integrations remain in Donna after
          disconnect or source-side permission changes until you explicitly
          delete them from Integrations.
        </p>

        <h2>Account deletion</h2>
        <p>
          You can delete your Donna account and the personal data we store for
          you at any time in the iOS app:
        </p>
        <ol>
          <li>Open Donna and sign in</li>
          <li>Open Profile and choose <strong>Delete account</strong></li>
          <li>Confirm deletion</li>
        </ol>
        <p>
          Account deletion is permanent. When you confirm, we delete your sign-in
          account and remove the data associated with it from our systems,
          including:
        </p>
        <ul>
          <li>Your account identifier and profile summary</li>
          <li>Voice conversation transcripts and stored audio</li>
          <li>Links, documents, photos, and other content saved to memory</li>
          <li>Derived facts and knowledge compiled from your conversations</li>
        </ul>
        <p>
          Deletion applies to data stored on our servers and in Supabase. It does
          not remove copies already processed by third-party AI providers under
          their own retention policies. If you cannot access the app, contact us
          using the email below and we will help delete your account.
        </p>

        <h2>Microphone and photo access</h2>
        <p>
          The Donna app requests microphone access when you start a voice
          session. Photo library access is requested only when you choose to add
          a photo to memory. You can revoke these permissions at any time in
          iOS Settings.
        </p>

        <h2>Children</h2>
        <p>
          Donna is not directed at children under 13, and we do not knowingly
          collect personal information from children.
        </p>

        <h2>Changes</h2>
        <p>
          We may update this policy from time to time. We will revise the date
          at the top of this page when we do.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about privacy or account deletion? Email{" "}
          <a href="mailto:kishansagathiya@gmail.com">kishansagathiya@gmail.com</a>
          .
        </p>
      </article>
    </div>
  );
}
