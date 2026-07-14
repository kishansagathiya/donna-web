import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { Layout } from "./components/Layout";
import { Landing } from "./pages/Landing";
import { Privacy } from "./pages/Privacy";
import { Support } from "./pages/Support";
import { Login } from "./pages/Login";
import { Consent } from "./pages/Consent";
import { ChatApp } from "./pages/ChatApp";
import { DailyTasksPage } from "./pages/DailyTasksPage";
import { NoteDetailPage } from "./pages/NoteDetailPage";
import { NotesPage } from "./pages/NotesPage";
import { SearchNotesPage } from "./pages/SearchContextPage";
import { AddMemoryPage } from "./pages/AddMemoryPage";
import { ExtractedMemoryPage } from "./pages/ExtractedMemoryPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AppShell, ConsentShell, LoginShell } from "./pages/AppShell";
import { AppLayout } from "./pages/AppLayout";

function RedirectContextToNote() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/app/notes/${id}` : "/app/notes"} replace />;
}

function PageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "Donna",
      "/login": "Sign in — Donna",
      "/consent": "Data consent — Donna",
      "/app": "Donna",
      "/app/notes": "Notes — Donna",
      "/app/notes/search": "Search notes — Donna",
      "/app/today": "Today — Donna",
      "/app/search": "Memory — Donna",
      "/app/profile": "Profile — Donna",
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
      <ThemeProvider>
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
              <Route path="app/today" element={<DailyTasksPage />} />
              <Route path="app/search" element={<ExtractedMemoryPage />} />
              <Route path="app/add" element={<AddMemoryPage />} />
              <Route path="app/profile" element={<ProfilePage />} />
              <Route path="app/notes" element={<NotesPage />} />
              <Route path="app/notes/search" element={<SearchNotesPage />} />
              <Route path="app/notes/:id" element={<NoteDetailPage />} />
              <Route path="app/context/:id" element={<RedirectContextToNote />} />
              <Route path="app/context" element={<Navigate to="/app/search" replace />} />
            </Route>
          </Route>
        </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
