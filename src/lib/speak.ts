/**
 * Read-aloud helper for assistant replies via POST /tts (Cartesia by default).
 * Uses AudioContext so playback still works after the TTS network round-trip
 * (HTMLAudioElement.play() often fails once the click gesture has expired).
 */

import { API_BASE_URL } from "../config";
import { getAccessToken } from "../services/auth";

const SPEAKING_CHANGE = "donna-speak-change";

let speakingId: string | null = null;
let audioContext: AudioContext | null = null;
let activeSource: AudioBufferSourceNode | null = null;
let abortController: AbortController | null = null;

function notify(): void {
  window.dispatchEvent(new Event(SPEAKING_CHANGE));
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

export function getSpeakingId(): string | null {
  return speakingId;
}

export function subscribeSpeaking(listener: () => void): () => void {
  window.addEventListener(SPEAKING_CHANGE, listener);
  return () => window.removeEventListener(SPEAKING_CHANGE, listener);
}

function stopSource(): void {
  if (activeSource) {
    try {
      activeSource.stop();
    } catch {
      // already stopped
    }
    activeSource.disconnect();
    activeSource = null;
  }
}

export function stopSpeaking(): void {
  abortController?.abort();
  abortController = null;
  stopSource();
  speakingId = null;
  notify();
}

export async function speakText(id: string, text: string): Promise<void> {
  // Keep the click gesture alive for later playback.
  unlockAudio();

  const cleaned = prepareTextForSpeech(text);
  if (!cleaned) return;

  if (speakingId === id) {
    stopSpeaking();
    return;
  }

  stopSpeaking();
  speakingId = id;
  notify();

  const controller = new AbortController();
  abortController = controller;

  try {
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
      signal: controller.signal,
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

    if (controller.signal.aborted || speakingId !== id) {
      return;
    }

    const arrayBuffer = await res.arrayBuffer();
    if (controller.signal.aborted || speakingId !== id) {
      return;
    }
    if (arrayBuffer.byteLength === 0) {
      throw new Error("Empty audio from TTS");
    }

    const ctx = await getAudioContext();
    // decodeAudioData may detach the buffer; copy for safety across browsers.
    const copy = arrayBuffer.slice(0);
    const buffer = await ctx.decodeAudioData(copy);

    if (controller.signal.aborted || speakingId !== id) {
      return;
    }

    stopSource();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    activeSource = source;
    source.onended = () => {
      if (activeSource === source) {
        activeSource = null;
      }
      if (speakingId === id) {
        speakingId = null;
        notify();
      }
    };
    source.start(0);
  } catch (err) {
    if (controller.signal.aborted) {
      return;
    }
    speakingId = null;
    stopSource();
    notify();
    throw err;
  } finally {
    if (abortController === controller) {
      abortController = null;
    }
  }
}
