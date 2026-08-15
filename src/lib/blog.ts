export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  description: string;
  body: string;
};

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseFrontmatter(raw: string): {
  data: Record<string, string>;
  body: string;
} {
  const match = raw.match(FRONTMATTER);
  if (!match) {
    return { data: {}, body: raw.trim() };
  }

  const data: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) data[key] = value;
  }

  return { data, body: match[2].trim() };
}

export function slugFromPath(path: string): string {
  const file = path.split("/").pop() ?? "";
  return file.replace(/\.md$/, "");
}

export function parseMarkdownPost(
  slug: string,
  raw: string,
): BlogPost | null {
  const { data, body } = parseFrontmatter(raw);
  if (data.draft === "true") return null;
  if (!data.title || !data.date || !body) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return null;

  return {
    slug,
    title: data.title,
    date: data.date,
    description: data.description ?? "",
    body,
  };
}

export function loadPosts(files: Record<string, string>): BlogPost[] {
  return Object.entries(files)
    .map(([path, raw]) => parseMarkdownPost(slugFromPath(path), raw))
    .filter((post): post is BlogPost => post !== null)
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

const postFiles = import.meta.glob("../content/blog/*.md", {
  query: "?raw",
  eager: true,
  import: "default",
}) as Record<string, string>;

export function listPosts(): BlogPost[] {
  return loadPosts(postFiles);
}

export function getPost(slug: string): BlogPost | undefined {
  return listPosts().find((post) => post.slug === slug);
}

export function formatPostDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
