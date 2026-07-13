import { Link, Outlet, useLocation } from "react-router-dom";
import { LOGO_LANDING } from "../lib/logo";
import { DonnaLogo } from "./DonnaLogo";
import "./Layout.css";

export function Layout() {
  const { pathname } = useLocation();
  const isLanding = pathname === "/";

  return (
    <div className={isLanding ? "layout layout--eink" : "layout"}>
      <header className="layout-header">
        <Link to="/" className="layout-brand">
          {isLanding ? (
            <img
              className="layout-brand-logo"
              src={LOGO_LANDING}
              alt=""
              width={28}
              height={28}
            />
          ) : (
            <DonnaLogo
              className="layout-brand-logo"
              alt=""
              width={28}
              height={28}
            />
          )}
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
