import { useState } from "react";
import { signInWithApple } from "../services/auth";
import { Spinner } from "./ui/Spinner";
import { cn } from "../lib/cn";

type Props = {
  onError?: (message: string) => void;
};

export function SignInWithAppleButton({ onError }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await signInWithApple();
    } catch (err) {
      setLoading(false);
      const message =
        err instanceof Error ? err.message : "Sign in failed. Please try again.";
      onError?.(message);
    }
  }

  return (
    <button
      type="button"
      className={cn(
        "flex min-h-11 w-full items-center justify-center gap-2 rounded-donna bg-donna-text px-4 py-3 text-base font-semibold text-white",
        "transition-opacity duration-150 hover:opacity-90",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-gold-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-70",
      )}
      onClick={() => void handleClick()}
      disabled={loading}
    >
      {loading ? (
        <Spinner className="h-5 w-5 border-white/30 border-t-white" />
      ) : (
        <>
          <AppleLogo />
          Sign in with Apple
        </>
      )}
    </button>
  );
}

function AppleLogo() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      />
    </svg>
  );
}
