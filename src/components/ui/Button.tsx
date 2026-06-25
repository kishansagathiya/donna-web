import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "destructive" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  fullWidth?: boolean;
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-donna-primary text-white hover:bg-donna-primary-hover disabled:opacity-70",
  secondary:
    "bg-donna-surface text-donna-text border border-donna-border hover:border-donna-primary-ring/50",
  destructive:
    "bg-donna-destructive text-white hover:opacity-90 disabled:opacity-70",
  ghost:
    "bg-transparent text-donna-muted hover:text-donna-primary",
};

export function Button({
  variant = "primary",
  fullWidth = false,
  className,
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-donna px-4 py-3.5 text-base font-semibold transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed",
        variantClasses[variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  );
}
