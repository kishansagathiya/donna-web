import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type HeaderProps = {
  title: string;
  action?: ReactNode;
  className?: string;
};

export function AppPageHeader({ title, action, className }: HeaderProps) {
  return (
    <header
      className={cn(
        "flex shrink-0 items-center justify-between border-b border-donna-border px-5 py-3",
        className,
      )}
    >
      <h1 className="text-lg font-semibold text-donna-text">{title}</h1>
      {action}
    </header>
  );
}

export function HeaderTextButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "min-h-11 px-2 text-base text-donna-muted transition-colors duration-150 hover:text-donna-gold",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-gold-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
