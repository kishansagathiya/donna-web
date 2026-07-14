# donna-web

Landing page and web app for Donna.

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Build for production with `npm run build`.

## Auth (Supabase)

Donna uses Supabase Auth. The login page offers **Sign in with Apple** (popup + ID token) and **Sign in with Google** (Google Identity Services → ID token, with OAuth redirect fallback).

### Google

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an OAuth client of type **Web application**.
2. Add Authorized JavaScript origins:
   - `https://donna-web-production-3d4a.up.railway.app`
   - `http://localhost:5173`
3. Add Authorized redirect URI: `https://eghhxjlhautsikejocze.supabase.co/auth/v1/callback`
4. In Supabase → **Authentication → Providers → Google**, enable Google and paste the Client ID + Client Secret.
5. In Supabase → **Authentication → URL Configuration**, include:
   - `https://donna-web-production-3d4a.up.railway.app/login`
   - `http://localhost:5173/login`
6. Set `VITE_GOOGLE_CLIENT_ID` (defaults to the Donna Web Client ID in `src/config.ts`).

### Apple

See root [README](../README.md) and set `VITE_APPLE_CLIENT_ID` (Services ID) if overriding the default.
