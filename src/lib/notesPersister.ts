import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { del, get, set } from "idb-keyval";
import { notesPersistStorageKey } from "./notesQueryKeys";

const idbStorage = {
  getItem: async (key: string) => {
    const value = await get<string>(key);
    return value ?? null;
  },
  setItem: async (key: string, value: string) => {
    await set(key, value);
  },
  removeItem: async (key: string) => {
    await del(key);
  },
};

export function createNotesPersister(userId: string) {
  return createAsyncStoragePersister({
    storage: idbStorage,
    key: notesPersistStorageKey(userId),
    throttleTime: 500,
  });
}

export async function clearNotesPersistedCache(userId: string): Promise<void> {
  await idbStorage.removeItem(notesPersistStorageKey(userId));
}
