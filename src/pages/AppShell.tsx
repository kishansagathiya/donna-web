import { useEffect, type ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { hasAiDataConsent } from "../services/privacyConsent";
import "../app-shell.css";
import { Spinner } from "../components/ui/Spinner";

function useAppRouteBody() {
  useEffect(() => {
    document.documentElement.classList.add("app-route");
    document.body.classList.add("app-route");
    return () => {
      document.documentElement.classList.remove("app-route");
      document.body.classList.remove("app-route");
    };
  }, []);
}

function AppShellFrame({ children }: { children: ReactNode }) {
  useAppRouteBody();

  return (
    <div className="app-shell fixed inset-0 flex flex-col overflow-hidden bg-white text-donna-text">
      {children}
    </div>
  );
}

function LoadingScreen() {
  useAppRouteBody();

  return (
    <div className="app-shell fixed inset-0 flex items-center justify-center bg-white">
      <Spinner />
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
    <AppShellFrame>
      <Outlet />
    </AppShellFrame>
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
    <AppShellFrame>
      <Outlet />
    </AppShellFrame>
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
    <AppShellFrame>
      <Outlet />
    </AppShellFrame>
  );
}
