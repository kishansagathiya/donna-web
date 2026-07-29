import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("./auth", () => ({
  getAccessToken: vi.fn(async () => "test-token"),
}));

function okResponse(): Response {
  return new Response(null, { status: 202 });
}

/** Lets the fire-and-forget async IIFE (token fetch + fetch) settle. */
async function flushReports(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function lastCallBody(fetchMock: Mock<typeof fetch>) {
  const [, init] = fetchMock.mock.calls.at(-1)!;
  return JSON.parse(String(init?.body)) as Record<string, unknown>;
}

describe("reportError", () => {
  beforeEach(() => {
    // Fresh module state (fingerprints, session cap) for every test.
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("reports the same fingerprint only once per session", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => okResponse());
    vi.stubGlobal("fetch", fetchMock);
    const { reportError } = await import("./errorReporting");

    reportError(new Error("boom"));
    reportError(new Error("boom"));
    reportError(new Error("boom"));
    await flushReports();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/errors");
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer test-token",
    );

    const body = JSON.parse(String(init?.body));
    expect(body.source).toBe("web");
    expect(body.message).toBe("boom");
    expect(body.route).toBe(window.location.pathname);
    expect(typeof body.stack).toBe("string");
  });

  it("reports different messages separately", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => okResponse());
    vi.stubGlobal("fetch", fetchMock);
    const { reportError } = await import("./errorReporting");

    reportError(new Error("first"));
    reportError(new Error("second"));
    await flushReports();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("caps reports at 20 per page session", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => okResponse());
    vi.stubGlobal("fetch", fetchMock);
    const { reportError } = await import("./errorReporting");

    for (let i = 0; i < 25; i += 1) {
      reportError(new Error(`error-${i}`));
    }
    await flushReports();

    expect(fetchMock).toHaveBeenCalledTimes(20);
  });

  it("never throws on weird input", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => okResponse());
    vi.stubGlobal("fetch", fetchMock);
    const { reportError } = await import("./errorReporting");

    expect(() => reportError(null)).not.toThrow();
    expect(() => reportError(undefined)).not.toThrow();
    expect(() => reportError("plain string")).not.toThrow();
    expect(() => reportError({ code: 42 })).not.toThrow();
    expect(() => reportError(new Error("real error"))).not.toThrow();
    await flushReports();

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(lastCallBody(fetchMock).message).toBe("real error");
  });

  it("swallows fetch failures silently", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      throw new Error("network down");
    });
    vi.stubGlobal("fetch", fetchMock);
    const { reportError } = await import("./errorReporting");

    expect(() => reportError(new Error("boom"))).not.toThrow();
    await flushReports();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends without Authorization when there is no token", async () => {
    const { getAccessToken } = await import("./auth");
    vi.mocked(getAccessToken).mockResolvedValueOnce(null);

    const fetchMock = vi.fn<typeof fetch>(async () => okResponse());
    vi.stubGlobal("fetch", fetchMock);
    const { reportError } = await import("./errorReporting");

    reportError(new Error("signed out boom"));
    await flushReports();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(
      (init?.headers as Record<string, string>).Authorization,
    ).toBeUndefined();
  });

  it("truncates long messages and stacks", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => okResponse());
    vi.stubGlobal("fetch", fetchMock);
    const { reportError } = await import("./errorReporting");

    const err = new Error("m".repeat(1500));
    err.stack = "s".repeat(9000);
    reportError(err);
    await flushReports();

    const body = lastCallBody(fetchMock);
    expect(body.message).toHaveLength(1000);
    expect(body.stack).toHaveLength(8000);
  });

  it("passes context through to the payload", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => okResponse());
    vi.stubGlobal("fetch", fetchMock);
    const { reportError } = await import("./errorReporting");

    reportError(new Error("with context"), { endpoint: "/chat" });
    await flushReports();

    expect(lastCallBody(fetchMock).context).toEqual({ endpoint: "/chat" });
  });
});

describe("initErrorReporting", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("is idempotent and wires up global handlers", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => okResponse());
    vi.stubGlobal("fetch", fetchMock);
    const { initErrorReporting } = await import("./errorReporting");

    initErrorReporting();
    const firstHandler = window.onerror;
    initErrorReporting();

    expect(window.onerror).toBe(firstHandler);
    expect(window.onunhandledrejection).not.toBeNull();
  });
});
