import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { CircleHelp, MessageSquare, Plus, Settings } from "lucide-react";
import { DonnaLogo } from "./DonnaLogo";
import { cn } from "../lib/cn";
import { isSettingsPath } from "../lib/settingsNav";

const navItems = [
  { to: "/app", label: "Chat", icon: MessageSquare, end: true },
] as const;

type Props = {
  onNewChat?: () => void;
  onNavigate?: () => void;
  className?: string;
};

export function Sidebar({ onNewChat, onNavigate, className }: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const settingsActive = isSettingsPath(pathname);

  function handleNewChat() {
    onNavigate?.();
    if (onNewChat) {
      onNewChat();
      return;
    }
    navigate("/app", { state: { newChat: true } });
  }

  return (
    <aside
      className={cn(
        "flex h-full w-60 shrink-0 flex-col border-r border-donna-border bg-donna-sidebar",
        className,
      )}
    >
      <div className="flex items-center gap-3 px-5 py-5">
        <DonnaLogo
          className="h-10 w-10 rounded-xl object-contain"
          width={40}
          height={40}
        />
        <div>
          <p className="text-base font-bold text-donna-primary">Donna</p>
          <p className="text-xs text-donna-muted">AI Assistant</p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={handleNewChat}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl bg-donna-primary px-4 py-2.5",
            "text-sm font-semibold text-white transition-colors hover:bg-donna-primary-hover",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring focus-visible:ring-offset-2",
          )}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          New Chat
        </button>
      </div>

      <nav className="flex flex-col gap-1 px-3" aria-label="Main">
        {navItems.map((item) => {
          const { to, label, icon: Icon, end } = item;
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => {
                onNavigate?.();
              }}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring",
                  isActive
                    ? "bg-donna-primary-light text-donna-primary"
                    : "text-donna-muted hover:bg-donna-surface hover:text-donna-text",
                )
              }
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
              {label}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-donna-border px-3 py-3">
        <NavLink
          to="/app/settings"
          onClick={onNavigate}
          className={() =>
            cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring",
              settingsActive
                ? "bg-donna-primary-light text-donna-primary"
                : "text-donna-muted hover:bg-donna-surface hover:text-donna-text",
            )
          }
        >
          <Settings className="h-5 w-5" strokeWidth={1.75} />
          Settings
        </NavLink>
        <NavLink
          to="/support"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring",
              isActive
                ? "bg-donna-primary-light text-donna-primary"
                : "text-donna-muted hover:bg-donna-surface hover:text-donna-text",
            )
          }
        >
          <CircleHelp className="h-5 w-5" strokeWidth={1.75} />
          Help
        </NavLink>
      </div>
    </aside>
  );
}
