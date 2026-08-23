import { describe, expect, it } from "vitest";
import { preferHighQualityOpus } from "./aecLoopback";

describe("preferHighQualityOpus", () => {
  it("raises Opus bitrate and playback rate on fmtp lines", () => {
    const sdp = [
      "v=0",
      "m=audio 9 UDP/TLS/RTP/SAVPF 111",
      "a=rtpmap:111 opus/48000/2",
      "a=fmtp:111 minptime=10;useinbandfec=1",
      "",
    ].join("\r\n");

    const next = preferHighQualityOpus(sdp);
    expect(next).toContain("a=fmtp:111 minptime=10;useinbandfec=1");
    expect(next).toContain("maxaveragebitrate=128000");
    expect(next).toContain("maxplaybackrate=48000");
  });

  it("rewrites existing low bitrate instead of duplicating", () => {
    const sdp = [
      "m=audio 9 UDP/TLS/RTP/SAVPF 111",
      "a=rtpmap:111 opus/48000/2",
      "a=fmtp:111 minptime=10;useinbandfec=1;maxaveragebitrate=32000;maxplaybackrate=16000",
      "",
    ].join("\r\n");

    const next = preferHighQualityOpus(sdp);
    expect(next.match(/maxaveragebitrate=/g)).toHaveLength(1);
    expect(next).toContain("maxaveragebitrate=128000");
    expect(next).toContain("maxplaybackrate=48000");
    expect(next).not.toContain("maxaveragebitrate=32000");
  });

  it("leaves non-Opus fmtp lines alone", () => {
    const sdp = [
      "a=rtpmap:96 telephone-event/8000",
      "a=fmtp:96 0-15",
      "",
    ].join("\r\n");
    expect(preferHighQualityOpus(sdp)).toBe(sdp);
  });
});
