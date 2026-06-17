import { NavLink } from "react-router-dom";
import "./AppNav.css";

export function AppNav() {
  return (
    <nav className="app-nav" aria-label="App sections">
      <NavLink to="/app" end className={({ isActive }) => (isActive ? "active" : "")}>
        Chat
      </NavLink>
      <NavLink
        to="/app/context"
        className={({ isActive }) => (isActive ? "active" : "")}
      >
        Context
      </NavLink>
    </nav>
  );
}
