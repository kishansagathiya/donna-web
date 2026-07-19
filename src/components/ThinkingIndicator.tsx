import { useEffect, useState } from "react";
import {
  DONNA_THINKING_VERBS,
  randomThinkingVerbIndex,
} from "../lib/thinkingPhrases";
import { cn } from "../lib/cn";

const ROTATE_MS = 2800;

function useThinkingPhrase() {
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

  return {
    verb: DONNA_THINKING_VERBS[verbIndex],
    visible,
  };
}

type DotsProps = {
  className?: string;
  size?: "sm" | "md";
};

export function BouncingDots({ className, size = "sm" }: DotsProps) {
  const dotSize = size === "md" ? "h-1.5 w-1.5" : "h-1 w-1";

  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      aria-hidden="true"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            "thinking-dot rounded-full bg-current",
            dotSize,
          )}
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

type LabelProps = {
  className?: string;
  verb?: string;
  visible?: boolean;
};

export function ThinkingLabel({ className, verb, visible = true }: LabelProps) {
  const phrase = useThinkingPhrase();
  const text = verb ?? phrase.verb;
  const show = visible && (verb ? true : phrase.visible);

  return (
    <p
      className={cn(
        "text-sm text-donna-muted transition-opacity duration-200",
        show ? "opacity-100" : "opacity-0",
        className,
      )}
      aria-live="polite"
    >
      Donna is {text}
    </p>
  );
}

type BlockProps = {
  className?: string;
  /** Fixed verb; omit to rotate thinking phrases. */
  verb?: string;
};

export function AssistantThinkingBlock({ className, verb }: BlockProps) {
  const phrase = useThinkingPhrase();
  const labelVerb = verb ?? phrase.verb;
  const visible = verb !== undefined ? true : phrase.visible;

  return (
    <div
      className={cn(
        "mr-auto flex max-w-[85%] flex-col items-start gap-1.5",
        className,
      )}
    >
      <div className="rounded-2xl rounded-bl-md border border-donna-border bg-donna-surface px-4 py-3 text-donna-muted">
        <BouncingDots size="md" />
      </div>
      <ThinkingLabel verb={labelVerb} visible={visible} className="pl-1" />
    </div>
  );
}

type Props = {
  className?: string;
};

export function ThinkingIndicator({ className }: Props) {
  return <ThinkingLabel className={className} />;
}
