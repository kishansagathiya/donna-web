import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  Bell,
  CalendarCheck,
  Flame,
  RefreshCw,
  Star,
} from "lucide-react";
import {
  checkDailyNotes,
  formatNoteDate,
  type DailyBriefing,
  type DailyTask,
} from "../services/notesApi";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { Button } from "../components/ui/Button";
import { AlertBanner } from "../components/ui/AlertBanner";
import { cn } from "../lib/cn";

const PRIORITY_LABELS: Record<string, { label: string; className: string }> = {
  do_first: {
    label: "Do first",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  schedule: {
    label: "Schedule",
    className: "bg-amber-50 text-amber-800 border-amber-200",
  },
  delegate: {
    label: "Quick win",
    className: "bg-sky-50 text-sky-800 border-sky-200",
  },
};

function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") {
    return Promise.resolve("denied" as NotificationPermission);
  }
  if (Notification.permission === "granted") {
    return Promise.resolve("granted");
  }
  if (Notification.permission === "denied") {
    return Promise.resolve("denied");
  }
  return Notification.requestPermission();
}

function showDailyNotification(briefing: DailyBriefing) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }

  const taskLines = briefing.tasks
    .slice(0, 5)
    .map((task, i) => `${i + 1}. ${task.title}`)
    .join("\n");

  const body =
    briefing.tasks.length > 0
      ? taskLines + (briefing.tasks.length > 5 ? `\n+${briefing.tasks.length - 5} more…` : "")
      : briefing.summary;

  new Notification("Donna — Today's focus", {
    body,
    tag: `donna-daily-${briefing.date}`,
  });
}

function TaskCard({
  task,
  onSelect,
}: {
  task: DailyTask;
  onSelect: (id: string) => void;
}) {
  const priority = PRIORITY_LABELS[task.priority] ?? PRIORITY_LABELS.schedule;

  return (
    <Card onClick={() => onSelect(task.note_id)} className="cursor-pointer">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-md border px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide",
                priority.className,
              )}
            >
              {priority.label}
            </span>
            {task.is_urgent ? (
              <Flame className="h-4 w-4 text-donna-destructive" aria-label="Urgent" />
            ) : null}
            {task.is_important ? (
              <Star
                className="h-4 w-4 fill-donna-primary text-donna-primary"
                aria-label="Important"
              />
            ) : null}
          </div>
          <p className="mt-2 text-base font-semibold text-donna-text">{task.title}</p>
          {task.preview ? (
            <p className="mt-1 line-clamp-2 text-sm text-donna-muted">{task.preview}</p>
          ) : null}
          {task.reason ? (
            <p className="mt-2 text-xs text-donna-muted italic">{task.reason}</p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export function DailyTasksPage() {
  const navigate = useNavigate();
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof Notification !== "undefined" && Notification.permission === "granted",
  );

  const runCheck = useCallback(async (withNotification = true) => {
    setChecking(true);
    setError(null);
    try {
      const result = await checkDailyNotes();
      setBriefing(result);
      if (withNotification) {
        await requestNotificationPermission().then((perm) => {
          setNotificationsEnabled(perm === "granted");
          if (perm === "granted") {
            showDailyNotification(result);
          }
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to check notes");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void runCheck(false);
  }, [runCheck]);

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotificationsEnabled(perm === "granted");
    if (perm === "granted" && briefing) {
      showDailyNotification(briefing);
    }
  };

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <header className="flex shrink-0 flex-col gap-3 border-b border-donna-border px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
        <div>
          <h1 className="text-xl font-semibold text-donna-text">Today</h1>
          <p className="mt-0.5 text-sm text-donna-muted">{todayLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!notificationsEnabled && typeof Notification !== "undefined" ? (
            <Button
              variant="secondary"
              className="!w-auto gap-2 px-4 py-2.5 text-sm"
              onClick={() => void handleEnableNotifications()}
            >
              <Bell className="h-4 w-4" />
              Enable alerts
            </Button>
          ) : null}
          <Button
            className="!w-auto gap-2 px-4 py-2.5 text-sm"
            onClick={() => void runCheck(true)}
            disabled={checking}
          >
            <RefreshCw className={cn("h-4 w-4", checking && "animate-spin")} />
            {checking ? "Checking…" : "Check my notes"}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto">
        {error ? (
          <AlertBanner className="mx-5 mt-3">{error}</AlertBanner>
        ) : null}

        {checking && !briefing ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <Spinner />
          </div>
        ) : null}

        {briefing?.summary ? (
          <section className="border-b border-donna-border bg-donna-surface/40 px-5 py-4 md:px-8">
            <p className="text-[0.9375rem] leading-relaxed text-donna-text">
              {briefing.summary}
            </p>
          </section>
        ) : null}

        {briefing && briefing.tasks.length === 0 && briefing.outdated.length === 0 && !checking ? (
          <EmptyState
            icon={CalendarCheck}
            title="All clear for today"
            description="Add notes from chat, links, or documents and Donna will build your daily list."
          />
        ) : null}

        {briefing && briefing.tasks.length > 0 ? (
          <section className="px-5 py-4 md:px-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-donna-muted">
              Focus today ({briefing.tasks.length})
            </h2>
            <ul className="flex flex-col gap-3">
              {briefing.tasks.map((task) => (
                <li key={task.note_id}>
                  <TaskCard
                    task={task}
                    onSelect={(id) => navigate(`/app/context/${id}`)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {briefing && briefing.outdated.length > 0 ? (
          <section className="border-t border-donna-border px-5 py-4 md:px-8">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-donna-muted">
              <Archive className="h-4 w-4" />
              May be outdated ({briefing.outdated.length})
            </h2>
            <p className="mb-3 text-xs text-donna-muted">
              These notes might no longer be relevant — review or archive them.
            </p>
            <ul className="flex flex-col gap-3">
              {briefing.outdated.map((note) => (
                <li key={note.note_id}>
                  <Card
                    onClick={() => navigate(`/app/context/${note.note_id}`)}
                    className="cursor-pointer opacity-80 hover:opacity-100"
                  >
                    <p className="text-base font-medium text-donna-text">{note.title}</p>
                    {note.preview ? (
                      <p className="mt-1 line-clamp-2 text-sm text-donna-muted">
                        {note.preview}
                      </p>
                    ) : null}
                    {note.reason ? (
                      <p className="mt-2 text-xs text-donna-muted italic">{note.reason}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-donna-muted">
                      Tap to review
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {briefing?.date ? (
          <p className="px-5 py-4 text-center text-xs text-donna-muted md:px-8">
            Last checked for {formatNoteDate(`${briefing.date}T12:00:00.000Z`)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
