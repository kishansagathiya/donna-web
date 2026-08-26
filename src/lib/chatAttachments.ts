export type ChatAttachmentKind = "file" | "url";

export type ChatAttachmentPayload = {
  kind: ChatAttachmentKind;
  filename?: string;
  mime?: string;
  data_base64?: string;
  url?: string;
};

/** Client-side pending attachment before/while sending. */
export type PendingAttachment = {
  id: string;
  kind: ChatAttachmentKind;
  filename: string;
  mime?: string;
  /** Object URL for image preview (revoke after remove/send). */
  previewUrl?: string;
  /** Payload sent to /chat */
  payload: ChatAttachmentPayload;
};

const MAX_CHAT_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const MAX_CHAT_ATTACHMENTS = 10;
export const CHAT_IMAGE_MAX_EDGE = 1568;
export const CHAT_IMAGE_JPEG_QUALITY = 0.82;

export const CHAT_ATTACH_ACCEPT =
  "image/*,image/heic,image/heif,.heic,.heif,.pdf,.txt,.md,.doc,.docx,.csv,.json,.html";

export function isImageMime(mime?: string): boolean {
  return Boolean(mime && mime.startsWith("image/"));
}

/** iOS Photos often omit `file.type` for HEIC; fall back to the filename. */
export function resolveChatMime(file: Pick<File, "type" | "name">): string {
  return file.type || guessMime(file.name);
}

/**
 * Copy selected files before resetting the input.
 * Safari's FileList is live, so clearing `input.value` empties a stored FileList.
 */
export function takeSelectedFiles(input: HTMLInputElement): File[] {
  const files = Array.from(input.files ?? []);
  input.value = "";
  return files;
}

/** Coarse pointers (phones) get an unfiltered picker so iOS shows Photo Library. */
export function chatAttachAcceptForViewport(
  matchMedia: (query: string) => { matches: boolean } = (query) =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query)
      : { matches: false },
): string | undefined {
  return matchMedia("(pointer: coarse)").matches
    ? undefined
    : CHAT_ATTACH_ACCEPT;
}

export function scaledImageSize(
  width: number,
  height: number,
  maxEdge = CHAT_IMAGE_MAX_EDGE,
): { width: number; height: number } {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const edge = Math.max(w, h);
  if (edge <= maxEdge) {
    return { width: w, height: h };
  }
  const scale = maxEdge / edge;
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}

export async function fileToChatAttachment(file: File): Promise<PendingAttachment> {
  if (file.size > MAX_CHAT_ATTACHMENT_BYTES) {
    throw new Error("File is too large (max 15MB)");
  }
  const mime = resolveChatMime(file);
  const compressed = isImageMime(mime) ? await compressImageForChat(file, mime) : null;
  const source = compressed?.blob ?? file;
  const outMime = compressed?.mime ?? mime;
  const filename = compressed?.filename ?? (file.name || "attachment");
  const dataUrl = await readFileAsDataURL(source);
  const base64 = dataUrl.includes("base64,")
    ? dataUrl.slice(dataUrl.indexOf("base64,") + "base64,".length)
    : dataUrl;
  const previewUrl = isImageMime(outMime)
    ? URL.createObjectURL(compressed?.blob ?? file)
    : undefined;
  return {
    id: crypto.randomUUID(),
    kind: "file",
    filename,
    mime: outMime,
    previewUrl,
    payload: {
      kind: "file",
      filename,
      mime: outMime,
      data_base64: base64,
    },
  };
}

export function urlToChatAttachment(rawUrl: string): PendingAttachment {
  const url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("Enter an http(s) URL");
  }
  let hostname = url;
  try {
    hostname = new URL(url).hostname || url;
  } catch {
    throw new Error("Invalid URL");
  }
  return {
    id: crypto.randomUUID(),
    kind: "url",
    filename: hostname,
    payload: {
      kind: "url",
      url,
    },
  };
}

export function revokePendingAttachment(att: PendingAttachment): void {
  if (att.previewUrl) {
    URL.revokeObjectURL(att.previewUrl);
  }
}

export function assertAttachmentBudget(currentCount: number, adding = 1): void {
  if (currentCount + adding > MAX_CHAT_ATTACHMENTS) {
    throw new Error(`You can attach up to ${MAX_CHAT_ATTACHMENTS} items per message`);
  }
}

async function compressImageForChat(
  file: File,
  mime: string,
): Promise<{ blob: Blob; mime: string; filename: string } | null> {
  if (mime === "image/gif" || mime === "image/svg+xml") {
    return null;
  }
  if (typeof createImageBitmap !== "function") {
    return null;
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }
  try {
    const { width, height } = scaledImageSize(bitmap.width, bitmap.height);
    const alreadySmall =
      width === bitmap.width &&
      height === bitmap.height &&
      file.size <= 400_000;
    if (alreadySmall) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);

    const outputMime = mime === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        resolve,
        outputMime,
        outputMime === "image/jpeg" ? CHAT_IMAGE_JPEG_QUALITY : undefined,
      );
    });
    if (!blob || blob.size >= file.size) {
      return null;
    }
    return {
      blob,
      mime: blob.type || outputMime,
      filename: rewriteImageFilename(file.name || "photo", blob.type || outputMime),
    };
  } finally {
    bitmap.close();
  }
}

export function rewriteImageFilename(filename: string, mime: string): string {
  const ext = mime === "image/png" ? ".png" : mime === "image/webp" ? ".webp" : ".jpg";
  const trimmed = filename.trim() || "photo";
  return trimmed.replace(/\.[a-z0-9]+$/i, "") + ext;
}

function readFileAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

function guessMime(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".txt") || lower.endsWith(".md")) return "text/plain";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".heif")) return "image/heif";
  return "application/octet-stream";
}
