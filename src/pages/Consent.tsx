import { Link, useNavigate } from "react-router-dom";
import { PRIVACY_POLICY_URL } from "../config";
import { grantAiDataConsent } from "../services/privacyConsent";
import "./Consent.css";

export function Consent() {
  const navigate = useNavigate();

  function handleAccept() {
    grantAiDataConsent();
    navigate("/app", { replace: true });
  }

  return (
    <div className="consent-page">
      <div className="consent-scroll">
        <h1 className="consent-title">How Donna uses your data</h1>
        <p className="consent-lead">
          Donna sends some of your information to third-party AI services so it
          can read your messages, think, and reply. Please review before
          continuing.
        </p>

        <h2 className="consent-section">What we send</h2>
        <ul className="consent-list">
          <li>Messages you type to Donna and Donna&apos;s text replies</li>
          <li>Links, documents, and photos you add to memory</li>
          <li>
            Your account identifier so Donna can keep your data separate from
            other users
          </li>
        </ul>

        <h2 className="consent-section">Who receives it</h2>
        <ul className="consent-list">
          <li>OpenRouter — AI responses</li>
          <li>
            Supabase — secure sign-in and storage for your account and saved
            memories
          </li>
        </ul>

        <p className="consent-note">
          Donna does not use your data for advertising or sell your personal
          information.
        </p>

        <Link to={PRIVACY_POLICY_URL} className="link-gold">
          Read full Privacy Policy
        </Link>
      </div>

      <button className="btn-primary consent-accept" onClick={handleAccept}>
        I agree — continue to Donna
      </button>
    </div>
  );
}
