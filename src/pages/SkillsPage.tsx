import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Plus, Sparkles, Wand2 } from "lucide-react";
import { AppPageHeader } from "../components/ui/AppPageHeader";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { TextArea } from "../components/ui/TextArea";
import { TextInput } from "../components/ui/TextInput";
import {
  createSkill,
  createSkillFromRaw,
  deleteSkill,
  downloadSkillExport,
  listSkills,
  updateSkill,
  type Skill,
} from "../services/skillsApi";

type Draft = { name: string; description: string; content: string };

const emptyDraft: Draft = { name: "", description: "", content: "" };

const sourceLabels: Record<Skill["source"], string> = {
  system: "Bundled",
  user: "Yours",
  agent: "Agent",
};

export function SkillsPage() {
  const navigate = useNavigate();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [rawMode, setRawMode] = useState(false);
  const [raw, setRaw] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setSkills(await listSkills());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load skills");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setRaw("");
    setRawMode(false);
    setEditorOpen(true);
  };

  const openEdit = (skill: Skill) => {
    setEditing(skill);
    setDraft({
      name: skill.name,
      description: skill.description,
      content: skill.content,
    });
    setRawMode(false);
    setEditorOpen(true);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (rawMode) {
        await createSkillFromRaw(raw);
      } else if (editing) {
        await updateSkill(editing.id!, {
          name: draft.name,
          description: draft.description,
          content: draft.content,
        });
      } else {
        await createSkill(draft);
      }
      setEditorOpen(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save skill");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (skill: Skill) => {
    if (!skill.id || skill.source === "system") return;
    if (!window.confirm(`Delete skill "${skill.name}"?`)) return;
    try {
      await deleteSkill(skill.id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete skill");
    }
  };

  const useInAgent = (skill: Skill) => {
    navigate(`/app?mode=agent&skill=${encodeURIComponent(skill.name)}`);
  };

  const exportSkill = (skill: Skill) => {
    if (!skill.id) return;
    downloadSkillExport(skill.id, skill.name).catch((e) => {
      setError(e instanceof Error ? e.message : "Export failed");
    });
  };

  const grouped = useMemo(
    () => ({
      user: skills.filter((s) => s.source !== "system"),
      system: skills.filter((s) => s.source === "system"),
    }),
    [skills],
  );

  return (
    <div className="flex min-h-dvh flex-col bg-donna-bg">
      <AppPageHeader
        title="Skills"
        onBack={() => navigate("/app/profile")}
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
      ) : skills.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No skills yet"
          description="Skills are reusable procedures Donna follows for repeatable tasks. Create one, or let Donna save one after a successful run."
        />
      ) : (
        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4 md:px-6">
          {grouped.user.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-donna-muted">
                Your skills
              </h2>
              {grouped.user.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onEdit={() => openEdit(skill)}
                  onDelete={() => void remove(skill)}
                  onUse={() => useInAgent(skill)}
                  onExport={() => exportSkill(skill)}
                />
              ))}
            </section>
          ) : null}
          {grouped.system.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-donna-muted">
                Donna's bundled skills
              </h2>
              {grouped.system.map((skill) => (
                <SkillCard
                  key={skill.name}
                  skill={skill}
                  onUse={() => useInAgent(skill)}
                />
              ))}
            </section>
          ) : null}
        </div>
      )}

      {editorOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-0 md:items-center md:p-6">
          <div className="max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-donna-border bg-white p-4 md:rounded-2xl md:p-6">
            <h2 className="mb-4 text-lg font-semibold text-donna-text">
              {editing ? `Edit "${editing.name}"` : rawMode ? "Import SKILL.md" : "New skill"}
            </h2>

            {!editing ? (
              <div className="mb-4 flex gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setRawMode(false)}
                  className={`rounded-full px-3 py-1 ${!rawMode ? "bg-donna-primary text-white" : "border border-donna-border text-donna-muted"}`}
                >
                  Form
                </button>
                <button
                  type="button"
                  onClick={() => setRawMode(true)}
                  className={`rounded-full px-3 py-1 ${rawMode ? "bg-donna-primary text-white" : "border border-donna-border text-donna-muted"}`}
                >
                  Paste SKILL.md
                </button>
              </div>
            ) : null}

            {rawMode ? (
              <TextArea
                rows={12}
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder={"---\nname: my-skill\ndescription: When this applies\n---\n\nInstructions…"}
              />
            ) : (
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-donna-muted">Name (kebab-case)</span>
                  <TextInput
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="flight-booking-prefs"
                    disabled={Boolean(editing)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-donna-muted">Description (when it applies)</span>
                  <TextInput
                    value={draft.description}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, description: e.target.value }))
                    }
                    placeholder="How Kishan books flights — airline, seat, budget"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-donna-muted">Instructions (markdown)</span>
                  <TextArea
                    rows={10}
                    value={draft.content}
                    onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                    placeholder={"1. …"}
                  />
                </label>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void save()} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SkillCard({
  skill,
  onEdit,
  onDelete,
  onUse,
  onExport,
}: {
  skill: Skill;
  onEdit?: () => void;
  onDelete?: () => void;
  onUse: () => void;
  onExport?: () => void;
}) {
  return (
    <article className="rounded-2xl border border-donna-border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-donna-text">{skill.name}</h3>
            <span className="shrink-0 rounded-full bg-donna-surface px-2 py-0.5 text-[11px] font-medium text-donna-muted">
              {sourceLabels[skill.source]}
            </span>
          </div>
          {skill.description ? (
            <p className="mt-1 text-sm text-donna-muted">{skill.description}</p>
          ) : null}
          <p className="mt-2 line-clamp-2 text-xs text-donna-muted/80">
            {skill.content.slice(0, 200)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="secondary" className="px-3 py-1.5 text-sm" onClick={onUse}>
          <span className="inline-flex items-center gap-1">
            <Wand2 className="h-3.5 w-3.5" /> Use in Agent
          </span>
        </Button>
        {onEdit ? (
          <Button variant="ghost" className="px-3 py-1.5 text-sm" onClick={onEdit}>
            Edit
          </Button>
        ) : null}
        {skill.id && onExport ? (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-donna-muted transition-colors hover:text-donna-primary"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        ) : null}
        {onDelete ? (
          <Button
            variant="ghost"
            className="px-3 py-1.5 text-sm hover:text-donna-destructive"
            onClick={onDelete}
          >
            Delete
          </Button>
        ) : null}
      </div>
    </article>
  );
}
