import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useVoiceSession } from "./useVoiceSession";

type VoiceSessionContextValue = ReturnType<typeof useVoiceSession>;

const VoiceSessionContext = createContext<VoiceSessionContextValue | null>(null);

export function VoiceSessionProvider({ children }: { children: ReactNode }) {
  const value = useVoiceSession();
  return (
    <VoiceSessionContext.Provider value={value}>
      {children}
    </VoiceSessionContext.Provider>
  );
}

export function useVoiceSessionContext(): VoiceSessionContextValue {
  const ctx = useContext(VoiceSessionContext);
  if (!ctx) {
    throw new Error("useVoiceSessionContext must be used within VoiceSessionProvider");
  }
  return ctx;
}
