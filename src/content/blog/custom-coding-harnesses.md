---
title: "Custom coding harnesses"
date: 2026-08-31
description: Claude Code, except the harness keeps rewriting its own source as the user's requirements change. Companies that cannot wait already build this by hand.
---

[Stripe Minions](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents) · [Shopify Roast](https://github.com/Shopify/roast) · [OpenAI harness engineering](https://openai.com/index/harness-engineering/) · [LangChain](https://www.langchain.com/blog/how-to-build-a-custom-agent-harness)

Claude Code is a coding harness. The model is not. The harness is the program around it: the loop that reads files, runs shell, applies patches, retries, stops. Tools are functions. Hooks are callbacks. The system prompt is a string in a file. LangChain writes it as `agent = model + harness`. All of that is code.

A **custom** coding harness is that program, except it is allowed to change itself.

Picture shipping something that looks like Claude Code. The user does not only ask it to edit their app. They ask it to become the agent they actually need. "Always lint before you push." "Never touch migrations without this check." "Use our internal search, not grep." "If CI fails this way, stop and open a ticket." Stock Claude Code would stuff those into `CLAUDE.md` and hope. A custom harness treats them as product requirements for *its own source*. Next session you are not running Anthropic's loop. You are running the fork that grew in the user's repo: a new tool, a different retry, a pre-push node that cannot be skipped because it is a function, not a paragraph.

That is the whole distinction. Rules files are suggestions in the prompt. Custom means the TypeScript or Python of the agent itself keeps changing.

The startup idea is to build that: Claude Code whose codebase is live. The companies with the most to lose already do the expensive version by hand — they fork the agent and keep rewriting it — and a second wave of companies is selling kits so you can assemble a frozen one. Frozen is not the product.

## Same model, different box

Changing the harness is not a metaphor. Same weights, different program around them, different results.

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

They did not prompt Claude Code harder. They changed the agent's code — forked it, added blueprint nodes, wired lint into the loop. That is a custom harness, assembled by humans. The sentence that matters: Stripe already gives engineers Cursor and Claude Code. Minions exist *anyway*, because the generic loop cannot rewrite itself into Stripe.

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

Their philosophy is the product requirement: **non-determinism is the enemy of reliability.** Guardrails are structural, not just prompt-based. Roast is still typed by a human. The product is an agent that would write those cogs the next time the user asked for a new workflow.

### OpenAI: harness engineering

OpenAI [documented their own](https://openai.com/index/harness-engineering/). A small team shipped an internal product with **zero lines of manually written code** — on the order of a million lines, ~1,500 PRs, three engineers, then seven. Humans steer. Codex executes.

What they actually built is a custom coding harness:

- `AGENTS.md` as a table of contents, not an encyclopedia. Knowledge lives in versioned `docs/`. Dedicated linters and a "doc-gardening" agent keep it true.
- A rigid layered architecture (Types → Config → Repo → Service → Runtime → UI) enforced by **custom linters and structural tests**. Lint errors are written as remediation instructions the agent can act on.
- Recurring background Codex tasks that scan for drift against "golden principles" and open tiny refactor PRs. They used to spend every Friday — 20% of the week — cleaning "AI slop." That did not scale. They automated it and called it **garbage collection**.

Ryan Lopopolo's closer: "building software still demands discipline, but the discipline shows up more in the scaffolding rather than the code." They also say the quiet part: this behavior "depends heavily on the specific structure and tooling of this repository and should not be assumed to generalize without similar investment."

That last sentence is the market. OpenAI's harness does not transfer to your repo. And they did not get there by maintaining a prompt. Codex writes the linters, the docs, the cleanup jobs — the harness keeps changing the scaffolding it runs in. You need that loop pointed at *your* requirements, not theirs.

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

Not another Claude Code. Claude Code, except the first repo it is allowed to edit is itself.

The user says what they need. The harness writes a change to *its* tools, loop, hooks, or deterministic steps, then uses the new version on the next task. Requirements become PRs to the agent, written by the agent. That is how you get Stripe-shaped behavior without staffing a team to fork goose.

Those PRs look like the internals above, because that is what "custom" turns into in a real org:

1. **A new node in the loop, not a new paragraph in a prompt.** Lint, test, push, migrate — as code the model cannot skip. Shopify already open-sourced that shape as a DSL. The product is generating it from use, not asking a platform engineer to type it.
2. **Feedback shifted left.** If CI will fail, the harness grows a local check so it finds out in a second, not after a 20-minute pipeline.
3. **Tools that exist only here.** Internal search, ticketing, feature flags — added as functions when the user needs them, not 500 MCP servers dumped into context.
4. **Architecture enforced mechanically.** Custom linters whose error text is a patch recipe. Taste encoded once in the harness source, applied everywhere.
5. **Garbage collection of the harness too.** If a workaround rots, a background pass deletes it. Agents copy whatever they see, including their own slop.

The buyer is the team whose generic agent opens a PR that compiles and still ships the wrong abstraction. They already pay for models. They cannot staff a three-person "harness engineering" team, and they should not have to file a ticket with Anthropic to get a lint node.

The kit vendors make this look crowded. It is not. LangChain and Copilot SDK let a human assemble a frozen harness. Stripe forked goose and kept changing it. The company is the loop that does that fork continuously, from the user's requirements, without a platform team in the middle.

## Why this is a 2026 idea and not a 2023 wrapper

In 2023 the wrapper was the product because the model was the scarce part. In 2026 the models are close enough that Cursor's full-time job is rewriting tool descriptions every time a new one ships, and consultancies will tell you [the value is accruing to the harness](https://thenextweb.com/news/cursor-price-hikes-claude-code-harness-shift).

Three facts have to be true at once for a custom-harness company to make sense. They are:

1. Generic agents are widely deployed and still fail on the codebases that matter.
2. The orgs that cannot afford to fail have already built private harnesses, and they keep investing after buying Cursor.
3. The platform layer exists, which means the category is named and budgeted — and still ships a harness that only a human can customize.

That is a classic "the incumbents built it for themselves" market. Palantir looked like that. Databricks looked like that. The internal tool leaks, then a company productizes the leak for everyone who is not Stripe.

I am not claiming this is easy. Letting an agent rewrite its own control loop is how you get a confused fork, or a confused production incident. That risk is also why it is defensible. The model vendor will not let Claude Code rewrite Claude Code for your CI. The IDE vendor will not pick a winner among every customer's weird pipeline. The gap is a product: a coding harness whose source stays alive.

If the stock agent feels flaky on a real codebase, the next step is not a different model. It is an agent that is allowed to change the box it lives in.
