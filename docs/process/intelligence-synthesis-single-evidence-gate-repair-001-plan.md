# INTELLIGENCE-SYNTHESIS-SINGLE-EVIDENCE-GATE-REPAIR-001 Plan

Card: `INTELLIGENCE-SYNTHESIS-SINGLE-EVIDENCE-GATE-REPAIR-001`
Sprint: `intelligence-synthesis-single-evidence-gate-repair-2026-05-18`
Closeout key: `intelligence-synthesis-single-evidence-gate-repair-v1`

## What

Repair the safe code path behind the red `intelligence-synthesis-spine-refresh` scheduled-job row.

The May 18 job failed because `runGovernedSynthesis()` generated a Strategy-eligible synthesized item with only one evidence chunk. `SYNTHESIS-VERIFY-001` correctly blocked that item as `single_evidence_strategy_claim`. The generator should not produce a Strategy-grade claim that its own verifier must reject.

## Why

Steve wants P0 process failures cleaned up before feature work. This is not a Slack sync/extraction rerun and not a live external-write job. It is a local synthesis classification repair: under-supported clusters should remain operational review items until they have enough evidence to be Strategy Hub eligible.

Operator value: the synthesis refresh should fail closed on weak strategy claims without turning the whole scheduled job red for a preventable classification mismatch. This protects Steve's real workflow: Strategy Hub only gets higher-quality Strategy-grade signals, while weaker single-thread items remain operational review instead of blocking the whole refresh. It improves speed and quality because the next builder can see a true runtime issue instead of re-debugging the same classifier/verifier mismatch.

## Acceptance Criteria

- Synthesis classification requires at least two evidence refs and at least two evidence chunk refs before marking a cluster `strategyHubEligible`.
- Dogfood recreates a goal/strategy-looking cluster with one evidence chunk and proves it is not Strategy eligible.
- Dogfood proves the same class of cluster can still become Strategy eligible when it has multi-evidence, multi-chunk support.
- The repair does not run live extraction, Slack sync, Slack candidate extraction, external sends, Drive mutation, Gmail/ClickUp sends, or Agent Feedback auto-send.
- The read-only `foundation-verify` scheduled job is reconciled by a fresh governed success, if stale failure was the only safe red row.
- Slack scheduled-job red rows are classified as approval-bound operational-write work and are not live-rerun in this card.
- Focused proof, backlog hygiene, full `foundation:verify`, and full `process:foundation-ship` pass before push.

## Definition Of Done

- `INTELLIGENCE-SYNTHESIS-SINGLE-EVIDENCE-GATE-REPAIR-001` closes under `intelligence-synthesis-single-evidence-gate-repair-v1`.
- `docs/process/approvals/INTELLIGENCE-SYNTHESIS-SINGLE-EVIDENCE-GATE-REPAIR-001.json` validates at 9.8+.
- `npm run process:intelligence-synthesis-single-evidence-gate-repair-check -- --close-card --json` passes.
- `npm run backlog:hygiene -- --json` passes.
- `npm run foundation:verify -- --json-summary` passes.
- `npm run process:foundation-ship -- --card=INTELLIGENCE-SYNTHESIS-SINGLE-EVIDENCE-GATE-REPAIR-001 --planApprovalRef=docs/process/approvals/INTELLIGENCE-SYNTHESIS-SINGLE-EVIDENCE-GATE-REPAIR-001.json --closeoutKey=intelligence-synthesis-single-evidence-gate-repair-v1 --commitRef=HEAD` passes.

## Details

Root invariant: Strategy Hub eligible synthesis must already satisfy the synthesis verifier's Strategy-grade evidence bar. If a cluster only has one evidence chunk, it can still be useful operational signal, but it must not masquerade as Strategy-grade truth.

Existing code, docs, scripts, and backlog truth to reuse:

- `lib/intelligence-synthesis.js` owns clustering and `strategyHubEligible` classification.
- `lib/synthesis-claim-verification.js` owns `single_evidence_strategy_claim` blocking.
- `scripts/intelligence-synthesis-engine-proof.mjs` remains the scheduled/proof runner, but this card does not run the live refresh.
- `lib/foundation-system-health.js` and the job ledger continue to surface remaining red rows.
- Live backlog truth owns this P0 repair card, Current Sprint stage, Plan Critic row, and closeout record.
- Existing docs reused: `docs/process/system-health-red-row-repair-001-plan.md` and `docs/handoffs/2026-05-16-system-health-nightly-audit-closeout.md`.

Behavior proof, not substring proof: the focused check calls `buildIntelligenceSynthesisSingleEvidenceGateDogfood()`, which uses the real synthesis item builder and `verifySynthesizedRecord()` function path. It rejects the old failure mode by producing a synthetic single-evidence goal/strategy cluster and proving it verifies as operational, not Strategy eligible. It also proves a multi-evidence, multi-chunk cluster can still become Strategy eligible. Substring markers only support wiring checks and are not accepted as the behavioral proof.

Gate decision tree: static syntax check first, focused dogfood second, backlog hygiene third, full `foundation:verify` fourth, then full `process:foundation-ship`. Blast radius includes synthesis classification, job-health closeout proof, package script, and closeout registry, so the full ship gate is required. The focused proof stays fast and proportional; it uses synthetic in-memory facts/evidence and does not call the live refresh, embedding route, Slack, extraction targets, or external systems.

Large-file plan: `lib/intelligence-synthesis.js` is below 1,500 lines before this card and remains under that preferred module budget. Do not add responsibility outside synthesis classification and dogfood proof.

Repair path: if dogfood finds that legitimate multi-evidence Strategy clusters are downgraded, keep `SYNTHESIS-VERIFY-001` strict and adjust the classifier's support threshold in one place. If the scheduled synthesis job still fails after the next approved run, open a follow-up from the new failure reason instead of broadening this card.

## Risks

- Risk: downgrading too much synthesis could make Strategy Hub miss a useful signal. Mitigation: the dogfood proves multi-evidence, multi-chunk clusters still become Strategy eligible.
- Risk: a builder might rerun Slack or live extraction to clear System Health. Mitigation: this card explicitly classifies those rows as approval-bound operational-write work and does not run them.
- Risk: this becomes a verifier bypass. Mitigation: `SYNTHESIS-VERIFY-001` remains unchanged and strict; the generator changes before verification.
- Risk: the focused proof becomes slow. Mitigation: dogfood is synthetic and in-memory, under a minute, with full verifier/ship only at closeout.

## Tests

- `node --check lib/intelligence-synthesis.js scripts/process-intelligence-synthesis-single-evidence-gate-repair-check.mjs`
- `npm run process:intelligence-synthesis-single-evidence-gate-repair-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=INTELLIGENCE-SYNTHESIS-SINGLE-EVIDENCE-GATE-REPAIR-001 --planApprovalRef=docs/process/approvals/INTELLIGENCE-SYNTHESIS-SINGLE-EVIDENCE-GATE-REPAIR-001.json --closeoutKey=intelligence-synthesis-single-evidence-gate-repair-v1 --commitRef=HEAD`

## Not Next

- Do not work `MEETING-VAULT-ACL-001` Phase B or historical Meeting Vault cleanup from this sprint.
- Do not mutate Google Drive permissions.
- Do not run Slack sync or Slack extraction.
- Do not run live extraction.
- Do not send Gmail, ClickUp, Drive, or Agent Feedback mutations.
- Do not weaken `SYNTHESIS-VERIFY-001`.
- Do not hide remaining operational-write red rows.
- Do not build agent gates, Harlan, Fal, voice, Canva, OpenHuman, or UI redesign in this card.
