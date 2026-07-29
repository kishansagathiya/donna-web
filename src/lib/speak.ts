/**
 * Read-aloud helper for assistant replies (Web Speech API).
 * Only one utterance plays at a time; subscribe to react to stop/start.
 */

const SPEAKING_CHANGE = "donna-speak-change";

let speakingId: string | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;

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

export function stopSpeaking(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    speakingId = null;
    activeUtterance = null;
    notify();
    return;
  }
  window.speechSynthesis.cancel();
  speakingId = null;
  activeUtterance = null;
  notify();
}

export function speakText(id: string, text: string): void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return;
  }

  const cleaned = prepareTextForSpeech(text);
  if (!cleaned) return;

  if (speakingId === id) {
    stopSpeaking();
    return;
  }

  stopSpeaking();

  const utterance = new SpeechSynthesisUtterance(cleaned);
  utterance.rate = 1.05;
  activeUtterance = utterance;
  speakingId = id;
  notify();

  const clearIfCurrent = () => {
    if (activeUtterance !== utterance) return;
    speakingId = null;
    activeUtterance = null;
    notify();
  };

  utterance.onend = clearIfCurrent;
  utterance.onerror = clearIfCurrent;

  window.speechSynthesis.speak(utterance);
}
