import { useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { Button } from "./ui/Button";
import {
  clearDesktopHandoff,
  desktopHandoffLoopback,
  desktopHandoffUrl,
} from "../services/auth";

type Props = {
  session: Session;
};

export function DesktopAuthHandoff({ session }: Props) {
  const navigate = useNavigate();
  const loopback = desktopHandoffLoopback();
  const href = desktopHandoffUrl(session);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <h1 className="text-xl font-semibold text-donna-text">
        Return to Donna Desktop
      </h1>
      <p className="max-w-xs text-sm leading-relaxed text-donna-muted">
        You are signed in. Click below to open the Mac app. Safari may ask to
        allow Donna.
      </p>
      {loopback ? (
        <form
          action={`http://127.0.0.1:${loopback.port}/desktop-auth`}
          method="POST"
          className="w-full"
        >
          <input type="hidden" name="nonce" value={loopback.nonce} />
          <input type="hidden" name="access_token" value={session.access_token} />
          <input
            type="hidden"
            name="refresh_token"
            value={session.refresh_token}
          />
          <button
            type="submit"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-donna bg-donna-primary px-4 py-3.5 text-base font-semibold text-white hover:bg-donna-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring focus-visible:ring-offset-2"
          >
            Open Donna Desktop
          </button>
        </form>
      ) : (
        <a
          href={href}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-donna bg-donna-primary px-4 py-3.5 text-base font-semibold text-white hover:bg-donna-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring focus-visible:ring-offset-2"
        >
          Open Donna Desktop
        </a>
      )}
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          clearDesktopHandoff();
          navigate("/app", { replace: true });
        }}
      >
        Continue in this browser
      </Button>
    </div>
  );
}
