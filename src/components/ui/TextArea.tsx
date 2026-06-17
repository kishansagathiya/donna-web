import type { TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextArea({ className, ...props }: Props) {
  return (
    <textarea
      className={cn(
        "w-full rounded-donna border border-donna-border bg-white px-3 py-2.5 text-base leading-relaxed text-donna-text",
        "placeholder:text-donna-muted",
        "focus:border-donna-gold-ring focus:outline-none focus:ring-2 focus:ring-donna-gold-ring/30",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
