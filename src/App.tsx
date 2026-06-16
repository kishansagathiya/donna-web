import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { Layout } from "./components/Layout";
import { Landing } from "./pages/Landing";
import { Privacy } from "./pages/Privacy";
import { Support } from "./pages/Support";
import { Login } from "./pages/Login";
import { Consent } from "./pages/Consent";
import { ChatApp } from "./pages/ChatApp";
import { AppShell, ConsentShell, LoginShell } from "./pages/AppShell";

function PageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "Donna",
      "/login": "Sign in — Donna",
      "/consent": "Data consent — Donna",
      "/app": "Donna",
      "/privacy": "Privacy — Donna",
      "/support": "Support — Donna",
    };
    document.title = titles[pathname] ?? "Donna";
  }, [pathname]);

  return null;
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
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
