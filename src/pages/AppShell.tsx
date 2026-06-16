import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { hasAiDataConsent } from "../services/privacyConsent";
import "../app-theme.css";
import "./AppShell.css";

function LoadingScreen() {
  return (
    <div className="app-shell app-loading">
      <div className="app-spinner" role="status" aria-label="Loading" />
    </div>
  );
}

export function AppShell() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAiDataConsent()) {
    return <Navigate to="/consent" replace />;
  }

  return (
    <div className="app-shell">
      <Outlet />
    </div>
  );
}

export function ConsentShell() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (hasAiDataConsent()) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="app-shell">
      <Outlet />
    </div>
  );
}

export function LoginShell() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    if (hasAiDataConsent()) {
      return <Navigate to="/app" replace />;
    }
    return <Navigate to="/consent" replace />;
  }

  return (
    <div className="app-shell">
      <Outlet />
    </div>
  );
}
