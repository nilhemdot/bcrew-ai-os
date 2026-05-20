# INTEL-THREAD-CONTEXT-001 - Thread Context Evidence Proof

## What

Add full thread context to Strategic Intelligence source proof.

The action-router proof already shows source IDs, quotes, participants, and basic from/to context. This card makes the proof useful for human judgment by surfacing whether a signal is reply-backed, one-way, stale, system-drafted, single-source, or corroborated.

## Why

Steve challenged the first Strategy proof because technically valid evidence can still be weak if it is only a one-message email, a system notification, or a dead thread with no reply captured. Strategic Intelligence and the Scoper cannot be trusted if they show a quote but hide conversation completeness.

This card closes that trust gap without running new extraction. It enriches existing route proof from already-archived communication artifacts and renders the confidence context in Strategy Hub.

## Acceptance Criteria

- Source proof items include structured `threadContext`.
- `threadContext` includes message count, reply count, comment count where available, latest activity, participant count, from/to direction, source account, source container, linked atom/candidate/artifact IDs, evidence-use count, and corroboration status.
- Weak-proof flags are emitted for one-message thread, no reply captured, missing thread status, stale thread, automated/system origin, missing participants, and missing cross-source corroboration.
- Strategy Hub route review renders the thread context and weak-proof flags in plain English.
- Raw artifact metadata is used for proof enrichment but not exposed directly in rendered proof items.
- Dogfood proves one-message, no-reply, automated origin, stale, reply-backed, and multi-source corroboration behavior.
- Current Sprint marks `INTEL-THREAD-CONTEXT-001` done and advances to `SCOPER-UI-001`.

## Definition Of Done

- `lib/intel-thread-context.js` owns the thread-context model, enrichment helper, summary, and dogfood proof.
- `lib/intelligence-action-router.js` enriches action-route source proof with `threadContext` and a route-level `threadContextSummary`.
- `public/strategic-execution.js` renders thread context, corroboration, and weak-proof flags.
- `lib/foundation-verifier-followup-backlog-assurance.js` recognizes the shipped thread-context closeout instead of treating the card as stale future work.
- `scripts/process-intel-thread-context-check.mjs` validates approval, Plan Critic, live backlog, Current Sprint truth, dogfood behavior, live route proof enrichment, UI rendering hooks, verifier coverage, closeout registry, and write boundaries.
- `package.json` exposes `process:intel-thread-context-check`.
- Closeout registry, verifier coverage, plan, approval, and handoff are wired.
- Full closeout gates pass and main is clean/pushed.

## Details

## Reuse Existing Work

This card reuses existing Strategic Intelligence and shared-communications surfaces instead of building a new extraction lane.

- Existing code reused: `lib/intelligence-action-router.js`, `public/strategic-execution.js`, `lib/strategic-intel-loop.js`, and `lib/intel-scoper.js`.
- Existing docs reused: `docs/specs/2026-04-28-strategic-intelligence-loop.md`, `docs/handoffs/2026-05-19-strategic-intel-loop-closeout.md`, and `docs/process/intel-scoper-001-plan.md`.
- Existing data reused: `shared_communication_artifacts`, `shared_communication_candidates`, `intelligence_atoms`, `intelligence_synthesis_facts`, and `intelligence_action_routes`.
- Existing scripts reused: `process:strategic-intel-check`, `process:intel-scoper-check`, `process:strategy-004-check`, `process:strategy-009-check`, `process:system-health-nightly-audit-check`, `process:build-lane-repeated-failure-action-gate-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.

The exact gap is evidence quality. The source proof exists, but it does not force the system to explain whether the proof is conversation-backed or weak.

Behavioral rules:

- A one-message thread is weak until a reply, owner response, or corroborating source proves otherwise.
- System or automated origins must be visible before Strategic Intelligence treats a signal as a human-owned issue.
- Missing thread counts are not fatal, but they must be displayed as missing context.
- Single-source proof can remain usable, but it must be labeled as single-source instead of silently appearing fully corroborated.
- Cross-source corroboration is a confidence signal, not an automatic approval.

Privacy boundary:

- The card reads only already-archived local AIOS proof data and route metadata.
- It does not start Gmail, Missive, Slack, meeting, Drive, browser, OCR, transcription, or provider jobs.
- It does not expose raw artifact metadata directly in Strategy Hub proof items.
- It does not mutate source systems, action-route apply destinations, Drive permissions, credentials, or provider config.

Gate decision: full gate. The card changes Strategy Hub source proof and Current Sprint truth, so it needs Plan Critic, focused proof, health/repeated-failure/backlog gates, full `foundation:verify`, and `process:foundation-ship`.

Decision tree: this is not a static-only card because it changes route proof rendering and live Current Sprint state. It is not a broad source/extraction card because it does not run new source jobs. The correct decision-tree result is a bounded proof/rendering card with full Foundation closeout gates.

Behavior proof path: the focused proof calls `buildIntelThreadContextDogfoodProof()` and a live `createIntelligenceActionRouterStore().getActionRouterSnapshot()` path. Dogfood rejects weak behavior through actual functions instead of substring checks, and the live snapshot proves action-router proof items carry `threadContext`.

Operator value: Strategy route review becomes legible enough to answer Steve's real question: is this a living conversation, a one-way artifact, a system-drafted signal, or a corroborated owner issue?

Speed bound: the focused proof uses existing route snapshots and synthetic dogfood, and must stay fast enough to use by default during normal card closeout. It does not run extraction, source sync, model/provider calls, browser work, or full verifier internally.

## Risks

- Risk: proof enrichment leaks raw artifact metadata. Repair path: the helper strips `metadata` and `threadMetadata` from rendered proof items after deriving safe context fields.
- Risk: this drifts into new extraction or source sync. Repair path: the card forbids source jobs and uses existing archived route proof only.
- Risk: weak-proof flags become a hard rejection of useful single-source evidence. Repair path: flags are confidence context; route approval still belongs to the existing review workflow.
- Risk: this becomes Scoper UI work. Repair path: `SCOPER-UI-001` stays the next card and owns structured Scoper output rendering.

## Tests

- `node --check lib/intel-thread-context.js lib/intelligence-action-router.js public/strategic-execution.js scripts/process-intel-thread-context-check.mjs`
- `npm run process:intel-thread-context-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=INTEL-THREAD-CONTEXT-001 --planApprovalRef=docs/process/approvals/INTEL-THREAD-CONTEXT-001.json --closeoutKey=intel-thread-context-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=INTEL-THREAD-CONTEXT-001 --closeoutKey=intel-thread-context-v1`
- `npm run process:foundation-ship -- --card=INTEL-THREAD-CONTEXT-001 --planApprovalRef=docs/process/approvals/INTEL-THREAD-CONTEXT-001.json --closeoutKey=intel-thread-context-v1 --commitRef=HEAD`

## Not Next

- No new extraction, sync, crawl, browser, screenshot, OCR, transcription, or provider/model call work.
- No private broad extraction, paid/provider access, browser-auth work, external sends, source-system writes, Drive permission mutation, or credential/key rotation.
- Do not work `MEETING-VAULT-ACL-001` Phase B.
- Do not mutate Drive permissions.
- No action-route apply workflow changes.
- No Scoper UI build; `SCOPER-UI-001` owns rendering structured Scoper output after this proof context exists.
- No new atom/retrieval schema migration.
