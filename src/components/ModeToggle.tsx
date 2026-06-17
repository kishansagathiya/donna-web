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
      className="flex gap-1 rounded-full border border-donna-border bg-donna-surface p-0.5"
      role="tablist"
      aria-label="Interaction mode"
    >
      {(["talk", "listen"] as const).map((value) => (
        <button
          key={value}
          type="button"
          role="tab"
          className={cn(
            "rounded-full px-3.5 py-1.5 text-[0.8125rem] font-semibold capitalize transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-gold-ring",
            mode === value
              ? "bg-donna-gold text-white"
              : "text-donna-gold hover:bg-donna-surface",
            disabled && "cursor-not-allowed opacity-60",
          )}
          aria-selected={mode === value}
          disabled={disabled}
          onClick={() => onChange(value)}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
