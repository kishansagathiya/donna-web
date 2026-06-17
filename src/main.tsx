function isAppRoute(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/consent" ||
    pathname.startsWith("/app")
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

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
