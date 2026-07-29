import { useEffect, useState } from "react";
import {
  getExperimentalUiEnabled,
  setExperimentalUiEnabled,
} from "../lib/experimentalSettings";

/** Features shown only while Experimental is on. Empty until something ships. */
const FEATURES: {
  key: string;
  title: string;
  description: string;
}[] = [];

export function ExperimentalSection() {
  const [uiEnabled, setUiEnabled] = useState(false);

  useEffect(() => {
    setUiEnabled(getExperimentalUiEnabled());
  }, []);

  function handleUiToggle(next: boolean) {
    setUiEnabled(next);
    setExperimentalUiEnabled(next);
  }

  return (
    <div className="mb-8 max-w-lg">
      <p className="mb-1 text-sm font-semibold text-donna-text">Experimental</p>
      <p className="mb-3 text-xs leading-relaxed text-donna-muted">
        Early features that may change or be removed. Turn this on to see and
        manage them.
      </p>

      <label className="flex items-center justify-between gap-3 rounded-donna border border-donna-border bg-donna-surface px-3.5 py-3">
        <span className="text-sm font-medium text-donna-text">
          {uiEnabled ? "Experimental on" : "Experimental off"}
        </span>
        <input
          type="checkbox"
          className="h-4 w-4 accent-donna-primary"
          checked={uiEnabled}
          onChange={(event) => handleUiToggle(event.target.checked)}
          aria-label="Experimental features"
        />
      </label>

      {uiEnabled ? (
        <div className="mt-3 space-y-2">
          {FEATURES.length === 0 ? (
            <p className="text-xs leading-relaxed text-donna-muted">
              No experimental features right now.
            </p>
          ) : (
            FEATURES.map((feature) => (
              <div
                key={feature.key}
                className="rounded-donna border border-donna-border bg-donna-surface px-3.5 py-3"
              >
                <p className="text-sm font-medium text-donna-text">
                  {feature.title}
                </p>
                <p className="mt-0.5 text-xs text-donna-muted">
                  {feature.description}
                </p>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
