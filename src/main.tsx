function isAppRoute(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/consent" ||
    pathname.startsWith("/app") ||
    pathname.startsWith("/share/")
  );
}

function applyAppRouteClass() {
  if (!isAppRoute(window.location.pathname)) {
    return;
  }
  document.documentElement.classList.add("app-route");
  document.body.classList.add("app-route");
}

applyAppRouteClass();

import { initTheme } from "./lib/theme";
initTheme();

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initErrorReporting } from "./services/errorReporting";
import "./index.css";

initErrorReporting();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
