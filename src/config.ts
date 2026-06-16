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

export const AI_DATA_CONSENT_KEY = "donna.ai_data_consent.v1";
