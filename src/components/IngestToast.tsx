import type { IngestToast } from "../hooks/useAssetIngest";
import "./IngestToast.css";

type Props = {
  toast: IngestToast;
};

export function IngestToast({ toast }: Props) {
  if (!toast) return null;

  return (
    <div
      className={`ingest-toast${toast.isError ? " ingest-toast--error" : ""}`}
      role="status"
    >
      {toast.message}
    </div>
  );
}
