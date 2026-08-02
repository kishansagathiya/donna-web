import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUDIO_CHANNELS,
  AUDIO_SAMPLE_RATE,
  LIVE_VOICE_WS_URL,
} from "../config";
import { getAccessToken } from "../services/auth";
import { BrowserAudioCapture } from "../voice/browserCapture";
import { floatToPcm16, pcm16ToBase64 } from "../voice/pcm";
import {
  createStreamingPlayback,
  stopActivePlayback,
} from "../voice/playback";
import { LiveVoiceClient } from "../liveVoice/liveVoiceClient";
import type { LiveServerMessage } from "../liveVoice/protocol";

export type LiveVoiceState = "idle" | "connecting" | "live" | "error";

export type LiveTranscriptLine = {
  id: string;
  role: "user" | "assistant";
  text: string;
  final: boolean;
};

export function useLiveVoiceSession() {
  const [state, setState] = useState<LiveVoiceState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lines, setLines] = useState<LiveTranscriptLine[]>([]);

  const clientRef = useRef<LiveVoiceClient | null>(null);
  const captureRef = useRef<BrowserAudioCapture | null>(null);
  const playbackRef = useRef<ReturnType<typeof createStreamingPlayback> | null>(
    null,
  );
  const activeRef = useRef(false);
  const readyRef = useRef(false);
  const lineIdRef = useRef(0);

  const stopCapture = useCallback(() => {
    activeRef.current = false;
    readyRef.current = false;
    captureRef.current?.stop();
  }, []);

  const clearPlayback = useCallback(() => {
    playbackRef.current?.stop();
    playbackRef.current = null;
    stopActivePlayback();
  }, []);

  const fail = useCallback(
    (message: string) => {
      stopCapture();
      clearPlayback();
      if (clientRef.current?.isConnected) {
        try {
          clientRef.current.disconnect();
        } catch {
          // ignore
        }
      }
      setState("error");
      setErrorMsg(message);
    },
    [clearPlayback, stopCapture],
  );

  const appendTranscript = useCallback(
    (role: "user" | "assistant", text: string, final: boolean) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setLines((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === role && !last.final) {
          const next = [...prev];
          next[next.length - 1] = {
            ...last,
            text: final ? trimmed : `${last.text} ${trimmed}`.trim(),
            final,
          };
          return next;
        }
        lineIdRef.current += 1;
        return [
          ...prev,
          {
            id: `live-${lineIdRef.current}`,
            role,
            text: trimmed,
            final,
          },
        ];
      });
    },
    [],
  );

  const handleMessage = useCallback(
    (message: LiveServerMessage) => {
      switch (message.type) {
        case "session.ready":
          readyRef.current = true;
          setState("live");
          break;
        case "audio.chunk":
          if (!playbackRef.current) {
            playbackRef.current = createStreamingPlayback();
          }
          playbackRef.current.enqueue({
            format: "pcm16",
            data: message.data,
            sampleRate: message.sampleRate ?? 24_000,
            channels: message.channels ?? 1,
          });
          break;
        case "transcript":
          appendTranscript(message.role, message.text, Boolean(message.final));
          break;
        case "interrupted":
          clearPlayback();
          break;
        case "error":
          fail(message.message || "Voice session error");
          break;
        case "session.ended":
          stopCapture();
          clearPlayback();
          if (clientRef.current?.isConnected) {
            try {
              clientRef.current.disconnect();
            } catch {
              // ignore
            }
          }
          setState("idle");
          break;
        default:
          break;
      }
    },
    [appendTranscript, clearPlayback, fail, stopCapture],
  );

  const ensureClient = useCallback(() => {
    if (!clientRef.current) {
      const client = new LiveVoiceClient(LIVE_VOICE_WS_URL);
      client.setHandlers({
        onMessage: handleMessage,
        onError: (message) => fail(message),
        onClose: () => {
          if (activeRef.current) {
            fail("Disconnected from Donna Voice");
          }
        },
      });
      clientRef.current = client;
    }
    return clientRef.current;
  }, [fail, handleMessage]);

  const ensureCapture = useCallback(() => {
    if (!captureRef.current) {
      const capture = new BrowserAudioCapture();
      capture.configure({
        sampleRate: AUDIO_SAMPLE_RATE,
        channels: AUDIO_CHANNELS,
        bufferLength: Math.floor(AUDIO_SAMPLE_RATE * 0.1),
        onAudioReady: (samples) => {
          if (!activeRef.current || !readyRef.current) return;
          if (!clientRef.current?.isConnected) return;
          const pcm = floatToPcm16(samples);
          clientRef.current.send({
            type: "audio.chunk",
            data: pcm16ToBase64(pcm),
          });
        },
      });
      captureRef.current = capture;
    }
    return captureRef.current;
  }, []);

  const end = useCallback(async () => {
    stopCapture();
    clearPlayback();
    if (clientRef.current?.isConnected) {
      try {
        clientRef.current.send({ type: "session.end" });
      } catch {
        // ignore
      }
      try {
        clientRef.current.disconnect();
      } catch {
        // ignore
      }
    }
    setState("idle");
  }, [clearPlayback, stopCapture]);

  const start = useCallback(async () => {
    if (state === "connecting" || state === "live") return;
    setErrorMsg(null);
    setLines([]);
    setState("connecting");

    const client = ensureClient();
    const capture = ensureCapture();

    try {
      const token = await getAccessToken();
      await client.connect(token ?? undefined);
      activeRef.current = true;
      client.send({ type: "session.start" });
      const result = await capture.start();
      if (result.status === "error") {
        fail(result.message);
      }
    } catch (err) {
      fail(
        err instanceof Error
          ? err.message
          : "Could not start Voice conversation",
      );
    }
  }, [ensureCapture, ensureClient, fail, state]);

  const toggle = useCallback(async () => {
    if (state === "live" || state === "connecting") {
      await end();
      return;
    }
    await start();
  }, [end, start, state]);

  useEffect(() => {
    return () => {
      void end();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    state,
    errorMsg,
    lines,
    start,
    end,
    toggle,
  };
}
