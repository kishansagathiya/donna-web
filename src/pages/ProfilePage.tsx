import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  deleteAccount,
  downloadAccountExport,
  getAccountPreferences,
  updateLLMModel,
  updatePersona,
  updateTimezone,
} from "../services/accountApi";
import { signOut } from "../services/auth";
import { Button } from "../components/ui/Button";
import { AlertBanner } from "../components/ui/AlertBanner";
import { Spinner } from "../components/ui/Spinner";
import { ThemeToggle } from "../components/ThemeToggle";
import { ExperimentalSection } from "../components/ExperimentalSection";
import { IntegrationsSection } from "../components/IntegrationsSection";
import { ImportChatGPTSection } from "../components/ImportChatGPTSection";
import { useAuth } from "../hooks/useAuth";
import {
  detectDeviceTimezone,
  timezoneSelectOptions,
} from "../lib/timezones";

function normalizePersona(persona: string): string {
  if (persona === "therapist") return "listener";
  return persona || "companion";
}

export function ProfilePage() {
  const { session } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [loadingModels, setLoadingModels] = useState(true);
  const [savingModel, setSavingModel] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [personas, setPersonas] = useState<string[]>([]);
  const [persona, setPersona] = useState("companion");
  const [personaCustom, setPersonaCustom] = useState("");
  const [savingPersona, setSavingPersona] = useState(false);
  const [timezone, setTimezone] = useState("");
  const [savingTimezone, setSavingTimezone] = useState(false);
  const busy =
    signingOut ||
    deleting ||
    savingModel ||
    savingPersona ||
    savingTimezone ||
    exporting;

  const email = session?.user.email ?? "";
  const name =
    (session?.user.user_metadata?.full_name as string | undefined) ?? email;
  const initial = (name || "U").charAt(0).toUpperCase();

  useEffect(() => {
    setLoadingModels(true);
    setError(null);
    void getAccountPreferences()
      .then(async (preferences) => {
        setModels(preferences.available_models);
        setSelectedModel(preferences.llm_model);
        setPersonas(preferences.available_personas ?? []);
        setPersona(normalizePersona(preferences.persona ?? "companion"));
        setPersonaCustom(preferences.persona_custom ?? "");
        let tz = (preferences.timezone ?? "").trim();
        if (!tz) {
          const detected = detectDeviceTimezone();
          try {
            tz = await updateTimezone(detected);
          } catch (err) {
            setTimezone(detected);
            setError(
              err instanceof Error
                ? `Could not save timezone (${err.message}). Choose it again below.`
                : "Could not save timezone. Choose it again below.",
            );
            return;
          }
        }
        setTimezone(tz);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load models");
      })
      .finally(() => setLoadingModels(false));
  }, []);

  async function handleModelChange(model: string) {
    const previous = selectedModel;
    setSelectedModel(model);
    setSavingModel(true);
    setError(null);
    try {
      await updateLLMModel(model);
    } catch (err) {
      setSelectedModel(previous);
      setError(err instanceof Error ? err.message : "Could not save model");
    } finally {
      setSavingModel(false);
    }
  }

  async function handlePersonaChange(next: string) {
    const previous = persona;
    setPersona(next);
    setSavingPersona(true);
    setError(null);
    try {
      await updatePersona(next, next === "custom" ? personaCustom : "");
    } catch (err) {
      setPersona(previous);
      setError(err instanceof Error ? err.message : "Could not save persona");
    } finally {
      setSavingPersona(false);
    }
  }

  async function handlePersonaCustomSave() {
    setSavingPersona(true);
    setError(null);
    try {
      await updatePersona("custom", personaCustom);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save persona");
    } finally {
      setSavingPersona(false);
    }
  }

  async function handleTimezoneChange(next: string) {
    const previous = timezone;
    setTimezone(next);
    setSavingTimezone(true);
    setError(null);
    try {
      const saved = await updateTimezone(next);
      setTimezone(saved);
    } catch (err) {
      setTimezone(previous);
      setError(err instanceof Error ? err.message : "Could not save timezone");
    } finally {
      setSavingTimezone(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      await downloadAccountExport();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download data");
    } finally {
      setExporting(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    setError(null);
    try {
      await signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign out");
    } finally {
      setSigningOut(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete account");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto">
      <div className="border-b border-donna-border px-6 py-5 md:px-8">
        <h1 className="text-xl font-semibold text-donna-text">Profile</h1>
      </div>

      <div className="flex-1 px-6 py-6 md:px-8">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-donna-primary-light text-2xl font-semibold text-donna-primary">
            {initial}
          </div>
          <div>
            <p className="text-lg font-semibold text-donna-text">{name}</p>
            {email ? <p className="text-sm text-donna-muted">{email}</p> : null}
          </div>
        </div>

        {error ? (
          <AlertBanner className="mb-4">{error}</AlertBanner>
        ) : null}

        <div className="mb-8 max-w-lg">
          <label
            htmlFor="llm-model"
            className="mb-1 block text-sm font-semibold text-donna-text"
          >
            AI model
          </label>
          <p className="mb-2 text-xs text-donna-muted">
            Used for both text and voice replies.
          </p>
          {loadingModels ? (
            <div className="flex items-center gap-2 py-3 text-sm text-donna-muted">
              <Spinner className="h-5 w-5" />
              Loading models…
            </div>
          ) : (
            <select
              id="llm-model"
              className="w-full rounded-donna border border-donna-border bg-white px-3 py-3 text-sm text-donna-text"
              value={selectedModel}
              onChange={(event) => void handleModelChange(event.target.value)}
              disabled={busy}
            >
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mb-8 max-w-lg">
          <label
            htmlFor="timezone"
            className="mb-1 block text-sm font-semibold text-donna-text"
          >
            Timezone
          </label>
          <p className="mb-2 text-xs text-donna-muted">
            Used when Donna schedules calendar meetings (for example “tomorrow
            at 4pm”).
          </p>
          {loadingModels ? (
            <div className="flex items-center gap-2 py-3 text-sm text-donna-muted">
              <Spinner className="h-5 w-5" />
              Loading…
            </div>
          ) : (
            <select
              id="timezone"
              className="w-full rounded-donna border border-donna-border bg-white px-3 py-3 text-sm text-donna-text"
              value={timezone}
              onChange={(event) => void handleTimezoneChange(event.target.value)}
              disabled={busy}
            >
              {timezoneSelectOptions(timezone).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mb-8 max-w-lg">
          <label
            htmlFor="persona"
            className="mb-1 block text-sm font-semibold text-donna-text"
          >
            Persona
          </label>
          <p className="mb-2 text-xs text-donna-muted">
            How Donna talks to you in chat and voice.
          </p>
          <select
            id="persona"
            className="w-full rounded-donna border border-donna-border bg-white px-3 py-3 text-sm capitalize text-donna-text"
            value={persona}
            onChange={(event) => void handlePersonaChange(event.target.value)}
            disabled={busy || personas.length === 0}
          >
            {(personas.length > 0
              ? personas
              : ["companion", "boss", "coach", "listener", "custom"]
            ).map((p) => (
              <option key={p} value={p} className="capitalize">
                {p}
              </option>
            ))}
          </select>
          {persona === "custom" ? (
            <div className="mt-3">
              <label
                htmlFor="persona-custom"
                className="mb-1 block text-xs font-medium text-donna-text"
              >
                Custom persona instructions
              </label>
              <textarea
                id="persona-custom"
                rows={4}
                maxLength={4000}
                placeholder="e.g. You are Donna, a witty senior engineer who pairs with me…"
                value={personaCustom}
                onChange={(e) => setPersonaCustom(e.target.value)}
                disabled={busy}
                className="w-full rounded-donna border border-donna-border px-3 py-3 text-sm text-donna-text focus:border-donna-gold-ring focus:outline-none focus:ring-2 focus:ring-donna-gold-ring/30"
              />
              <div className="mt-2 flex justify-end">
                <Button
                  variant="secondary"
                  className="!w-auto px-4 py-2 text-sm"
                  onClick={() => void handlePersonaCustomSave()}
                  disabled={busy || savingPersona}
                >
                  {savingPersona ? "Saving…" : "Save persona"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <ThemeToggle className="mb-8 max-w-lg" />

        <ExperimentalSection />

        <IntegrationsSection />

        <div className="mb-8 max-w-lg">
          <p className="mb-1 text-sm font-semibold text-donna-text">AI employees</p>
          <p className="mb-3 text-xs leading-relaxed text-donna-muted">
            Hire goal-driven workers that keep shifting in the background until
            the job is done. Pause anytime; approve only irreversible steps.
          </p>
          <Link to="/app/employees">
            <Button variant="secondary" fullWidth>
              Manage employees
            </Button>
          </Link>
        </div>

        <div className="mb-8 max-w-lg">
          <p className="mb-1 text-sm font-semibold text-donna-text">Skills</p>
          <p className="mb-3 text-xs leading-relaxed text-donna-muted">
            Reusable procedures Donna&apos;s agents follow — yours, saved by agents,
            or bundled. Donna picks the right one automatically; you can also
            choose.
          </p>
          <Link to="/app/skills">
            <Button variant="secondary" fullWidth>
              Manage skills
            </Button>
          </Link>
        </div>

        <ImportChatGPTSection />

        <div className="mb-8 max-w-lg">
          <p className="mb-1 text-sm font-semibold text-donna-text">
            Download my data
          </p>
          <p className="mb-3 text-xs leading-relaxed text-donna-muted">
            Download a ZIP of your conversations, notes, and uploaded files.
          </p>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => void handleExport()}
            disabled={busy}
          >
            {exporting ? "Preparing download…" : "Download my data"}
          </Button>
        </div>

        <div className="flex max-w-lg flex-col gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => void handleSignOut()}
            disabled={busy}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>

          {confirmDelete ? (
            <div className="rounded-donna border border-donna-border bg-donna-surface p-4">
              <p className="mb-3 text-sm text-donna-text">
                This cannot be undone. Delete everything?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setConfirmDelete(false)}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => void handleDelete()}
                  disabled={busy}
                >
                  {deleting ? "Deleting…" : "Delete account"}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="destructive"
              fullWidth
              onClick={() => setConfirmDelete(true)}
              disabled={busy}
            >
              Delete account
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
