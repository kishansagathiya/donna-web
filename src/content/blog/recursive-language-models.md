---
title: "Recursive Language Models: don't stuff the prompt, recurse over it"
date: 2026-08-22
description: Context windows keep growing. Context rot does not go away. RLMs treat the prompt as an object in a REPL and let the model decide what to look at.
---

[Paper](https://arxiv.org/abs/2512.24601) · [Alex Zhang's blog](https://alexzhang13.github.io/blog/2025/rlm/) · [Docs](https://alexzhang13.github.io/rlm/) · [Code](https://github.com/alexzhang13/rlm) · [Minimal](https://github.com/alexzhang13/rlm-minimal)

A [paper](https://arxiv.org/abs/2512.24601) from MIT CSAIL argues that we have been feeding prompts to the wrong place. Pre-training, architecture, and longer windows all try to make the Transformer *see* more. Recursive Language Models (RLMs) keep the prompt out of the network until the model writes code to look.

The interface stays a language model. `rlm.completion(prompt)` in, string out. Under the hood the prompt is a Python variable. The root model peeks, greps, chunks, and recursively calls itself (or a cheaper sibling) over snippets. No extra training required to get started.

The authors — Alex L. Zhang, Tim Kraska, and Omar Khattab — treat long context as an inference-time scaling problem, not a window-size problem. Same models you already use. A different place for the text to live.

[Recursive Language Models announcement](https://x.com/a1zhang/status/1978469116542337259)

![An RLM is a text-to-text call. The prompt lives in a REPL; the model writes code and recursively sub-queries itself over snippets.](https://alexzhang13.github.io/assets/img/rlm/teaser.png)

## The bottleneck is not the window

Frontier models now advertise 200k–1M token windows. Needle-in-a-haystack benches like RULER look solved. Then you keep a Claude Code session open, or ask a distributional question over thousands of unlabeled rows, and the model gets dumber.

[Alex Zhang's October 2025 blog](https://alexzhang13.github.io/blog/2025/rlm/) calls this **context rot**. Anthropic's definition is recall dropping as tokens pile up. The more useful version is: quality degrades as a function of *both* length and task complexity. Finding one phrase in a haystack is O(1) work. Labeling every line and aggregating is linear. Pairing every entry with every other entry is quadratic. GPT-5 can hold 272k tokens and still score **0.1 F1** on OOLONG-Pairs at 32k.

Compaction — summarize when full, keep going — is the default agent fix. It assumes early details can be forgotten. That is the wrong bet on dense tasks. Retrieval agents fetch snippets until the window fills, then compact anyway. Coding agents can grep a filesystem; they still dump the *user prompt* into the model's context.

![GPT-5 vs RLM(GPT-5) as input length scales on S-NIAH, OOLONG, and OOLONG-Pairs. Base model quality falls with length and with task complexity. The RLM keeps working past the 272k window.](https://arxiv.org/html/2512.24601v3/scaling_plot.svg)

## Put the prompt in a REPL

The method is a thin scaffold.

1. Load the user prompt `P` as a string variable in a persistent Python REPL.
2. Tell the root model the *metadata*: length, a short prefix, how to access slices. Not `P` itself.
3. Let it write code. Stdout is truncated; long results stay in variables.
4. Expose `llm_query` / `rlm_query` as functions *inside* that code, so a `for` loop can launch Ω(|P|) sub-calls.
5. Stop when the model sets `FINAL(...)` or `FINAL_VAR(some_var)`.

That last bit matters for long *outputs* too. The answer can be a variable the model built programmatically, not a string it has to emit autoregressively inside its own window.

![The RLM loop: prompt as a REPL variable, code that peeks and decomposes, recursive sub-calls over programmatic snippets.](https://alexzhang13.github.io/assets/img/rlm/repl.png)

Three design choices separate this from "a coding agent with a sub-agent tool":

1. **The user prompt is a symbolic object.** Not just a corpus on disk. The model is not allowed to paste `P` into the root window.
2. **Recursion happens in code, not in chat.** Verbalizing "now call a sub-agent on this paragraph" does not scale to a million slices. A loop does.
3. **Sub-call returns land in variables.** The root sees `labels`, not 800 raw completions.

Omar Khattab's short version: a coding agent that greps files and dumps them into context is not an RLM. The prompt itself has to stay outside the network.

## What the model actually does

Trajectories are readable. Common patterns, all emergent from the REPL rather than a hardcoded workflow:

- **Peek.** First 2,000 characters, `len(context)`, split on newlines.
- **Grep.** Regex for IDs, keywords, section headers. Narrow before you spend a sub-call.
- **Partition + map.** Chunk the rest, `llm_query` each chunk, aggregate in Python.
- **Summarize.** Sub-calls compress; the root decides.
- **Programmatic one-shot.** On LoCoDiff-style git histories, the model sometimes just *applies the diffs in code* instead of reading them as prose.

That last one is the tell. Some "long-context" tasks are programming tasks wearing a text costume. An RLM is allowed to notice.

![Three RLM moves in the wild: regex over the prompt, recursive `llm_query` on batches, and stitching sub-call outputs into a composite answer.](https://arxiv.org/html/2512.24601v3/figures/Frame_7.png)

## What it buys on real benchmarks

Same protocol: frontier GPT-5 (root) with GPT-5-mini sub-calls, versus the usual long-context scaffolds. No per-task fine-tuning. Numbers from [arXiv:2512.24601v3](https://arxiv.org/abs/2512.24601).

| Method | CodeQA | BrowseComp+ (1K docs) | OOLONG | OOLONG-Pairs |
|---|---|---|---|---|
| Task length | 23K–4.2M | 6M–11M | 131K | 32K |
| GPT-5 | 24.0%* | 0.0%* | 44.0% | 0.1 |
| CodeAct + BM25 | 22.0%* | 51.0% | 38.0% | 24.7 |
| Compaction agent | 58.0% | 70.5% | 46.0% | 0.1 |
| OpenCode + offload | 64.0% | 94.0% | 52.0% | 4.8 |
| Claude Code + offload | 62.0% | 84.0% | 48.0% | 6.5 |
| RLM depth=0 | 58.0% | 88.0% | 36.0% | 43.9 |
| RLM depth=1 | **62.0%** | **91.3%** | **56.0%** | **58.0** |
| RLM depth=3 | 58.0% | 92.0% | **58.0%** | **76.0** |

\* hit the input context limit. Depth=0 is REPL without sub-calls. Depth>1 lets sub-calls be RLMs.

The median GPT-5 lift across these tasks is **26% vs compaction**, **130% vs CodeAct with sub-calls**, **13% vs Claude Code**. On OOLONG-Pairs the base model is essentially zero. Recursion is doing quadratic work that a 32k window cannot.

Cost stays in the same order of magnitude. Median RLM query is often *cheaper* than stuffing the whole prompt into GPT-5. The mean is pulled up by outlier trajectories that thrash. A naively ingested 6–11M token BrowseComp+ prompt would cost GPT-5-mini about $1.50–$2.75; RLM(GPT-5, depth=1) averages **$0.99** and beats compaction by over 20 points.

![OOLONG `trec_coarse` at 132k: RLM(GPT-5-mini) more than doubles GPT-5 while staying in the same cost band.](https://alexzhang13.github.io/assets/img/rlm/oolong-132k.png)

The REPL is necessary for length. Recursion is necessary for density. On CodeQA with Qwen3-Coder-480B, depth=0 (just code over the prompt) wins. On OOLONG-Pairs, depth=3 is what gets GPT-5 to 76 F1.

Qwen3-Coder as an RLM is a warning as much as a result. It writes more syntax errors, and deeper recursion can *hurt* because failed sub-RLMs propagate. The scaffold is only as good as the model's ability to use a REPL.

## Beyond long context: longer reasoning

The later paper version adds [LongCoT-mini](https://longcot.ai/). Problems are short prompts whose answers depend on a graph of subproblems. GPT-5.2 scores **38.7** overall. RLM(GPT-5.2) gets to **50.6**. Give it an explicit decomposition hint — build the graph, solve nodes with sub-calls — and it reaches **65.6**, including 99 on logic and chess.

[Alex's LongCoT writeup](https://alexzhang13.github.io/blog/2026/longcot-rlm/) is the honest version of that result. Off-the-shelf RLM can *lose* to the base model on MATH and CS if it decomposes badly. The right decomposition is in the model's distribution. It does not always sample it. A hint, or training, is what pulls it out.

That is the [mismanaged geniuses](https://alexzhang13.github.io/blog/2026/mgh/) claim: frontier models are already strong at the sub-calls. We are bad at letting them manage those calls. Human-designed agent graphs encode *our* decomposition. RLMs make decomposition a program the model writes.

## Train the recursion

You do not have to stay at prompting.

**RLM-Qwen3-8B** is Qwen3-8B rejection-fine-tuned on 1,000 RLM trajectories from Qwen3-Coder-480B on LongBenchPro — a different domain than the evals. Median **+28%** on the four long-context tasks, cheaper and more than **3×** faster, because the root makes fewer dumb REPL mistakes. It starts to approach vanilla GPT-5 on three of those tasks.

Length generalizes. RL-train Qwen3-4B-Instruct as an RLM on MRCRv2 at 64k / 2 needles, and it transfers to **1M / 8 needles**, a split that shows up in frontier model cards. Untrained `RLM(Qwen3-4B)` is near zero on that split. After the short-task RL, it solves it. The root's view of the long task, with context offloaded, looks almost like the short one.

![Post-training an 8B as an RLM lifts every long-context task in the eval. RL on a short MRCRv2 split generalizes to the 1M, 8-needle split.](https://arxiv.org/html/2512.24601v3/figures/training-plot-gem.png)

[Prime Intellect](https://www.primeintellect.ai/blog/rlm) called this the context-folding bet for 2026 and wired RLMs into [`verifiers`](https://github.com/PrimeIntellect-ai/verifiers) and [`prime-rl`](https://github.com/PrimeIntellect-ai/prime-rl). Their ablations match the paper's caution: GPT-5-mini uses the scaffold; many open models do not, unless you give environment-specific tips. Training is the path off of those tips.

## Run one

Official library, MIT OASYS:

```
pip install rlms
```

```python
from rlm import RLM

rlm = RLM(
    backend="openai",
    backend_kwargs={"model_name": "gpt-5-nano"},
    verbose=True,
)
print(rlm.completion("Print me the first 100 powers of two, each on a newline.").response)
```

Python 3.11+. Backends: OpenAI, Anthropic, OpenRouter, Portkey, vLLM. REPL backends: `local`, `ipython`, `docker`, Modal, Prime, Daytona, E2B. Pass `RLMLogger(log_dir="./logs")` and run the repo's visualizer (`visualizer/`, localhost:3001) to watch code, sub-calls, and the root.

![RLM visualizer: root iterations, REPL cells, and recursive sub-calls on one trajectory.](https://raw.githubusercontent.com/alexzhang13/rlm/main/media/visualizer.png)

The [gist-sized rewrite](https://github.com/alexzhang13/rlm-minimal) is `rlm_repl.py` + `repl.py`, depth=1. Swap `Sub_RLM` for `RLM_REPL` if you want deeper recursion.

## What is in the wild

The official README keeps a running list. The ones worth knowing:

| Project | What it is |
|---|---|
| [`alexzhang13/rlm`](https://github.com/alexzhang13/rlm) | Canonical inference engine + `training/` harness |
| [`alexzhang13/rlm-minimal`](https://github.com/alexzhang13/rlm-minimal) | Small enough to fork in an afternoon |
| [`dspy.RLM`](https://dspy.ai/api/modules/RLM/) | Drop-in DSPy module: `dspy.RLM("context, query -> answer")` |
| [`PrimeIntellect-ai/prime-agent`](https://github.com/PrimeIntellect-ai/prime-agent) | Coding/research agent whose native tool is a persistent IPython kernel + `rlm(...)` |
| [`context-labs/halo`](https://github.com/context-labs/halo) | RLM-based automatic agent optimization loop |
| [`viplismism/rlm-cli`](https://github.com/viplismism/rlm-cli) | CLI wrapper |
| [`ax-llm/ax`](https://github.com/ax-llm/ax) | TypeScript agent stack with an RLM path |

Omar is also on the DSPy side, so `dspy.RLM` is the shortest path if you already have signatures. It sandboxes in Deno/Pyodide by default, exposes `llm_query` / `llm_query_batched`, and lets you point `sub_lm` at a cheaper model.

Prime Agent is the product-shaped version: files, shell, skills, and sub-agents are all code in one kernel. `await rlm("review auth")` spawns a real child session, not a chatty tool call.

Further reading from the authors and the people training on this:

- [Recursive Language Models](https://alexzhang13.github.io/blog/2025/rlm/) (Oct 2025 blog, the original results)
- [Language Models will be Scaffolds](https://alexzhang13.github.io/blog/2026/scaffold/)
- [The Mismanaged Geniuses Hypothesis](https://alexzhang13.github.io/blog/2026/mgh/)
- [RLMs on LongCoT](https://alexzhang13.github.io/blog/2026/longcot-rlm/)
- [Harnesses as compositional generalizers](https://alexzhang13.github.io/blog/2026/harness/)
- [Prime Intellect: the paradigm of 2026](https://www.primeintellect.ai/blog/rlm)
- [alphaXiv: reinforcing RLMs](https://www.alphaxiv.org/blog/reinforcement-learning-for-rlms)

## What to take from it

If you run agents, you already hit context rot. Summarizing the session every N turns is leaving the prompt on the table. The paper's bet is that you do not need a 10M-token Transformer to work over 10M tokens. You need the prompt off the network, a REPL that can call the model, and (eventually) training so the model uses that loop without being babysat.

[LLM-as-a-Verifier](/blog/llm-as-a-verifier) was about picking among trajectories you already sampled. This is about not stuffing the whole problem into one trajectory in the first place. Both are inference-time scaling. Both assume the model is smarter than the way we currently call it.

Paper: [arXiv:2512.24601](https://arxiv.org/abs/2512.24601). Narrative and early figures: [alexzhang13.github.io/blog/2025/rlm](https://alexzhang13.github.io/blog/2025/rlm/). Install: [`rlms`](https://github.com/alexzhang13/rlm). Smallest fork: [rlm-minimal](https://github.com/alexzhang13/rlm-minimal).
