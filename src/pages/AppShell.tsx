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
    <div className="app-shell fixed inset-0 flex bg-white">
      <div className="flex h-full w-full flex-col overflow-hidden text-donna-text">
        {children}
      </div>
    </div>
  );
}

function AuthShellFrame({ children }: { children: ReactNode }) {
  useAppRouteBody();

  return (
    <div className="app-shell fixed inset-0 flex items-center justify-center bg-donna-surface">
      <div className="flex h-full w-full max-w-md flex-col overflow-hidden bg-white text-donna-text shadow-sm sm:h-auto sm:min-h-[32rem] sm:rounded-2xl sm:border sm:border-donna-border">
        {children}
      </div>
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
    <AuthShellFrame>
      <Outlet />
    </AuthShellFrame>
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
    <AuthShellFrame>
      <Outlet />
    </AuthShellFrame>
  );
}

/** Public routes that should use the same app chrome/fonts as /app (e.g. shared chats). */
export function SharedShell() {
  return (
    <AppShellFrame>
      <Outlet />
    </AppShellFrame>
  );
}
