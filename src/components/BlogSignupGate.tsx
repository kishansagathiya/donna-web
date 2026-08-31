import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function BlogSignupGate({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const gated = !isAuthenticated;
  const signupTo = `/login?next=${encodeURIComponent(pathname)}`;

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
            <p>A Donna account unlocks the full blog.</p>
            <Link to={signupTo} className="blog-gate-cta">
              Sign up
            </Link>
            <p className="blog-gate-fineprint">
              Already have an account? <Link to={signupTo}>Sign in</Link>
            </p>
            <p className="blog-gate-fineprint">
              <Link to="/privacy">Privacy</Link>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
