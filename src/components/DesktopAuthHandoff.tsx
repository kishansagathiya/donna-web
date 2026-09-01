import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Button } from "./ui/Button";
import { Spinner } from "./ui/Spinner";
import { handoffSessionToDesktop } from "../services/auth";

type Props = {
  session: Session;
};

export function DesktopAuthHandoff({ session }: Props) {
  const [tried, setTried] = useState(false);

  useEffect(() => {
    handoffSessionToDesktop(session);
    setTried(true);
  }, [session]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <Spinner className="h-6 w-6 border-donna-border border-t-donna-text" />
      <h1 className="text-xl font-semibold text-donna-text">
        Return to Donna Desktop
      </h1>
      <p className="max-w-xs text-sm leading-relaxed text-donna-muted">
        {tried
          ? "If Donna didn’t open, click the button below. Your browser may ask for permission."
          : "Opening Donna Desktop…"}
      </p>
      <Button
        type="button"
        onClick={() => handoffSessionToDesktop(session)}
      >
        Open Donna Desktop
      </Button>
    </div>
  );
}
