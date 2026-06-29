import type { DonnaMode } from "../types/mode";
import { cn } from "../lib/cn";

type Props = {
  mode: DonnaMode;
  onChange: (mode: DonnaMode) => void;
  disabled?: boolean;
};

export function ModeToggle({ mode, onChange, disabled }: Props) {
  return (
    <div
      className={cn(
        "flex gap-1 rounded-full border border-donna-border bg-donna-surface p-1",
        disabled && "opacity-60",
      )}
      role="tablist"
      aria-label="Interaction mode"
    >
      {(
        [
          { value: "talk" as const, label: "Talk" },
          { value: "notes" as const, label: "Notes" },
        ] as const
      ).map(({ value, label }) => (
        <button
          key={value}
          type="button"
          role="tab"
          className={cn(
            "rounded-full px-4 py-1.5 text-[0.8125rem] font-semibold transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-gold-ring",
            "disabled:cursor-not-allowed",
            mode === value
              ? "bg-donna-gold text-white shadow-sm"
              : "text-donna-muted hover:text-donna-text",
          )}
          aria-selected={mode === value}
          disabled={disabled}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
