import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarCheck,
  Check,
  Flame,
  RefreshCw,
  Star,
  Trash2,
} from "lucide-react";
import {
  checkDailyNotes,
  deleteNote,
  updateNote,
  type DailyBriefing,
  type DailyTask,
} from "../services/notesApi";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { Button } from "../components/ui/Button";
import { AlertBanner } from "../components/ui/AlertBanner";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../lib/cn";
import {
  briefingWithoutNotes,
  collapseDailyNoteText,
  dailyTaskText,
  shouldCollapseDailyNote,
  TODAY_CLEAR_FLAGS,
  todayActionError,
} from "../lib/dailyTasks";
import { patchNoteInFeeds, removeNoteFromFeeds } from "../lib/notesCache";
import { notesQueryKeys } from "../lib/notesQueryKeys";
import {
  dismissReminder,
  formatReminderWhen,
  listReminders,
  type Reminder,
} from "../services/remindersApi";

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
  selected,
  busy,
  onToggle,
  onOpen,
  onDone,
  onRemove,
}: {
  task: DailyTask;
  selected: boolean;
  busy: boolean;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onDone: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const text = dailyTaskText(task);
  const long = shouldCollapseDailyNote(text);
  const [expanded, setExpanded] = useState(false);
  const shown = long && !expanded ? collapseDailyNoteText(text) : text;

  return (
    <div
      className={cn(
        "flex w-full items-start gap-3 rounded-donna border bg-white p-3.5 text-left",
        "transition-colors duration-150",
        selected
          ? "border-donna-primary"
          : "border-donna-border hover:border-donna-gold-ring",
      )}
    >
      <label
        className="flex shrink-0 cursor-pointer items-start pt-0.5"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          type="checkbox"
          className="h-4 w-4 accent-donna-primary"
          checked={selected}
          onChange={() => onToggle(task.note_id)}
          aria-label={`Select note: ${task.title || "untitled"}`}
        />
      </label>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-gold-ring focus-visible:ring-offset-2"
          onClick={() => onOpen(task.note_id)}
        >
          <div className="flex flex-wrap items-center gap-2">
            {task.is_urgent ? (
              <Flame
                className="h-4 w-4 fill-current text-donna-destructive"
                aria-label="Urgent"
              />
            ) : null}
            {task.is_important ? (
              <Star
                className="h-4 w-4 fill-donna-primary text-donna-primary"
                aria-label="Important"
              />
            ) : null}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-[0.9375rem] font-normal leading-relaxed text-donna-text">
            {shown}
          </p>
        </button>
        {long ? (
          <button
            type="button"
            className="mt-1 text-sm font-medium text-donna-primary hover:underline"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-donna border border-donna-border px-2.5 py-1 text-sm font-medium text-donna-text hover:border-donna-primary disabled:opacity-50"
            disabled={busy}
            onClick={() => onDone(task.note_id)}
          >
            Done
          </button>
          <button
            type="button"
            className="rounded-donna px-2.5 py-1 text-sm font-medium text-donna-muted hover:text-donna-text disabled:opacity-50"
            disabled={busy}
            onClick={() => onRemove(task.note_id)}
          >
            Remove from Today
          </button>
        </div>
      </div>
    </div>
  );
}

export function DailyTasksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [checking, setChecking] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof Notification !== "undefined" && Notification.permission === "granted",
  );

  const runCheck = useCallback(async (withNotification = true) => {
    setChecking(true);
    setError(null);
    try {
      const [result, openReminders] = await Promise.all([
        checkDailyNotes(),
        listReminders("open").catch(() => [] as Reminder[]),
      ]);
      setBriefing(result);
      setReminders(openReminders);
      setSelected(new Set());
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

  const allNoteIds = useMemo(
    () => (briefing?.tasks ?? []).map((task) => task.note_id),
    [briefing],
  );
  const selectedCount = selected.size;
  const allSelected = allNoteIds.length > 0 && selectedCount === allNoteIds.length;
  const hasTasks = allNoteIds.length > 0;

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(allNoteIds));
  };

  const finishIds = (ids: string[], failed: string[]) => {
    if (ids.length > 0) {
      setBriefing((prev) => (prev ? briefingWithoutNotes(prev, ids) : prev));
    }
    setSelected((prev) => {
      if (failed.length > 0) {
        return new Set(failed);
      }
      const next = new Set(prev);
      for (const id of ids) {
        next.delete(id);
      }
      return next;
    });
  };

  const dismissFromToday = async (
    ids: string[],
    action: "done" | "remove",
  ) => {
    if (ids.length === 0 || !briefing) {
      return;
    }
    setActing(true);
    setError(null);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => updateNote(id, TODAY_CLEAR_FLAGS)),
      );
      const ok: string[] = [];
      const failed: string[] = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          ok.push(ids[index]);
        } else {
          failed.push(ids[index]);
        }
      });

      if (ok.length > 0 && userId) {
        for (const id of ok) {
          patchNoteInFeeds(queryClient, userId, id, { ...TODAY_CLEAR_FLAGS });
        }
        void queryClient.invalidateQueries({
          queryKey: notesQueryKeys.feeds(userId),
        });
      }

      finishIds(ok, failed);
      if (failed.length > 0) {
        setError(todayActionError(action, ok.length, failed.length));
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : action === "done"
            ? "Failed to mark notes done"
            : "Failed to remove notes from Today",
      );
    } finally {
      setActing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCount === 0 || !briefing) {
      return;
    }
    const ids = [...selected];
    const label = ids.length === 1 ? "this note" : `${ids.length} notes`;
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) {
      return;
    }

    setActing(true);
    setError(null);
    try {
      const results = await Promise.allSettled(ids.map((id) => deleteNote(id)));
      const deleted: string[] = [];
      const failed: string[] = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          deleted.push(ids[index]);
        } else {
          failed.push(ids[index]);
        }
      });

      if (deleted.length > 0 && userId) {
        for (const id of deleted) {
          removeNoteFromFeeds(queryClient, userId, id);
          queryClient.removeQueries({
            queryKey: notesQueryKeys.detail(userId, id),
          });
        }
        void queryClient.invalidateQueries({
          queryKey: notesQueryKeys.feeds(userId),
        });
        void queryClient.invalidateQueries({
          queryKey: notesQueryKeys.tags(userId),
        });
      }

      finishIds(deleted, failed);
      if (failed.length > 0) {
        setError(todayActionError("delete", deleted.length, failed.length));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete notes");
    } finally {
      setActing(false);
    }
  };

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

        {reminders.length > 0 ? (
          <section className="border-b border-donna-border px-5 py-4 md:px-8">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-donna-muted">
                Reminders
              </h2>
              <button
                type="button"
                className="text-xs font-medium text-donna-primary"
                onClick={() => navigate("/app/reminders")}
              >
                View all
              </button>
            </div>
            <div className="space-y-2">
              {reminders.slice(0, 4).map((rem) => (
                <div
                  key={rem.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-donna-border bg-white px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-donna-text">
                      {rem.title}
                    </p>
                    <p className="text-xs text-donna-muted">
                      {formatReminderWhen(rem.due_at, rem.timezone)}
                      {rem.status === "fired" ? " · due now" : ""}
                    </p>
                  </div>
                  {rem.status === "fired" ? (
                    <Button
                      variant="secondary"
                      className="!w-auto px-2.5 py-1 text-xs"
                      disabled={acting}
                      onClick={() => {
                        setActing(true);
                        void dismissReminder(rem.id)
                          .then(() =>
                            setReminders((prev) => prev.filter((r) => r.id !== rem.id)),
                          )
                          .catch((err: unknown) =>
                            setError(err instanceof Error ? err.message : "Failed"),
                          )
                          .finally(() => setActing(false));
                      }}
                    >
                      Done
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
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

        {hasTasks ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-donna-border px-5 py-3 md:px-8">
            <Button
              variant="secondary"
              className="!w-auto px-3 py-2 text-sm"
              onClick={toggleSelectAll}
            >
              {allSelected ? "Clear selection" : "Select all"}
            </Button>
            <Button
              variant="secondary"
              className="!w-auto gap-2 px-3 py-2 text-sm"
              onClick={() => void dismissFromToday([...selected], "done")}
              disabled={selectedCount === 0 || acting}
            >
              <Check className="h-4 w-4" />
              {acting
                ? "Updating…"
                : selectedCount > 0
                  ? `Mark done (${selectedCount})`
                  : "Mark done"}
            </Button>
            <Button
              variant="secondary"
              className="!w-auto px-3 py-2 text-sm"
              onClick={() => void dismissFromToday([...selected], "remove")}
              disabled={selectedCount === 0 || acting}
            >
              {selectedCount > 0
                ? `Remove from Today (${selectedCount})`
                : "Remove from Today"}
            </Button>
            <Button
              variant="destructive"
              className="!w-auto gap-2 px-3 py-2 text-sm"
              onClick={() => void handleBulkDelete()}
              disabled={selectedCount === 0 || acting}
            >
              <Trash2 className="h-4 w-4" />
              {selectedCount > 0 ? `Delete ${selectedCount}` : "Delete"}
            </Button>
            {selectedCount > 0 ? (
              <span className="text-sm text-donna-muted">
                {selectedCount} selected
              </span>
            ) : (
              <span className="text-sm text-donna-muted">
                Mark done or remove from Today — notes stay in Notes
              </span>
            )}
          </div>
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
                      selected={selected.has(task.note_id)}
                      busy={acting}
                      onToggle={toggleSelected}
                      onOpen={(id) => navigate(`/app/notes/${id}`)}
                      onDone={(id) => void dismissFromToday([id], "done")}
                      onRemove={(id) => void dismissFromToday([id], "remove")}
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
