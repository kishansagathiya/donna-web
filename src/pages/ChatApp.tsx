import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Search, Settings } from "lucide-react";
import { AccountModal } from "../components/AccountModal";
import { ChatInput } from "../components/ChatInput";
import { ChatMessages } from "../components/ChatMessages";
import { IngestToast } from "../components/IngestToast";
import { ModeToggle } from "../components/ModeToggle";
import { AlertBanner } from "../components/ui/AlertBanner";
import { IconButton } from "../components/ui/IconButton";
import { useAssetIngest } from "../hooks/useAssetIngest";
import { useChatSession } from "../hooks/useChatSession";
import type { DonnaMode } from "../types/mode";
import { cn } from "../lib/cn";

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
    <div className={cn("flex h-full min-h-0 w-full flex-col")}>
      <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-donna-border bg-white px-3 py-2.5">
        <div className="justify-self-start">
          <IconButton
            onClick={() => setAccountOpen(true)}
            aria-label="Account settings"
          >
            <Settings className="h-5 w-5" strokeWidth={2} />
          </IconButton>
        </div>

        <ModeToggle mode={mode} onChange={setMode} disabled={busy} />

        <div className="flex items-center gap-1.5 justify-self-end">
          <IconButton
            onClick={() => navigate("/app/search")}
            aria-label="Search context"
          >
            <Search className="h-5 w-5" strokeWidth={2} />
          </IconButton>
          <IconButton
            onClick={() => navigate("/app/add")}
            aria-label="Add to memory"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </IconButton>
        </div>
      </header>

      <ChatMessages messages={messages} phase={phase} mode={mode} />

      {error ? (
        <AlertBanner onDismiss={dismissError}>{error}</AlertBanner>
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
