# Build Intel Karpathy LLM KB Preflight Closeout

Card: `BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001`

Closeout key: `build-intel-karpathy-llm-kb-preflight-v1`

Branch: `foundation/system-health-red-to-green-001`

## What Changed

- Compared current AIOS Foundation primitives against the Karpathy-style raw data -> compiled markdown/wiki -> query/Q&A -> quality/lint loop.
- Kept the output proposal/research only.
- Confirmed the queued Karpathy packet remains pending approval and non-runnable.
- Routed gaps to existing Foundation-owned follow-up cards instead of creating a Harlan-only memory path.
- Added focused proof, verifier coverage, package script, plan, approval, and closeout registry coverage.

## Source Packet

- Dream Labs AI: "Build Andrej Karpathy's LLM Knowledge Base for Businesses (10x Output!)"
- Nate Herk: "Andrej Karpathy Just 10x'd Everyone's Claude Code"
- Original Karpathy source: `https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f`

## Current AIOS Fit

- Raw data / source packet: present through `EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001`.
- Source contract and permission gate: present through `SOURCE-CONTRACT-VALIDATION-LAYER-001` and `EXTRACTION-RUNTIME-READINESS-001`.
- Compiled markdown/wiki: missing design. Foundation needs compiler rules for source packets, citations, freshness, chunking, and markdown/wiki output before agents consume this pattern.
- Query / Q&A interface: partial. Hybrid evidence exists, but there is no Foundation-owned KB query contract for compiled source packs yet.
- Quality / lint loop: missing design. Compiled knowledge needs provenance lint, stale-source checks, answer-eval fixtures, and citation coverage before agent use.
- Agent consumption: blocked until Foundation owns the capability.

## What We Already Have

- source contracts and auth/extraction posture validation
- pending-approval Karpathy source packet
- extraction runtime readiness gates
- atoms, retrieval, synthesis, and action-router primitives
- Research Inbox/proposal-only precedent

## Missing Before Build

- compiled markdown/wiki schema and source-to-page rules
- KB query/Q&A contract over compiled source packs
- provenance/freshness/citation lint rules
- answer-eval fixtures for compiled knowledge
- agent consumption contract after Foundation capability ownership

## What Not To Copy

- Do not turn this into a Harlan-only memory hack.
- Do not dump raw transcripts into markdown and call it a knowledge base.
- Do not bypass source contracts, freshness, permission, cost, or evidence envelopes.
- Do not make vector search the only truth layer; compiled markdown/wiki remains source-backed reviewable output.
- Do not let agents query or mutate the KB before Foundation owns compiler rules, quality gates, and query contracts.

## Proposal Routing

- `FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001`: enrich existing card. Define Foundation-owned compiler rules before any agent consumes a Karpathy-style KB.
- `KNOWLEDGE-BASE-QUALITY-GATE-001`: enrich existing card. Define provenance, freshness, citation, and answer-eval quality gates before compiled KB output is trusted.

Recommended next: `FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001`, unless Steve separately approves a no-auth/no-paid extraction run from the pending Karpathy packet.

## Proof

- `node --check lib/build-intel-karpathy-llm-kb-preflight.js lib/foundation-intelligence-audit-verifier.js scripts/process-build-intel-karpathy-llm-kb-preflight-check.mjs scripts/foundation-verify.mjs`
- `npm run process:build-intel-karpathy-llm-kb-preflight-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:ship-check -- --card=BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001 --planApprovalRef=docs/process/approvals/BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001.json --closeoutKey=build-intel-karpathy-llm-kb-preflight-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001 --closeoutKey=build-intel-karpathy-llm-kb-preflight-v1`
- `npm run process:foundation-ship -- --card=BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001 --planApprovalRef=docs/process/approvals/BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001.json --closeoutKey=build-intel-karpathy-llm-kb-preflight-v1 --commitRef=HEAD`

## Known Limits

- This does not run live extraction.
- This does not fetch transcripts, crawl pages, capture screenshots, summarize videos, or call a model.
- This does not write Research Inbox proposals, create atoms, or mutate backlog from extracted content.
- This does not build Harlan/Fal/voice/Canva/OpenHuman work.
