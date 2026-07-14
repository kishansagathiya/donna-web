import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DonnaLogo } from "../components/DonnaLogo";
import { SignInWithAppleButton } from "../components/SignInWithAppleButton";
import { SignInWithGoogleButton } from "../components/SignInWithGoogleButton";
import { PRIVACY_POLICY_URL } from "../config";
import { cn } from "../lib/cn";

export function Login() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const queryParams = new URLSearchParams(window.location.search);
    const errorDescription =
      hashParams.get("error_description") ?? queryParams.get("error_description");

    if (errorDescription) {
      setError(decodeURIComponent(errorDescription.replace(/\+/g, " ")));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  return (
    <div className="flex h-full min-h-0 w-full flex-col justify-between overflow-y-auto px-6 pb-8 pt-12">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <DonnaLogo
          className="mb-2 h-20 w-20 rounded-2xl object-contain"
          width={80}
          height={80}
        />
        <h1 className="text-3xl font-bold tracking-tight text-donna-text">Donna</h1>
        <p className="max-w-xs text-base leading-relaxed text-donna-muted">
          AI Assistant that remembers what matters
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-center text-[0.9375rem] font-medium text-donna-muted">
          Sign in to continue
        </p>

        <SignInWithAppleButton onError={setError} />
        <SignInWithGoogleButton onError={setError} />

        {error ? (
          <p className="text-center text-sm text-donna-destructive">{error}</p>
        ) : null}

        <Link
          to={PRIVACY_POLICY_URL}
          className={cn(
            "self-center text-sm font-medium text-donna-primary underline",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring",
          )}
        >
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}
