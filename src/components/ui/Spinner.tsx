import { cn } from "../../lib/cn";

type Props = {
  className?: string;
  label?: string;
};

export function Spinner({ className, label = "Loading" }: Props) {
  return (
    <div
      className={cn(
        "h-8 w-8 animate-spin rounded-full border-[3px] border-donna-border border-t-donna-gold",
        className,
      )}
      role="status"
      aria-label={label}
    />
  );
}
