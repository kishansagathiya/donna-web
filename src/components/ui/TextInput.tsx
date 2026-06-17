import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement>;

export function TextInput({ className, ...props }: Props) {
  return (
    <input
      className={cn(
        "w-full rounded-donna border border-donna-border bg-donna-surface px-3 py-2.5 text-base text-donna-text",
        "placeholder:text-donna-muted",
        "focus:border-donna-gold-ring focus:outline-none focus:ring-2 focus:ring-donna-gold-ring/30",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
