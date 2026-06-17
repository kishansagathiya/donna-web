import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center px-6 py-8 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-donna-surface border border-donna-border">
        <Icon className="h-6 w-6 text-donna-gold" strokeWidth={1.75} />
      </div>
      <p className="text-lg font-semibold text-donna-text">{title}</p>
      {description ? (
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-donna-muted">
          {description}
        </p>
      ) : null}
    </div>
  );
}
