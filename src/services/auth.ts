import { createClient, type Session } from "@supabase/supabase-js";
import {
  APPLE_CLIENT_ID,
  GOOGLE_CLIENT_ID,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "../config";
import { desktopInvoke, isDonnaDesktop } from "../lib/desktop";

const APPLE_SCRIPT_SRC =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let appleScriptPromise: Promise<void> | null = null;
let googleScriptPromise: Promise<void> | null = null;

const desktopClient = typeof window !== "undefined" && isDonnaDesktop();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: !desktopClient,
    persistSession: !desktopClient,
    detectSessionInUrl: !desktopClient,
  },
});

export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function getAccessToken(): Promise<string | null> {
  if (isDonnaDesktop()) {
    try {
      const token = await desktopInvoke<string | null>("get_access_token");
      if (token) return token;
    } catch {
      // fall through to in-memory session
    }
  }
  const session = await getSession();
  return session?.access_token ?? null;
}

/** Email/password login (no public signup — accounts are created by admins). */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<void> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) {
    throw new Error("Enter an email and password.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  });
  if (error) {
    throw new Error(error.message);
  }
  if (isDonnaDesktop() && data.session) {
    await persistDesktopSession(data.session);
  }
}

const DESKTOP_HANDOFF_KEY = "donna.desktop_handoff.v1";
const DESKTOP_HANDOFF_COOKIE = "donna_desktop_handoff";
const DESKTOP_HANDOFF_TTL_MS = 15 * 60 * 1000;

type DesktopHandoffState = {
  t: number;
  port?: string;
  nonce?: string;
};

function hasDesktopHandoffQuery(): boolean {
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(window.location.search);
  return q.get("desktop") === "1" || q.get("desktop_handoff") === "1";
}

function readStoredHandoff(): DesktopHandoffState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DESKTOP_HANDOFF_KEY);
    if (raw) {
      if (raw === "1") return { t: Date.now() };
      const parsed = JSON.parse(raw) as DesktopHandoffState;
      if (parsed && typeof parsed.t === "number") {
        if (Date.now() - parsed.t > DESKTOP_HANDOFF_TTL_MS) {
          clearDesktopHandoff();
          return null;
        }
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  if (typeof document === "undefined") return null;
  for (const part of document.cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name !== DESKTOP_HANDOFF_COOKIE) continue;
    const value = decodeURIComponent(rest.join("="));
    const [flag, port, nonce] = value.split("|");
    if (flag === "1") {
      return {
        t: Date.now(),
        port: port || undefined,
        nonce: nonce || undefined,
      };
    }
  }
  return null;
}

function persistHandoff(state: DesktopHandoffState): void {
  try {
    sessionStorage.setItem(DESKTOP_HANDOFF_KEY, JSON.stringify(state));
  } catch {
    // private mode
  }
  if (typeof document === "undefined") return;
  const maxAge = Math.floor(DESKTOP_HANDOFF_TTL_MS / 1000);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const cookieVal = encodeURIComponent(
    `1|${state.port ?? ""}|${state.nonce ?? ""}`,
  );
  document.cookie = `${DESKTOP_HANDOFF_COOKIE}=${cookieVal}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
}

/** System-browser login for Donna Desktop. Tokens return via loopback or donna://. */
export function rememberDesktopHandoff(): void {
  if (typeof window === "undefined") return;
  const q = new URLSearchParams(window.location.search);
  const existing = readStoredHandoff();
  const fromQuery = hasDesktopHandoffQuery();
  const port = q.get("handoff_port") || existing?.port;
  const nonce = q.get("handoff_nonce") || existing?.nonce;
  if (!fromQuery && !port && !existing) return;
  persistHandoff({
    t: existing?.t ?? Date.now(),
    port,
    nonce,
  });
}

export function clearDesktopHandoff(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(DESKTOP_HANDOFF_KEY);
  } catch {
    // ignore
  }
  if (typeof document !== "undefined") {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${DESKTOP_HANDOFF_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
  }
}

export function isDesktopBrowserHandoff(): boolean {
  if (typeof window === "undefined" || isDonnaDesktop()) return false;
  rememberDesktopHandoff();
  if (hasDesktopHandoffQuery()) return true;
  return readStoredHandoff() != null;
}

export function desktopHandoffLoopback(): { port: string; nonce: string } | null {
  const stored = readStoredHandoff();
  const q =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search);
  const port = q?.get("handoff_port") || stored?.port;
  const nonce = q?.get("handoff_nonce") || stored?.nonce;
  if (!port || !nonce) return null;
  if (!/^\d{1,5}$/.test(port)) return null;
  const n = Number(port);
  if (n < 1 || n > 65535) return null;
  return { port, nonce };
}

export function desktopHandoffUrl(session: Session): string {
  const params = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  return `donna://auth/callback?${params.toString()}`;
}

export function handoffSessionToDesktop(session: Session): void {
  window.location.assign(desktopHandoffUrl(session));
}

async function persistDesktopSession(session: Session): Promise<void> {
  if (!isDonnaDesktop()) return;
  await desktopInvoke("set_session", {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
}

async function tryDesktopAuthStart(provider: "apple" | "google"): Promise<boolean> {
  if (!isDonnaDesktop()) return false;
  await desktopInvoke("auth_start", { provider });
  return true;
}

export async function signInWithApple(): Promise<void> {
  if (await tryDesktopAuthStart("apple")) {
    return;
  }
  if (!APPLE_CLIENT_ID) {
    throw new Error(
      "Apple Sign In is not configured. Set VITE_APPLE_CLIENT_ID to your Apple Services ID.",
    );
  }

  await loadAppleScript();

  const rawNonce = crypto.randomUUID();
  const hashedNonce = await sha256Hex(rawNonce);
  const redirectURI = `${window.location.origin}/login`;

  window.AppleID!.auth.init({
    clientId: APPLE_CLIENT_ID,
    scope: "name email",
    redirectURI,
    usePopup: true,
    nonce: hashedNonce,
  });

  let response: AppleSignInResponse;
  try {
    response = await window.AppleID!.auth.signIn();
  } catch (error) {
    if (isAppleSignInCancellation(error)) {
      return;
    }
    throw error instanceof Error
      ? error
      : new Error("Sign in with Apple failed.");
  }

  const idToken = response.authorization.id_token;
  if (!idToken) {
    throw new Error("No identity token received from Apple.");
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: idToken,
    nonce: rawNonce,
  });

  if (error) {
    if (error.message.toLowerCase().includes("not enabled")) {
      throw new Error(
        "Apple Sign In is not enabled in Supabase. Go to Authentication → Providers → Apple, turn it on, and add your Services ID to Client IDs.",
      );
    }
    if (error.message.toLowerCase().includes("unacceptable audience")) {
      throw new Error(
        `Add ${APPLE_CLIENT_ID} to Supabase → Authentication → Providers → Apple → Client IDs (comma-separated with com.kishansagathiya.donna).`,
      );
    }
    if (error.message.toLowerCase().includes("nonces mismatch")) {
      throw new Error(
        "Apple Sign In nonce verification failed. Contact support or retry sign-in.",
      );
    }
    throw new Error(error.message);
  }

  if (data.session) {
    await persistDesktopSession(data.session);
  }

  const name = response.user?.name;
  if (name) {
    const fullName = [name.firstName, name.middleName, name.lastName]
      .filter(Boolean)
      .join(" ");

    if (fullName) {
      await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          given_name: name.firstName,
          family_name: name.lastName,
        },
      });
    }
  }
}

/** Google Identity Services → Supabase ID token (falls back to OAuth redirect). */
export async function signInWithGoogle(): Promise<void> {
  if (await tryDesktopAuthStart("google")) {
    return;
  }
  if (!GOOGLE_CLIENT_ID) {
    throw new Error(
      "Google Sign In is not configured. Set VITE_GOOGLE_CLIENT_ID to your Google Web Client ID.",
    );
  }

  await loadGoogleScript();

  const rawNonce = crypto.randomUUID();
  const hashedNonce = await sha256Hex(rawNonce);

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const settle = (action: () => void) => {
      if (settled) return;
      settled = true;
      action();
    };

    window.google!.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        void (async () => {
          try {
            if (!response.credential) {
              settle(() =>
                reject(new Error("No identity token received from Google.")),
              );
              return;
            }

            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: response.credential,
              nonce: rawNonce,
            });

            if (error) {
              const message = error.message.toLowerCase();
              if (message.includes("not enabled")) {
                settle(() =>
                  reject(
                    new Error(
                      "Google Sign In is not enabled in Supabase. Go to Authentication → Providers → Google, turn it on, and add your Web Client ID.",
                    ),
                  ),
                );
                return;
              }
              if (message.includes("unacceptable audience")) {
                settle(() =>
                  reject(
                    new Error(
                      `Add ${GOOGLE_CLIENT_ID} to Supabase → Authentication → Providers → Google → Client IDs.`,
                    ),
                  ),
                );
                return;
              }
              if (message.includes("nonces mismatch")) {
                settle(() =>
                  reject(
                    new Error(
                      "Google Sign In nonce verification failed. Retry sign-in, or enable Skip nonce check in Supabase Google provider settings.",
                    ),
                  ),
                );
                return;
              }
              settle(() => reject(new Error(error.message)));
              return;
            }

            if (data.session) {
              await persistDesktopSession(data.session);
            }
            settle(() => resolve());
          } catch (err) {
            settle(() =>
              reject(
                err instanceof Error
                  ? err
                  : new Error("Sign in with Google failed."),
              ),
            );
          }
        })();
      },
      nonce: hashedNonce,
      context: "signin",
      ux_mode: "popup",
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
    });

    window.google!.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        if (isDonnaDesktop()) {
          settle(() =>
            reject(
              new Error(
                "Google sign-in isn’t available in this window. Use Apple or email, or sign in at localhost:5173 in your browser.",
              ),
            ),
          );
          return;
        }
        void supabase.auth
          .signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: `${window.location.origin}/login`,
              queryParams: { prompt: "select_account" },
            },
          })
          .then(({ error }) => {
            if (error) {
              settle(() => reject(new Error(error.message)));
            }
            // Browser navigates to Google; leave promise pending.
          });
        return;
      }

      if (!notification.isDismissedMoment()) {
        return;
      }

      const reason = notification.getDismissedReason();
      if (reason === "credential_returned") {
        return;
      }
      // User closed the prompt — treat like Apple cancel.
      settle(() => resolve());
    });
  });
}

function loadAppleScript(): Promise<void> {
  return loadExternalScript(
    APPLE_SCRIPT_SRC,
    () => Boolean(window.AppleID),
    () => appleScriptPromise,
    (promise) => {
      appleScriptPromise = promise;
    },
    "Failed to load Sign in with Apple.",
  );
}

function loadGoogleScript(): Promise<void> {
  return loadExternalScript(
    GOOGLE_SCRIPT_SRC,
    () => Boolean(window.google?.accounts?.id),
    () => googleScriptPromise,
    (promise) => {
      googleScriptPromise = promise;
    },
    "Failed to load Sign in with Google.",
  );
}

function loadExternalScript(
  src: string,
  isReady: () => boolean,
  getPromise: () => Promise<void> | null,
  setPromise: (promise: Promise<void>) => void,
  errorMessage: string,
): Promise<void> {
  if (isReady()) {
    return Promise.resolve();
  }

  const existingPromise = getPromise();
  if (existingPromise) {
    return existingPromise;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(errorMessage)),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(errorMessage));
    document.head.appendChild(script);
  });

  setPromise(promise);
  return promise;
}

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function isAppleSignInCancellation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { error?: string; message?: string };
  const code = record.error ?? record.message ?? "";
  return (
    code.includes("popup_closed_by_user") ||
    code.includes("user_cancelled") ||
    code.includes("1001")
  );
}

export async function signOut(): Promise<void> {
  if (isDonnaDesktop()) {
    try {
      await desktopInvoke("auth_sign_out");
    } catch {
      // still clear the webview session
    }
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user.id;
  const { error } = await supabase.auth.signOut();
  if (userId) {
    const { clearNotesCacheForUser } = await import(
      "../hooks/NotesQueryProvider"
    );
    await clearNotesCacheForUser(userId);
  }
  if (error) {
    throw new Error(error.message);
  }
}

export function onAuthStateChange(
  callback: (session: Session | null) => void,
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => subscription.unsubscribe();
}
