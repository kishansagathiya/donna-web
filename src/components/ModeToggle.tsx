import type { DonnaMode } from "../types/mode";
import "./ModeToggle.css";

type Props = {
  mode: DonnaMode;
  onChange: (mode: DonnaMode) => void;
  disabled?: boolean;
};

export function ModeToggle({ mode, onChange, disabled }: Props) {
  return (
    <div className="mode-toggle" role="tablist" aria-label="Interaction mode">
      <button
        type="button"
        role="tab"
        className={`mode-toggle-segment${mode === "talk" ? " mode-toggle-segment--active" : ""}`}
        aria-selected={mode === "talk"}
        disabled={disabled}
        onClick={() => onChange("talk")}
      >
        Talk
      </button>
      <button
        type="button"
        role="tab"
        className={`mode-toggle-segment${mode === "listen" ? " mode-toggle-segment--active" : ""}`}
        aria-selected={mode === "listen"}
        disabled={disabled}
        onClick={() => onChange("listen")}
      >
        Listen
      </button>
    </div>
  );
}
