import {
  createContext,
  useContext,
  useRef,
  type ReactNode,
} from "react";
import { useChatSessionContext } from "./ChatSessionProvider";
import { useVoiceSession } from "./useVoiceSession";

type VoiceSessionContextValue = ReturnType<typeof useVoiceSession>;

const VoiceSessionContext = createContext<VoiceSessionContextValue | null>(null);

export function VoiceSessionProvider({ children }: { children: ReactNode }) {
  const { sendMessage } = useChatSessionContext();
  const sendRef = useRef(sendMessage);
  sendRef.current = sendMessage;

  const value = useVoiceSession({
    onTranscript: (text) => {
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
