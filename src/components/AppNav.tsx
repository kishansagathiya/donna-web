import { NavLink } from "react-router-dom";
import "./AppNav.css";

export function AppNav() {
  return (
    <nav className="app-nav" aria-label="App sections">
      <NavLink to="/app" end className={({ isActive }) => (isActive ? "active" : "")}>
        Chat
      </NavLink>
      <NavLink
        to="/app/notes"
        className={({ isActive }) => (isActive ? "active" : "")}
      >
        Notes
      </NavLink>
      <NavLink
        to="/app/search"
        className={({ isActive }) => (isActive ? "active" : "")}
      >
        Search
      </NavLink>
    </nav>
  );
}
