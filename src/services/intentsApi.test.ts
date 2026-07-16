import { beforeEach, describe, expect, it, vi } from "vitest";
import { confirmActionRun, dismissIntent, listIntents } from "./intentsApi";

vi.mock("./auth", () => ({
  getAccessToken: vi.fn(async () => "test-token"),
}));

describe("intentsApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("lists open intents", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json([{ id: "i1", kind: "remind", status: "open", summary: "Call Mom" }]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const rows = await listIntents();
    expect(rows).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/intents?status=open");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
  });

  it("dismisses an intent", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ id: "i1", status: "dismissed" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const row = await dismissIntent("i1");
    expect(row.status).toBe("dismissed");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/intents/i1/dismiss");
    expect(init.method).toBe("POST");
  });

  it("confirms an action run", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ id: "r1", status: "succeeded" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const row = await confirmActionRun("r1");
    expect(row.status).toBe("succeeded");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/action-runs/r1/confirm");
    expect(init.method).toBe("POST");
  });
});
