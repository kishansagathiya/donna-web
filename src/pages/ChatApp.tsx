import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import { AccountModal } from "../components/AccountModal";
import { ChatInput } from "../components/ChatInput";
import { ChatMessages } from "../components/ChatMessages";
import { IngestToast } from "../components/IngestToast";
import { AlertBanner } from "../components/ui/AlertBanner";
import { IconButton } from "../components/ui/IconButton";
import { useAssetIngest } from "../hooks/useAssetIngest";
import { useAuth } from "../hooks/useAuth";
import { useChatSession } from "../hooks/useChatSession";
import { cn } from "../lib/cn";

const quickActions = [
  { label: "Summarize PDF", prompt: "Summarize the PDF I shared" },
  { label: "Debug code", prompt: "Help me debug this code" },
  { label: "Draft email", prompt: "Help me draft an email" },
] as const;

function UserAvatar({ onClick }: { onClick: () => void }) {
  const { session } = useAuth();
  const name =
    (session?.user.user_metadata?.full_name as string | undefined) ??
    session?.user.email ??
    "U";
  const initial = name.charAt(0).toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open profile"
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full bg-donna-primary-light text-sm font-semibold text-donna-primary",
        "transition-opacity hover:opacity-80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring focus-visible:ring-offset-2",
      )}
    >
      {initial}
    </button>
  );
}

export function ChatApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { messages, sendMessage, clearChat, busy, phase, error, dismissError } =
    useChatSession("talk");
  const { toast, showToast, addFile } = useAssetIngest();
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    const state = location.state as {
      ingestToast?: { message: string; isError: boolean };
      newChat?: boolean;
    } | null;

    if (state?.newChat) {
      clearChat();
      navigate("/app", { replace: true, state: null });
    }

    if (state?.ingestToast) {
      showToast(state.ingestToast.message, state.ingestToast.isError);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate, showToast, clearChat]);

  async function handleFileSelect(file: File) {
    const result = await addFile(file);
    if (result.ok) {
      showToast(result.message, false);
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <header className="flex shrink-0 items-center justify-end gap-2 px-5 py-3">
        <IconButton
          onClick={() => setAccountOpen(true)}
          aria-label="Settings"
          className="!h-9 !w-9 !border-transparent !bg-transparent !text-donna-muted hover:!bg-donna-surface"
        >
          <Settings className="h-5 w-5" strokeWidth={1.75} />
        </IconButton>
        <UserAvatar onClick={() => navigate("/app/profile")} />
      </header>

      <ChatMessages messages={messages} phase={phase} />

      {error ? (
        <AlertBanner onDismiss={dismissError}>{error}</AlertBanner>
      ) : null}

      <ChatInput
        onSend={(text) => void sendMessage(text)}
        onFileSelect={(file) => void handleFileSelect(file)}
        disabled={busy}
        placeholder="Type your message here..."
        quickActions={
          messages.length === 0
            ? quickActions.map((action) => ({
                label: action.label,
                onClick: () => void sendMessage(action.prompt),
              }))
            : undefined
        }
      />

      <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
      <IngestToast toast={toast} />
    </div>
  );
}
