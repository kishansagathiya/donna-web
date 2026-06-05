import { useEffect } from "react";
import "./Pages.css";

export function Support() {
  useEffect(() => {
    document.title = "Support — Donna";
  }, []);

  return (
    <div className="doc-page">
      <article className="doc">
        <h1>Support</h1>
        <p className="doc-updated">We&apos;re here to help.</p>

        <p>
          Donna is your voice-powered AI second brain. Tap the gold mic, speak
          naturally, and Donna listens, thinks, and talks back.
        </p>

        <h2>Getting started</h2>
        <ul>
          <li>Open the Donna app on your iPhone</li>
          <li>Tap the gold microphone button</li>
          <li>Allow microphone access when iOS prompts you</li>
          <li>Speak your question or thought</li>
          <li>Wait a moment for Donna&apos;s spoken reply</li>
          <li>Tap the mic again to end the session</li>
        </ul>
        <p>
          Donna requires an internet connection. The app works best in a quiet
          environment with a stable network.
        </p>

        <h2>Common issues</h2>
        <p>
          <strong>Donna doesn&apos;t hear me.</strong> Check that microphone
          access is enabled for Donna in Settings → Privacy &amp; Security →
          Microphone.
        </p>
        <p>
          <strong>No reply or long delay.</strong> Confirm you have a working
          internet connection and try again in a few seconds.
        </p>
        <p>
          <strong>Audio doesn&apos;t play.</strong> Make sure your iPhone is not
          muted and volume is turned up.
        </p>

        <div className="support-card">
          <h2>Contact us</h2>
          <p>
            For help, feedback, or account questions, reach us at:
          </p>
          <a
            className="support-email"
            href="mailto:kishansagathiya@gmail.com"
          >
            kishansagathiya@gmail.com
          </a>
        </div>
      </article>
    </div>
  );
}
