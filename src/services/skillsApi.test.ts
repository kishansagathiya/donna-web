import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth", () => ({
  getAccessToken: vi.fn(async () => "test-token"),
}));

vi.mock("./errorReporting", () => ({
  reportError: vi.fn(),
}));

function skill(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "skill-1",
    user_id: "user-1",
    name: "flight-prefs",
    description: "airline prefs",
    content: "Always United, aisle.",
    source: "user",
    version: 1,
    created_at: "2026-08-20T00:00:00Z",
    updated_at: "2026-08-20T00:00:00Z",
    ...overrides,
  };
}

describe("skillsApi", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    const { getAccessToken } = await import("./auth");
    vi.mocked(getAccessToken).mockResolvedValue("test-token");
  });

  it("listSkills sends auth + returns skills", async () => {
    const { listSkills } = await import("./skillsApi");
    const fetchMock = vi.fn().mockResolvedValue(Response.json([skill()]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listSkills()).resolves.toEqual([skill()]);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/skills");
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer test-token");
  });

  it("createSkill posts the draft", async () => {
    const { createSkill } = await import("./skillsApi");
    const fetchMock = vi.fn().mockResolvedValue(Response.json(skill()));
    vi.stubGlobal("fetch", fetchMock);

    await createSkill({
      name: "flight-prefs",
      description: "airline prefs",
      content: "Always United, aisle.",
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/skills");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      name: "flight-prefs",
      description: "airline prefs",
      content: "Always United, aisle.",
    });
  });

  it("createSkillFromRaw posts raw markdown", async () => {
    const { createSkillFromRaw } = await import("./skillsApi");
    const fetchMock = vi.fn().mockResolvedValue(Response.json(skill()));
    vi.stubGlobal("fetch", fetchMock);

    await createSkillFromRaw("---\nname: flight-prefs\n---\n\nBody");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      raw: "---\nname: flight-prefs\n---\n\nBody",
    });
  });

  it("updateSkill patches and deleteSkill deletes", async () => {
    const { updateSkill, deleteSkill } = await import("./skillsApi");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(skill({ version: 2 })))
      .mockResolvedValueOnce(Response.json({ deleted: true }));
    vi.stubGlobal("fetch", fetchMock);

    await updateSkill("skill-1", { content: "Updated." });
    await deleteSkill("skill-1");

    const [patchUrl, patchInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(patchUrl).toBe("/skills/skill-1");
    expect(patchInit.method).toBe("PATCH");

    const [deleteUrl, deleteInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(deleteUrl).toBe("/skills/skill-1");
    expect(deleteInit.method).toBe("DELETE");
  });

  it("surfaces API errors", async () => {
    const { deleteSkill } = await import("./skillsApi");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({ error: "skill_not_found" }, { status: 404 }),
      ),
    );
    await expect(deleteSkill("missing")).rejects.toThrow("skill_not_found");
  });

  it("parseSkillMdFrontmatter extracts fields", async () => {
    const { parseSkillMdFrontmatter } = await import("./skillsApi");
    const parsed = parseSkillMdFrontmatter(
      "---\nname: trip-planning\ndescription: Plans trips\n---\n\nBody here.",
    );
    expect(parsed.name).toBe("trip-planning");
    expect(parsed.description).toBe("Plans trips");
    expect(parsed.content).toBe("Body here.");

    const none = parseSkillMdFrontmatter("no frontmatter");
    expect(none.name).toBe("");
    expect(none.content).toBe("no frontmatter");
  });

  it("renderSkillMd round-trips through parseSkillMdFrontmatter", async () => {
    const { renderSkillMd, parseSkillMdFrontmatter } = await import("./skillsApi");
    const md = renderSkillMd({
      name: "trip-planning",
      description: "Plans trips",
      content: "1. Ask dates.",
    });
    const parsed = parseSkillMdFrontmatter(md);
    expect(parsed.name).toBe("trip-planning");
    expect(parsed.description).toBe("Plans trips");
    expect(parsed.content).toBe("1. Ask dates.");
  });
});
