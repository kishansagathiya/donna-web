import { isDonnaDesktop } from "../lib/desktop";
import { waitingReasonLabel } from "../services/desktopApi";

export function DesktopRequiredBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  const desktop = isDonnaDesktop();
  const required = message.toLowerCase().includes("desktop_required") ||
    message.toLowerCase().includes("install donna desktop");
  if (!required) return null;
  return (
    <div className="mx-4 mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <p className="font-medium">Donna Desktop required</p>
      <p className="mt-1 text-xs leading-relaxed">
        {desktop
          ? "This Mac is not registered yet. Stay signed in and wait for the worker to come online."
          : "New agent runs execute on your Mac. Install Donna Desktop, sign in, and keep it running."}
      </p>
      <button
        type="button"
        className="mt-2 text-xs font-medium underline"
        onClick={onDismiss}
      >
        Dismiss
      </button>
    </div>
  );
}

export function WaitingForMacBanner({
  status,
  waitingReason,
}: {
  status?: string;
  waitingReason?: string | null;
}) {
  if (status !== "queued") return null;
  const label = waitingReasonLabel(waitingReason);
  if (!label) return null;
  return (
    <div className="mx-4 mb-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
      {label}. The assigned Mac will pick this up when it is free and online.
    </div>
  );
}
