import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useChatSession } from "./useChatSession";

type ChatSessionContextValue = ReturnType<typeof useChatSession>;

const ChatSessionContext = createContext<ChatSessionContextValue | null>(null);

export function ChatSessionProvider({ children }: { children: ReactNode }) {
  const value = useChatSession();
  return (
    <ChatSessionContext.Provider value={value}>
      {children}
    </ChatSessionContext.Provider>
  );
}

export function useChatSessionContext(): ChatSessionContextValue {
  const ctx = useContext(ChatSessionContext);
  if (!ctx) {
    throw new Error("useChatSessionContext must be used within ChatSessionProvider");
  }
  return ctx;
}
