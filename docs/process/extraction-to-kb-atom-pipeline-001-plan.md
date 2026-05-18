# EXTRACTION-TO-KB-ATOM-PIPELINE-001 Plan

## What

Build the V1 extraction-output routing contract for Foundation. A valid extractor artifact envelope can become proposal-only candidates for:

- KB draft
- intelligence atom
- synthesis fact
- review inbox item
- action route

Tight V1 scope: pure artifact validation, deterministic candidate builders, focused proof, verifier coverage, closeout registry, and current plan/state updates. This card creates no persistent extraction outputs.

Not-next boundaries: no live extraction, public web lookup, source API calls, transcript fetches, screenshots/keyframes, downloads, summarization, vision, model calls, private/paid/community/course auth, Skool/MyICOR/Loom/authorized-browser access, Research Inbox writes, KB page writes, atom writes, synthesis fact writes, action-route writes, vector/query-index writes, backlog mutation from extracted content, external writes, hidden subagents, parallel builders, or extraction workers.

## Why

Steve does not want another pile of disconnected video notes. The useful operator behavior is: when extraction eventually runs, every output has an obvious, source-backed route into operating knowledge and review without becoming automatic doctrine or automatic tasks.

This card makes the safe downstream shape visible before workers start. A builder can see whether an artifact is routeable, why it is blocked, and which candidate surfaces it would feed after approval.

## Acceptance Criteria

- `lib/extraction-to-kb-atom-pipeline.js` validates artifact envelopes for source ID, source URL/ref, captured date, stale date, privacy tier, permission class, citations, claims, and contradiction status.
- The healthy fixture emits proposal-only KB draft, atom candidate, synthesis fact candidate, review inbox candidate, and action-route candidate.
- The KB draft path uses the existing `compileFoundationKbDraft()` and therefore the existing KB quality gate.
- Every candidate has `writeMode: proposal_only` and `approvalRequiredBeforePersist: true`.
- Output write flags for KB pages, atoms, synthesis facts, action routes, review inbox, vector/query index, and backlog mutation stay false.
- Dogfood rejects missing source ID, missing citation, stale freshness, unresolved contradiction, private/paid source without approval, live extraction/model side effects, and direct writes.
- `lib/foundation-intelligence-audit-verifier.js` includes behavior coverage and dogfood for the new pipeline.
- `scripts/process-extraction-to-kb-atom-pipeline-check.mjs` proves live backlog, Plan Critic, Current Sprint, approval, verifier coverage, package script, closeout registry, current plan/state, and file budgets.
- Full `foundation:verify` and full `process:foundation-ship` pass before push.

## Definition Of Done

Done means `EXTRACTION-TO-KB-ATOM-PIPELINE-001` is live `done`, the closeout key is `extraction-to-kb-atom-pipeline-v1`, Current Sprint rolls to `EXTRACTION-PARALLEL-WORKER-PROTOCOL-001` in `scoping`, and Recent Builds exposes the closeout after commit.

Command-proven done requires:

- `node --check lib/extraction-to-kb-atom-pipeline.js lib/foundation-intelligence-audit-verifier.js scripts/process-extraction-to-kb-atom-pipeline-check.mjs scripts/foundation-verify.mjs`
- `npm run process:extraction-to-kb-atom-pipeline-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=EXTRACTION-TO-KB-ATOM-PIPELINE-001 --planApprovalRef=docs/process/approvals/EXTRACTION-TO-KB-ATOM-PIPELINE-001.json --closeoutKey=extraction-to-kb-atom-pipeline-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=EXTRACTION-TO-KB-ATOM-PIPELINE-001 --closeoutKey=extraction-to-kb-atom-pipeline-v1`
- `npm run process:foundation-ship -- --card=EXTRACTION-TO-KB-ATOM-PIPELINE-001 --planApprovalRef=docs/process/approvals/EXTRACTION-TO-KB-ATOM-PIPELINE-001.json --closeoutKey=extraction-to-kb-atom-pipeline-v1 --commitRef=HEAD`

## Details

Existing work to reuse:

- `YOUTUBE-BUILD-INTEL-BATCH-001` closed public YouTube queue specs without extraction.
- `FOUNDATION-KB-COMPILER-V1-001` compiles source-backed records into proposal-only KB drafts.
- `KNOWLEDGE-BASE-QUALITY-GATE-001` enforces citations, freshness, privacy tier, page budget, and contradiction rules.
- `INTEL-ATOM-001`, `SYNTHESIS-FACTS-001`, and `ACTION-ROUTER-001` already define durable DB-backed destinations.
- `ACTION-ROUTE-REVIEW-INBOX-001` and action-route approval gates keep downstream action human-reviewed.
- Current Sprint helpers, Plan Critic helpers, approval integrity, process write guard, fanout check, and Foundation ship gate already exist.

Implementation files:

- `lib/extraction-to-kb-atom-pipeline.js`
- `scripts/process-extraction-to-kb-atom-pipeline-check.mjs`
- `lib/foundation-intelligence-audit-verifier.js`
- `lib/foundation-build-closeout-intelligence-records.js`
- `docs/process/extraction-to-kb-atom-pipeline-001-plan.md`
- `docs/process/approvals/EXTRACTION-TO-KB-ATOM-PIPELINE-001.json`
- `docs/handoffs/2026-05-18-extraction-to-kb-atom-pipeline-closeout.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `package.json`

Verifier/check posture: `scripts/process-extraction-to-kb-atom-pipeline-check.mjs` is read-only by default. Live backlog, Plan Critic, and Current Sprint writes require explicit `--apply` or `--close-card` posture through `process-write-guard.js`; no-flag writes are blocked, and verifier/check paths fail closed instead of repairing live state. For `scripts/foundation-verify.mjs`, verifier/check behavior remains read-only, performs zero repairs, and fails closed instead of repairing live state.

Large-file posture: `docs/rebuild/current-plan.md` is already over 1,500 lines, so this card has a split plan and adds no new responsibility there. Treat `docs/rebuild/current-plan.md` as a thin wrapper/current-sprint handoff only: all new behavior lives in `lib/extraction-to-kb-atom-pipeline.js` and `scripts/process-extraction-to-kb-atom-pipeline-check.mjs`; the rebuild plan only replaces the top Current Sprint handoff with this card's closeout and next card. Any broader rebuild-plan split remains a separate Foundation cleanup card.

## Risks

- Risk: the contract accidentally approves extraction. Mitigation: the snapshot exposes `runtimeExtractionApprovedByThisCard: false`, validates no side effects, and dogfoods live extraction/model flags.
- Risk: proposal candidates become direct DB writes. Mitigation: write flags are explicit, candidate objects are `proposal_only`, and direct-write dogfood fails closed.
- Risk: missing citation or stale source truth becomes doctrine. Mitigation: source ID, citation, and freshness validation runs before output candidates are produced; KB draft uses the existing quality gate.
- Risk: private or paid content is routed like public content. Mitigation: private/paid permission classes and owner-private privacy tiers require separate approval proof.
- Rollback/repair path: if focused proof, verifier coverage, or full ship regresses, leave the card in `executing` or return it with the failing invariant, remove the closeout/current-plan claim from the branch, and repair the pure contract before re-running `--close-card`. Do not patch live DB rows or skip verifier failures.

## Tests

Gate decision tree: full gate is required because this changes a Foundation behavior module, package script, verifier coverage, closeout records, live sprint/backlog state, and current rebuild docs. Static proof is `node --check`; focused proof is `process:extraction-to-kb-atom-pipeline-check`; final proof is `process:foundation-ship`.

Behavior proof is actual function path, not substring proof: `buildExtractionToKbAtomPipelineSnapshot()` calls real validation, candidate builders, and `compileFoundationKbDraft()`. `buildExtractionToKbAtomPipelineDogfoodProof()` mutates fixtures to recreate the exact unsafe failure modes and proves they fail closed.

Speed and file-size budget: module and focused proof stay under 1,500 lines each, approval JSON stays under 50 lines, handoff stays under 100 lines, focused proof should run under two minutes, and full ship must stay inside the existing ship target so the gate is fast enough to use by default.
