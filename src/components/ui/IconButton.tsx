import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function IconButton({ className, children, ...props }: Props) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
        "border border-donna-border bg-donna-surface text-donna-gold",
        "transition-colors duration-150 hover:opacity-85",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-gold-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
