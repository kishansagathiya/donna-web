import { NavLink, useNavigate } from "react-router-dom";
import { AppPageHeader } from "../components/ui/AppPageHeader";
import { cn } from "../lib/cn";
import { settingsNavItems } from "../lib/settingsNav";

export function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <AppPageHeader title="Settings" onBack={() => navigate("/app")} />

      <nav
        className="flex flex-col gap-1 overflow-y-auto px-4 py-4 md:px-8"
        aria-label="Settings"
      >
        {settingsNavItems.map((item) => {
          const { to, label, icon: Icon, end } = item;
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring",
                  isActive
                    ? "bg-donna-primary-light text-donna-primary"
                    : "text-donna-text hover:bg-donna-surface",
                )
              }
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
              {label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
