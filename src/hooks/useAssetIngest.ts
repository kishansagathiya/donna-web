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
        showToast(ingestMessageForKind(result.asset_kind));
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Could not save link",
          true,
        );
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
        showToast(ingestMessageForKind(result.asset_kind));
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Could not save file",
          true,
        );
      } finally {
        setBusy(false);
      }
    },
    [showToast],
  );

  return { toast, busy, addLink, addFile, showToast };
}
