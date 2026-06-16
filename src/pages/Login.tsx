import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { SignInWithAppleButton } from "../components/SignInWithAppleButton";
import { PRIVACY_POLICY_URL } from "../config";
import { signInWithEmail, signUpWithEmail } from "../services/auth";
import "./Login.css";

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
    <div className="login-page">
      <div className="login-hero">
        <div className="login-logo" aria-hidden="true">
          D
        </div>
        <h1 className="login-title">Donna</h1>
        <p className="login-subtitle">AI Second Brain, but the BEST</p>
      </div>

      <div className="login-actions">
        {signupSent ? (
          <p className="login-success">
            Check your email to confirm your account, then sign in.
          </p>
        ) : (
          <>
            <p className="login-label">Sign in to continue</p>

            <SignInWithAppleButton onError={setError} />

            {error ? <p className="login-error">{error}</p> : null}

            {!showEmail ? (
              <button
                type="button"
                className="login-toggle"
                onClick={() => {
                  setShowEmail(true);
                  setError(null);
                }}
              >
                Sign in with email instead
              </button>
            ) : (
              <>
                <div className="login-divider" aria-hidden="true">
                  <span>or</span>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                  <input
                    className="text-input"
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />

                  <input
                    className="text-input"
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

                  <button
                    className="btn-primary"
                    type="submit"
                    disabled={loading}
                  >
                    {loading
                      ? "Please wait…"
                      : mode === "signin"
                        ? "Sign in"
                        : "Sign up"}
                  </button>

                  <button
                    type="button"
                    className="login-toggle"
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

        <Link to={PRIVACY_POLICY_URL} className="link-gold login-privacy">
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}
