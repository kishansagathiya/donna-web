import { useEffect, useState } from "react";
import {
  DONNA_THINKING_VERBS,
  randomThinkingVerbIndex,
} from "../lib/thinkingPhrases";
import { cn } from "../lib/cn";

type Props = {
  className?: string;
};

const ROTATE_MS = 2800;

export function ThinkingIndicator({ className }: Props) {
  const [verbIndex, setVerbIndex] = useState(randomThinkingVerbIndex);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setVerbIndex((prev) => (prev + 1) % DONNA_THINKING_VERBS.length);
        setVisible(true);
      }, 200);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <p
      className={cn(
        "flex items-center justify-center gap-1.5 text-sm text-donna-muted",
        className,
      )}
      aria-live="polite"
    >
      <span
        className={cn(
          "transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0",
        )}
      >
        Donna is {DONNA_THINKING_VERBS[verbIndex]}
      </span>
      <span className="inline-flex items-end gap-0.5 pb-px" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="thinking-dot h-1 w-1 rounded-full bg-donna-muted"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
    </p>
  );
}
