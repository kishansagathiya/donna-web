import {
  fileToChatAttachment,
  isImageMime,
  resolveChatMime,
  revokePendingAttachment,
  takeSelectedFiles,
  type ChatAttachmentPayload,
  type PendingAttachment,
} from "./chatAttachments";

export const NOTE_IMAGE_ACCEPT =
  "image/*,image/heic,image/heif,.heic,.heif";
export const MAX_NOTE_IMAGES = 10;

export type { ChatAttachmentPayload, PendingAttachment };

export function noteImageAcceptForViewport(
  matchMedia: (query: string) => { matches: boolean } = (query) =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query)
      : { matches: false },
): string | undefined {
  return matchMedia("(pointer: coarse)").matches
    ? undefined
    : NOTE_IMAGE_ACCEPT;
}

export function payloadsFromPending(
  attachments: PendingAttachment[],
): ChatAttachmentPayload[] {
  return attachments.map((att) => att.payload);
}

export function assertNoteImageBudget(currentCount: number, adding = 1): void {
  if (currentCount + adding > MAX_NOTE_IMAGES) {
    throw new Error(`You can attach up to ${MAX_NOTE_IMAGES} photos per note`);
  }
}

export {
  isImageMime,
  revokePendingAttachment,
  takeSelectedFiles,
};

export async function filesToNoteImages(files: File[]): Promise<PendingAttachment[]> {
  if (files.length === 0) {
    return [];
  }
  const nonImages = files.filter(
    (file) => !isImageMime(resolveChatMime(file)),
  );
  if (nonImages.length > 0) {
    throw new Error("Only images can be attached to notes");
  }
  return Promise.all(files.map((file) => fileToChatAttachment(file)));
}
