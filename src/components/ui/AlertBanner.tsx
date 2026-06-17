import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type Props = {
  children: ReactNode;
  onDismiss?: () => void;
  className?: string;
};

export function AlertBanner({ children, onDismiss, className }: Props) {
  return (
    <div
      className={cn(
        "mx-4 mb-2 flex items-center justify-between gap-3 rounded-donna border border-donna-destructive/20 bg-donna-destructive/8 px-3.5 py-2.5 text-sm text-donna-destructive",
        className,
      )}
      role="alert"
    >
      <span>{children}</span>
      {onDismiss ? (
        <button
          type="button"
          className="shrink-0 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-gold-ring"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
