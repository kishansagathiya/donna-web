/**
 * Read-aloud player for assistant replies via POST /tts.
 * Prefetches on reply finish, persists via server cache, and supports
 * pause / resume / seek with a progress bar.
 */

import { API_BASE_URL } from "../config";
import { getAccessToken } from "../services/auth";

const SPEAK_CHANGE = "donna-speak-change";
const PREFETCH_CHANGE = "donna-speak-prefetch-change";
const MAX_CACHE_ENTRIES = 6;

export type SpeakStatus = "idle" | "loading" | "playing" | "paused";

export type SpeakSnapshot = {
  id: string | null;
  status: SpeakStatus;
  currentTime: number;
  duration: number;
};

type CacheEntry = {
  textKey: string;
  arrayBuffer: ArrayBuffer;
  audioBuffer?: AudioBuffer;
};

let snapshot: SpeakSnapshot = {
  id: null,
  status: "idle",
  currentTime: 0,
  duration: 0,
};

let audioContext: AudioContext | null = null;
let activeSource: AudioBufferSourceNode | null = null;
let activeBuffer: AudioBuffer | null = null;
/** Playback offset within the buffer when the current source started. */
let startedAtOffset = 0;
/** audioContext.currentTime when the current source started. */
let contextStartedAt = 0;
let playAbortController: AbortController | null = null;
let progressRaf = 0;

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<ArrayBuffer>>();
const prefetchControllers = new Map<string, AbortController>();

function notifySpeak(): void {
  window.dispatchEvent(new Event(SPEAK_CHANGE));
}

function notifyPrefetch(): void {
  window.dispatchEvent(new Event(PREFETCH_CHANGE));
}

function setSnapshot(next: Partial<SpeakSnapshot>): void {
  snapshot = { ...snapshot, ...next };
  notifySpeak();
}

/** Must run synchronously in the click handler before any await. */
export function unlockAudio(): void {
  if (typeof window === "undefined") return;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return;
  if (!audioContext) {
    audioContext = new Ctx();
  }
  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
}

async function getAudioContext(): Promise<AudioContext> {
  unlockAudio();
  if (!audioContext) {
    throw new Error("Audio is not supported in this browser");
  }
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
  return audioContext;
}

/** Strip markdown / URLs so TTS reads clean prose. */
export function prepareTextForSpeech(text: string): string {
  if (!text) return text;

  let out = text;
  out = out.replace(/```[\s\S]*?```/g, " ");
  out = out.replace(/`([^`]+)`/g, "$1");
  out = out.replace(/^#{1,6}\s+/gm, "");
  out = out.replace(/\*\*([^*]+)\*\*/g, "$1");
  out = out.replace(/__([^_]+)__/g, "$1");
  out = out.replace(/\*([^*]+)\*/g, "$1");
  out = out.replace(/_([^_]+)_/g, "$1");
  out = out.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");
  out = out.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  out = out.replace(/\b(?:https?:\/\/|www\.)[^\s<>"']+/gi, "");
  out = out.replace(
    /\b[a-z0-9][-a-z0-9]*(?:\.[a-z0-9][-a-z0-9]*)+(?:\/[^\s]*)?/gi,
    "",
  );
  out = out.replace(/\band\/or\b/gi, "and or");
  let prev = "";
  while (prev !== out) {
    prev = out;
    out = out.replace(/(\w+(?:[-']\w+)*)\s*\/\s*(\w+(?:[-']\w+)*)/g, "$1 or $2");
  }
  out = out.replace(/\s{2,}/g, " ");
  return out.trim();
}

export function getSpeakSnapshot(): SpeakSnapshot {
  return snapshot;
}

/** @deprecated use getSpeakSnapshot().id */
export function getSpeakingId(): string | null {
  return snapshot.status === "idle" ? null : snapshot.id;
}

export function subscribeSpeaking(listener: () => void): () => void {
  window.addEventListener(SPEAK_CHANGE, listener);
  return () => window.removeEventListener(SPEAK_CHANGE, listener);
}

export function subscribePrefetch(listener: () => void): () => void {
  window.addEventListener(PREFETCH_CHANGE, listener);
  return () => window.removeEventListener(PREFETCH_CHANGE, listener);
}

export function isSpeakCached(id: string, text: string): boolean {
  const cleaned = prepareTextForSpeech(text);
  const entry = cache.get(id);
  return Boolean(entry && entry.textKey === cleaned);
}

export function isSpeakPrefetching(id: string): boolean {
  return inflight.has(id);
}

function trimCache(keepId?: string): void {
  while (cache.size > MAX_CACHE_ENTRIES) {
    let evict: string | undefined;
    for (const key of cache.keys()) {
      if (key !== keepId) {
        evict = key;
        break;
      }
    }
    if (!evict) break;
    cache.delete(evict);
  }
}

async function fetchTtsAudio(
  cleaned: string,
  signal: AbortSignal,
): Promise<ArrayBuffer> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Not signed in");
  }

  const res = await fetch(`${API_BASE_URL}/tts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "audio/mpeg, audio/wav, */*",
    },
    body: JSON.stringify({ text: cleaned }),
    signal,
  });

  if (!res.ok) {
    let message = `Could not speak reply (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string; error?: string };
      message = body.message ?? body.error ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const arrayBuffer = await res.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    throw new Error("Empty audio from TTS");
  }
  return arrayBuffer;
}

export function prefetchSpeak(id: string, text: string): void {
  const cleaned = prepareTextForSpeech(text);
  if (!cleaned) return;

  const existing = cache.get(id);
  if (existing && existing.textKey === cleaned) return;
  if (inflight.has(id)) return;

  notifyPrefetch();

  const controller = new AbortController();
  prefetchControllers.get(id)?.abort();
  prefetchControllers.set(id, controller);

  const promise = fetchTtsAudio(cleaned, controller.signal)
    .then((arrayBuffer) => {
      cache.set(id, { textKey: cleaned, arrayBuffer });
      trimCache(id);
      notifyPrefetch();
      return arrayBuffer;
    })
    .finally(() => {
      if (inflight.get(id) === promise) {
        inflight.delete(id);
      }
      if (prefetchControllers.get(id) === controller) {
        prefetchControllers.delete(id);
      }
      notifyPrefetch();
    });

  inflight.set(id, promise);
  void promise.catch(() => {
    // Prefetch failures stay silent; speakText will surface errors on click.
  });
}

function stopSource(): void {
  if (activeSource) {
    try {
      activeSource.onended = null;
      activeSource.stop();
    } catch {
      // already stopped
    }
    try {
      activeSource.disconnect();
    } catch {
      // ignore
    }
    activeSource = null;
  }
}

function stopProgressLoop(): void {
  if (progressRaf) {
    cancelAnimationFrame(progressRaf);
    progressRaf = 0;
  }
}

function readPlayingTime(): number {
  if (!audioContext || !activeBuffer) return startedAtOffset;
  if (snapshot.status !== "playing") return startedAtOffset;
  const elapsed = audioContext.currentTime - contextStartedAt;
  return Math.min(activeBuffer.duration, Math.max(0, startedAtOffset + elapsed));
}

function startProgressLoop(): void {
  stopProgressLoop();
  const tick = () => {
    if (snapshot.status !== "playing") {
      progressRaf = 0;
      return;
    }
    const currentTime = readPlayingTime();
    if (currentTime !== snapshot.currentTime) {
      setSnapshot({ currentTime });
    }
    progressRaf = requestAnimationFrame(tick);
  };
  progressRaf = requestAnimationFrame(tick);
}

function clearPlayer(keepId = false): void {
  playAbortController?.abort();
  playAbortController = null;
  stopProgressLoop();
  stopSource();
  activeBuffer = null;
  startedAtOffset = 0;
  contextStartedAt = 0;
  setSnapshot({
    id: keepId ? snapshot.id : null,
    status: "idle",
    currentTime: 0,
    duration: keepId ? snapshot.duration : 0,
  });
}

export function stopSpeaking(): void {
  clearPlayer(false);
}

function startSourceAt(offset: number): void {
  if (!audioContext || !activeBuffer || !snapshot.id) return;

  stopSource();
  const clamped = Math.min(Math.max(0, offset), Math.max(0, activeBuffer.duration - 0.01));
  const source = audioContext.createBufferSource();
  source.buffer = activeBuffer;
  source.connect(audioContext.destination);
  const id = snapshot.id;
  source.onended = () => {
    if (activeSource !== source) return;
    activeSource = null;
    // Natural end (not pause/seek stop).
    if (snapshot.id === id && snapshot.status === "playing") {
      stopProgressLoop();
      startedAtOffset = 0;
      setSnapshot({
        id,
        status: "paused",
        currentTime: activeBuffer?.duration ?? 0,
      });
    }
  };
  startedAtOffset = clamped;
  contextStartedAt = audioContext.currentTime;
  activeSource = source;
  source.start(0, clamped);
  setSnapshot({
    status: "playing",
    currentTime: clamped,
    duration: activeBuffer.duration,
  });
  startProgressLoop();
}

export function pauseSpeak(): void {
  if (snapshot.status !== "playing" || !activeBuffer) return;
  const currentTime = readPlayingTime();
  stopProgressLoop();
  stopSource();
  startedAtOffset = currentTime;
  setSnapshot({ status: "paused", currentTime });
}

export function resumeSpeak(): void {
  if (snapshot.status !== "paused" || !activeBuffer) return;
  unlockAudio();
  void getAudioContext().then(() => {
    if (snapshot.status !== "paused" || !activeBuffer) return;
    startSourceAt(startedAtOffset >= (activeBuffer.duration - 0.05) ? 0 : startedAtOffset);
  });
}

export function seekSpeak(time: number): void {
  if (!activeBuffer || !snapshot.id) return;
  const clamped = Math.min(Math.max(0, time), activeBuffer.duration);
  const wasPlaying = snapshot.status === "playing";
  stopProgressLoop();
  stopSource();
  startedAtOffset = clamped;
  setSnapshot({ currentTime: clamped });
  if (wasPlaying) {
    startSourceAt(clamped);
  } else {
    setSnapshot({ status: "paused", currentTime: clamped });
  }
}

async function ensureArrayBuffer(
  id: string,
  cleaned: string,
  signal: AbortSignal,
): Promise<ArrayBuffer> {
  const cached = cache.get(id);
  if (cached && cached.textKey === cleaned) {
    return cached.arrayBuffer;
  }

  const pending = inflight.get(id);
  if (pending) {
    try {
      const arrayBuffer = await pending;
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      const after = cache.get(id);
      if (after && after.textKey === cleaned) {
        return after.arrayBuffer;
      }
      return arrayBuffer;
    } catch {
      // Fall through.
    }
  }

  const arrayBuffer = await fetchTtsAudio(cleaned, signal);
  cache.set(id, { textKey: cleaned, arrayBuffer });
  trimCache(id);
  notifyPrefetch();
  return arrayBuffer;
}

async function decodeForId(
  id: string,
  cleaned: string,
  arrayBuffer: ArrayBuffer,
): Promise<AudioBuffer> {
  const entry = cache.get(id);
  if (entry?.textKey === cleaned && entry.audioBuffer) {
    return entry.audioBuffer;
  }
  const ctx = await getAudioContext();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
  cache.set(id, {
    textKey: cleaned,
    arrayBuffer,
    audioBuffer,
  });
  trimCache(id);
  return audioBuffer;
}

/**
 * Toggle playback for a message: start, pause, or resume.
 */
export async function speakText(id: string, text: string): Promise<void> {
  unlockAudio();

  const cleaned = prepareTextForSpeech(text);
  if (!cleaned) return;

  if (snapshot.id === id && snapshot.status === "playing") {
    pauseSpeak();
    return;
  }
  if (snapshot.id === id && snapshot.status === "paused") {
    resumeSpeak();
    return;
  }

  playAbortController?.abort();
  stopProgressLoop();
  stopSource();

  const controller = new AbortController();
  playAbortController = controller;
  setSnapshot({
    id,
    status: "loading",
    currentTime: 0,
    duration: 0,
  });

  try {
    const arrayBuffer = await ensureArrayBuffer(id, cleaned, controller.signal);
    if (controller.signal.aborted || snapshot.id !== id) return;

    const audioBuffer = await decodeForId(id, cleaned, arrayBuffer);
    if (controller.signal.aborted || snapshot.id !== id) return;

    activeBuffer = audioBuffer;
    startedAtOffset = 0;
    setSnapshot({
      id,
      status: "paused",
      currentTime: 0,
      duration: audioBuffer.duration,
    });
    startSourceAt(0);
  } catch (err) {
    if (controller.signal.aborted) {
      return;
    }
    clearPlayer(false);
    throw err;
  } finally {
    if (playAbortController === controller) {
      playAbortController = null;
    }
  }
}

export function formatSpeakTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const whole = Math.floor(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
