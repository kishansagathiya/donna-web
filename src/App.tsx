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
import { AddMemoryPage } from "./pages/AddMemoryPage";
import { SearchContextPage } from "./pages/SearchContextPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AppShell, ConsentShell, LoginShell } from "./pages/AppShell";
import { AppLayout } from "./pages/AppLayout";

function PageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "Donna",
      "/login": "Sign in — Donna",
      "/consent": "Data consent — Donna",
      "/app": "Donna",
      "/app/search": "Search — Donna",
      "/app/profile": "Profile — Donna",
      "/privacy": "Privacy — Donna",
      "/support": "Support — Donna",
    };
    document.title = titles[pathname] ?? "Donna";
  }, [pathname]);

  return null;
}

function LegacyNotesRedirect() {
  const { id } = useParams<{ id?: string }>();
  return <Navigate to={id ? `/app/context/${id}` : "/app"} replace />;
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
            <Route element={<AppLayout />}>
              <Route path="app" element={<ChatApp />} />
              <Route path="app/search" element={<SearchContextPage />} />
              <Route path="app/add" element={<AddMemoryPage />} />
              <Route path="app/profile" element={<ProfilePage />} />
              <Route path="app/context/:id" element={<ContextDetailPage />} />
              <Route path="app/context" element={<Navigate to="/app" replace />} />
              <Route path="app/notes" element={<Navigate to="/app" replace />} />
              <Route path="app/notes/:id" element={<LegacyNotesRedirect />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
