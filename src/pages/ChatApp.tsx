import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { History, Settings } from "lucide-react";
import { ChatHistorySheet } from "../components/ChatHistorySheet";
import { ChatHistorySidebar } from "../components/ChatHistorySidebar";
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

const SIDEBAR_COLLAPSE_KEY = "donna.chatHistory.collapsed";

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
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null,
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const {
    messages,
    sendMessage,
    stopGeneration,
    regenerate,
    editAndResend,
    retryFailed,
    setMessageFeedback,
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

  useEffect(() => {
    try {
      localStorage.setItem(
        SIDEBAR_COLLAPSE_KEY,
        sidebarCollapsed ? "1" : "0",
      );
    } catch {
      // ignore
    }
  }, [sidebarCollapsed]);

  async function handleFileSelect(file: File) {
    const result = await addFile(file);
    if (result.ok) {
      showToast(result.message, false);
    }
  }

  function handleNewChat() {
    clearChat();
    clearVoiceTurns();
    setActiveConversationId(null);
  }

  function handleResume(
    conversationId: string,
    nextSessionId: string | undefined,
    nextMessages: typeof messages,
  ) {
    clearVoiceTurns();
    setActiveConversationId(conversationId);
    loadConversation(nextSessionId, nextMessages);
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
    <div className="flex h-full min-h-0 w-full">
      <ChatHistorySidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        selectedId={activeConversationId}
        onNewChat={handleNewChat}
        onResume={(conversationId, sessionId, nextMessages) => {
          handleResume(conversationId, sessionId, nextMessages);
        }}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 px-5 py-3">
          <h1 className="text-lg font-semibold text-donna-text">Chat</h1>
          <div className="flex items-center gap-2">
            <IconButton
              onClick={() => setHistoryOpen(true)}
              aria-label="Chat history"
              className="!h-9 !w-9 !border-transparent !bg-transparent !text-donna-muted hover:!bg-donna-surface lg:hidden"
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
          busy={busy}
          onCopyMessage={async (content) => {
            try {
              await navigator.clipboard.writeText(content);
              showToast("Copied", false);
            } catch {
              showToast("Could not copy", true);
            }
          }}
          onRegenerate={() => void regenerate()}
          onEditMessage={(id, text) => void editAndResend(id, text)}
          onFeedback={(id, rating) => void setMessageFeedback(id, rating)}
          onRetry={() => void retryFailed()}
        />

        {activeError ? (
          <AlertBanner
            onDismiss={dismissActiveError}
            action={
              !voiceError && error
                ? { label: "Retry", onClick: () => void retryFailed() }
                : undefined
            }
          >
            {activeError}
          </AlertBanner>
        ) : null}

        <ChatInput
          onSend={(text) => void sendMessage(text)}
          onStop={stopGeneration}
          onFileSelect={(file) => void handleFileSelect(file)}
          disabled={inputDisabled}
          busy={busy}
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
          onResume={(conversationId, sessionId, nextMessages) => {
            handleResume(conversationId, sessionId, nextMessages);
          }}
        />
      </div>
    </div>
  );
}
