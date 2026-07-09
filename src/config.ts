/** Supabase project URL */
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ??
  "https://eghhxjlhautsikejocze.supabase.co";

/** Supabase publishable key — safe to embed in the client */
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  "sb_publishable_sFpDOcCxs9aKq283JIQPBg_eZRIpUTB";

/** Donna backend (REST). Empty string uses same origin (Vite dev proxy). */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? "" : "https://donna-server-go-production.up.railway.app");

export const PRIVACY_POLICY_URL =
  import.meta.env.VITE_PRIVACY_POLICY_URL ?? "/privacy";

/** App Store listing for the Donna iOS app. */
export const APP_STORE_URL =
  import.meta.env.VITE_APP_STORE_URL ??
  "https://apps.apple.com/us/app/donna-best-ai-second-brain/id6776987368";

/** Apple Services ID for Sign in with Apple JS (web). */
export const APPLE_CLIENT_ID =
  import.meta.env.VITE_APPLE_CLIENT_ID ?? "com.kishansagathiya.donna.web";

export const AI_DATA_CONSENT_KEY = "donna.ai_data_consent.v1";

export const THEME_STORAGE_KEY = "donna.app_theme.v1";

const PRODUCTION_VOICE_WS_URL =
  "wss://donna-server-go-production.up.railway.app/voice";

function resolveVoiceWsUrl(): string {
  if (import.meta.env.VITE_VOICE_WS_URL) {
    return import.meta.env.VITE_VOICE_WS_URL;
  }
  if (import.meta.env.DEV) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/voice`;
  }
  return PRODUCTION_VOICE_WS_URL;
}

export const VOICE_WS_URL = resolveVoiceWsUrl();

export const AUDIO_SAMPLE_RATE = 16_000;
export const AUDIO_CHANNELS = 1;
export const VAD_SILENCE_MS = 350;
export const VAD_ENERGY_THRESHOLD = 0.02;
export const VAD_MIN_SPEECH_MS = 400;
