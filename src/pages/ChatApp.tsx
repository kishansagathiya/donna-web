import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Check,
  History,
  PanelRightOpen,
  Settings,
  Share2,
  Square,
} from "lucide-react";
import { AgentRunsSheet } from "../components/AgentRunsSheet";
import { AgentRunsSidebar } from "../components/AgentRunsSidebar";
import { AgentTurnView } from "../components/agents/AgentTurnView";
import { ChatHero } from "../components/ChatHero";
import { ChatHistorySheet } from "../components/ChatHistorySheet";
import { ChatHistorySidebar } from "../components/ChatHistorySidebar";
import { ChatInput } from "../components/ChatInput";
import { ChatMessages } from "../components/ChatMessages";
import { IngestToast } from "../components/IngestToast";
import { ShareAgentRunSheet } from "../components/ShareAgentRunSheet";
import { ShareConversationSheet } from "../components/ShareConversationSheet";
import { AlertBanner } from "../components/ui/AlertBanner";
import { Button } from "../components/ui/Button";
import { IconButton } from "../components/ui/IconButton";
import { useAssetIngest } from "../hooks/useAssetIngest";
import { useAuth } from "../hooks/useAuth";
import { useChatSessionContext } from "../hooks/ChatSessionProvider";
import { useComposerMode } from "../hooks/ComposerModeProvider";
import { useAgentSession } from "../hooks/useAgentSession";
import { useCreateNoteMutation } from "../hooks/useNotes";
import { useVoiceSessionContext } from "../hooks/VoiceSessionProvider";
import { cn } from "../lib/cn";
import { isComposerMode } from "../lib/composerMode";
import { DONNA_THINKING_PHASE, isDonnaThinkingPhase } from "../lib/thinkingPhrases";
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

function statusTone(status: string) {
  switch (status) {
    case "succeeded":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "failed":
    case "cancelled":
      return "bg-rose-50 text-rose-800 border-rose-200";
    case "waiting_for_user":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "running":
    case "queued":
      return "bg-sky-50 text-sky-800 border-sky-200";
    default:
      return "bg-donna-surface text-donna-muted border-donna-border";
  }
}

export function ChatApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { mode, setMode, agentVoiceSendRef } = useComposerMode();
  const isAgent = mode === "agent";
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
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
    busy: chatBusy,
    phase,
    error: chatError,
    dismissError: dismissChatError,
  } = useChatSessionContext();
  const agent = useAgentSession(isAgent);
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

  const busy = isAgent ? agent.busy : chatBusy;
  const threadError = isAgent ? agent.error : chatError;
  const activeError = voiceError ?? threadError;
  const inputDisabled = busy || micDisabled || sessionActive;
  const hasChatThread = messages.length > 0;
  const hasAgentThread = Boolean(agent.active);
  const hasThread = isAgent ? hasAgentThread : hasChatThread;

  useEffect(() => {
    agentVoiceSendRef.current = (text) => {
      void agent.handleSend(text, []);
    };
    return () => {
      agentVoiceSendRef.current = null;
    };
  });

  useEffect(() => {
    const requested = searchParams.get("mode");
    if (!isComposerMode(requested)) return;
    setMode(requested);
    const next = new URLSearchParams(searchParams);
    next.delete("mode");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, setMode]);

  useEffect(() => {
    const state = location.state as {
      ingestToast?: { message: string; isError: boolean };
      newChat?: boolean;
    } | null;

    if (state?.newChat) {
      if (mode === "agent") {
        agent.handleNewRun();
      } else {
        clearChat();
        setActiveConversationId(null);
      }
      navigate("/app", { replace: true, state: null });
    }

    if (state?.ingestToast) {
      showToast(state.ingestToast.message, state.ingestToast.isError);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate, showToast, clearChat, mode, agent.handleNewRun]);

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

  function handleNewThread() {
    if (isAgent) {
      agent.handleNewRun();
      return;
    }
    clearChat();
    setActiveConversationId(null);
  }

  function handleResume(
    conversationId: string,
    nextSessionId: string | undefined,
    nextMessages: typeof messages,
  ) {
    setMode("chat");
    setActiveConversationId(conversationId);
    loadConversation(nextSessionId, nextMessages);
  }

  function dismissActiveError() {
    if (voiceError) {
      dismissVoiceError();
      return;
    }
    if (isAgent) {
      agent.setError(null);
      return;
    }
    dismissChatError();
  }

  const inputSessionLabel =
    hasThread && sessionLabel && !isDonnaThinkingPhase(sessionLabel)
      ? sessionLabel
      : null;
  const agentHeroSessionLabel =
    agent.busy && !agent.active ? DONNA_THINKING_PHASE : sessionLabel;
  const agentPlaceholder = !agent.active
    ? "Describe a cloud agent goal…"
    : agent.waitingWithOptions
      ? agent.allowMultiple
        ? "Optional note to add with your selection…"
        : "Or type a different answer…"
      : agent.needsReply
        ? "Write your answer…"
        : "Add a follow-up or correction…";
  const showAgentActions =
    isAgent &&
    agent.active &&
    !agent.isPending &&
    (agent.active.status === "running" ||
      agent.active.status === "queued" ||
      agent.needsReply);

  return (
    <div className="flex h-full min-h-0 w-full">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 px-5 py-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-donna-text">
              {isAgent ? "Agent" : "Chat"}
            </h1>
            {isAgent && agent.active ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                    statusTone(
                      agent.needsReply ? "waiting_for_user" : agent.active.status,
                    ),
                  )}
                >
                  {agent.needsReply ? "needs reply" : agent.active.status}
                </span>
                {agent.active.error ? (
                  <span className="text-xs text-rose-700">
                    {agent.active.error}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {isAgent && agent.active && !agent.isPending ? (
              <IconButton
                onClick={() => setShareOpen(true)}
                aria-label="Share agent"
                className="!h-9 !w-9 !border-transparent !bg-transparent !text-donna-muted hover:!bg-donna-surface"
              >
                <Share2 className="h-5 w-5" strokeWidth={1.75} />
              </IconButton>
            ) : null}
            {!isAgent && activeConversationId && hasChatThread ? (
              <IconButton
                onClick={() => setShareOpen(true)}
                aria-label="Share conversation"
                className="!h-9 !w-9 !border-transparent !bg-transparent !text-donna-muted hover:!bg-donna-surface"
              >
                <Share2 className="h-5 w-5" strokeWidth={1.75} />
              </IconButton>
            ) : null}
            {showAgentActions && agent.active ? (
              <>
                <Button
                  variant="secondary"
                  className="!w-auto gap-1 px-3 py-2 text-sm"
                  disabled={agent.busy}
                  onClick={() => void agent.onFinish(agent.active!.id)}
                >
                  <Check className="h-4 w-4" />
                  Mark finished
                </Button>
                <Button
                  variant="ghost"
                  className="!w-auto gap-1 px-3 py-2 text-sm"
                  disabled={agent.busy}
                  onClick={() => void agent.onCancel(agent.active!.id)}
                >
                  <Square className="h-4 w-4" />
                  Cancel
                </Button>
              </>
            ) : null}
            <UserAvatar onClick={() => navigate("/app/profile")} />
            {!isAgent ? (
              <IconButton
                onClick={() => navigate("/app/profile")}
                aria-label="Profile and settings"
                className="!h-9 !w-9 !border-transparent !bg-transparent !text-donna-muted hover:!bg-donna-surface"
              >
                <Settings className="h-5 w-5" strokeWidth={1.75} />
              </IconButton>
            ) : null}
            <IconButton
              onClick={() => setHistorySheetOpen(true)}
              aria-label={isAgent ? "Agent history" : "Chat history"}
              className="!h-9 !w-9 !border-transparent !bg-transparent !text-donna-muted hover:!bg-donna-surface lg:!hidden"
            >
              <History className="h-5 w-5" strokeWidth={1.75} />
            </IconButton>
            <IconButton
              onClick={() => setHistoryPanelOpen((open) => !open)}
              aria-label={
                historyPanelOpen
                  ? isAgent
                    ? "Close agent history"
                    : "Close chat history"
                  : isAgent
                    ? "Open agent history"
                    : "Open chat history"
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

        {isAgent ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {!agent.active ? (
              <ChatHero
                micState={micState}
                onMicPress={() => void toggleTalk()}
                micDisabled={micDisabled || agent.busy}
                showMic
                sessionLabel={agentHeroSessionLabel}
                title="Start a cloud agent goal…"
                description="Background goals on Donna cloud — your phone can lock while it works."
              />
            ) : (
              <div className="flex w-full flex-col gap-8 px-5 py-5 md:px-8 lg:px-10">
                {agent.turns.map((turn) => (
                  <AgentTurnView
                    key={turn.id}
                    turn={turn}
                    runStatus={agent.active!.status}
                    waitingExtras={
                      turn.isLatest && agent.needsReply
                        ? {
                            busy: agent.busy,
                            onFinish: () => void agent.onFinish(agent.active!.id),
                          }
                        : null
                    }
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <ChatMessages
            messages={messages}
            phase={phase}
            micState={micState}
            onMicPress={() => void toggleTalk()}
            micDisabled={micDisabled}
            sessionLabel={sessionLabel}
            voicePhaseLabel={voicePhaseLabel}
            showMic={!hasChatThread}
            busy={chatBusy}
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
        )}

        {activeError ? (
          <AlertBanner
            onDismiss={dismissActiveError}
            action={
              !isAgent && !voiceError && chatError
                ? { label: "Retry", onClick: () => void retryFailed() }
                : undefined
            }
          >
            {activeError}
          </AlertBanner>
        ) : null}

        {isAgent && agent.waitingWithOptions ? (
          <div className="shrink-0 border-t border-donna-border px-4 pb-2 pt-3 md:px-6">
            <p className="mb-2 text-xs text-donna-muted">
              {agent.allowMultiple
                ? "Select one or more options"
                : "Select an option"}
            </p>
            <div className="flex flex-wrap gap-2">
              {agent.options.map((opt) => {
                const on = agent.selectedOptions.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={agent.busy}
                    onClick={() => agent.toggleOption(opt.id)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                      on
                        ? "border-donna-primary bg-donna-primary text-white"
                        : "border-donna-border bg-white text-donna-text hover:border-donna-primary/50",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {agent.selectedOptions.length > 0 ? (
              <div className="mt-3 flex justify-end">
                <Button
                  className="!w-auto px-4 py-2 text-sm"
                  disabled={agent.busy}
                  onClick={() =>
                    void agent.handleSend(agent.composeWithOptions(""), [])
                  }
                >
                  Confirm
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        <ChatInput
          onSend={(text, attachments, options) => {
            if (isAgent) {
              void agent.handleSend(text, attachments);
              return;
            }
            void sendMessage(text, attachments, options);
          }}
          onStop={isAgent ? undefined : stopGeneration}
          onError={(message) => {
            if (isAgent) {
              agent.setError(message);
              return;
            }
            showToast(message, true);
          }}
          disabled={inputDisabled}
          busy={busy}
          placeholder={isAgent ? agentPlaceholder : "Message Donna…"}
          showMic={hasThread}
          micState={micState}
          onMicPress={() => void toggleTalk()}
          micDisabled={micDisabled || (isAgent && agent.busy)}
          sessionLabel={isAgent ? agentHeroSessionLabel : inputSessionLabel}
          showWebSearch={!isAgent}
          allowEmptySend={isAgent && agent.allowEmptySend}
          mode={mode}
          onModeChange={setMode}
          quickActions={
            !isAgent && !hasChatThread && !sessionActive
              ? quickActions.map((action) => ({
                  label: action.label,
                  onClick: () => void sendMessage(action.prompt),
                }))
              : undefined
          }
        />

        <IngestToast toast={toast} />

        {isAgent ? (
          <>
            <ShareAgentRunSheet
              open={shareOpen}
              runId={agent.active?.id ?? null}
              goal={agent.active?.goal}
              onClose={() => setShareOpen(false)}
            />
            <AgentRunsSheet
              open={historySheetOpen}
              onClose={() => setHistorySheetOpen(false)}
              selectedId={agent.selectedId}
              onSelect={(run) => agent.setSelectedId(run.id)}
              refreshKey={agent.refreshKey}
              runs={agent.runs}
            />
          </>
        ) : (
          <>
            <ChatHistorySheet
              open={historySheetOpen}
              onClose={() => setHistorySheetOpen(false)}
              onResume={(conversationId, sessionId, nextMessages) => {
                handleResume(conversationId, sessionId, nextMessages);
              }}
            />
            <ShareConversationSheet
              open={shareOpen}
              conversationId={activeConversationId}
              onClose={() => setShareOpen(false)}
            />
          </>
        )}
      </div>

      {isAgent ? (
        <AgentRunsSidebar
          open={historyPanelOpen}
          onClose={() => setHistoryPanelOpen(false)}
          selectedId={agent.selectedId}
          onNewRun={agent.handleNewRun}
          onSelect={(run) => agent.setSelectedId(run.id)}
          refreshKey={agent.refreshKey}
          runs={agent.runs}
        />
      ) : (
        <ChatHistorySidebar
          open={historyPanelOpen}
          onClose={() => setHistoryPanelOpen(false)}
          selectedId={activeConversationId}
          onNewChat={handleNewThread}
          onResume={(conversationId, sessionId, nextMessages) => {
            handleResume(conversationId, sessionId, nextMessages);
          }}
        />
      )}
    </div>
  );
}
