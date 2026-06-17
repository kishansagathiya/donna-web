import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "../../lib/cn";

type HeaderProps = {
  title: string;
  onBack?: () => void;
  backDisabled?: boolean;
  action?: ReactNode;
};

export function AppPageHeader({
  title,
  onBack,
  backDisabled,
  action,
}: HeaderProps) {
  return (
    <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-donna-border bg-white px-3 py-2.5">
      <div className="flex justify-self-start">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={backDisabled}
            aria-label="Back"
            className={cn(
              "inline-flex h-11 min-w-11 items-center justify-center rounded-donna px-2 text-donna-muted",
              "transition-colors duration-150 hover:text-donna-gold",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-gold-ring",
              "disabled:cursor-not-allowed disabled:opacity-55",
            )}
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
          </button>
        ) : null}
      </div>

      <h1 className="truncate px-1 text-center text-[1.0625rem] font-semibold text-donna-text">
        {title}
      </h1>

      <div className="flex items-center justify-self-end">{action}</div>
    </header>
  );
}
