import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Bot } from "lucide-react";
import { SignInWithAppleButton } from "../components/SignInWithAppleButton";
import { Button } from "../components/ui/Button";
import { TextInput } from "../components/ui/TextInput";
import { PRIVACY_POLICY_URL } from "../config";
import { signInWithEmail, signUpWithEmail } from "../services/auth";
import { cn } from "../lib/cn";

export function Login() {
  const [showEmail, setShowEmail] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSent, setSignupSent] = useState(false);

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
        setSignupSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col justify-between overflow-y-auto px-6 pb-8 pt-12">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div
          className="mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-donna-primary text-white"
          aria-hidden="true"
        >
          <Bot className="h-10 w-10" strokeWidth={1.75} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-donna-text">Donna</h1>
        <p className="max-w-xs text-base leading-relaxed text-donna-muted">
          AI Assistant that remembers what matters
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {signupSent ? (
          <p className="text-center leading-relaxed text-donna-primary">
            Check your email to confirm your account, then sign in.
          </p>
        ) : (
          <>
            <p className="text-center text-[0.9375rem] font-medium text-donna-muted">
              Sign in to continue
            </p>

            <SignInWithAppleButton onError={setError} />

            {error ? (
              <p className="text-center text-sm text-donna-destructive">{error}</p>
            ) : null}

            {!showEmail ? (
              <button
                type="button"
                className="min-h-11 py-2 text-center text-sm text-donna-muted transition-colors hover:text-donna-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring"
                onClick={() => {
                  setShowEmail(true);
                  setError(null);
                }}
              >
                Sign in with email instead
              </button>
            ) : (
              <>
                <div className="flex items-center gap-3 text-sm text-donna-muted" aria-hidden="true">
                  <span className="h-px flex-1 bg-donna-border" />
                  <span>or</span>
                  <span className="h-px flex-1 bg-donna-border" />
                </div>

                <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
                  <TextInput
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />

                  <TextInput
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                  />

                  <Button type="submit" fullWidth disabled={loading}>
                    {loading
                      ? "Please wait…"
                      : mode === "signin"
                        ? "Sign in"
                        : "Sign up"}
                  </Button>

                  <button
                    type="button"
                    className="min-h-11 py-2 text-center text-sm text-donna-muted transition-colors hover:text-donna-primary"
                    onClick={() => {
                      setMode(mode === "signin" ? "signup" : "signin");
                      setError(null);
                    }}
                  >
                    {mode === "signin"
                      ? "Need an account? Sign up"
                      : "Already have an account? Sign in"}
                  </button>
                </form>
              </>
            )}
          </>
        )}

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
