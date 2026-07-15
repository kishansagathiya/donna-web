import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { History, PanelRightOpen, Settings } from "lucide-react";
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
import {
  getConversation,
  turnsToMessages,
} from "../services/conversationsApi";
import { isDonnaThinkingPhase } from "../lib/thinkingPhrases";
import { cn } from "../lib/cn";

function nextMessageId(): string {
  return crypto.randomUUID();
}

const quickActions = [
  { label: "Summarize PDF", prompt: "Summarize the PDF I shared" },
  { label: "Debug code", prompt: "Help me debug this code" },
  { label: "Draft email", prompt: "Help me draft an email" },
] as const;

const HISTORY_PANEL_KEY = "donna.chatHistory.panelOpen";

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
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null,
  );
  // Desktop right panel starts closed; open only via the expand button.
  const [historyPanelOpen, setHistoryPanelOpen] = useState(() => {
    try {
      return localStorage.getItem(HISTORY_PANEL_KEY) === "1";
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
      resumeConversationId?: string;
    } | null;

    if (state?.newChat) {
      clearChat();
      clearVoiceTurns();
      setActiveConversationId(null);
      navigate("/app", { replace: true, state: null });
      return;
    }

    if (state?.resumeConversationId) {
      const conversationId = state.resumeConversationId;
      navigate("/app", { replace: true, state: null });
      void (async () => {
        try {
          const detail = await getConversation(conversationId);
          const nextMessages = turnsToMessages(detail.turns).map((m) => ({
            id: nextMessageId(),
            role: m.role,
            content: m.content,
          }));
          const sessionId =
            detail.channel === "text" ? detail.client_session_id : undefined;
          clearVoiceTurns();
          setActiveConversationId(conversationId);
          loadConversation(sessionId, nextMessages);
        } catch (err) {
          showToast(
            err instanceof Error ? err.message : "Failed to open conversation",
            true,
          );
        }
      })();
      return;
    }

    if (state?.ingestToast) {
      showToast(state.ingestToast.message, state.ingestToast.isError);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [
    location,
    navigate,
    showToast,
    clearChat,
    clearVoiceTurns,
    loadConversation,
  ]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_PANEL_KEY, historyPanelOpen ? "1" : "0");
    } catch {
      // ignore
    }
  }, [historyPanelOpen]);

  async function handleSaveToMemory(file: File) {
    const result = await addFile(file);
    if (result.ok) {
      showToast(result.message, false);
    } else {
      showToast(result.message || "Could not save to memory", true);
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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 px-5 py-3">
          <h1 className="text-lg font-semibold text-donna-text">Chat</h1>
          <div className="flex items-center gap-2">
            <UserAvatar onClick={() => navigate("/app/profile")} />
            <IconButton
              onClick={() => navigate("/app/profile")}
              aria-label="Profile and settings"
              className="!h-9 !w-9 !border-transparent !bg-transparent !text-donna-muted hover:!bg-donna-surface"
            >
              <Settings className="h-5 w-5" strokeWidth={1.75} />
            </IconButton>
            {/* Mobile: bottom sheet — far right, away from profile */}
            <IconButton
              onClick={() => setHistorySheetOpen(true)}
              aria-label="Chat history"
              className="!h-9 !w-9 !border-transparent !bg-transparent !text-donna-muted hover:!bg-donna-surface lg:hidden"
            >
              <History className="h-5 w-5" strokeWidth={1.75} />
            </IconButton>
            {/* Desktop: expand right panel — sits next to where the panel opens */}
            <IconButton
              onClick={() => setHistoryPanelOpen((open) => !open)}
              aria-label={
                historyPanelOpen ? "Close chat history" : "Open chat history"
              }
              aria-pressed={historyPanelOpen}
              className={cn(
                "!h-9 !w-9 !border-transparent !bg-transparent hover:!bg-donna-surface hidden lg:inline-flex",
                historyPanelOpen
                  ? "!text-donna-primary"
                  : "!text-donna-muted",
              )}
            >
              {historyPanelOpen ? (
                <History className="h-5 w-5" strokeWidth={1.75} />
              ) : (
                <PanelRightOpen className="h-5 w-5" strokeWidth={1.75} />
              )}
            </IconButton>
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
          onSend={(text, attachments) => void sendMessage(text, attachments)}
          onStop={stopGeneration}
          onSaveToMemory={(file) => void handleSaveToMemory(file)}
          onError={(message) => showToast(message, true)}
          disabled={inputDisabled}
          busy={busy}
          placeholder="Message Donna… attach for this turn, or save to memory"
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
          open={historySheetOpen}
          onClose={() => setHistorySheetOpen(false)}
          onResume={(conversationId, sessionId, nextMessages) => {
            handleResume(conversationId, sessionId, nextMessages);
          }}
        />
      </div>

      <ChatHistorySidebar
        open={historyPanelOpen}
        onClose={() => setHistoryPanelOpen(false)}
        selectedId={activeConversationId}
        onNewChat={handleNewChat}
        onResume={(conversationId, sessionId, nextMessages) => {
          handleResume(conversationId, sessionId, nextMessages);
        }}
      />
    </div>
  );
}
