import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  isBlogUnlocked,
  isValidSignupEmail,
  saveBlogSignupEmail,
} from "../lib/blogGate";

export function BlogSignupGate({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const [unlocked, setUnlocked] = useState(isBlogUnlocked);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const gated = !isAuthenticated && !unlocked;
  const loginTo = `/login?next=${encodeURIComponent(pathname)}`;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!isValidSignupEmail(email)) {
      setError("Enter a valid email.");
      return;
    }
    try {
      saveBlogSignupEmail(email);
      setUnlocked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that email.");
    }
  }

  return (
    <div className={gated ? "blog-post-gated" : undefined}>
      <div
        className={gated ? "blog-post-body blog-post-body--gated" : "blog-post-body"}
        inert={gated || undefined}
        aria-hidden={gated || undefined}
      >
        {children}
      </div>
      {gated ? (
        <div className="blog-gate">
          <div className="blog-gate-card" role="region" aria-labelledby="blog-gate-title">
            <h2 id="blog-gate-title">Sign up to read the post</h2>
            <p>
              One email unlocks the full blog on this browser. No password.
            </p>
            <form className="blog-gate-form" onSubmit={handleSubmit}>
              <label className="visually-hidden" htmlFor="blog-gate-email">
                Email
              </label>
              <input
                id="blog-gate-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <button type="submit">Unlock post</button>
            </form>
            {error ? <p className="blog-gate-error">{error}</p> : null}
            <p className="blog-gate-fineprint">
              Already have an account? <Link to={loginTo}>Sign in</Link>
            </p>
            <p className="blog-gate-fineprint">
              By continuing you agree to receive occasional product updates.{" "}
              <Link to="/privacy">Privacy</Link>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
