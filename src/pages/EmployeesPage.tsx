import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Pause, Play, Plus, Archive } from "lucide-react";
import { AppPageHeader } from "../components/ui/AppPageHeader";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { TextArea } from "../components/ui/TextArea";
import { TextInput } from "../components/ui/TextInput";
import {
  archiveEmployee,
  hireEmployee,
  listEmployees,
  pauseEmployee,
  resumeEmployee,
  type AIEmployee,
} from "../services/employeesApi";

type Draft = {
  name: string;
  role: string;
  goal: string;
  cadence_minutes: string;
};

const emptyDraft: Draft = {
  name: "",
  role: "",
  goal: "",
  cadence_minutes: "0",
};

const statusLabel: Record<string, string> = {
  active: "Working",
  paused: "Paused",
  completed: "Done",
  archived: "Archived",
};

export function EmployeesPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<AIEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hireOpen, setHireOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setEmployees(await listEmployees());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load employees");
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

  const openHire = () => {
    setDraft(emptyDraft);
    setHireOpen(true);
  };

  const hire = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const cadence = Number.parseInt(draft.cadence_minutes || "0", 10);
      await hireEmployee({
        name: draft.name.trim(),
        role: draft.role.trim() || undefined,
        goal: draft.goal.trim(),
        cadence_minutes: Number.isFinite(cadence) ? cadence : 0,
      });
      setHireOpen(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not hire employee");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (id: string, action: "pause" | "resume" | "archive") => {
    setBusyId(id);
    try {
      if (action === "pause") await pauseEmployee(id);
      else if (action === "resume") await resumeEmployee(id);
      else await archiveEmployee(id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const openShift = (emp: AIEmployee) => {
    if (emp.current_agent_run_id) {
      navigate(`/app?mode=agent&run=${encodeURIComponent(emp.current_agent_run_id)}`);
      return;
    }
    navigate("/app?mode=agent");
  };

  const grouped = useMemo(() => {
    const active = employees.filter((e) => e.status === "active" || e.status === "paused");
    const done = employees.filter((e) => e.status === "completed" || e.status === "archived");
    return { active, done };
  }, [employees]);

  return (
    <div className="flex min-h-dvh flex-col bg-donna-bg">
      <AppPageHeader
        title="Employees"
        onBack={() => navigate("/app")}
        action={
          <Button onClick={openHire} className="px-3 py-1.5 text-sm">
            <span className="inline-flex items-center gap-1">
              <Plus className="h-4 w-4" /> Hire
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
      ) : employees.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No AI employees yet"
          description="Hire someone with a goal — they keep working in the background until it's done. You only need to approve irreversible steps."
        />
      ) : (
        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4 md:px-6">
          {grouped.active.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-donna-muted">
                Team
              </h2>
              {grouped.active.map((emp) => (
                <EmployeeCard
                  key={emp.id}
                  employee={emp}
                  busy={busyId === emp.id}
                  onOpenShift={() => openShift(emp)}
                  onPause={() => void runAction(emp.id, "pause")}
                  onResume={() => void runAction(emp.id, "resume")}
                  onArchive={() => void runAction(emp.id, "archive")}
                />
              ))}
            </section>
          ) : null}
          {grouped.done.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-donna-muted">
                Completed
              </h2>
              {grouped.done.map((emp) => (
                <EmployeeCard
                  key={emp.id}
                  employee={emp}
                  busy={busyId === emp.id}
                  onOpenShift={() => openShift(emp)}
                  onArchive={() => void runAction(emp.id, "archive")}
                />
              ))}
            </section>
          ) : null}
        </div>
      )}

      {hireOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-0 md:items-center md:p-6">
          <div className="max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-donna-border bg-white p-4 md:rounded-2xl md:p-6">
            <h2 className="mb-1 text-lg font-semibold text-donna-text">Hire an AI employee</h2>
            <p className="mb-4 text-sm text-donna-muted">
              They work toward the goal in continuous shifts on Donna&apos;s cloud.
            </p>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-donna-muted">Name</span>
                <TextInput
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="Alex"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-donna-muted">Role</span>
                <TextInput
                  value={draft.role}
                  onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
                  placeholder="Researcher"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-donna-muted">Goal</span>
                <TextArea
                  rows={4}
                  value={draft.goal}
                  onChange={(e) => setDraft((d) => ({ ...d, goal: e.target.value }))}
                  placeholder="Research YC competitors and keep a living brief in my notes"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-donna-muted">
                  Cadence (minutes, 0 = continuous)
                </span>
                <TextInput
                  value={draft.cadence_minutes}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, cadence_minutes: e.target.value }))
                  }
                  inputMode="numeric"
                  placeholder="0"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setHireOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => void hire()}
                disabled={saving || !draft.name.trim() || !draft.goal.trim()}
              >
                {saving ? "Hiring…" : "Hire"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EmployeeCard({
  employee,
  busy,
  onOpenShift,
  onPause,
  onResume,
  onArchive,
}: {
  employee: AIEmployee;
  busy?: boolean;
  onOpenShift: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onArchive?: () => void;
}) {
  const working = Boolean(employee.current_agent_run_id);
  return (
    <article className="rounded-2xl border border-donna-border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-donna-text">{employee.name}</h3>
            <span className="shrink-0 rounded-full bg-donna-surface px-2 py-0.5 text-[11px] font-medium text-donna-muted">
              {statusLabel[employee.status] ?? employee.status}
            </span>
            {working ? (
              <span className="shrink-0 rounded-full bg-donna-primary-light px-2 py-0.5 text-[11px] font-medium text-donna-primary">
                On shift
              </span>
            ) : null}
          </div>
          {employee.role ? (
            <p className="mt-0.5 text-xs font-medium text-donna-muted">{employee.role}</p>
          ) : null}
          <p className="mt-2 text-sm text-donna-text">{employee.goal}</p>
          {employee.progress_summary ? (
            <p className="mt-2 line-clamp-3 text-xs text-donna-muted">
              Progress: {employee.progress_summary}
            </p>
          ) : (
            <p className="mt-2 text-xs text-donna-muted">No progress logged yet.</p>
          )}
          <p className="mt-2 text-[11px] text-donna-muted/80">
            {employee.shift_count} shift{employee.shift_count === 1 ? "" : "s"}
            {employee.cadence_minutes > 0
              ? ` · every ${employee.cadence_minutes}m`
              : " · continuous"}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          className="px-3 py-1.5 text-sm"
          onClick={onOpenShift}
          disabled={!employee.current_agent_run_id}
        >
          {employee.current_agent_run_id ? "Open shift" : "Between shifts"}
        </Button>
        {employee.status === "active" && onPause ? (
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
        {employee.status === "paused" && onResume ? (
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
        {employee.status !== "archived" && onArchive ? (
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
