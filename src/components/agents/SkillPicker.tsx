import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { cn } from "../../lib/cn";
import { listSkills, type Skill } from "../../services/skillsApi";

type Props = {
  selected: string[];
  onChange: (names: string[]) => void;
  disabled?: boolean;
};

export function SkillPicker({ selected, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    if (!open) return;
    void listSkills()
      .then(setSkills)
      .catch(() => setSkills([]));
  }, [open]);

  function toggle(name: string) {
    if (selected.includes(name)) {
      onChange(selected.filter((n) => n !== name));
      return;
    }
    onChange([...selected, name]);
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-label="Choose skills"
        title="Skills"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          "transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          selected.length > 0 || open
            ? "bg-donna-primary-light text-donna-primary hover:bg-donna-primary-light/80"
            : "text-donna-muted hover:bg-donna-surface hover:text-donna-text",
        )}
      >
        <Sparkles className="h-5 w-5" strokeWidth={1.75} />
      </button>
      {open ? (
        <div className="absolute bottom-11 left-0 z-30 w-72 overflow-hidden rounded-xl border border-donna-border bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-donna-border px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-donna-muted">
              Skills for this run
            </p>
            <Link
              to="/app/skills"
              className="text-xs font-medium text-donna-primary hover:underline"
            >
              Manage
            </Link>
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {skills.length === 0 ? (
              <li className="px-3 py-3 text-sm text-donna-muted">
                No skills yet. Create one in Skills.
              </li>
            ) : (
              skills.map((skill) => {
                const on = selected.includes(skill.name);
                return (
                  <li key={skill.id ?? skill.name}>
                    <button
                      type="button"
                      onClick={() => toggle(skill.name)}
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm",
                        on ? "bg-donna-primary-light/70" : "hover:bg-donna-surface",
                      )}
                    >
                      <span className="font-medium text-donna-text">
                        {on ? "✓ " : ""}
                        {skill.name}
                      </span>
                      {skill.description ? (
                        <span className="line-clamp-2 text-xs text-donna-muted">
                          {skill.description}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
