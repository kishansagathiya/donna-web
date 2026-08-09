/**
 * Browser AEC only cancels audio it treats as a WebRTC "remote" participant.
 * Local Web Audio → speakers is invisible to that canceller, so Donna's voice
 * bleeds into the mic. Route playback through a local peer-connection loopback
 * and play the remote stream via an <audio> element instead.
 *
 * See: https://cv.nguyenbinh.dev/browser-aec/
 */

type AecRoute = {
  /** Connect BufferSources here (not ctx.destination). */
  input: MediaStreamAudioDestinationNode;
  close: () => void;
};

let routePromise: Promise<AecRoute> | null = null;
let route: AecRoute | null = null;

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
    outbound.addTrack(track, localStream);
  }

  const offer = await outbound.createOffer();
  await outbound.setLocalDescription(offer);
  await inbound.setRemoteDescription(offer);
  const answer = await inbound.createAnswer();
  await inbound.setLocalDescription(answer);
  await outbound.setRemoteDescription(answer);

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
      const input = ctx.createMediaStreamDestination();
      const { remoteStream, close: closeLoopback } =
        await createLoopbackStream(input.stream);

      const el = document.createElement("audio");
      el.autoplay = true;
      el.setAttribute("playsinline", "true");
      el.srcObject = remoteStream;
      // Keep element attached so autoplay/AEC stay tied to the document.
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
