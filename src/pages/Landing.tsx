import { Link } from "react-router-dom";
import "../App.css";

export function Landing() {
  return (
    <div className="page">
      <main className="landing">
        <h1>
          AI Second Brain, but the <em>BEST</em>
        </h1>
        <p className="landing-tagline">
          Talk on iOS. Chat on the web. Donna remembers what matters.
        </p>
        <div className="landing-actions">
          <Link to="/app" className="landing-cta">
            Open Donna
          </Link>
          <Link to="/login" className="landing-secondary">
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
