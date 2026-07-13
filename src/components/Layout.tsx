import { Link, Outlet } from "react-router-dom";
import { DonnaLogo } from "./DonnaLogo";
import "./Layout.css";

export function Layout() {
  return (
    <div className="layout">
      <header className="layout-header">
        <Link to="/" className="layout-brand">
          <DonnaLogo
            className="layout-brand-logo"
            surface="marketing"
            alt=""
            width={28}
            height={28}
          />
          Donna
        </Link>
      </header>
      <Outlet />
      <footer className="layout-footer">
        <nav aria-label="Footer">
          <Link to="/privacy">Privacy</Link>
          <span className="layout-footer-sep" aria-hidden="true">
            ·
          </span>
          <Link to="/support">Support</Link>
        </nav>
      </footer>
    </div>
  );
}
