import { APP_THEMES, type AppTheme } from "../lib/theme";
import { useTheme } from "../hooks/useTheme";
import { cn } from "../lib/cn";

type Props = {
  className?: string;
};

export function ThemeToggle({ className }: Props) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={className}>
      <p className="mb-1 text-sm font-semibold text-donna-text">Color theme</p>
      <p className="mb-3 text-xs text-donna-muted">
        Switch between the warm cream palette, the earlier indigo look, or a
        black-and-white e-ink reader.
      </p>
      <div
        className="flex gap-1 rounded-xl border border-donna-border bg-donna-surface p-1"
        role="radiogroup"
        aria-label="Color theme"
      >
        {(["cream", "indigo", "eink"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={theme === value}
            onClick={() => setTheme(value)}
            className={cn(
              "flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring",
              theme === value
                ? "bg-donna-primary text-white shadow-sm"
                : "text-donna-muted hover:text-donna-text",
            )}
          >
            {APP_THEMES[value as AppTheme].label}
          </button>
        ))}
      </div>
    </div>
  );
}
