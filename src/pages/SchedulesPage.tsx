import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, Clock, Pause, Play, Plus } from "lucide-react";
import { AppPageHeader } from "../components/ui/AppPageHeader";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { TextArea } from "../components/ui/TextArea";
import { TextInput } from "../components/ui/TextInput";
import {
  archiveSchedule,
  cadenceLabel,
  createSchedule,
  listSchedules,
  pauseSchedule,
  resumeSchedule,
  runScheduleNow,
  type ScheduledGoal,
} from "../services/schedulesApi";

type Draft = {
  title: string;
  goal: string;
  cadence_minutes: string;
};

const emptyDraft: Draft = {
  title: "",
  goal: "",
  cadence_minutes: "1440",
};

const cadenceOptions = [
  { value: "0", label: "Once" },
  { value: "60", label: "Hourly" },
  { value: "1440", label: "Daily" },
  { value: "10080", label: "Weekly" },
];

const statusLabel: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  completed: "Done",
  archived: "Archived",
};

export function SchedulesPage() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<ScheduledGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSchedules(await listSchedules());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load schedules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, 8000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const openCreate = () => {
    setDraft(emptyDraft);
    setCreateOpen(true);
  };

  const create = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const cadence = Number.parseInt(draft.cadence_minutes || "1440", 10);
      await createSchedule({
        title: draft.title.trim(),
        goal: draft.goal.trim(),
        cadence_minutes: Number.isFinite(cadence) ? cadence : 1440,
      });
      setCreateOpen(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create schedule");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (
    id: string,
    action: "pause" | "resume" | "archive" | "run",
  ) => {
    setBusyId(id);
    try {
      if (action === "pause") await pauseSchedule(id);
      else if (action === "resume") await resumeSchedule(id);
      else if (action === "run") await runScheduleNow(id);
      else await archiveSchedule(id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const openRun = (sch: ScheduledGoal) => {
    if (sch.current_agent_run_id) {
      navigate(`/app?mode=agent&run=${encodeURIComponent(sch.current_agent_run_id)}`);
      return;
    }
    navigate("/app?mode=agent");
  };

  const grouped = useMemo(() => {
    const active = schedules.filter((s) => s.status === "active" || s.status === "paused");
    const done = schedules.filter((s) => s.status === "completed" || s.status === "archived");
    return { active, done };
  }, [schedules]);

  return (
    <div className="flex min-h-dvh flex-col bg-donna-bg">
      <AppPageHeader
        title="Schedules"
        onBack={() => navigate("/app")}
        action={
          <Button onClick={openCreate} className="px-3 py-1.5 text-sm">
            <span className="inline-flex items-center gap-1">
              <Plus className="h-4 w-4" /> New
            </span>
          </Button>
        }
      />

      {error ? (
        <p className="px-4 pt-3 text-sm text-donna-destructive md:px-6">{error}</p>
      ) : null}

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner />
        </div>
      ) : schedules.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No scheduled goals yet"
          description="Run an agent on a cadence — daily brief, watch a price, weekly research — while your phone is locked. You only approve irreversible steps."
        />
      ) : (
        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4 md:px-6">
          {grouped.active.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-donna-muted">
                Upcoming
              </h2>
              {grouped.active.map((sch) => (
                <ScheduleCard
                  key={sch.id}
                  schedule={sch}
                  busy={busyId === sch.id}
                  onOpen={() => openRun(sch)}
                  onPause={() => void runAction(sch.id, "pause")}
                  onResume={() => void runAction(sch.id, "resume")}
                  onRun={() => void runAction(sch.id, "run")}
                  onArchive={() => void runAction(sch.id, "archive")}
                />
              ))}
            </section>
          ) : null}
          {grouped.done.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-donna-muted">
                Completed
              </h2>
              {grouped.done.map((sch) => (
                <ScheduleCard
                  key={sch.id}
                  schedule={sch}
                  busy={busyId === sch.id}
                  onOpen={() => openRun(sch)}
                  onArchive={() => void runAction(sch.id, "archive")}
                />
              ))}
            </section>
          ) : null}
        </div>
      )}

      {createOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-0 md:items-center md:p-6">
          <div className="max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-donna-border bg-white p-4 md:rounded-2xl md:p-6">
            <h2 className="mb-1 text-lg font-semibold text-donna-text">New scheduled goal</h2>
            <p className="mb-4 text-sm text-donna-muted">
              Donna runs this on cloud. One-shot goals complete after the first run.
            </p>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-donna-muted">Title</span>
                <TextInput
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="Monday brief"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-donna-muted">Goal</span>
                <TextArea
                  rows={4}
                  value={draft.goal}
                  onChange={(e) => setDraft((d) => ({ ...d, goal: e.target.value }))}
                  placeholder="Summarize what I should know this week from my notes and calendar"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-donna-muted">Cadence</span>
                <select
                  value={draft.cadence_minutes}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, cadence_minutes: e.target.value }))
                  }
                  className="w-full rounded-xl border border-donna-border bg-white px-3 py-2 text-sm text-donna-text"
                >
                  {cadenceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => void create()}
                disabled={saving || !draft.title.trim() || !draft.goal.trim()}
              >
                {saving ? "Creating…" : "Schedule"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ScheduleCard({
  schedule,
  busy,
  onOpen,
  onPause,
  onResume,
  onRun,
  onArchive,
}: {
  schedule: ScheduledGoal;
  busy?: boolean;
  onOpen: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onRun?: () => void;
  onArchive?: () => void;
}) {
  const working = Boolean(schedule.current_agent_run_id);
  return (
    <article className="rounded-2xl border border-donna-border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-donna-text">{schedule.title}</h3>
            <span className="shrink-0 rounded-full bg-donna-surface px-2 py-0.5 text-[11px] font-medium text-donna-muted">
              {statusLabel[schedule.status] ?? schedule.status}
            </span>
            {working ? (
              <span className="shrink-0 rounded-full bg-donna-primary-light px-2 py-0.5 text-[11px] font-medium text-donna-primary">
                Running
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-donna-text">{schedule.goal}</p>
          {schedule.last_summary ? (
            <p className="mt-2 line-clamp-3 text-xs text-donna-muted">
              Last: {schedule.last_summary}
            </p>
          ) : (
            <p className="mt-2 text-xs text-donna-muted">No runs yet.</p>
          )}
          <p className="mt-2 text-[11px] text-donna-muted/80">
            {schedule.run_count} run{schedule.run_count === 1 ? "" : "s"}
            {" · "}
            {cadenceLabel(schedule.cadence_minutes)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          className="px-3 py-1.5 text-sm"
          onClick={onOpen}
          disabled={!schedule.current_agent_run_id}
        >
          {schedule.current_agent_run_id ? "Open run" : "Idle"}
        </Button>
        {schedule.status === "active" && onRun ? (
          <Button
            variant="ghost"
            className="px-3 py-1.5 text-sm"
            disabled={busy || working}
            onClick={onRun}
          >
            Run now
          </Button>
        ) : null}
        {schedule.status === "active" && onPause ? (
          <Button
            variant="ghost"
            className="px-3 py-1.5 text-sm"
            disabled={busy}
            onClick={onPause}
          >
            <span className="inline-flex items-center gap-1">
              <Pause className="h-3.5 w-3.5" /> Pause
            </span>
          </Button>
        ) : null}
        {schedule.status === "paused" && onResume ? (
          <Button
            variant="ghost"
            className="px-3 py-1.5 text-sm"
            disabled={busy}
            onClick={onResume}
          >
            <span className="inline-flex items-center gap-1">
              <Play className="h-3.5 w-3.5" /> Resume
            </span>
          </Button>
        ) : null}
        {schedule.status !== "archived" && onArchive ? (
          <Button
            variant="ghost"
            className="px-3 py-1.5 text-sm hover:text-donna-destructive"
            disabled={busy}
            onClick={onArchive}
          >
            <span className="inline-flex items-center gap-1">
              <Archive className="h-3.5 w-3.5" /> Archive
            </span>
          </Button>
        ) : null}
      </div>
    </article>
  );
}
