import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Sidebar } from "../components/Sidebar";
import { ChatSessionProvider } from "../hooks/ChatSessionProvider";
import { ComposerModeProvider } from "../hooks/ComposerModeProvider";
import { VoiceSessionProvider } from "../hooks/VoiceSessionProvider";
import { cn } from "../lib/cn";

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-full w-full min-h-0">
      <Sidebar className="hidden md:flex" />

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <Sidebar
            className="relative z-50 shadow-xl"
            onNewChat={() => setMobileNavOpen(false)}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </div>
      ) : null}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
        <div className="flex shrink-0 items-center border-b border-donna-border px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg text-donna-muted",
              "hover:bg-donna-surface hover:text-donna-text",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring",
            )}
          >
            {mobileNavOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
          <span className="ml-2 text-sm font-semibold text-donna-primary">Donna</span>
        </div>

        <ComposerModeProvider>
          <ChatSessionProvider>
            <VoiceSessionProvider>
              <Outlet />
            </VoiceSessionProvider>
          </ChatSessionProvider>
        </ComposerModeProvider>
      </main>
    </div>
  );
}
