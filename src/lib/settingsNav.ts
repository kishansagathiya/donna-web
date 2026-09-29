import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Briefcase,
  CalendarCheck,
  Clock,
  Database,
  Inbox,
  Laptop,
  Mic,
  StickyNote,
  User,
} from "lucide-react";

export type SettingsNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end: boolean;
};

/** Surfaces that live under Settings, not the main chat navigation. */
export const settingsNavItems: SettingsNavItem[] = [
  { to: "/app/voice", label: "Voice", icon: Mic, end: true },
  { to: "/app/notes", label: "Notes", icon: StickyNote, end: false },
  { to: "/app/employees", label: "Employees", icon: Briefcase, end: false },
  { to: "/app/schedules", label: "Schedules", icon: Clock, end: false },
  { to: "/app/actions", label: "Actions", icon: Inbox, end: false },
  { to: "/app/reminders", label: "Reminders", icon: Bell, end: false },
  { to: "/app/today", label: "Today", icon: CalendarCheck, end: false },
  { to: "/app/search", label: "Memory", icon: Database, end: false },
  { to: "/app/profile", label: "Profile", icon: User, end: false },
  { to: "/app/desktop", label: "Desktop", icon: Laptop, end: false },
];

const settingsOnlyPrefixes = ["/app/skills", "/app/add"];

export function isSettingsPath(pathname: string): boolean {
  if (pathname === "/app/settings") return true;
  if (
    settingsOnlyPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return true;
  }
  return settingsNavItems.some((item) =>
    item.end
      ? pathname === item.to
      : pathname === item.to || pathname.startsWith(`${item.to}/`),
  );
}
