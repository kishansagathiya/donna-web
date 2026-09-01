import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { DonnaLogo } from "../components/DonnaLogo";
import { SignInWithAppleButton } from "../components/SignInWithAppleButton";
import { SignInWithGoogleButton } from "../components/SignInWithGoogleButton";
import { Spinner } from "../components/ui/Spinner";
import { TextInput } from "../components/ui/TextInput";
import { PRIVACY_POLICY_URL } from "../config";
import { isDonnaDesktop } from "../lib/desktop";
import { cn } from "../lib/cn";
import {
  getSession,
  handoffSessionToDesktop,
  isDesktopBrowserHandoff,
  onAuthStateChange,
  signInWithPassword,
} from "../services/auth";

export function Login() {
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const queryParams = new URLSearchParams(window.location.search);
    const errorDescription =
      hashParams.get("error_description") ?? queryParams.get("error_description");

    if (errorDescription) {
      setError(decodeURIComponent(errorDescription.replace(/\+/g, " ")));
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (!isDesktopBrowserHandoff()) return undefined;

    const bounce = (
      session: Parameters<typeof handoffSessionToDesktop>[0] | null,
    ) => {
      if (session?.access_token) handoffSessionToDesktop(session);
    };
    void getSession().then(bounce);
    return onAuthStateChange(bounce);
  }, []);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPasswordLoading(true);
    try {
      await signInWithPassword(email, password);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sign in failed. Please try again.";
      setError(message);
    } finally {
      setPasswordLoading(false);
    }
  }

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
        {isDonnaDesktop() ? (
          <p className="max-w-xs text-sm text-donna-muted">
            Apple and Google open in your browser, then return here. Email
            sign-in stays in this window.
          </p>
        ) : isDesktopBrowserHandoff() ? (
          <p className="max-w-xs text-sm text-donna-muted">
            After sign-in, click Open Donna Desktop if the app does not come
            forward on its own.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-center text-[0.9375rem] font-medium text-donna-muted">
          Sign in to continue
        </p>

        <SignInWithAppleButton onError={setError} />
        <SignInWithGoogleButton onError={setError} />

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-donna-border" />
          <span className="text-xs font-medium uppercase tracking-wide text-donna-muted">
            or
          </span>
          <div className="h-px flex-1 bg-donna-border" />
        </div>

        <form className="flex flex-col gap-3" onSubmit={(e) => void handlePasswordSubmit(e)}>
          <label className="sr-only" htmlFor="login-email">
            Email
          </label>
          <TextInput
            id="login-email"
            type="email"
            autoComplete="username"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label className="sr-only" htmlFor="login-password">
            Password
          </label>
          <TextInput
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={passwordLoading}
            className={cn(
              "flex min-h-11 w-full items-center justify-center gap-2 rounded-donna border border-donna-border bg-donna-surface px-4 py-3 text-base font-semibold text-donna-text",
              "transition-opacity duration-150 hover:opacity-90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-70",
            )}
          >
            {passwordLoading ? (
              <Spinner className="h-5 w-5 border-donna-border border-t-donna-text" />
            ) : (
              "Sign in with email"
            )}
          </button>
        </form>

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
