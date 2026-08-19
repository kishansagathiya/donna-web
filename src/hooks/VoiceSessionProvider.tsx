import {
  createContext,
  useContext,
  useRef,
  type ReactNode,
} from "react";
import { useChatSessionContext } from "./ChatSessionProvider";
import { useComposerMode } from "./ComposerModeProvider";
import { useVoiceSession } from "./useVoiceSession";

type VoiceSessionContextValue = ReturnType<typeof useVoiceSession>;

const VoiceSessionContext = createContext<VoiceSessionContextValue | null>(null);

export function VoiceSessionProvider({ children }: { children: ReactNode }) {
  const { sendMessage } = useChatSessionContext();
  const { mode, agentVoiceSendRef } = useComposerMode();
  const sendRef = useRef(sendMessage);
  sendRef.current = sendMessage;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const value = useVoiceSession({
    onTranscript: (text) => {
      if (modeRef.current === "agent") {
        agentVoiceSendRef.current?.(text);
        return;
      }
      void sendRef.current(text);
    },
  });

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
