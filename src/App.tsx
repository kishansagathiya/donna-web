import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { Layout } from "./components/Layout";
import { Landing } from "./pages/Landing";
import { Privacy } from "./pages/Privacy";
import { Support } from "./pages/Support";
import { Login } from "./pages/Login";
import { Consent } from "./pages/Consent";
import { ChatApp } from "./pages/ChatApp";
import { ContextDetailPage } from "./pages/ContextDetailPage";
import { ContextPage } from "./pages/ContextPage";
import { AppShell, ConsentShell, LoginShell } from "./pages/AppShell";

function PageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "Donna",
      "/login": "Sign in — Donna",
      "/consent": "Data consent — Donna",
      "/app": "Donna",
      "/app/context": "Context — Donna",
      "/privacy": "Privacy — Donna",
      "/support": "Support — Donna",
    };
    document.title = titles[pathname] ?? "Donna";
  }, [pathname]);

  return null;
}

function LegacyNotesRedirect() {
  const { id } = useParams<{ id?: string }>();
  return <Navigate to={id ? `/app/context/${id}` : "/app/context"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PageTitle />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="support" element={<Support />} />
          </Route>

          <Route element={<LoginShell />}>
            <Route path="login" element={<Login />} />
          </Route>

          <Route element={<ConsentShell />}>
            <Route path="consent" element={<Consent />} />
          </Route>

          <Route element={<AppShell />}>
            <Route path="app" element={<ChatApp />} />
            <Route path="app/context" element={<ContextPage />} />
            <Route path="app/context/:id" element={<ContextDetailPage />} />
            <Route path="app/notes" element={<Navigate to="/app/context" replace />} />
            <Route path="app/notes/:id" element={<LegacyNotesRedirect />} />
            <Route path="app/search" element={<Navigate to="/app/context" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
