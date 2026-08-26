import { beforeEach, describe, expect, it, vi } from "vitest";
import { cancelReminder, createReminder, listReminders } from "./remindersApi";

vi.mock("./auth", () => ({
  getAccessToken: vi.fn(async () => "test-token"),
}));

describe("remindersApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("lists open reminders", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json([{ id: "r1", title: "Call Mom", status: "scheduled" }]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const rows = await listReminders();
    expect(rows).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/reminders?");
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer test-token");
  });

  it("creates a reminder", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ id: "r1", title: "Call Mom", status: "scheduled" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const row = await createReminder({ title: "Call Mom", when: "tomorrow 4pm" });
    expect(row.id).toBe("r1");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/reminders");
    expect(init.method).toBe("POST");
    expect(init.body).toContain("Call Mom");
  });

  it("cancels a reminder", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ id: "r1", status: "cancelled" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const row = await cancelReminder("r1");
    expect(row.status).toBe("cancelled");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/reminders/r1/cancel");
    expect(init.method).toBe("POST");
  });
});
