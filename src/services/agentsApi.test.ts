import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth", () => ({
  getAccessToken: vi.fn(async () => "test-token"),
}));

vi.mock("./errorReporting", () => ({
  reportError: vi.fn(),
}));

function run(id: string) {
  return {
    id,
    user_id: "user-1",
    goal: "Book a flight",
    status: "succeeded",
    max_steps: 80,
    step_count: 3,
    created_at: "2026-08-14T00:00:00Z",
    updated_at: "2026-08-14T00:00:00Z",
  };
}

describe("listAgentRuns", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    const { getAccessToken } = await import("./auth");
    vi.mocked(getAccessToken).mockResolvedValue("test-token");
  });

  it("dedupes concurrent list requests", async () => {
    const { listAgentRuns } = await import("./agentsApi");
    let resolveFetch: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const a = listAgentRuns();
    const b = listAgentRuns();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());

    resolveFetch!(Response.json([run("run-1")]));
    await expect(Promise.all([a, b])).resolves.toEqual([
      [run("run-1")],
      [run("run-1")],
    ]);
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("/agent-runs?limit=50");
  });

  it("retries once after a network error", async () => {
    const { listAgentRuns } = await import("./agentsApi");
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(
        new TypeError("NetworkError when attempting to fetch resource"),
      )
      .mockResolvedValueOnce(Response.json([run("run-2")]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listAgentRuns()).resolves.toEqual([run("run-2")]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("skips in-flight dedupe when fresh is requested", async () => {
    const { listAgentRuns } = await import("./agentsApi");
    let resolveFirst: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          if (!resolveFirst) {
            resolveFirst = resolve;
            return;
          }
          resolve(Response.json([run("run-fresh")]));
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const stale = listAgentRuns();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const fresh = listAgentRuns(undefined, { fresh: true });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    resolveFirst!(Response.json([run("run-stale")]));
    await expect(stale).resolves.toEqual([run("run-stale")]);
    await expect(fresh).resolves.toEqual([run("run-fresh")]);
  });
});
