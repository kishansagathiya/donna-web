import { useEffect, useState } from "react";
import {
  getExperimentalUiEnabled,
  setExperimentalUiEnabled,
} from "../lib/experimentalSettings";
import {
  getAccountPreferences,
  updateLocalAgentsV1,
} from "../services/accountApi";

/** Features shown only while Experimental is on. */
const FEATURES: {
  key: string;
  title: string;
  description: string;
}[] = [
  {
    key: "localAgentsV1",
    title: "Local agents (macOS)",
    description:
      "Run new agent jobs on Donna Desktop instead of the cloud. Requires the Mac app signed in and online.",
  },
];

export function ExperimentalSection() {
  const [uiEnabled, setUiEnabled] = useState(false);
  const [localAgents, setLocalAgents] = useState(false);
  const [flagError, setFlagError] = useState<string | null>(null);
  const [flagBusy, setFlagBusy] = useState(false);

  useEffect(() => {
    setUiEnabled(getExperimentalUiEnabled());
  }, []);

  useEffect(() => {
    if (!uiEnabled) return;
    void getAccountPreferences()
      .then((prefs) => setLocalAgents(Boolean(prefs.experimental?.localAgentsV1)))
      .catch(() => {
        // Preferences may fail if offline; leave the toggle off.
      });
  }, [uiEnabled]);

  function handleUiToggle(next: boolean) {
    setUiEnabled(next);
    setExperimentalUiEnabled(next);
  }

  async function handleLocalAgents(next: boolean) {
    setFlagBusy(true);
    setFlagError(null);
    try {
      setLocalAgents(await updateLocalAgentsV1(next));
    } catch (err) {
      setFlagError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setFlagBusy(false);
    }
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
                <label className="flex items-start justify-between gap-3">
                  <span>
                    <p className="text-sm font-medium text-donna-text">
                      {feature.title}
                    </p>
                    <p className="mt-0.5 text-xs text-donna-muted">
                      {feature.description}
                    </p>
                  </span>
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-donna-primary"
                    checked={localAgents}
                    disabled={flagBusy}
                    onChange={(event) =>
                      void handleLocalAgents(event.target.checked)
                    }
                    aria-label={feature.title}
                  />
                </label>
                {flagError ? (
                  <p className="mt-2 text-xs text-donna-destructive">{flagError}</p>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
