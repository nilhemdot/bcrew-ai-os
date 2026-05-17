# BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001 Plan

Card: `BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001`

Closeout key: `build-intel-karpathy-llm-kb-preflight-v1`

## What

Build a proposal-only Foundation preflight for the Karpathy LLM Knowledge Base / LLM Wiki direction. The preflight compares current AIOS source contracts, queued Karpathy source packet, extraction readiness, atoms, retrieval, synthesis, docs, and Research Inbox precedent against this pattern:

`raw data -> compiled markdown/wiki -> query/Q&A -> quality/lint loop`

The card must promote and close the existing live backlog card. It must not create a duplicate card and must not run extraction.

## Why

Steve wants the building system moving fast, but the Karpathy KB idea can become architecture debt if it turns into a Harlan-only memory shortcut or a transcript dump. The useful operator behavior is a clear Foundation answer:

- what AIOS already has;
- what is missing before a knowledge compiler can be built;
- what must not be copied;
- which existing Foundation cards own the next work.

## Acceptance Criteria

- Existing code, existing docs, existing scripts, Current Sprint, and live backlog truth are reused.
- The focused proof calls actual function paths: `buildKarpathyLlmKbPreflightSnapshot()`, `buildKarpathyLlmKbPreflightDogfoodProof()`, `buildFoundationCurrentSprintStatus()`, and Plan Critic validation.
- Marker-only source proof is rejected by behavior fixtures that change live-extraction, follow-up-card, Harlan-only memory, and output-target state.
- Check/process script live-state mutation is read-only by default and only allowed through explicit `--apply` or `--close-card` posture.
- Full `process:foundation-ship` runs before push.

## Definition Of Done

- `BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001` is live, closed as done, and tied to `build-intel-karpathy-llm-kb-preflight-v1`.
- `EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001` remains done, blocked/pending approval, and non-runnable.
- The preflight module proves have/missing/not-to-copy truth through `buildKarpathyLlmKbPreflightSnapshot()` and dogfood fixtures.
- Missing work routes to existing cards `FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001` and `KNOWLEDGE-BASE-QUALITY-GATE-001`.
- Dogfood rejects live extraction, missing compiler follow-up, missing quality-gate follow-up, Harlan-only memory output, and direct-agent output.
- Focused proof, backlog hygiene, `foundation:verify`, and full `process:foundation-ship` pass before push.

## Details

Reuse existing work:

- existing code: `lib/extractor-queue-karpathy-kb-video-pack.js`, `lib/extraction-runtime-readiness.js`, `lib/build-intel-extraction-implementation.js`, `lib/research-inbox.js`, and `lib/foundation-intelligence-audit-verifier.js`;
- existing docs: `docs/handoffs/2026-05-17-extractor-queue-karpathy-kb-video-pack-closeout.md`, `docs/handoffs/2026-05-17-runtime-memory-build-intel-stab-capture.md`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`;
- existing scripts: `scripts/process-extractor-queue-karpathy-kb-video-pack-check.mjs`, `scripts/process-build-intel-extraction-check.mjs`, and `scripts/foundation-verify.mjs`;
- live backlog and Current Sprint truth: `EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001`, `FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001`, and `KNOWLEDGE-BASE-QUALITY-GATE-001`.

Main session owns this Foundation sprint and Steve approved this active sprint scope. This is not hub side work.

Implementation:

1. Add `lib/build-intel-karpathy-llm-kb-preflight.js` with stage comparison, proposal rows, not-to-copy doctrine, report rendering, and dogfood fixtures.
2. Add `scripts/process-build-intel-karpathy-llm-kb-preflight-check.mjs` as the focused proof and governed live-card/current-sprint updater.
3. Add plan, approval JSON, closeout handoff/report, package script, closeout registry record, and intelligence/audit verifier coverage.
4. Update rebuild plan/state with the closed preflight and next recommended Foundation compiler-design direction.

Gate decision tree:

- static gate for syntax: `node --check`;
- focused gate while iterating: `npm run process:build-intel-karpathy-llm-kb-preflight-check -- --close-card --json`;
- full gate before push: `npm run process:foundation-ship -- --card=BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001 --planApprovalRef=docs/process/approvals/BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001.json --closeoutKey=build-intel-karpathy-llm-kb-preflight-v1 --commitRef=HEAD`.

## Risks

- Scope drift into live extraction. Mitigation: target remains blocked/pending approval; proof checks no crawl runs for the Karpathy target.
- Harlan-only memory drift. Mitigation: not-to-copy doctrine and dogfood fail if that boundary is missing.
- Backlog mutation from research. Mitigation: proposal rows are `writesBacklog=false`, and no Research Inbox or atom writes are performed.
- Process drag. Mitigation: focused proof is under 1,500 lines, runs before full gates, and the ship gate is used once at closeout.
- Live-state safety. Mitigation: process checks fail closed in read-only mode and route live card/current sprint repair through explicit `--apply` or `--close-card`; no no-flag repair is allowed.

Not next:

- No live extraction.
- No transcript fetch, crawl, screenshot capture, summarization, or model call.
- No auth-required extraction.
- No paid extraction without explicit Steve approval.
- No Research Inbox write, atom creation, or backlog mutation from extracted content.
- No Harlan/Fal/voice/Canva/OpenHuman feature work.
- No broad UI redesign.
- No Meeting Vault Phase B or Drive permission mutation.
- Do not rerun the live Agent Feedback auto-send job.

## Tests

- `node --check lib/build-intel-karpathy-llm-kb-preflight.js lib/foundation-intelligence-audit-verifier.js scripts/process-build-intel-karpathy-llm-kb-preflight-check.mjs scripts/foundation-verify.mjs`
- `npm run process:build-intel-karpathy-llm-kb-preflight-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001 --planApprovalRef=docs/process/approvals/BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001.json --closeoutKey=build-intel-karpathy-llm-kb-preflight-v1 --commitRef=HEAD`

Speed budget: focused proof should run in seconds; full gate remains the final pre-push gate. File budget: new hand-written modules stay under 1,500 lines. API budget: this adds no broad default Hub payload and no new UI loading surface.

Split plan: `docs/rebuild/current-plan.md` is already above the 1,500-line watch threshold, so this card keeps that touched over-budget file as a thin status wrapper with no new responsibility. It adds only a short sprint-status note there and extracts durable behavior to the new domain module `lib/build-intel-karpathy-llm-kb-preflight.js` plus focused verifier coverage.

Explicit artifact budgets: the approval JSON is a governed data record capped under 5 KB, and the closeout/report artifact is capped under 12 KB for this sprint. If either grows past that, split the detail into a separate research note before ship.
