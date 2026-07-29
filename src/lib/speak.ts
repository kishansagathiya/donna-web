/**
 * Read-aloud helper for assistant replies via POST /tts (ElevenLabs).
 * Only one clip plays at a time; subscribe to react to stop/start.
 */

import { API_BASE_URL } from "../config";
import { getAccessToken } from "../services/auth";

const SPEAKING_CHANGE = "donna-speak-change";

let speakingId: string | null = null;
let activeAudio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;
let abortController: AbortController | null = null;

function notify(): void {
  window.dispatchEvent(new Event(SPEAKING_CHANGE));
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

function clearAudio(): void {
  if (activeAudio) {
    activeAudio.onended = null;
    activeAudio.onerror = null;
    activeAudio.pause();
    activeAudio.src = "";
    activeAudio = null;
  }
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
}

export function stopSpeaking(): void {
  abortController?.abort();
  abortController = null;
  clearAudio();
  speakingId = null;
  notify();
}

export async function speakText(id: string, text: string): Promise<void> {
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

    const blob = await res.blob();
    if (controller.signal.aborted || speakingId !== id) {
      return;
    }

    const url = URL.createObjectURL(blob);
    objectUrl = url;
    const audio = new Audio(url);
    activeAudio = audio;

    const clearIfCurrent = () => {
      if (activeAudio !== audio) return;
      clearAudio();
      if (speakingId === id) {
        speakingId = null;
        notify();
      }
    };

    audio.onended = clearIfCurrent;
    audio.onerror = clearIfCurrent;
    await audio.play();
  } catch (err) {
    if (controller.signal.aborted) {
      return;
    }
    speakingId = null;
    clearAudio();
    notify();
    throw err;
  } finally {
    if (abortController === controller) {
      abortController = null;
    }
  }
}
