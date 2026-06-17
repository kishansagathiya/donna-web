import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { hasAiDataConsent } from "../services/privacyConsent";
import "../app-shell.css";
import { Spinner } from "../components/ui/Spinner";
import { cn } from "../lib/cn";

function LoadingScreen() {
  return (
    <div className="app-shell flex min-h-dvh flex-col items-center justify-center bg-white">
      <Spinner />
    </div>
  );
}

const shellClassName = cn(
  "app-shell isolate flex min-h-dvh w-full flex-col bg-white text-donna-text",
  "mx-auto max-w-2xl sm:shadow-[0_0_40px_rgba(0,0,0,0.06)]",
);

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
    <div className={shellClassName}>
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
    <div className={shellClassName}>
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
    <div className={shellClassName}>
      <Outlet />
    </div>
  );
}
