import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import {
  getStoredComposerMode,
  storeComposerMode,
  type ComposerMode,
} from "../lib/composerMode";

type ComposerModeContextValue = {
  mode: ComposerMode;
  setMode: (mode: ComposerMode) => void;
  agentVoiceSendRef: MutableRefObject<((text: string) => void) | null>;
};

const ComposerModeContext = createContext<ComposerModeContextValue | null>(
  null,
);

export function ComposerModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ComposerMode>(() =>
    getStoredComposerMode(),
  );
  const agentVoiceSendRef = useRef<((text: string) => void) | null>(null);

  const setMode = useCallback((next: ComposerMode) => {
    setModeState(next);
    storeComposerMode(next);
  }, []);

  const value = useMemo(
    () => ({ mode, setMode, agentVoiceSendRef }),
    [mode, setMode],
  );

  return (
    <ComposerModeContext.Provider value={value}>
      {children}
    </ComposerModeContext.Provider>
  );
}

export function useComposerMode(): ComposerModeContextValue {
  const ctx = useContext(ComposerModeContext);
  if (!ctx) {
    throw new Error(
      "useComposerMode must be used within ComposerModeProvider",
    );
  }
  return ctx;
}
