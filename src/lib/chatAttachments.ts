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

export function isImageMime(mime?: string): boolean {
  return Boolean(mime && mime.startsWith("image/"));
}

export async function fileToChatAttachment(file: File): Promise<PendingAttachment> {
  if (file.size > MAX_CHAT_ATTACHMENT_BYTES) {
    throw new Error("File is too large (max 15MB)");
  }
  const dataUrl = await readFileAsDataURL(file);
  const base64 = dataUrl.includes("base64,")
    ? dataUrl.slice(dataUrl.indexOf("base64,") + "base64,".length)
    : dataUrl;
  const mime = file.type || guessMime(file.name);
  const previewUrl = isImageMime(mime) ? URL.createObjectURL(file) : undefined;
  return {
    id: crypto.randomUUID(),
    kind: "file",
    filename: file.name || "attachment",
    mime,
    previewUrl,
    payload: {
      kind: isImageMime(mime) ? "file" : "file",
      filename: file.name || "attachment",
      mime,
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

function readFileAsDataURL(file: File): Promise<string> {
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
  return "application/octet-stream";
}
