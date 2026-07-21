import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import {
  clearFailedMutation,
  listFailedMutations,
  previewFromContent,
  pushFailedMutation,
  upsertNoteInFeeds,
  type NotesFeedPage,
} from "./notesCache";
import { notesPersistStorageKey, notesQueryKeys } from "./notesQueryKeys";
import type { InfiniteData } from "@tanstack/react-query";

describe("notesQueryKeys", () => {
  it("scopes keys and persist storage by user", () => {
    expect(notesQueryKeys.all("user-a")[1]).toBe("user-a");
    expect(notesPersistStorageKey("user-a")).toBe("donna-notes-v2:user-a");
    expect(notesPersistStorageKey("user-a")).not.toBe(
      notesPersistStorageKey("user-b"),
    );
  });
});

describe("notesCache", () => {
  it("builds optimistic title/preview from content", () => {
    expect(previewFromContent("Hello\nWorld details")).toEqual({
      title: "Hello",
      preview: "World details",
    });
  });

  it("upserts notes into the curated feed and tracks failed mutations", () => {
    const client = new QueryClient();
    const userId = "user-1";
    upsertNoteInFeeds(
      client,
      userId,
      {
        id: "n1",
        title: "Hello",
        preview: "World",
        note_date: "2026-07-21T00:00:00.000Z",
        is_important: false,
        is_urgent: false,
        source_type: "manual",
        keywords: null,
        category: null,
        has_audio: false,
        tags: ["work", "ideas"],
      },
      { curated: true },
    );

    const feed = client.getQueryData<InfiniteData<NotesFeedPage>>(
      notesQueryKeys.feed(userId, { curated: true }),
    );
    expect(feed?.pages[0]?.items[0]?.id).toBe("n1");

    // Update responses omit tags — must not wipe cached chips.
    upsertNoteInFeeds(
      client,
      userId,
      {
        id: "n1",
        title: "Hello edited",
        preview: "World",
        note_date: "2026-07-21T00:00:00.000Z",
        is_important: false,
        is_urgent: false,
        source_type: "manual",
        keywords: null,
        category: null,
        has_audio: false,
      },
      { curated: true },
    );
    const after = client.getQueryData<InfiniteData<NotesFeedPage>>(
      notesQueryKeys.feed(userId, { curated: true }),
    );
    expect(after?.pages[0]?.items[0]?.tags).toEqual(["work", "ideas"]);

    pushFailedMutation(client, userId, {
      id: "create:n1",
      noteId: "n1",
      action: "create",
      message: "network down",
      createdAt: "2026-07-21T00:00:00.000Z",
    });
    expect(listFailedMutations(client, userId)).toHaveLength(1);
    clearFailedMutation(client, userId, "n1", "create");
    expect(listFailedMutations(client, userId)).toHaveLength(0);
  });
});
