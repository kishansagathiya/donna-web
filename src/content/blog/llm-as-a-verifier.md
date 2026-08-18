---
title: "LLM-as-a-Verifier: generation is cheap, picking the right answer is not"
date: 2026-08-18
description: Agents already know how to solve hard tasks if you sample enough times. The bottleneck is telling a good trajectory from a merely plausible one.
---

[Paper](https://arxiv.org/abs/2607.05391) · [Website](https://llm-as-a-verifier.com/) · [Code](https://github.com/llm-as-a-verifier/llm-as-a-verifier) · [TurboAgent](https://github.com/llm-as-a-verifier/TurboAgent)

A [paper](https://arxiv.org/abs/2607.05391) from Stanford, Berkeley, and NVIDIA argues that we have been scaling the wrong half of the loop. Pre-training, post-training, and test-time compute all make models *generate* better. Verification — deciding whether a solution is actually correct — has stayed coarse.

LLM-as-a-Judge asks a model for a 1–5 score and keeps the top token. On long agent rollouts that is not enough. Distinct trajectories collapse to the same integer. On Terminal-Bench V2, a discrete judge ties **27%** of the time.

The authors — Jacky Kwok, Shulu Li, Pranav Atreya, Yuejiang Liu, Yixing Jiang, Chelsea Finn, Marco Pavone, Ion Stoica, and Azalia Mirhoseini — treat verification as its own scaling axis. No extra training. Same models you already use. A different way of reading the logits.

[LLM-as-a-Verifier announcement](https://x.com/jackyk02/status/2074969820739805275)

![LLM-as-a-Verifier overview: one verification framework for test-time scaling, progress tracking, and RL](https://llm-as-a-verifier.com/figures/llmoverview.png)

## The bottleneck is not generation

On Terminal-Bench, if you sample enough trajectories and an oracle always picks the best one, Pass@K climbs to **98.9%**. The models can solve the benchmark. They cannot tell which of their own attempts did.

That is the product problem for anyone shipping agents: you already pay for five tries. You still ship the first one that looks finished.

![Most agents already know how to solve the task. Sampling 100 trajectories per task nearly solves Terminal-Bench — if you can pick the right one.](https://llm-as-a-verifier.com/figures/motivation.png)

A trained reward model would help in one domain and fall over in the next. A judge that emits a single digit helps until two candidates both look like a “5”.

## Read the whole score distribution

The method is almost annoyingly small.

Prompt the model as a pairwise reviewer. Ask for scores in tags:

```
<score_A> INTEGER_1_TO_20 </score_A>
<score_B> INTEGER_1_TO_20 </score_B>
```

Do not take `argmax`. Take the **expectation** over the logprob distribution of the score tokens. If the model is 60% on 17 and 40% on 16, the reward is 16.6, not 17.

That continuous score is then averaged over three knobs:

1. **Granularity G** — a 1–20 scale instead of 1–5, so nearby beliefs are not rounded into the same bucket.
2. **Repeats K** — independent evaluations, whose variance shrinks like 1/K.
3. **Criteria C** — split “is this correct?” into things that are actually checkable. For code agents: specification, output format, errors in logs.

![Fine-grained reward estimation: pairwise scoring prompts, logprobs from score tags, expectation instead of argmax](https://llm-as-a-verifier.com/figures/method.png)

The implementation uses a letter scale (A–T) under the hood so logprobs stay extractable as granularity grows. `pip install llm-verifier` exposes this as `select`, `compare`, and `track`.

## Why finer scores actually help

Enlarging the token set does not give the model new information. It gives the decoder a finer space to project a belief that was already there.

On Terminal-Bench V2, pairwise accuracy goes from **73.1% at G=1** to **77.5% at G=20**. The signal-to-noise ratio of (correct − incorrect) scores rises with G.

The `query-optimize` case study makes this concrete. Two SQL optimizations both run faster. Only one checks equivalence against the canonical database. Gemini 2.5 Flash *notices* the difference, but hedges: “slightly cleaner,” “marginally more direct.” Over 100 repeats:

| Method | Correct ranked higher | Tie | Wrong ranking |
|---|---|---|---|
| Judge (discrete, 1–5) | 12/100 | 88/100 | 0/100 |
| Verifier (continuous, 1–5) | 69/100 | 0/100 | 31/100 |
| Verifier (continuous, 1–20) | 77/100 | 0/100 | 23/100 |

The discrete judge is not confused. It is **over-quantized**. Expectation kills the ties. Granularity sharpens the remaining signal.

Repeats and criteria do different jobs. A single-pass verifier already matches a heavily ensembled judge. Averaging K=16 gets you to 77.4% with **zero ties**; the judge still ties 5.5% of the time at that budget. Splitting the rubric (specification / output / errors) takes any one criterion at 75.2–76.4% to an ensemble at **78.3%**.

![Verification accuracy improves along three axes: score granularity, repeated evaluation, and criteria decomposition](https://llm-as-a-verifier.com/figures/granularity.png)

![Continuous verifier vs discrete judge: higher accuracy at every budget, and a 26.7% tie rate that the verifier drives to zero](https://llm-as-a-verifier.com/figures/judge_vs_verifier.png)

## Ranking N candidates without an O(N²) tournament

Best-of-N still needs a ranking algorithm. Full round-robin is quadratic. **Probabilistic Pivot Tournament (PPT)** drops that to O(Nk):

1. **Ring pass** — a random cycle so every candidate sits once in slot A and once in slot B, cancelling positional bias.
2. **Pick k pivots** — the empirical leaders from the ring.
3. **Pivot rounds** — compare everyone to the pivots, and the pivots to each other.
4. **Select** — highest average preference, normalized so pivots are not rewarded just for playing more games.

Preferences come from Bradley–Terry on the continuous scores, not from hard wins.

![Probabilistic Pivot Tournament: ring pass, pivot selection, then a budget concentrated on the uncertain top candidates](https://llm-as-a-verifier.com/figures/pivot_tournament.png)

## What it buys on real benchmarks

Same protocol everywhere: sample N trajectories, rank with PPT, submit the winner. Verifier is typically Gemini 2.5 Flash at G=20, K=8, three criteria. No per-domain fine-tuning.

![State-of-the-art across coding, robotics, and medical agent benchmarks](https://llm-as-a-verifier.com/figures/SOTA.png)

| Benchmark | Pass@1 | LLM-as-a-Verifier | Oracle |
|---|---|---|---|
| Terminal-Bench V2 | 83.1% | **86.5%** | 92.1% |
| SWE-Bench Verified | 76.1% | **78.2%** | 84.4% |
| MedAgentBench | 70.2% | **73.3%** | 75.0% |

On Terminal-Bench that is GPT-5.5 + Capy, N=5, beating GPT-5.5 + NexAU-AHE (84.7%) and Claude Mythos + Terminus-2 (82.0%). On SWE-Bench the candidate pool is heterogeneous — one trajectory each from Opus 4.5, Gemini 3 Flash, and MiniMax M2.5 — and the verifier still picks the strongest patch.

Robotics is the transfer test. Inputs are multi-frame videos. Qwen 3.6 35B as a VLM verifier, zero-shot, same expectation over score tokens:

| Method | Preference accuracy |
|---|---|
| LLM-as-a-Judge (discrete) | 70.8% |
| TOPReward | 74.7% |
| Robometer-4B | 78.8% |
| RoboReward-8B (trained) | 81.4% |
| LLM-as-a-Verifier | **87.4%** |

MAE against human annotations drops from 1.11 to **0.72**. A general logprob trick beating reward models trained on tens of thousands of robot episodes is the result that should make people sit up.

![Zero-shot robotics preference accuracy on RoboRewardBench](https://llm-as-a-verifier.com/figures/roborewardbench.png)

Closed models that hide logprobs are not a dead end. GPT-5.5 writes the reasoning; Gemini 2.5 Flash supplies the calibrated distribution. That two-stage pass is +5.2 points over using GPT-5.5’s integer scores, and it wipes out a 10.9% tie rate.

## The score is also a progress bar

Score prefixes of a trajectory, not just the finished run. On a successful Terminal-Bench task (`pytorch-model-cli`), verifier scores rise as the agent reads `model.py`, installs a CPU-only torch, fixes `hidden_dim`, and finishes. The failed twin installs giant `torchvision`, fills the disk, and dies — and the scores stay low the whole way.

![Progress tracking on pytorch-model-cli: successful trajectory scores climb; the failed run stays low](https://raw.githubusercontent.com/llm-as-a-verifier/llm-as-a-verifier/main/assets/progress_pytorch_model_cli_rescored.png)

Value-order correlation (does the score rise with step index?) is **0.848** on successful Terminal-Bench rollouts and 0.769 on failed ones. On RoboRewardBench it is **0.966**, ahead of RoboReward-8B (0.877).

![A robotics rollout scored as it happens — corn onto plate, temporally aligned progress](https://llm-as-a-verifier.com/media/robotics/corn_on_plate.mp4)

That is the monitoring story: abandon a hopeless coding agent before it writes broken state, or watch a robot miss the grasp instead of waiting for a sparse success bit.

## Put it in front of Claude Code

[TurboAgent](https://github.com/llm-as-a-verifier/TurboAgent) is the drop-in. It is an inference proxy between Claude Code (or any OpenAI-compatible client) and the provider: optional prompt refinement, N parallel candidates, PPT, best response back. Visualizer at `localhost:8888/visualizer`.

```
pip install turbo-agent
turbo-agent
ANTHROPIC_BASE_URL=http://localhost:8888 claude
```

![TurboAgent visualizer: parallel candidates, pairwise tournament scores, and the selected response](https://raw.githubusercontent.com/llm-as-a-verifier/TurboAgent/main/screenshot.png)

## Self-verification is getting cheap

The interesting update since the paper: the generator and the verifier can be the **same** open model.

[Self-verification with DeepSeek V4 Flash](https://x.com/jackyk02/status/2089421448784023553)

On Terminal-Bench 2.1, five `mini-swe-agent` trajectories from DeepSeek V4 Flash, ranked by DeepSeek V4 Flash:

| Config | Pass@1 | LLM-as-a-Verifier | Oracle |
|---|---|---|---|
| Best-of-3 | 79.4% | **86.5%** | 92.1% |
| Best-of-5 | 78.7% | **88.0%** | 96.6% |

Jacky’s claim is that this beats Claude Fable 5 on that board at about **11×** lower cost. Once sampling is cheap, verification quality is the whole game. The repo’s 0.2.0 release also prefix-caches the pairwise prompts (~3.4× fewer uncached input tokens on trajectory-heavy runs), which is how you actually afford K repeats.

## Dense rewards for RL

The same scalar is a drop-in shaped reward. On LIBERO, a π₀ policy with DSRL-SAC reaches matched success about **1.8×** faster (and a higher final rate, 0.76 vs 0.69). On MATH, Qwen3-8B + GRPO gets about **1.1×** — useful when every sample in the group is wrong and sparse correctness gives a zero gradient. PPT scores the reasoning traces anyway.

![Sample efficiency: LIBERO (off-policy SAC) and MATH (on-policy GRPO), sparse vs verifier-dense rewards](https://llm-as-a-verifier.com/figures/combined_libero_math.png)

## What to take from it

If you run agents, you already live in the Pass@K gap. Sampling five patches and shipping the first one that compiles is leaving the oracle on the table.

The paper’s bet is that you do not need a new reward model for every domain. You need a scoring channel that is not a 1–5 argmax, a ranking schedule that is not quadratic, and a rubric split into questions a model can actually answer.

Paper: [arXiv:2607.05391](https://arxiv.org/abs/2607.05391). Interactive figures and APIs: [llm-as-a-verifier.com](https://llm-as-a-verifier.com/). Install: [`llm-verifier`](https://github.com/llm-as-a-verifier/llm-as-a-verifier). Proxy for Claude Code: [TurboAgent](https://github.com/llm-as-a-verifier/TurboAgent).
