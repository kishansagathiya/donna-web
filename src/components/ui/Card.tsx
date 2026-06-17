import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function Card({ className, children, ...props }: Props) {
  return (
    <button
      type="button"
      className={cn(
        "block w-full rounded-donna border border-donna-border bg-white p-3.5 text-left",
        "transition-colors duration-150 hover:border-donna-gold-ring",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-gold-ring focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
