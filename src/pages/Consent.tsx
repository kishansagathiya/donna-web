import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { PRIVACY_POLICY_URL } from "../config";
import { grantAiDataConsent } from "../services/privacyConsent";

export function Consent() {
  const navigate = useNavigate();

  function handleAccept() {
    grantAiDataConsent();
    navigate("/app", { replace: true });
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col px-6 pt-6">
      <div className="flex-1 overflow-y-auto pb-4">
        <h1 className="mb-3 text-[1.75rem] font-bold tracking-tight text-donna-text">
          How Donna uses your data
        </h1>
        <p className="mb-6 text-base leading-relaxed text-donna-muted">
          Donna sends some of your information to third-party AI services so it
          can read your messages, think, and reply. Please review before
          continuing.
        </p>

        <h2 className="mb-2.5 text-[1.0625rem] font-semibold text-donna-text">
          What we send
        </h2>
        <ul className="mb-5 list-disc space-y-2 pl-5 text-[0.9375rem] leading-relaxed text-donna-muted">
          <li>Messages you type to Donna and Donna&apos;s text replies</li>
          <li>Links, documents, and photos you add to memory</li>
          <li>
            Your account identifier so Donna can keep your data separate from
            other users
          </li>
        </ul>

        <h2 className="mb-2.5 text-[1.0625rem] font-semibold text-donna-text">
          Who receives it
        </h2>
        <ul className="mb-5 list-disc space-y-2 pl-5 text-[0.9375rem] leading-relaxed text-donna-muted">
          <li>OpenRouter — AI responses</li>
          <li>
            Supabase — secure sign-in and storage for your account and saved
            memories
          </li>
        </ul>

        <p className="mb-3 text-sm leading-relaxed text-donna-muted">
          Donna does not use your data for advertising or sell your personal
          information.
        </p>

        <Link
          to={PRIVACY_POLICY_URL}
          className="text-sm font-medium text-donna-gold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-gold-ring"
        >
          Read full Privacy Policy
        </Link>
      </div>

      <div className="shrink-0 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
        <Button fullWidth onClick={handleAccept}>
          I agree — continue to Donna
        </Button>
      </div>
    </div>
  );
}
