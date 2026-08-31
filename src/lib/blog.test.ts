import { describe, expect, it } from "vitest";
import {
  formatPostDate,
  getPost,
  listPosts,
  loadPosts,
  parseFrontmatter,
  parseMarkdownPost,
  slugFromPath,
} from "./blog";

const sample = `---
title: Memory without action
date: 2026-08-15
description: Why notes apps are not assistants.
---

Notes without follow-through are just another archive.
`;

describe("parseFrontmatter", () => {
  it("reads keys and leaves the body", () => {
    const { data, body } = parseFrontmatter(sample);
    expect(data).toEqual({
      title: "Memory without action",
      date: "2026-08-15",
      description: "Why notes apps are not assistants.",
    });
    expect(body).toBe("Notes without follow-through are just another archive.");
  });

  it("strips quotes around values", () => {
    const { data } = parseFrontmatter(`---
title: "Hello: world"
date: '2026-01-01'
---

Body
`);
    expect(data.title).toBe("Hello: world");
    expect(data.date).toBe("2026-01-01");
  });

  it("returns the whole file as body when frontmatter is missing", () => {
    const { data, body } = parseFrontmatter("# Hello\n\nWorld");
    expect(data).toEqual({});
    expect(body).toBe("# Hello\n\nWorld");
  });
});

describe("slugFromPath", () => {
  it("uses the markdown filename", () => {
    expect(slugFromPath("../content/blog/introducing-donna.md")).toBe(
      "introducing-donna",
    );
  });
});

describe("parseMarkdownPost", () => {
  it("builds a post from frontmatter", () => {
    expect(parseMarkdownPost("memory-without-action", sample)).toEqual({
      slug: "memory-without-action",
      title: "Memory without action",
      date: "2026-08-15",
      description: "Why notes apps are not assistants.",
      body: "Notes without follow-through are just another archive.",
    });
  });

  it("skips drafts and invalid posts", () => {
    expect(
      parseMarkdownPost(
        "draft",
        `---
title: Hidden
date: 2026-08-15
draft: true
---

Nope
`,
      ),
    ).toBeNull();
    expect(parseMarkdownPost("empty", "# no frontmatter")).toBeNull();
    expect(
      parseMarkdownPost(
        "bad-date",
        `---
title: Bad
date: August 15
---

Body
`,
      ),
    ).toBeNull();
  });
});

describe("loadPosts", () => {
  it("skips drafts and sorts newest first", () => {
    const posts = loadPosts({
      "older.md": `---
title: Older
date: 2026-01-01
---

A
`,
      "newer.md": `---
title: Newer
date: 2026-08-15
description: Fresh
---

B
`,
      "hidden.md": `---
title: Hidden
date: 2026-12-01
draft: true
---

C
`,
    });
    expect(posts.map((post) => post.slug)).toEqual(["newer", "older"]);
    expect(posts[0].description).toBe("Fresh");
  });
});

describe("formatPostDate", () => {
  it("formats ISO dates in UTC so they do not shift", () => {
    expect(formatPostDate("2026-08-15")).toBe("August 15, 2026");
    expect(formatPostDate("2026-01-02")).toBe("January 2, 2026");
  });
});

describe("bundled posts", () => {
  it("includes introducing-donna", () => {
    const posts = listPosts();
    const intro = getPost("introducing-donna");
    expect(intro).toBeDefined();
    expect(posts.some((post) => post.slug === "introducing-donna")).toBe(true);
    expect(intro?.title).toBeTruthy();
    expect(intro?.body.length).toBeGreaterThan(40);
  });

  it("includes stealing-reasoning-traces", () => {
    const post = getPost("stealing-reasoning-traces");
    expect(post).toBeDefined();
    expect(post?.title).toMatch(/reasoning traces/i);
    expect(post?.body).toContain("2608.09867");
  });

  it("includes llm-as-a-verifier", () => {
    const post = getPost("llm-as-a-verifier");
    expect(post).toBeDefined();
    expect(post?.title).toMatch(/LLM-as-a-Verifier/i);
    expect(post?.body).toContain("2607.05391");
    expect(post?.body).toContain("https://llm-as-a-verifier.com/");
    expect(post?.body).toContain(
      "https://github.com/llm-as-a-verifier/llm-as-a-verifier",
    );
    expect(post?.body).toContain(
      "https://github.com/llm-as-a-verifier/TurboAgent",
    );
    expect(post?.body).toContain(
      "https://x.com/jackyk02/status/2074969820739805275",
    );
    expect(post?.body).toContain(
      "https://x.com/jackyk02/status/2089421448784023553",
    );
  });

  it("includes recursive-language-models", () => {
    const post = getPost("recursive-language-models");
    expect(post).toBeDefined();
    expect(post?.title).toMatch(/Recursive Language Models/i);
    expect(post?.body).toContain("2512.24601");
    expect(post?.body).toContain("https://alexzhang13.github.io/blog/2025/rlm/");
    expect(post?.body).toContain("https://github.com/alexzhang13/rlm");
    expect(post?.body).toContain("https://github.com/alexzhang13/rlm-minimal");
    expect(post?.body).toContain("https://dspy.ai/api/modules/RLM/");
    expect(post?.body).toContain(
      "https://github.com/PrimeIntellect-ai/prime-agent",
    );
    expect(post?.body).toContain("https://www.primeintellect.ai/blog/rlm");
    expect(post?.body).toContain(
      "https://x.com/a1zhang/status/1978469116542337259",
    );
  });

  it("includes custom-coding-harnesses", () => {
    const post = getPost("custom-coding-harnesses");
    expect(post).toBeDefined();
    expect(post?.title).toMatch(/custom coding harnesses/i);
    expect(post?.body).toContain(
      "https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents",
    );
    expect(post?.body).toContain("https://github.com/Shopify/roast");
    expect(post?.body).toContain(
      "https://openai.com/index/harness-engineering/",
    );
    expect(post?.body).toContain(
      "https://www.langchain.com/blog/how-to-build-a-custom-agent-harness",
    );
    expect(post?.body).toContain(
      "https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents",
    );
    expect(post?.body).toContain("https://arxiv.org/abs/2405.15793");
    expect(post?.body).toMatch(/allowed to change itself/i);
    expect(post?.body).toContain("Claude Code");
  });
});
