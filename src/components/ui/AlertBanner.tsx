import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type Props = {
  children: ReactNode;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
};

export function AlertBanner({ children, onDismiss, action, className }: Props) {
  return (
    <div
      className={cn(
        "mx-4 mb-2 flex items-start justify-between gap-3 rounded-donna border border-donna-destructive/20 bg-donna-destructive/10 px-3.5 py-2.5 text-sm text-donna-destructive",
        className,
      )}
      role="alert"
    >
      <span className="min-w-0 break-words">{children}</span>
      <div className="flex shrink-0 items-center gap-3">
        {action ? (
          <button
            type="button"
            className="text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-gold-ring"
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ) : null}
        {onDismiss ? (
          <button
            type="button"
            className="text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-gold-ring"
            onClick={onDismiss}
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}
