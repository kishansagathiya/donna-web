import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarCheck,
  Flame,
  RefreshCw,
  Star,
} from "lucide-react";
import {
  checkDailyNotes,
  type DailyBriefing,
  type DailyTask,
} from "../services/notesApi";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { Button } from "../components/ui/Button";
import { AlertBanner } from "../components/ui/AlertBanner";
import { cn } from "../lib/cn";

const PRIORITY_SECTIONS: Array<{
  key: string;
  title: string;
  subtitle: string;
}> = [
  {
    key: "do_first",
    title: "Do first",
    subtitle: "Urgent and important",
  },
  {
    key: "schedule",
    title: "Schedule",
    subtitle: "Important, not urgent",
  },
  {
    key: "delegate",
    title: "Delegate",
    subtitle: "Urgent, less important",
  },
];

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
  return (
    <Card onClick={() => onSelect(task.note_id)} className="cursor-pointer">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
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
          <p className="mt-1 text-base font-semibold text-donna-text">{task.title}</p>
          {task.preview ? (
            <p className="mt-1 line-clamp-2 text-sm text-donna-muted">{task.preview}</p>
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
      setError(err instanceof Error ? err.message : "Failed to load today");
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

  const tasksByPriority = useMemo(() => {
    const grouped: Record<string, DailyTask[]> = {
      do_first: [],
      schedule: [],
      delegate: [],
    };
    for (const task of briefing?.tasks ?? []) {
      if (!Object.prototype.hasOwnProperty.call(grouped, task.priority)) {
        continue;
      }
      grouped[task.priority].push(task);
    }
    return grouped;
  }, [briefing]);

  const hasTasks = (briefing?.tasks.length ?? 0) > 0;

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
            {checking ? "Refreshing…" : "Refresh"}
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

        {briefing && !hasTasks && !checking ? (
          <EmptyState
            icon={CalendarCheck}
            title="All clear for today"
            description="Mark notes as urgent or important and they will show up here, with do-first items at the top."
          />
        ) : null}

        {PRIORITY_SECTIONS.map((section) => {
          const tasks = tasksByPriority[section.key] ?? [];
          if (tasks.length === 0) {
            return null;
          }
          return (
            <section key={section.key} className="px-5 py-4 md:px-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-donna-muted">
                {section.title} ({tasks.length})
              </h2>
              <p className="mb-3 mt-0.5 text-xs text-donna-muted">{section.subtitle}</p>
              <ul className="flex flex-col gap-3">
                {tasks.map((task) => (
                  <li key={`${section.key}-${task.note_id}`}>
                    <TaskCard
                      task={task}
                      onSelect={(id) => navigate(`/app/notes/${id}`)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
