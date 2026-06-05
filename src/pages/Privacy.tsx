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
        <p className="doc-updated">Last updated: June 5, 2026</p>

        <p>
          Donna (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is a
          voice-powered AI assistant. This policy explains how we handle
          information when you use the Donna iOS app and this website.
        </p>

        <h2>Information we collect</h2>
        <p>
          <strong>Voice audio.</strong> When you tap the microphone and speak,
          Donna records audio only during that active session. Audio is sent to
          our servers to transcribe your speech, generate a reply, and return
          spoken audio to the app.
        </p>
        <p>
          <strong>Website waitlist.</strong> If you join the waitlist on this
          site, we collect the email address you submit so we can notify you
          about Donna.
        </p>
        <p>
          We do not require an account to use the Donna app. We do not collect
          your name, contacts, location, or photos.
        </p>

        <h2>How we use information</h2>
        <ul>
          <li>To transcribe your speech and generate AI responses</li>
          <li>To deliver spoken replies through the app</li>
          <li>To send waitlist updates, if you signed up on this site</li>
          <li>To maintain, secure, and improve Donna</li>
        </ul>
        <p>
          We do not use your voice data for advertising. We do not sell your
          personal information.
        </p>

        <h2>Third-party services</h2>
        <p>
          Donna uses third-party AI and speech services to process voice input
          and generate responses. Audio and derived text may be transmitted to
          these providers only as needed to operate the app. Those providers
          process data under their own privacy policies.
        </p>

        <h2>Data retention</h2>
        <p>
          Voice audio is processed to complete each conversation turn. We do
          not design Donna to build a long-term archive of your conversations on
          your device. Server-side retention is limited to what is needed to
          operate and secure the service.
        </p>

        <h2>Microphone access</h2>
        <p>
          The Donna app requests microphone access only when you start a voice
          session. You can revoke microphone access at any time in iOS Settings.
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
          Questions about privacy? Email{" "}
          <a href="mailto:kishansagathiya@gmail.com">kishansagathiya@gmail.com</a>
          .
        </p>
      </article>
    </div>
  );
}
