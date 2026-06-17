import { useState } from "react";
import { AddMemorySheet } from "../components/AddMemorySheet";
import { AccountModal } from "../components/AccountModal";
import { ChatInput } from "../components/ChatInput";
import { ChatMessages } from "../components/ChatMessages";
import { IngestToast } from "../components/IngestToast";
import { ModeToggle } from "../components/ModeToggle";
import { AppNav } from "../components/AppNav";
import { useAssetIngest } from "../hooks/useAssetIngest";
import { useChatSession } from "../hooks/useChatSession";
import type { DonnaMode } from "../types/mode";
import "./ChatApp.css";

export function ChatApp() {
  const [mode, setMode] = useState<DonnaMode>("talk");
  const { messages, sendMessage, busy, phase, error, dismissError } =
    useChatSession(mode);
  const { toast, busy: ingestBusy, addLink, addFile } = useAssetIngest();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <div className="chat-app">
      <header className="chat-header">
        <button
          type="button"
          className="icon-button"
          onClick={() => setAccountOpen(true)}
          aria-label="Account settings"
        >
          ⚙
        </button>
        <span className="chat-header-title">Donna</span>
        <ModeToggle mode={mode} onChange={setMode} disabled={busy} />
        <button
          type="button"
          className="icon-button"
          onClick={() => setSheetOpen(true)}
          aria-label="Add to memory"
          disabled={ingestBusy}
        >
          +
        </button>
      </header>

      <AppNav />

      <ChatMessages messages={messages} phase={phase} mode={mode} />

      {error ? (
        <div className="chat-error-banner" role="alert">
          <span>{error}</span>
          <button type="button" onClick={dismissError}>
            Dismiss
          </button>
        </div>
      ) : null}

      <ChatInput
        onSend={(text) => void sendMessage(text)}
        disabled={busy}
        placeholder={
          mode === "listen"
            ? "Share something for Donna to remember…"
            : "Message Donna…"
        }
      />

      <AddMemorySheet
        open={sheetOpen}
        busy={ingestBusy}
        onClose={() => setSheetOpen(false)}
        onAddLink={(url) => void addLink(url)}
        onAddFile={(file) => void addFile(file)}
      />

      <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
      <IngestToast toast={toast} />
    </div>
  );
}
