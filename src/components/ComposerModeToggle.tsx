import { Bot, MessageSquare } from "lucide-react";
import { cn } from "../lib/cn";
import type { ComposerMode } from "../lib/composerMode";

type Props = {
  mode: ComposerMode;
  onChange: (mode: ComposerMode) => void;
  disabled?: boolean;
  className?: string;
};

export function ComposerModeToggle({
  mode,
  onChange,
  disabled,
  className,
}: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Composer mode"
      className={cn(
        "flex shrink-0 rounded-lg border border-donna-border bg-donna-surface p-0.5",
        disabled && "opacity-60",
        className,
      )}
    >
      {(
        [
          { id: "chat", label: "Chat", Icon: MessageSquare },
          { id: "agent", label: "Agent", Icon: Bot },
        ] as const
      ).map((option) => {
        const selected = mode === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold",
              "transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring",
              "disabled:cursor-not-allowed",
              selected
                ? "bg-donna-primary text-white"
                : "text-donna-muted hover:text-donna-text",
            )}
          >
            <option.Icon className="h-3.5 w-3.5" strokeWidth={2} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
