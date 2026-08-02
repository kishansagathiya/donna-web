import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  displayUserTranscript,
  getSharedConversation,
  type PublicSharedConversation,
} from "../services/conversationsApi";
import { MessageContent } from "../components/MessageContent";
import { DonnaLogo } from "../components/DonnaLogo";
import { Spinner } from "../components/ui/Spinner";
import { cn } from "../lib/cn";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: PublicSharedConversation };

export function SharedConversationPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ status: "error", message: "Missing share link." });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    void getSharedConversation(token)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Could not load shared chat";
        setState({
          status: "error",
          message:
            message === "not_found" || /not found/i.test(message)
              ? "This shared conversation is unavailable. The link may have been revoked."
              : message,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (state.status === "ready") {
      document.title = `${state.data.title} — Donna`;
    } else {
      document.title = "Shared conversation — Donna";
    }
  }, [state]);

  const messages = useMemo(() => {
    if (state.status !== "ready") return [];
    const out: { role: "user" | "assistant"; content: string }[] = [];
    for (const turn of state.data.turns) {
      const user = displayUserTranscript(turn.user_transcript);
      const assistant = turn.assistant_transcript.trim();
      if (user) out.push({ role: "user", content: user });
      if (assistant) out.push({ role: "assistant", content: assistant });
    }
    return out;
  }, [state]);

  return (
    <div className="flex min-h-screen flex-col bg-donna-surface">
      <header className="border-b border-donna-border bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-donna-text no-underline"
          >
            <DonnaLogo className="h-7 w-7" alt="" width={28} height={28} />
            <span className="text-base font-semibold">Donna</span>
          </Link>
          <p className="text-xs text-donna-muted">Shared conversation</p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 py-6">
        {state.status === "loading" ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <Spinner />
          </div>
        ) : null}

        {state.status === "error" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <h1 className="text-xl font-semibold text-donna-text">
              Link unavailable
            </h1>
            <p className="max-w-md text-sm text-donna-muted">{state.message}</p>
            <Link
              to="/"
              className="mt-2 text-sm font-medium text-donna-primary underline-offset-2 hover:underline"
            >
              Go to Donna
            </Link>
          </div>
        ) : null}

        {state.status === "ready" ? (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-donna-text">
                {state.data.title}
              </h1>
              <p className="mt-1 text-sm text-donna-muted">
                Read-only shared chat
              </p>
            </div>

            <div className="flex flex-col gap-3 pb-10">
              {messages.length === 0 ? (
                <p className="text-sm text-donna-muted">
                  This conversation has no messages yet.
                </p>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "min-w-0 rounded-2xl px-4 py-3 text-[0.9375rem] leading-relaxed",
                        message.role === "user"
                          ? "max-w-[85%] break-words rounded-br-md bg-donna-primary text-white"
                          : "w-full overflow-x-auto break-words rounded-bl-md border border-donna-border bg-white text-donna-text",
                      )}
                    >
                      <MessageContent
                        content={message.content}
                        variant={message.role}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
