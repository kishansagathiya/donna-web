import type { IngestToast } from "../hooks/useAssetIngest";
import { cn } from "../lib/cn";

type Props = {
  toast: IngestToast;
};

export function IngestToast({ toast }: Props) {
  if (!toast) return null;

  return (
    <div
      className={cn(
        "fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-50 max-w-[calc(100%-2rem)] -translate-x-1/2",
        "animate-[slideUp_0.25s_ease-out] rounded-full px-5 py-3 text-sm font-medium text-white shadow-lg",
        toast.isError ? "bg-donna-toast-error" : "bg-donna-toast",
      )}
      role="status"
    >
      {toast.message}
    </div>
  );
}
