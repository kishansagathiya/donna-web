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
import { NotesQueryProvider } from "./hooks/NotesQueryProvider";
import { ThemeProvider } from "./hooks/useTheme";
import { Layout } from "./components/Layout";
import { Landing } from "./pages/Landing";
import { Privacy } from "./pages/Privacy";
import { PrivateHosting } from "./pages/PrivateHosting";
import { Pitch } from "./pages/Pitch";
import { BlogPage } from "./pages/BlogPage";
import { BlogPostPage } from "./pages/BlogPostPage";
import { Support } from "./pages/Support";
import { Login } from "./pages/Login";
import { Consent } from "./pages/Consent";
import { ChatApp } from "./pages/ChatApp";
import { VoicePage } from "./pages/VoicePage";
import { DailyTasksPage } from "./pages/DailyTasksPage";
import { IntentsInboxPage } from "./pages/IntentsInboxPage";
import { NoteDetailPage } from "./pages/NoteDetailPage";
import { NotesPage } from "./pages/NotesPage";
import { SearchNotesPage } from "./pages/SearchContextPage";
import { AddMemoryPage } from "./pages/AddMemoryPage";
import { ExtractedMemoryPage } from "./pages/ExtractedMemoryPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SkillsPage } from "./pages/SkillsPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { SchedulesPage } from "./pages/SchedulesPage";
import { RemindersPage } from "./pages/RemindersPage";
import {
  AppShell,
  ConsentShell,
  LoginShell,
  SharedShell,
} from "./pages/AppShell";
import { AppLayout } from "./pages/AppLayout";
import { SharedConversationPage } from "./pages/SharedConversationPage";
import { SharedAgentRunPage } from "./pages/SharedAgentRunPage";
import { DesktopDiagnosticsPage } from "./pages/DesktopDiagnosticsPage";
import { AgentRunGraphPage } from "./pages/AgentRunGraphPage";

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
      "/app/voice": "Voice — Donna",
      "/app/notes": "Notes — Donna",
      "/app/notes/search": "Search notes — Donna",
      "/app/actions": "Actions — Donna",
      "/app/today": "Today — Donna",
      "/app/search": "Memory — Donna",
      "/app/profile": "Profile — Donna",
      "/app/desktop": "Desktop — Donna",
      "/app/skills": "Skills — Donna",
      "/app/employees": "Employees — Donna",
      "/app/schedules": "Schedules — Donna",
      "/app/reminders": "Reminders — Donna",
      "/privacy": "Privacy — Donna",
      "/private": "Private — Donna",
      "/pitch": "Pitch — Donna",
      "/support": "Support — Donna",
      "/blog": "Blog — Donna",
    };
    if (pathname.startsWith("/blog/") && pathname.length > "/blog/".length) {
      return;
    }
    if (/^\/app\/agents\/[^/]+\/graph$/.test(pathname)) {
      document.title = "Agent flow — Donna";
      return;
    }
    document.title = titles[pathname] ?? "Donna";
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NotesQueryProvider>
          <PageTitle />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="private" element={<PrivateHosting />} />
            <Route path="pitch" element={<Pitch />} />
            <Route path="blog" element={<BlogPage />} />
            <Route path="blog/:slug" element={<BlogPostPage />} />
            <Route path="support" element={<Support />} />
          </Route>

          <Route element={<SharedShell />}>
            <Route path="share/agent/:token" element={<SharedAgentRunPage />} />
            <Route path="share/:token" element={<SharedConversationPage />} />
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
              <Route path="app/voice" element={<VoicePage />} />
              <Route path="app/actions" element={<IntentsInboxPage />} />
              <Route
                path="app/agents/:runId/graph"
                element={<AgentRunGraphPage />}
              />
              <Route
                path="app/agents"
                element={<Navigate to="/app?mode=agent" replace />}
              />
              <Route path="app/today" element={<DailyTasksPage />} />
              <Route path="app/search" element={<ExtractedMemoryPage />} />
              <Route path="app/add" element={<AddMemoryPage />} />
              <Route path="app/profile" element={<ProfilePage />} />
              <Route path="app/desktop" element={<DesktopDiagnosticsPage />} />
              <Route path="app/skills" element={<SkillsPage />} />
              <Route path="app/employees" element={<EmployeesPage />} />
              <Route path="app/schedules" element={<SchedulesPage />} />
              <Route path="app/reminders" element={<RemindersPage />} />
              <Route path="app/notes" element={<NotesPage />} />
              <Route path="app/notes/search" element={<SearchNotesPage />} />
              <Route path="app/notes/:id" element={<NoteDetailPage />} />
              <Route path="app/context/:id" element={<RedirectContextToNote />} />
              <Route path="app/context" element={<Navigate to="/app/search" replace />} />
            </Route>
          </Route>
        </Routes>
          </NotesQueryProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
