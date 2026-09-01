import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getSession, onAuthStateChange, supabase } from "../services/auth";
import { desktopInvoke, isDonnaDesktop, onDesktopAuth } from "../lib/desktop";

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  userId: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function applyDesktopAccess(): Promise<boolean> {
      try {
        const access = await desktopInvoke<string | null>("get_access_token");
        if (!access) return false;
        const { data, error } = await supabase.auth.getUser(access);
        if (error || !data.user) return false;
        await supabase.auth.setSession({
          access_token: access,
          refresh_token: "desktop-keychain",
        });
        return true;
      } catch {
        return false;
      }
    }

    async function init() {
      if (isDonnaDesktop()) {
        await applyDesktopAccess();
      }
      const currentSession = await getSession();
      if (mounted) {
        setSession(currentSession);
        setLoading(false);
      }
    }

    void init();

    const unsubscribe = onAuthStateChange((nextSession) => {
      if (mounted) {
        setSession(nextSession);
        setLoading(false);
      }
    });
    const unlistenDesktop = isDonnaDesktop()
      ? onDesktopAuth(() => {
          void applyDesktopAccess().then(async (ok) => {
            if (!ok || !mounted) return;
            const next = await getSession();
            if (mounted) setSession(next);
          });
        })
      : () => {};

    return () => {
      mounted = false;
      unsubscribe();
      unlistenDesktop();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      loading,
      isAuthenticated: !!session,
      userId: session?.user.id ?? null,
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
