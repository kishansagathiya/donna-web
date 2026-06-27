import { resampleLinear } from "./pcm";

export type AudioCaptureOptions = {
  sampleRate: number;
  channels: number;
  bufferLength: number;
  onAudioReady: (samples: Float32Array) => void;
};

export type AudioCaptureResult =
  | { status: "ok" }
  | { status: "error"; message: string };

export class BrowserAudioCapture {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private options: AudioCaptureOptions | null = null;

  configure(options: AudioCaptureOptions): void {
    this.options = options;
  }

  async start(): Promise<AudioCaptureResult> {
    if (!this.options) {
      return { status: "error", message: "Audio capture not configured" };
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: this.options.channels,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch {
      return { status: "error", message: "Microphone permission denied" };
    }

    try {
      this.context = new AudioContext();
      if (this.context.state === "suspended") {
        await this.context.resume();
      }

      this.source = this.context.createMediaStreamSource(this.stream);
      const bufferSize = 4096;
      this.processor = this.context.createScriptProcessor(
        bufferSize,
        this.options.channels,
        this.options.channels,
      );

      const targetRate = this.options.sampleRate;
      const nativeRate = this.context.sampleRate;
      const { onAudioReady } = this.options;

      this.processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        const copy = new Float32Array(input.length);
        copy.set(input);
        const resampled = resampleLinear(copy, nativeRate, targetRate);
        onAudioReady(resampled);
      };

      this.source.connect(this.processor);
      const silentGain = this.context.createGain();
      silentGain.gain.value = 0;
      this.processor.connect(silentGain);
      silentGain.connect(this.context.destination);

      return { status: "ok" };
    } catch (err) {
      this.stop();
      return {
        status: "error",
        message:
          err instanceof Error ? err.message : "Failed to start recording",
      };
    }
  }

  stop(): void {
    this.processor?.disconnect();
    this.source?.disconnect();
    this.processor = null;
    this.source = null;

    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }

    if (this.context) {
      void this.context.close();
      this.context = null;
    }
  }
}
