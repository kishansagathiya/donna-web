import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DonnaLogo } from "../components/DonnaLogo";
import { MessageContent } from "../components/MessageContent";
import { Spinner } from "../components/ui/Spinner";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../lib/cn";
import {
  getSharedAgentRun,
  type PublicSharedAgentRun,
} from "../services/agentsApi";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: PublicSharedAgentRun };

function titleFromGoal(goal: string): string {
  const trimmed = goal.trim();
  if (trimmed.length <= 72) return trimmed || "Shared agent";
  return `${trimmed.slice(0, 72).trimEnd()}…`;
}

export function SharedAgentRunPage() {
  const { token } = useParams<{ token: string }>();
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ status: "error", message: "Missing share link." });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    void getSharedAgentRun(token)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Could not load shared agent";
        setState({
          status: "error",
          message:
            message === "not_found" || /not found/i.test(message)
              ? "This shared agent is unavailable. The link may have been revoked."
              : message,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (state.status === "ready") {
      document.title = `${titleFromGoal(state.data.goal)} — Donna`;
    } else {
      document.title = "Shared agent — Donna";
    }
  }, [state]);

  const messages = useMemo(() => {
    if (state.status !== "ready") return [];
    const out: { role: "user" | "assistant"; content: string }[] = [];
    for (const turn of state.data.turns) {
      const prompt = turn.prompt.trim();
      const output = (turn.output.text ?? "").trim();
      if (prompt) out.push({ role: "user", content: prompt });
      if (output && turn.output.kind !== "none") {
        out.push({ role: "assistant", content: output });
      }
    }
    return out;
  }, [state]);

  const title =
    state.status === "ready" ? titleFromGoal(state.data.goal) : "Shared agent";
  const openHref = isAuthenticated ? "/app?mode=agent" : "/login";
  const inProgress =
    state.status === "ready" &&
    (state.data.status === "running" || state.data.status === "queued");

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between gap-3 px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 text-donna-text no-underline"
            aria-label="Donna home"
          >
            <DonnaLogo
              className="h-8 w-8 rounded-xl object-contain"
              alt=""
              width={32}
              height={32}
            />
            <span className="hidden text-sm font-semibold text-donna-primary sm:inline">
              Donna
            </span>
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-donna-text">
              {title}
            </h1>
            <p className="text-xs text-donna-muted">
              Shared agent · read-only
              {inProgress ? " · in progress" : ""}
            </p>
          </div>
        </div>
        <Link
          to={openHref}
          className={cn(
            "shrink-0 rounded-xl bg-donna-primary px-3.5 py-2 text-sm font-semibold text-white",
            "transition-colors hover:bg-donna-primary-hover",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring focus-visible:ring-offset-2",
          )}
        >
              {isAuthenticated ? "Open in Donna" : "Open Donna"}
        </Link>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {state.status === "loading" ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner />
          </div>
        ) : null}

        {state.status === "error" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center">
            <h2 className="text-lg font-semibold text-donna-text">
              Link unavailable
            </h2>
            <p className="max-w-md text-sm text-donna-muted">{state.message}</p>
            <Link
              to={openHref}
              className="mt-1 text-sm font-medium text-donna-primary underline-offset-2 hover:underline"
            >
              {isAuthenticated ? "Back to Donna" : "Go to Donna"}
            </Link>
          </div>
        ) : null}

        {state.status === "ready" ? (
          <div
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4 md:px-8"
            role="log"
            aria-label="Shared agent"
          >
            {messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-donna-muted">
                This agent has no prompt or output yet.
              </p>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={cn(
                    "flex flex-col",
                    message.role === "user" ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "min-w-0 rounded-2xl px-4 py-3 text-[0.9375rem] leading-relaxed",
                      message.role === "user"
                        ? "max-w-[85%] break-words rounded-br-md bg-donna-primary text-white"
                        : "w-full overflow-x-auto break-words rounded-bl-md border border-donna-border bg-donna-surface text-donna-text",
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
        ) : null}
      </div>

      {state.status === "ready" ? (
        <footer className="shrink-0 border-t border-donna-border bg-white px-5 py-3 md:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-donna-muted">
              You&apos;re viewing a shared agent. Only the prompt and output are
              shown.
            </p>
            <Link
              to={openHref}
              className="text-sm font-medium text-donna-primary underline-offset-2 hover:underline"
            >
              {isAuthenticated ? "Continue in Donna" : "Start with Donna"}
            </Link>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
