import { useEffect, useState } from "react";
import { AlertBanner } from "./ui/AlertBanner";
import { Spinner } from "./ui/Spinner";
import {
  getExperimentalUiEnabled,
  setExperimentalUiEnabled,
} from "../lib/experimentalSettings";
import {
  getAccountPreferences,
  updateExperimentalFeatures,
  type ExperimentalFeatures,
} from "../services/accountApi";

type FeatureKey = keyof ExperimentalFeatures;

const FEATURES: {
  key: FeatureKey;
  title: string;
  description: string;
}[] = [
  {
    key: "notesFeed",
    title: "Notes V2 feed",
    description: "Use the faster Notes feed with richer metadata.",
  },
  {
    key: "smartTagging",
    title: "Smart tagging",
    description: "Automatically suggest tags when notes are saved.",
  },
  {
    key: "memoryExtraction",
    title: "Memory extraction",
    description: "Extract durable facts from notes and conversations.",
  },
  {
    key: "memoryRetrieval",
    title: "Memory retrieval",
    description: "Recall extracted memories when chatting with Donna.",
  },
];

const DEFAULT_FEATURES: ExperimentalFeatures = {
  notesFeed: false,
  smartTagging: false,
  memoryExtraction: false,
  memoryRetrieval: false,
};

export function ExperimentalSection() {
  const [uiEnabled, setUiEnabled] = useState(false);
  const [features, setFeatures] =
    useState<ExperimentalFeatures>(DEFAULT_FEATURES);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [savingKey, setSavingKey] = useState<FeatureKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUiEnabled(getExperimentalUiEnabled());
  }, []);

  useEffect(() => {
    if (!uiEnabled) {
      return;
    }
    setLoadingFeatures(true);
    setError(null);
    void getAccountPreferences()
      .then((preferences) => {
        setFeatures(preferences.experimental ?? DEFAULT_FEATURES);
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load experimental features",
        );
      })
      .finally(() => setLoadingFeatures(false));
  }, [uiEnabled]);

  function handleUiToggle(next: boolean) {
    setUiEnabled(next);
    setExperimentalUiEnabled(next);
    if (!next) {
      setError(null);
    }
  }

  async function handleFeatureToggle(key: FeatureKey, next: boolean) {
    if (savingKey) {
      return;
    }
    const previous = features;
    setFeatures({ ...features, [key]: next });
    setSavingKey(key);
    setError(null);
    try {
      const saved = await updateExperimentalFeatures({ [key]: next });
      setFeatures(saved);
    } catch (err) {
      setFeatures(previous);
      setError(
        err instanceof Error ? err.message : "Could not save experimental feature",
      );
    } finally {
      setSavingKey(null);
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
          {error ? <AlertBanner>{error}</AlertBanner> : null}
          {loadingFeatures ? (
            <div className="flex items-center gap-2 py-3 text-sm text-donna-muted">
              <Spinner className="h-5 w-5" />
              Loading experimental features…
            </div>
          ) : (
            FEATURES.map((feature) => {
              const enabled = features[feature.key];
              const saving = savingKey === feature.key;
              return (
                <label
                  key={feature.key}
                  className="block rounded-donna border border-donna-border bg-donna-surface px-3.5 py-3"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block text-sm font-medium text-donna-text">
                        {feature.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-donna-muted">
                        {feature.description}
                      </span>
                    </span>
                    {saving ? (
                      <Spinner className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 accent-donna-primary"
                        checked={enabled}
                        disabled={savingKey !== null}
                        onChange={(event) =>
                          void handleFeatureToggle(
                            feature.key,
                            event.target.checked,
                          )
                        }
                        aria-label={feature.title}
                      />
                    )}
                  </span>
                </label>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
