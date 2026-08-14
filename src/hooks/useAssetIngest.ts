import { useCallback, useState } from "react";
import {
  ingestFile,
  ingestMessageForKind,
  ingestUrl,
} from "../services/knowledgeApi";

export type IngestToast = {
  message: string;
  isError: boolean;
} | null;

export function useAssetIngest() {
  const [toast, setToast] = useState<IngestToast>(null);
  const [busy, setBusy] = useState(false);

  const showToast = useCallback((message: string, isError = false) => {
    setToast({ message, isError });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const addLink = useCallback(
    async (url: string) => {
      setBusy(true);
      try {
        const result = await ingestUrl(url);
        const message = ingestMessageForKind(
          result.asset_kind,
          result.extractor,
        );
        showToast(message);
        return { ok: true as const, message };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not save link";
        showToast(message, true);
        return { ok: false as const, message };
      } finally {
        setBusy(false);
      }
    },
    [showToast],
  );

  const addFile = useCallback(
    async (file: File) => {
      setBusy(true);
      try {
        const result = await ingestFile(file);
        const message = ingestMessageForKind(
          result.asset_kind,
          result.extractor,
        );
        showToast(message);
        return { ok: true as const, message };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not save file";
        showToast(message, true);
        return { ok: false as const, message };
      } finally {
        setBusy(false);
      }
    },
    [showToast],
  );

  return { toast, busy, addLink, addFile, showToast };
}
