/**
 * Browser AEC only cancels audio it treats as a WebRTC "remote" participant.
 * Local Web Audio → speakers is invisible to that canceller, so Donna's voice
 * bleeds into the mic. Feed a copy of playback through a local peer-connection
 * loopback so getUserMedia echoCancellation has a far-end reference.
 *
 * Hearing that Opus loopback directly sounds muffled / telephone-like, so the
 * audible path stays native Web Audio (PCM → destination). The remote <audio>
 * element stays muted; Chrome still associates the PeerConnection track with
 * the tab's capture AEC. Live Voice also soft-gates mic send while Donna is
 * speaking as a backup against residual echo.
 *
 * See: https://cv.nguyenbinh.dev/browser-aec/
 */

type AecRoute = {
  /**
   * Connect BufferSources here. Fans out to:
   * - ctx.destination (clean audible PCM)
   * - MediaStreamDestination → WebRTC (AEC reference)
   */
  input: GainNode;
  close: () => void;
};

let routePromise: Promise<AecRoute> | null = null;
let route: AecRoute | null = null;

function opusPayloadTypes(sdp: string): Set<string> {
  const payloads = new Set<string>();
  for (const line of sdp.split(/\r?\n/)) {
    const match = /^a=rtpmap:(\d+) opus\/\d+/i.exec(line);
    if (match) {
      payloads.add(match[1]);
    }
  }
  return payloads;
}

/** Prefer fullband Opus on the AEC reference encode. */
export function preferHighQualityOpus(sdp: string): string {
  const opusPayloads = opusPayloadTypes(sdp);
  if (opusPayloads.size === 0) {
    return sdp;
  }

  return sdp.replace(/a=fmtp:(\d+) ([^\r\n]*)/g, (line, payload, params) => {
    if (!opusPayloads.has(payload)) {
      return line;
    }

    let next = params;
    if (!/maxaveragebitrate=/i.test(next)) {
      next += ";maxaveragebitrate=128000";
    } else {
      next = next.replace(/maxaveragebitrate=\d+/i, "maxaveragebitrate=128000");
    }
    if (!/maxplaybackrate=/i.test(next)) {
      next += ";maxplaybackrate=48000";
    } else {
      next = next.replace(/maxplaybackrate=\d+/i, "maxplaybackrate=48000");
    }
    if (!/useinbandfec=/i.test(next)) {
      next += ";useinbandfec=1";
    }
    return `a=fmtp:${payload} ${next}`;
  });
}

async function raiseSenderBitrate(pc: RTCPeerConnection): Promise<void> {
  for (const sender of pc.getSenders()) {
    if (sender.track?.kind !== "audio") continue;
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings[0].maxBitrate = 128_000;
      await sender.setParameters(params);
    } catch {
      // Older engines may reject audio maxBitrate; SDP munging still helps.
    }
  }
}

async function createLoopbackStream(
  localStream: MediaStream,
): Promise<{ remoteStream: MediaStream; close: () => void }> {
  const outbound = new RTCPeerConnection();
  const inbound = new RTCPeerConnection();
  const remoteStream = new MediaStream();

  outbound.onicecandidate = (event) => {
    if (event.candidate) {
      void inbound.addIceCandidate(event.candidate);
    }
  };
  inbound.onicecandidate = (event) => {
    if (event.candidate) {
      void outbound.addIceCandidate(event.candidate);
    }
  };
  inbound.ontrack = (event) => {
    for (const track of event.streams[0]?.getTracks() ?? []) {
      remoteStream.addTrack(track);
    }
  };

  for (const track of localStream.getAudioTracks()) {
    try {
      track.contentHint = "music";
    } catch {
      // contentHint is best-effort.
    }
    outbound.addTrack(track, localStream);
  }

  const offer = await outbound.createOffer();
  const offerSdp = preferHighQualityOpus(offer.sdp ?? "");
  await outbound.setLocalDescription({ type: "offer", sdp: offerSdp });
  await inbound.setRemoteDescription({ type: "offer", sdp: offerSdp });

  const answer = await inbound.createAnswer();
  const answerSdp = preferHighQualityOpus(answer.sdp ?? "");
  await inbound.setLocalDescription({ type: "answer", sdp: answerSdp });
  await outbound.setRemoteDescription({ type: "answer", sdp: answerSdp });
  await raiseSenderBitrate(outbound);

  return {
    remoteStream,
    close: () => {
      outbound.close();
      inbound.close();
      for (const track of remoteStream.getTracks()) {
        track.stop();
      }
    },
  };
}

/**
 * Lazily build a shared AEC-aware playback sink for this tab.
 * Falls back to ctx.destination when WebRTC loopback is unavailable.
 */
export async function ensureAecPlaybackInput(
  ctx: AudioContext,
): Promise<AudioNode> {
  if (route) {
    return route.input;
  }
  if (!routePromise) {
    routePromise = (async () => {
      const input = ctx.createGain();
      input.gain.value = 1;
      // Clean audible path — native PCM, not Opus.
      input.connect(ctx.destination);

      const webrtcDest = ctx.createMediaStreamDestination();
      input.connect(webrtcDest);

      const { remoteStream, close: closeLoopback } =
        await createLoopbackStream(webrtcDest.stream);

      const el = document.createElement("audio");
      el.autoplay = true;
      // Keep the PC track "live" for AEC without playing muffled Opus twice.
      el.muted = true;
      el.setAttribute("playsinline", "true");
      el.srcObject = remoteStream;
      el.style.display = "none";
      document.body.appendChild(el);
      try {
        await el.play();
      } catch {
        // Autoplay may wait for a prior user gesture; live Voice start is one.
      }

      const created: AecRoute = {
        input,
        close: () => {
          closeLoopback();
          try {
            input.disconnect();
          } catch {
            // already disconnected
          }
          try {
            webrtcDest.disconnect();
          } catch {
            // already disconnected
          }
          el.pause();
          el.srcObject = null;
          el.remove();
        },
      };
      route = created;
      return created;
    })().catch((err) => {
      routePromise = null;
      throw err;
    });
  }

  try {
    const created = await routePromise;
    return created.input;
  } catch {
    // Safari / restricted contexts: still play, without AEC reference.
    return ctx.destination;
  }
}

export function disposeAecPlaybackRoute(): void {
  route?.close();
  route = null;
  routePromise = null;
}
