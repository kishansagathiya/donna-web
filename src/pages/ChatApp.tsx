import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { History, Settings } from "lucide-react";
import { ChatHistorySheet } from "../components/ChatHistorySheet";
import { ChatInput } from "../components/ChatInput";
import { ChatMessages } from "../components/ChatMessages";
import { IngestToast } from "../components/IngestToast";
import { AlertBanner } from "../components/ui/AlertBanner";
import { IconButton } from "../components/ui/IconButton";
import { useAssetIngest } from "../hooks/useAssetIngest";
import { useAuth } from "../hooks/useAuth";
import { useChatSessionContext } from "../hooks/ChatSessionProvider";
import { useVoiceSessionContext } from "../hooks/VoiceSessionProvider";
import { isDonnaThinkingPhase } from "../lib/thinkingPhrases";
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const {
    messages,
    sendMessage,
    clearChat,
    loadConversation,
    busy,
    phase,
    error,
    dismissError,
  } = useChatSessionContext();
  const {
    state: micState,
    toggleTalk,
    turns: voiceTurns,
    transcript: liveTranscript,
    reply: liveReply,
    phaseLabel: voicePhaseLabel,
    sessionLabel,
    errorMsg: voiceError,
    disabled: micDisabled,
    sessionActive,
    dismissError: dismissVoiceError,
    clearTurns: clearVoiceTurns,
  } = useVoiceSessionContext();
  const { toast, showToast, addFile } = useAssetIngest();
  const activeError = voiceError ?? error;
  const dismissActiveError = voiceError ? dismissVoiceError : dismissError;
  const inputDisabled = busy || micDisabled || sessionActive;

  useEffect(() => {
    const state = location.state as {
      ingestToast?: { message: string; isError: boolean };
      newChat?: boolean;
    } | null;

    if (state?.newChat) {
      clearChat();
      clearVoiceTurns();
      navigate("/app", { replace: true, state: null });
    }

    if (state?.ingestToast) {
      showToast(state.ingestToast.message, state.ingestToast.isError);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate, showToast, clearChat, clearVoiceTurns]);

  async function handleFileSelect(file: File) {
    const result = await addFile(file);
    if (result.ok) {
      showToast(result.message, false);
    }
  }

  const hasMessages =
    messages.length > 0 ||
    voiceTurns.length > 0 ||
    Boolean(liveTranscript) ||
    Boolean(liveReply);

  const inputSessionLabel =
    hasMessages && sessionLabel && !isDonnaThinkingPhase(sessionLabel)
      ? sessionLabel
      : null;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-2 px-5 py-3">
        <h1 className="text-lg font-semibold text-donna-text">Chat</h1>
        <div className="flex items-center gap-2">
          <IconButton
            onClick={() => setHistoryOpen(true)}
            aria-label="Chat history"
            className="!h-9 !w-9 !border-transparent !bg-transparent !text-donna-muted hover:!bg-donna-surface"
          >
            <History className="h-5 w-5" strokeWidth={1.75} />
          </IconButton>
          <IconButton
            onClick={() => navigate("/app/profile")}
            aria-label="Profile and settings"
            className="!h-9 !w-9 !border-transparent !bg-transparent !text-donna-muted hover:!bg-donna-surface"
          >
            <Settings className="h-5 w-5" strokeWidth={1.75} />
          </IconButton>
          <UserAvatar onClick={() => navigate("/app/profile")} />
        </div>
      </header>

      <ChatMessages
        messages={messages}
        phase={phase}
        micState={micState}
        onMicPress={() => void toggleTalk()}
        micDisabled={micDisabled}
        sessionLabel={sessionLabel}
        voiceTurns={voiceTurns}
        liveTranscript={liveTranscript}
        liveReply={liveReply}
        voicePhaseLabel={voicePhaseLabel}
        showMic={!hasMessages}
      />

      {activeError ? (
        <AlertBanner onDismiss={dismissActiveError}>{activeError}</AlertBanner>
      ) : null}

      <ChatInput
        onSend={(text) => void sendMessage(text)}
        onFileSelect={(file) => void handleFileSelect(file)}
        disabled={inputDisabled}
        placeholder="Type your message here..."
        showMic={hasMessages}
        micState={micState}
        onMicPress={() => void toggleTalk()}
        micDisabled={micDisabled}
        sessionLabel={inputSessionLabel}
        quickActions={
          messages.length === 0 &&
          voiceTurns.length === 0 &&
          !sessionActive
            ? quickActions.map((action) => ({
                label: action.label,
                onClick: () => void sendMessage(action.prompt),
              }))
            : undefined
        }
      />

      <IngestToast toast={toast} />

      <ChatHistorySheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onResume={(sessionId, nextMessages) => {
          clearVoiceTurns();
          loadConversation(sessionId, nextMessages);
        }}
      />
    </div>
  );
}
