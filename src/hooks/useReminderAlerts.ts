import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";
import { listReminders, type Reminder } from "../services/remindersApi";

const NOTIFIED_KEY = "donna.reminder.notified.v1";

function loadNotified(): Set<string> {
  try {
    const raw = sessionStorage.getItem(NOTIFIED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function saveNotified(ids: Set<string>) {
  try {
    sessionStorage.setItem(NOTIFIED_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore quota
  }
}

function requestPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") {
    return Promise.resolve("denied");
  }
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Promise.resolve(Notification.permission);
  }
  return Notification.requestPermission();
}

function showReminderNotification(reminder: Reminder) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }
  new Notification("Donna reminder", {
    body: reminder.title,
    tag: `donna-reminder-${reminder.id}`,
  });
}

export function useReminderAlerts() {
  const { isAuthenticated } = useAuth();
  const notified = useRef<Set<string>>(loadNotified());

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    const tick = async () => {
      try {
        const rows = await listReminders("fired");
        if (cancelled) return;
        let changed = false;
        for (const rem of rows) {
          if (notified.current.has(rem.id)) continue;
          notified.current.add(rem.id);
          changed = true;
          showReminderNotification(rem);
        }
        if (changed) saveNotified(notified.current);
      } catch {
        // keep polling
      }
    };

    void requestPermission();
    void tick();
    const id = window.setInterval(() => {
      void tick();
    }, 12000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isAuthenticated]);
}
