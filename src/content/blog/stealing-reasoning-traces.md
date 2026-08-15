---
title: Stealing reasoning traces from LLM APIs
date: 2026-08-15
description: Providers hide chain-of-thought in encrypted client-side blocks. Those blocks are interchangeable — and that turns weaker models into decryption oracles.
---

A [paper](https://arxiv.org/abs/2608.09867) from ELLIS Institute Tübingen and collaborators shows that the encrypted “thinking” blocks returned by major LLM APIs are not the sealed envelopes they look like.

OpenAI, Anthropic, and Google hide chain-of-thought to protect intellectual property and limit leakage. They do not store those traces on the server. They encrypt them, send them to the client, and ask the client to pass the blob back on the next turn. Statelessness plus secrecy.

The secrecy does not hold.

## What is actually being hidden

Reasoning models think before they speak. The internal scratchpad is denser than the visible answer: intermediate hypotheses, tool outputs, user data, sometimes secrets the user never typed. Showing that in plaintext makes distillation easy and can unmask safety machinery.

So providers deprecated plaintext reasoning. The API returns an opaque block. The client holds it. The server decrypts it later to reconstruct context. No database of thoughts.

That design has three jobs: keep the reasoning confidential, keep it untampered (the blob is typically an AEAD envelope), and keep the server stateless.

Confidentiality is the part that fails.

## The flaw: interchangeable blobs

The researchers — Alexander Panfilov, David Schmotz, Ilia Shumailov, Luca Beurer-Kellner, Joachim Schaeffer, Ameya Prabhu, Jonas Geiping, and Maksym Andriushchenko — show that these encrypted blocks are **compatible across sessions, users, and models inside a provider**.

A block from one conversation can be replayed in another. A block from one user can be decrypted by another. A block from a heavily guarded frontier model can be handed to a cheaper sibling in the same family.

That last point is the attack. Frontier models are trained not to dump their chain-of-thought. Weaker siblings are optimized for cost and speed, and they sit on the same encryption scheme. The server decrypts the blob for whoever presents it. The weak model then reads the strong model’s reasoning back in plaintext. You never have to jailbreak the strong model.

This is not breaking the crypto. It is using the provider’s own decryption path, through a model with fewer refusals.

## What that enables

The paper maps four consequences.

**Anti-distillation is bypassed.** The hidden reasoning is the part providers most want to keep. If it can be recovered at scale from Anthropic, OpenAI, and Google, the “secret sauce” of how a model solves a problem is no longer secret.

**Public logs leak private data.** Developers paste session logs into GitHub, bug reports, and tutorials, assuming the encrypted blocks are harmless. The authors decoded **315,320** such blocks from public repositories and recovered **367 PII artifacts** and **182 credentials**. Some of that data was not even in the user’s prompt — it had been pulled into the model’s reasoning from memory, then sealed in a blob the user could not read before sharing.

**Refusals can still leak.** A model may refuse a harmful request in the visible answer after having reasoned about it in private. The output looks safe. The hidden trace may not be. Decrypting the trace recovers what the refusal was supposed to contain.

**Encrypted blocks can carry injections.** The same portability works in reverse. A malicious instruction packed into an opaque block can travel through logs and agent rollouts. Humans see ciphertext. The server decrypts it into the model’s context.

| Finding | Count |
|---|---|
| Encrypted blocks decoded from public repos | 315,320 |
| PII recovered | 367 |
| Credentials recovered | 182 |

Zero of those required a direct jailbreak of the frontier model.

## What providers should do

The authors disclosed before publishing. The fixes are mostly about *binding*.

Encryption should be tied to the session, the user, and the model that produced the block. A blob from Opus should not decrypt in Haiku. Authenticated encryption already supports this: bind the ciphertext to associated data that must match, or decryption fails.

On the system side: do not let a weaker model decode a stronger model’s reasoning. Watch for cross-model replay. Tell developers, in the API docs, that these blocks can contain secrets and should not be pasted into public repos.

Until that lands, treat every encrypted reasoning block as plaintext you cannot see yet.

## What to do if you build on these APIs

Do not put reasoning blobs in GitHub, Discord, or a “repro” gist. Audit old logs if you already did. Do not design product safety around the idea that hidden thinking stays hidden. Watch for provider patches — and verify them.

The deeper point is architectural. Stateless APIs push secrets to the client. If the envelope is not bound to who generated it, who it belongs to, and which model may open it, you have obfuscation with a shared key. Shared keys leak.

Paper: [Stealing Reasoning Traces from Proprietary LLM APIs](https://arxiv.org/abs/2608.09867) (arXiv:2608.09867). Read the original for extraction evaluations, compatibility tables, and the mitigation appendix.
