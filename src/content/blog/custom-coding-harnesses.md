---
title: "Custom coding harnesses: the model is not the product"
date: 2026-08-31
description: Generic coding agents are table stakes. The remaining alpha is a harness fitted to one codebase — and the companies that can afford it already built one internally.
---

[Stripe Minions](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents) · [Shopify Roast](https://github.com/Shopify/roast) · [OpenAI harness engineering](https://openai.com/index/harness-engineering/) · [LangChain](https://www.langchain.com/blog/how-to-build-a-custom-agent-harness)

Cursor, Claude Code, and Codex are the new compiler. Everyone has them. The remaining question is whether the agent can ship in *your* repo — the one with the homegrown libraries, the three-million-test CI suite, the Ruby that is not Rails, the payments that cannot be wrong.

That is not a model problem. It is a harness problem.

A harness is the program around the model: tools, sandboxes, linters, CI loops, rule files, retries, and the deterministic steps you refuse to leave to a next-token guess. LangChain writes it as `agent = model + harness`. Stripe says vibe-coding a prototype is a different job from contributing to a production codebase. Anthropic, on their own Agent SDK, says even Opus 4.5 "will fall short of building a production-quality web app" if you only give it a high-level prompt and a loop.

The startup idea is to build **custom coding harnesses** — not another general coding agent. Fitted ones. The evidence that this is real work, not a vibe, is that the companies with the most to lose are already doing it internally, and a second wave of companies is selling the kit to everyone else.

## Same model, different box

Princeton and Stanford's [SWE-agent](https://arxiv.org/abs/2405.15793) made this measurable in 2024. Same GPT-4 Turbo. Drop it in a raw Linux shell, or give it an agent-computer interface — a linter that rejects broken edits, a 100-line file viewer, a search command that does not dump a novel. The custom interface was worth **10.7 percentage points** on SWE-bench Lite. A 64% relative lift over shell-only. The paper's claim is the one the industry has been rediscovering since: language models are a new kind of user, and they need software built for them.

Anthropic's [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) is the production version of that lesson. Compaction is not enough. Across sessions the agent one-shots the app, blows the window mid-feature, or declares victory because *something* exists. The fix is not a better system prompt. It is an initializer that writes a feature list and `init.sh`, a coding agent that does one feature per session, git as memory, and tests run the way a human would click them.

[Alex Zhang](https://alexzhang13.github.io/blog/2026/harness/) pushes it further: a good harness makes unfamiliar problems look locally in-distribution to the model. A bad one stuffs the whole trajectory into one context window and calls the resulting rot "the model being flaky."

The pattern people are converging on: **the harness — not the underlying model — is often the biggest lever for reliability.** A well-designed harness can make a good model excellent on messy, legacy, or high-stakes codebases. A poor one makes even a great model look random.

## The companies that already built one

This is not a thought experiment. It is what serious engineering orgs spent 2025–2026 doing instead of waiting for the next model drop.

### Stripe: Minions

Stripe [built Minions](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents) because off-the-shelf agents are optimized for a human looking over their shoulder. Minions are unattended. Slack thread in, CI-passing pull request out. Over **1,300 PRs a week** are fully minion-produced — human-reviewed, no human-written code.

They had to. The codebase is hundreds of millions of lines. Backend is Ruby with Sorbet, not Rails. Homegrown libraries the models have never seen. The code moves well over $1 trillion a year. "LLM agents are incredibly good at building software from scratch when there are relatively few constraints. Iterating on a codebase of this scale, complexity, and maturity is inherently much harder."

So they forked Block's [goose](https://github.com/block/goose), ran it on the same pre-warmed EC2 **devboxes** humans use (up in ~10 seconds, isolated from prod), and invented **blueprints**: a state machine that interleaves agent nodes ("implement the task", "fix CI") with deterministic nodes ("run configured linters", "push"). They shift feedback left. A background daemon precomputes lint-rule heuristics so pre-push lint is usually under a second; minions loop on that node *before* they spend a CI run. At most two CI rounds against a battery of three million tests, then a human. Context comes from subdirectory-scoped Cursor rules plus **Toolshed**, an internal MCP server with nearly 500 tools, of which each minion gets a curated handful so it does not drown.

The sentence that matters for a startup: Stripe already gives engineers Cursor and Claude Code. Minions exist *anyway*, because the generic harness does not know Stripe.

### Shopify: Roast

Shopify open-sourced the thing. [Roast](https://github.com/Shopify/roast) is a Ruby DSL for structured AI workflows. You do not prompt an agent to "do the migration." You write a workflow that mixes `chat`, `cmd`, `ruby`, and `agent` (Claude Code or Pi) as **cogs**. Deterministic steps stay deterministic. The model is only invoked where a guess is actually required.

```ruby
execute do
  chat(:plan) { "List 3 things to check in a code review." }
  cmd(:files) { "git diff --name-only HEAD~1" }
  agent(:review) do
    <<~PROMPT
      Review these files: #{cmd!(:files).out}
      Focus on: #{chat!(:plan).response}
    PROMPT
  end
end
```

Obie Fernandez's version at EuRuKo: free-roaming agents accumulate entropy. Each slightly-wrong step makes the next one harder. Structured workflows keep AI in a box. [Internally](https://www.zenml.io/llmops-database/structured-workflow-orchestration-for-large-scale-code-operations-with-claude) Roast became the way Shopify runs repeatable code operations at the scale of thousands of developers — Claude Code as a step, not as the entire product.

Their philosophy is the product requirement: **non-determinism is the enemy of reliability.** Guardrails are structural, not just prompt-based.

### OpenAI: harness engineering

OpenAI [documented their own](https://openai.com/index/harness-engineering/). A small team shipped an internal product with **zero lines of manually written code** — on the order of a million lines, ~1,500 PRs, three engineers, then seven. Humans steer. Codex executes.

What they actually built is a custom coding harness:

- `AGENTS.md` as a table of contents, not an encyclopedia. Knowledge lives in versioned `docs/`. Dedicated linters and a "doc-gardening" agent keep it true.
- A rigid layered architecture (Types → Config → Repo → Service → Runtime → UI) enforced by **custom linters and structural tests**. Lint errors are written as remediation instructions the agent can act on.
- Recurring background Codex tasks that scan for drift against "golden principles" and open tiny refactor PRs. They used to spend every Friday — 20% of the week — cleaning "AI slop." That did not scale. They automated it and called it **garbage collection**.

Ryan Lopopolo's closer: "building software still demands discipline, but the discipline shows up more in the scaffolding rather than the code." They also say the quiet part: this behavior "depends heavily on the specific structure and tooling of this repository and should not be assumed to generalize without similar investment."

That last sentence is the market. OpenAI's harness does not transfer to your repo. You need one of your own.

### Airbnb: migrations as a harness, not a chat

Airbnb's public version is a [pipeline](https://medium.com/airbnb-engineering/accelerating-large-scale-test-migration-with-llms-9565c208023b), not a chatbot. They moved ~3,500 Enzyme tests to React Testing Library in **six weeks**. Hand estimate: 1.5 years.

The model was not "please migrate this file." It was a step machine: transform, then Jest, then lint, then `tsc`. Each step had a retry loop that fed compiler errors back. Simple files: 75% done in four hours, ten retries max. The long tail got 50–100 retries and prompt/script tuning. Same idea as Stripe's blueprints and Shopify's cogs: the LLM is a step with a verifier, not the orchestrator.

Viaduct, their open-source GraphQL mesh, now ships generated projects with `AGENTS.md` baked in. They are building coding-agent support as a standalone capability. The org is being made legible to agents on purpose.

## Then the platforms showed up

Once enough companies had built this once, other companies started selling the factory.

| Who | What they sell |
|---|---|
| [LangChain](https://www.langchain.com/blog/how-to-build-a-custom-agent-harness) `create_agent` | A minimal loop plus a middleware stack, so a harness can be "tightly fit" to a task — coding, GTM, support. Their own agents are all this with different middleware. |
| [Microsoft Agent Framework Harness](https://devblogs.microsoft.com/agent-framework/the-microsoft-agent-framework-harness-is-now-released/) | Semantic Kernel + AutoGen, collapsed into an opinionated but customizable scaffold: planning, compaction, file memory, approvals. Coding, research, data analysis. |
| [Factory Droids](https://docs.factory.ai/harness/subagents) | Markdown-defined custom agents with scoped tools and org-capped autonomy. A platform so many teams share one harness instead of everyone hand-rolling. |
| [GitHub Copilot SDK](https://github.com/github/copilot-sdk/blob/main/docs/features/custom-agents.md) | Custom agents as session config: own prompt, own tools, own MCP. Fleet mode for parallel sub-agents. Enterprise-shaped "don't let every team invent this." |
| [Harness.io Worker Agents](https://www.harness.io/blog/introducing-autonomous-worker-agents) | Governed, sandboxed agents defined as YAML templates, run as pipeline steps, with org-wide RBAC and policy. The CI company noticed the agent *is* a CI step. |

These are not competitors to "build custom harnesses." They are proof of demand. LangChain is explicit: Deep Agents and the Claude Agent SDK are pre-assembled harnesses for the common case; `create_agent` exists because **task-harness fit** is the actual product. A customer-support harness and a long-running coding harness should not share a prompt file and hope.

Anthropic said the same thing from the other side. In [Scaling Managed Agents](https://www.anthropic.com/engineering/managed-agents): "task-specific agent harnesses excel in narrow domains." Claude Code is a general coding harness. It is not your payments-platform harness, your Rails-monolith harness, or your "migrate 3,500 tests" harness.

## What you would actually sell

The off-the-shelf agents win on greenfield work and popular stacks. They lose on the codebase that is the company.

A custom coding harness, in the sense Stripe and OpenAI mean it, is:

1. **A blueprint, not a chat.** Deterministic nodes for lint, test, push, migrate, generate. Agentic nodes only where the next action is unknown. Shopify already open-sourced the DSL shape.
2. **Feedback shifted left.** If CI will fail, the agent finds out in a second on the box, not after a 20-minute pipeline. Stripe's minions exist to spend tokens on the task, not the formatter.
3. **The repo as the system of record.** Short map file. Versioned docs. Rules scoped to directories. Internal tools as MCP, curated per run — Stripe's Toolshed lesson, not 500 tools dumped into context.
4. **Architecture enforced mechanically.** Custom linters whose error text is a patch recipe. Structural tests. Taste encoded once, applied everywhere. OpenAI had to invent this or the million-line agent dump would rot.
5. **Garbage collection.** Background jobs that scan for drift and open tiny PRs. Agents copy whatever they see. If slop is in the repo, slop is the new style guide.

The buyer is not a hobbyist who wants a better Cursor. It is the team whose generic agent opens a PR that compiles and still ships the wrong abstraction, against the wrong library, in the wrong layer, after burning a CI hour. They already pay for models. They cannot staff a three-person "harness engineering" team the way OpenAI can.

Two product shapes, same thesis:

- **Studio + runtime.** Sit with one org, encode their CI, conventions, and internal tools into a blueprint, then run unattended agents against it. Minions-as-a-service. The first ten customers *are* the product.
- **Platform for fitted harnesses.** The LangChain/Factory/Copilot layer, but opinionated toward *coding on an existing production repo*: blueprint DSL, shift-left adapters for whatever CI they have, linter-to-agent error rewriting, scheduled garbage collection. Not "build any agent." Build this kind.

The kit vendors make the second shape look crowded. It is not. They sell primitives. Someone still has to fit the harness to the repo — the way Stripe forked goose instead of prompting Cursor harder. That fitting is the company.

## Why this is a 2026 idea and not a 2023 wrapper

In 2023 the wrapper was the product because the model was the scarce part. In 2026 the models are close enough that Cursor's full-time job is rewriting tool descriptions every time a new one ships, and consultancies will tell you [the value is accruing to the harness](https://thenextweb.com/news/cursor-price-hikes-claude-code-harness-shift).

Three facts have to be true at once for a custom-harness company to make sense. They are:

1. Generic agents are widely deployed and still fail on the codebases that matter.
2. The orgs that cannot afford to fail have already built private harnesses, and they keep investing after buying Cursor.
3. The platform layer exists, which means the category is named, budgeted, and still missing the last mile: *your* linters, *your* CI, *your* architecture, *your* unattended loop.

That is a classic "the incumbents built it for themselves" market. Palantir looked like that. Databricks looked like that. The internal tool leaks, then a company productizes the leak for everyone who is not Stripe.

I am not claiming this is easy. Fitting a harness is slow, political, and full of repo-specific landmines — which is also why it is defensible. The model vendor cannot do it without becoming a consultancy. The IDE vendor cannot do it without picking a winner among every customer's weird CI. The gap in the middle is a product.

If you run agents on a real codebase and they feel flaky, try not changing the model first. Change the box it lives in.
