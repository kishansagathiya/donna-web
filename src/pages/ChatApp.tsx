import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AccountModal } from "../components/AccountModal";
import { ChatInput } from "../components/ChatInput";
import { ChatMessages } from "../components/ChatMessages";
import { IngestToast } from "../components/IngestToast";
import { ModeToggle } from "../components/ModeToggle";
import { useAssetIngest } from "../hooks/useAssetIngest";
import { useChatSession } from "../hooks/useChatSession";
import type { DonnaMode } from "../types/mode";
import "./ChatApp.css";

export function ChatApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<DonnaMode>("talk");
  const { messages, sendMessage, busy, phase, error, dismissError } =
    useChatSession(mode);
  const { toast, showToast } = useAssetIngest();
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    const state = location.state as {
      ingestToast?: { message: string; isError: boolean };
    } | null;
    if (state?.ingestToast) {
      showToast(state.ingestToast.message, state.ingestToast.isError);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate, showToast]);

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

        <div className="chat-header-center">
          <span className="chat-header-title">Donna</span>
          <ModeToggle mode={mode} onChange={setMode} disabled={busy} />
        </div>

        <div className="chat-header-right">
          <button
            type="button"
            className="icon-button icon-button-search"
            onClick={() => navigate("/app/search")}
            aria-label="Search context"
          >
            ⌕
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => navigate("/app/add")}
            aria-label="Add to memory"
          >
            +
          </button>
        </div>
      </header>

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

      <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
      <IngestToast toast={toast} />
    </div>
  );
}
