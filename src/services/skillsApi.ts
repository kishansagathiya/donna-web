import { API_BASE_URL } from "../config";
import { getAccessToken } from "./auth";
import { reportError } from "./errorReporting";

export type SkillSource = "user" | "agent" | "system";

export type Skill = {
  id?: string;
  user_id?: string;
  name: string;
  description: string;
  content: string;
  source: SkillSource;
  agent_run_id?: string | null;
  version?: number;
  created_at?: string;
  updated_at?: string;
};

export type SkillDraft = {
  name: string;
  description: string;
  content: string;
};

function isGet(init: RequestInit): boolean {
  const method = (init.method ?? "GET").toUpperCase();
  return method === "GET" || method === "HEAD";
}

async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Not signed in");
  }
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const run = () =>
    fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: "no-store" });

  try {
    return await run();
  } catch (err) {
    reportError(err, { endpoint: path });
    if (isGet(init)) {
      try {
        return await run();
      } catch (retryErr) {
        reportError(retryErr, { endpoint: path, retry: "1" });
        throw retryErr;
      }
    }
    throw err;
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string; error?: string };
    return body.message || body.error || res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function listSkills(): Promise<Skill[]> {
  const res = await authorizedFetch("/skills");
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as Skill[];
}

export async function getSkill(id: string): Promise<Skill> {
  const res = await authorizedFetch(`/skills/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as Skill;
}

export async function createSkill(draft: SkillDraft): Promise<Skill> {
  const res = await authorizedFetch("/skills", {
    method: "POST",
    body: JSON.stringify(draft),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as Skill;
}

export async function createSkillFromRaw(raw: string): Promise<Skill> {
  const res = await authorizedFetch("/skills", {
    method: "POST",
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as Skill;
}

export async function updateSkill(
  id: string,
  patch: Partial<SkillDraft>,
): Promise<Skill> {
  const res = await authorizedFetch(`/skills/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as Skill;
}

export async function deleteSkill(id: string): Promise<void> {
  const res = await authorizedFetch(`/skills/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await readError(res));
}

export function exportSkillUrl(id: string): string {
  return `${API_BASE_URL}/skills/${encodeURIComponent(id)}/export`;
}

export async function downloadSkillExport(id: string, name: string): Promise<void> {
  const res = await authorizedFetch(`/skills/${encodeURIComponent(id)}/export`);
  if (!res.ok) throw new Error(await readError(res));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name || "skill"}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function parseSkillMdFrontmatter(
  raw: string,
): { name: string; description: string; content: string } {
  const text = raw.trim();
  if (!text.startsWith("---")) {
    return { name: "", description: "", content: text };
  }
  const rest = text.slice(3);
  const end = rest.indexOf("\n---");
  if (end < 0) {
    return { name: "", description: "", content: text };
  }
  const fm = rest.slice(0, end);
  let body = rest.slice(end + 4);
  if (body.startsWith("---")) body = body.slice(3);
  const nameMatch = fm.match(/^name:\s*(.+)$/m);
  const descMatch = fm.match(/^description:\s*(.+)$/m);
  const unquote = (v: string) =>
    v.trim().replace(/^"(.*)"$/s, "$1").replace(/\\n/g, "\n").replace(/\\"/g, '"');
  return {
    name: nameMatch ? nameMatch[1].trim() : "",
    description: descMatch ? unquote(descMatch[1]) : "",
    content: body.trim(),
  };
}

export function renderSkillMd(skill: SkillDraft): string {
  const desc = skill.description.includes("\n") || skill.description.includes('"')
    ? `"${skill.description.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`
    : skill.description;
  return `---\nname: ${skill.name}\ndescription: ${desc}\n---\n\n${skill.content.trim()}\n`;
}
