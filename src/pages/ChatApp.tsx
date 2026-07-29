import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
import { useCreateNoteMutation } from "../hooks/useNotes";
import { useVoiceSessionContext } from "../hooks/VoiceSessionProvider";
import { isDonnaThinkingPhase } from "../lib/thinkingPhrases";
import { cn } from "../lib/cn";
import { newNoteId } from "../services/notesApi";

const quickActions = [
  {
    label: "What do you remember?",
    prompt: "What do you remember about me?",
  },
  {
    label: "Catch me up",
    prompt: "Catch me up from my notes and recent conversations.",
  },
  {
    label: "Continue last chat",
    prompt: "Continue where we left off.",
  },
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
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
    phaseLabel: voicePhaseLabel,
    sessionLabel,
    errorMsg: voiceError,
    disabled: micDisabled,
    sessionActive,
    dismissError: dismissVoiceError,
  } = useVoiceSessionContext();
  const { toast, showToast } = useAssetIngest();
  const createNoteMutation = useCreateNoteMutation();
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
      setActiveConversationId(null);
      navigate("/app", { replace: true, state: null });
    }

    if (state?.ingestToast) {
      showToast(state.ingestToast.message, state.ingestToast.isError);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate, showToast, clearChat]);

  // Granola OAuth return lands on /app?integrations=granola&ok=…
  useEffect(() => {
    if (searchParams.get("integrations") !== "granola") {
      return;
    }
    const ok = searchParams.get("ok");
    const oauthError = searchParams.get("error");
    if (ok === "0" || oauthError) {
      showToast(
        oauthError
          ? `Granola connection failed: ${oauthError}`
          : "Granola connection failed.",
        true,
      );
    } else {
      showToast("Connected to Granola. Importing meetings…", false);
    }
    const next = new URLSearchParams(searchParams);
    next.delete("integrations");
    next.delete("ok");
    next.delete("error");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, showToast]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_PANEL_KEY, historyPanelOpen ? "1" : "0");
    } catch {
      // ignore
    }
  }, [historyPanelOpen]);

  function handleNewChat() {
    clearChat();
    setActiveConversationId(null);
  }

  function handleResume(
    conversationId: string,
    nextSessionId: string | undefined,
    nextMessages: typeof messages,
  ) {
    setActiveConversationId(conversationId);
    loadConversation(nextSessionId, nextMessages);
  }

  const hasThread = messages.length > 0;

  const inputSessionLabel =
    hasThread && sessionLabel && !isDonnaThinkingPhase(sessionLabel)
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
              className="!h-9 !w-9 !border-transparent !bg-transparent !text-donna-muted hover:!bg-donna-surface lg:!hidden"
            >
              <History className="h-5 w-5" strokeWidth={1.75} />
            </IconButton>
            {/* Desktop: expand right panel — hidden on phone (panel is lg-only) */}
            <IconButton
              onClick={() => setHistoryPanelOpen((open) => !open)}
              aria-label={
                historyPanelOpen ? "Close chat history" : "Open chat history"
              }
              aria-pressed={historyPanelOpen}
              className={cn(
                "!h-9 !w-9 !border-transparent !bg-transparent hover:!bg-donna-surface !hidden lg:!inline-flex",
                historyPanelOpen ? "!text-donna-primary" : "!text-donna-muted",
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
          voicePhaseLabel={voicePhaseLabel}
          showMic={!hasThread}
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
          onSaveAsNote={async (content) => {
            try {
              await createNoteMutation.mutateAsync({
                content,
                id: newNoteId(),
              });
              showToast("Saved to Notes", false);
            } catch (err: unknown) {
              showToast(
                err instanceof Error ? err.message : "Could not save note",
                true,
              );
              throw err;
            }
          }}
          onRetry={() => void retryFailed()}
          onSpeakError={(message) => showToast(message, true)}
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
          onSend={(text, attachments, options) =>
            void sendMessage(text, attachments, options)
          }
          onStop={stopGeneration}
          onError={(message) => showToast(message, true)}
          disabled={inputDisabled}
          busy={busy}
          placeholder="Message Donna…"
          showMic={hasThread}
          micState={micState}
          onMicPress={() => void toggleTalk()}
          micDisabled={micDisabled}
          sessionLabel={inputSessionLabel}
          quickActions={
            !hasThread && !sessionActive
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
