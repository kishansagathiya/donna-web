import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function Sheet({
  open,
  onClose,
  title,
  titleId = "sheet-title",
  children,
  footer,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(timer);
      previousFocus?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        className={cn(
          "w-full max-w-lg bg-white shadow-xl",
          "rounded-t-2xl sm:rounded-2xl",
          "pb-[max(1rem,env(safe-area-inset-bottom))]",
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between border-b border-donna-border px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-donna-text">
            {title}
          </h2>
          <button
            type="button"
            className="min-h-11 px-2 text-base font-medium text-donna-muted transition-colors hover:text-donna-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-gold-ring"
            onClick={onClose}
          >
            Done
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? (
          <div className="border-t border-donna-border px-5 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
