import { createClient, type Session } from "@supabase/supabase-js";
import { APPLE_CLIENT_ID, SUPABASE_ANON_KEY, SUPABASE_URL } from "../config";

const APPLE_SCRIPT_SRC =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

let appleScriptPromise: Promise<void> | null = null;

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

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) {
    throw new Error(error.message);
  }
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

function loadAppleScript(): Promise<void> {
  if (window.AppleID) {
    return Promise.resolve();
  }

  if (!appleScriptPromise) {
    appleScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${APPLE_SCRIPT_SRC}"]`,
      );
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("Failed to load Sign in with Apple.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.src = APPLE_SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Failed to load Sign in with Apple."));
      document.head.appendChild(script);
    });
  }

  return appleScriptPromise;
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

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });
  if (error) {
    throw new Error(error.message);
  }
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
