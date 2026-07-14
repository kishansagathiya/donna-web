import { createClient, type Session } from "@supabase/supabase-js";
import {
  APPLE_CLIENT_ID,
  GOOGLE_CLIENT_ID,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "../config";

const APPLE_SCRIPT_SRC =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let appleScriptPromise: Promise<void> | null = null;
let googleScriptPromise: Promise<void> | null = null;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}

export async function signInWithApple(): Promise<void> {
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

  const { error } = await supabase.auth.signInWithIdToken({
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

            const { error } = await supabase.auth.signInWithIdToken({
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
  const { error } = await supabase.auth.signOut();
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
