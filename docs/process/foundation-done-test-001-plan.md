# FOUNDATION-DONE-TEST-001 Readiness Exit Test Plan

Status: proposed plan artifact, not approved. Planning only. Do not implement until Steve approves this plan at 9.8 or higher.

Card: `FOUNDATION-DONE-TEST-001`

Baseline:

- `SECURITY-002` is shipped at `508fd9f` and must not be reopened.
- Missing Foundation gate cards are captured at `ab3d7ee`.
- This plan does not approve Strategy, Sales expansion, Agent Feedback expansion, Scoper, Agent Factory, broad corpus expansion, or UI polish.

## Goal

Build the explicit Foundation readiness exit test: one deterministic gate that says whether Foundation is ready for Strategy to resume, or else names the exact failed leg, blocker card, and next proof command.

This card writes the exit test. It does not have to make Foundation pass the exit test. If the current system is not ready, the correct output is `not_ready` with named blockers.

## Readiness Meaning

Foundation can be called ready only when these legs pass together:

1. Source-verifiable answers are possible without chat-only claims.
2. Tier/redaction safety is enforced from server-derived identity.
3. Every P0 Foundation gate has structural verifier/process coverage or is named as a blocking card.
4. Runtime/process controls are healthy enough that jobs, workers, and shipped code cannot drift silently.
5. Extraction retry, ledger, and backfill behavior is mechanically controlled.
6. Raw meeting-note Drive/vault access is proven safe, not only AIOS-side redacted.
7. The gate emits a clear pass/fail result that can be trusted by builders and reviewers.

## Current Expected Result

The first implementation should probably report `not_ready`, not `ready`, because several blocker cards are intentionally still scoped:

- `SOURCE-LIFECYCLE-COMPLETION-001` for source completion/revalidation.
- `SYNTHESIS-VERIFY-001` for claim verification before Strategy/scout consumption.
- `SYSTEM-010-GHOST-CLOSEOUT-001` for dead-man, decommission, active-process, and cost/process controls.
- `EXTRACT-RUN-HARDENING-001` for retry/backoff, partial failure, stale lease, cursor, and bounded backfill controls.
- `MEETING-VAULT-ACL-001` plus dependency `DRIVE-ACCESS-REQUEST-001` for raw Drive ACL/vault safety.
- `SECURITY-FILTERED-COMMS-ACCESS-001` if non-Tier-1 shared-comms or intelligence access is required.
- `SECURITY-EDGE-001` and `SECURITY-PROVIDER-ROTATION-PROOF-001` before any broader public/external exposure claim.

That is not a failure of this card. It is the point of the exit test.

## Files And Modules To Inspect

Read before implementation:

- `lib/foundation-db.js`: live/backlog card state, P0 gate cards, Foundation snapshot shape.
- `lib/foundation-build-log.js`: closeout schema and proof command conventions.
- `lib/security-access.js`: SECURITY-002 route posture registry, server-derived tier helpers, redaction helpers.
- `lib/source-lifecycle.js`: source lifecycle definitions, source/target status model, existing source lifecycle proof checks.
- `lib/intelligence-retrieval.js`, `lib/intelligence-synthesis-facts.js`, `lib/intelligence-synthesis.js`, `lib/intelligence-action-router.js`: source-backed answer, fact, synthesized-item, and route proof inputs.
- `lib/foundation-gate-reliability.js`, `lib/process-git-hooks.js`: gate retry/proof behavior and ship-proof recording conventions.
- `scripts/foundation-verify.mjs`: existing structural verifier checks and where this card should be covered.
- `scripts/process-foundation-ship.mjs`, `scripts/process-ship-check.mjs`, `scripts/process-fanout-check.mjs`, `scripts/process-post-ship-fanout.mjs`: process gate behavior.
- `scripts/process-security-002-check.mjs`: existing tier/redaction proof that this gate should call or mirror, not duplicate loosely.
- `scripts/intelligence-retrieval-eval.mjs` and `docs/specs/2026-04-27-intelligence-retrieval-eval-baseline.json`: current retrieval recall gate.
- `scripts/process-source-lifecycle-expansion-check.mjs`: existing source lifecycle process-check pattern.
- `scripts/backlog-hygiene.mjs`: healthy backlog proof and synthetic stale-card pattern.
- `docs/audits/2026-05-02-missing-card-capture-audit.md`: captured blocker-card rationale.
- `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md`: active Foundation doctrine and current open/closed truth.
- `package.json`: proof command registration.

Read-only APIs to use for proof, not new route work:

- `GET /api/foundation-hub`
- `GET /api/source-of-truth`
- `GET /api/foundation/source-lifecycle`
- `GET /api/foundation/jobs`
- `GET /api/foundation/extraction-control`
- `GET /api/foundation/llm-runtime`
- `POST /api/intelligence/evidence` as owner/Tier 1 only

## Likely Files To Touch After Approval

Keep implementation focused:

- Add `lib/foundation-readiness-gates.js`
  - Central registry for readiness legs, blocker cards, required commands, and pass/fail rules.
  - No scattered readiness constants inside route handlers.
- Add `scripts/process-foundation-done-test.mjs`
  - Runs the exit test and prints human output plus `FOUNDATION_DONE_TEST_SUMMARY` JSON.
  - Read-only under normal operation.
- Update `package.json`
  - Add `process:foundation-done-test`.
- Update `scripts/foundation-verify.mjs`
  - Assert the gate registry exists, covers required legs/cards, package script exists, and the process script has stable output semantics.
- Update `lib/foundation-build-log.js`
  - Add closeout `foundation-done-test-v1` after implementation.
- Update `lib/foundation-db.js`
  - Move only `FOUNDATION-DONE-TEST-001` to `done` after the exit test itself is implemented and proven.
  - Do not mark blocker cards done from this card.
- Update `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md`
  - State that the exit test exists and currently reports ready/not-ready based on live blockers.
- Add `docs/process/foundation-done-test.md`
  - Operator-facing description of the readiness gate and what `ready` actually means.
- Add `docs/process/approvals/FOUNDATION-DONE-TEST-001.json` only after Steve approves the final plan.

Do not touch:

- Strategy Hub feature code.
- Sales Hub feature code.
- Agent Feedback feature code.
- Scoper or Agent Factory code.
- Broad corpus extraction quotas or new corpus lanes.
- UI polish files unless a later approved plan explicitly asks for a visible status panel.

## Central Gate Registry

The implementation should start with a central registry in `lib/foundation-readiness-gates.js`, similar in spirit to SECURITY-002 route postures.

Each gate entry should include:

```js
{
  key: 'source_verifiable_answer',
  label: 'Source-verifiable answer',
  required: true,
  blockerCards: ['SOURCE-LIFECYCLE-COMPLETION-001', 'SYNTHESIS-VERIFY-001'],
  proofCommands: ['npm run intelligence:retrieval-eval'],
  ownedByCard: 'FOUNDATION-DONE-TEST-001',
  passDescription: 'Answers carry source IDs, evidence refs, freshness, and no ungrounded claim.',
  failClosedBehavior: 'Return not_ready and name the first blocker card.'
}
```

The registry must cover at least these blocker cards:

- `SECURITY-002`
- `MEETING-VAULT-ACL-001`
- `SECURITY-FILTERED-COMMS-ACCESS-001`
- `SECURITY-EDGE-001`
- `SECURITY-PROVIDER-ROTATION-PROOF-001`
- `DRIVE-ACCESS-REQUEST-001`
- `FOUNDATION-DONE-TEST-001`
- `SYSTEM-010-GHOST-CLOSEOUT-001`
- `SOURCE-LIFECYCLE-COMPLETION-001`
- `EXTRACT-RUN-HARDENING-001`
- `SYNTHESIS-VERIFY-001`
- `MEETING-FORWARD-TRANSCRIPT-ENFORCEMENT-001`
- `PROCESS-ACK-STATES-001`
- `VERIFIER-INCREMENTAL-COVERAGE-001`

P1 follow-ups can be registered as advisory or future blockers, but P0 gates must never disappear from the output.

## Leg 1: Source-Verifiable Answer Test

Purpose: prove Foundation can answer an operator question using source evidence, not chat memory or unsupported generated prose.

Pass requirements:

- `npm run intelligence:retrieval-eval` passes the existing 20-case baseline.
- The script can produce or inspect at least one deterministic source-backed answer packet with:
  - question or fixture ID
  - answer status: `answered` or `insufficient_evidence`
  - active `sourceId`
  - evidence refs that resolve to existing facts, chunks, artifacts, source contracts, backlog records, decisions, or action routes
  - freshness or generated-at timestamp
  - tier/sensitivity metadata for returned evidence
- A synthetic unsupported question returns `insufficient_evidence`, not an invented answer.
- Synthesized claims used by the answer are either verified by `SYNTHESIS-VERIFY-001` or the leg fails with that blocker.
- Source trust/freshness gaps fail with `SOURCE-LIFECYCLE-COMPLETION-001`.

Fail examples:

- An answer has no source ID.
- A source ID is historical/undeclared for active use.
- Evidence refs do not resolve.
- The answer uses synthesized text without claim verification.
- The system answers a phantom source question instead of saying evidence is insufficient.

Blocker mapping:

- Missing or stale source trust: `SOURCE-LIFECYCLE-COMPLETION-001`.
- Unverified synthesized claim: `SYNTHESIS-VERIFY-001`.
- Retrieval baseline regression: `SYNTHESIS-VERIFY-001` or the exact retrieval card named as a regression in output.

## Leg 2: Tier/Redaction Safety Test

Purpose: prove the SECURITY-002 safety layer remains intact before Strategy or any broader read surface resumes.

Pass requirements:

- `npm run process:security-002-check` passes.
- Live backlog has `SECURITY-002` done with closeout `security-002-auth-tier-redaction-v1`.
- `lib/security-access.js` still owns `assertTier`, `assertRole`, server-derived actor tier, route posture registry, and redacted response helpers.
- `/api/intelligence/evidence` does not trust client `maxTier`.
- External/non-Steve users cannot read Tier 1 or person-sensitive data.
- Shared-comms/intelligence routes remain Tier 1-only unless a later approved filtered route proves real-data redaction.
- Any missing tier, missing classification, or missing sensitivity fails closed.

Fail examples:

- A route bypasses the route posture registry.
- A client request can raise its own tier.
- A redacted response leaks suppressed IDs, counts, raw excerpts, or source URLs unsafe for the actor.
- A non-Tier-1 user can reach raw shared communications without `SECURITY-FILTERED-COMMS-ACCESS-001`.

Blocker mapping:

- SECURITY-002 regression: `SECURITY-002` regression, do not reopen scope without Steve direction.
- Missing real-data filtered access for broader users: `SECURITY-FILTERED-COMMS-ACCESS-001`.
- Public/external auth path unproven: `SECURITY-EDGE-001`.
- Provider-side credential closure missing: `SECURITY-PROVIDER-ROTATION-PROOF-001`.

## Leg 3: Structural Verifier Coverage For Every P0 Gate

Purpose: prove Foundation does not rely on chat memory for P0 readiness.

Pass requirements:

- The readiness registry lists every P0 gate card captured by `ab3d7ee` and the already-shipped SECURITY-002 gate.
- Each P0 gate has one of:
  - `done_with_verifier`: done card, closeout key, proof command, and `foundation:verify` coverage.
  - `blocking_scoped`: scoped/ranked/executing card named as a readiness blocker with next action.
  - `conditional_blocker`: explicitly not required for the current readiness claim, with the condition named. Example: `SECURITY-EDGE-001` blocks public exposure even if local owner-only review continues.
- `foundation:verify` checks the registry, not only prose.
- Missing gate, missing blocker card, missing closeout key, or missing proof command fails the leg.

Initial P0 gate list:

- App auth/tier/redaction: `SECURITY-002`.
- Raw meeting vault: `MEETING-VAULT-ACL-001`, dependency `DRIVE-ACCESS-REQUEST-001`.
- Filtered shared-comms access: `SECURITY-FILTERED-COMMS-ACCESS-001`.
- Public/edge safety: `SECURITY-EDGE-001`.
- Provider credential closure: `SECURITY-PROVIDER-ROTATION-PROOF-001`.
- Runtime/process controls: `SYSTEM-010-GHOST-CLOSEOUT-001`.
- Source lifecycle completion: `SOURCE-LIFECYCLE-COMPLETION-001`.
- Extraction hardening: `EXTRACT-RUN-HARDENING-001`.
- Synthesis/claim verification: `SYNTHESIS-VERIFY-001`.
- Readiness test itself: `FOUNDATION-DONE-TEST-001`.

Fail examples:

- A P0 card is scoped but not shown as a blocker.
- A done P0 card lacks closeout/proof/verifier coverage.
- A new P0 Foundation gate appears in live backlog and is not registered.

## Leg 4: Runtime/Process Control Health Test

Purpose: prove the running system matches repo truth and can be controlled.

Pass requirements:

- `npm run foundation:verify` passes served-code and worker-code trust.
- Dashboard and worker are serving current `HEAD`.
- Foundation worker LaunchAgent is live or the system is explicitly marked manual-only.
- Job registry and runtime health have no stale active runs beyond threshold.
- Pause/resume paths are available for controlled jobs.
- Ship gates are intact:
  - `npm run process:ship-check`
  - `npm run process:fanout-check`
  - `npm run process:post-ship-fanout`
  - `npm run process:foundation-ship`
- Remaining dead-man/decommission/cost controls are closed or the leg fails with `SYSTEM-010-GHOST-CLOSEOUT-001`.

Fail examples:

- Dashboard or worker serves stale code.
- A job is running without a visible owner, process ID, timeout, pause state, or next safe command.
- A stale process can keep running after decommission.
- Cost/budget controls are only descriptive while the readiness claim says they are enforced.

Blocker mapping:

- Runtime control gap: `SYSTEM-010-GHOST-CLOSEOUT-001`.
- Ship/process gate regression: the specific process card named by the failed proof command.

## Leg 5: Extraction Retry/Ledger/Backfill Health Test

Purpose: prove extraction is a governed supply chain, not a best-effort archive script.

Pass requirements:

- Extraction targets and runs use run IDs, target IDs, item keys, lease owner, and current content hashes consistently.
- Failed items have retry/backoff state, not silent permanent skips.
- Partial failures are visible and mapped to a next safe command.
- Stale leases/runs are reaped or reported.
- Backfill windows are bounded and cursor/checkpoint state is explicit.
- Current-day lanes and daily quota lanes show last success/failure and no unexplained stale active runs.
- The test does not raise corpus quotas or create new extraction lanes.

Fail examples:

- A target run succeeds while item failures are hidden.
- A failed Drive/video/meeting item has no retry/backoff or blocked reason.
- Backfill can run unbounded without a lease/cursor.
- A stale active extraction run is not surfaced.

Blocker mapping:

- Extraction run control gap: `EXTRACT-RUN-HARDENING-001`.
- Source completion/revalidation gap exposed during extraction proof: `SOURCE-LIFECYCLE-COMPLETION-001`.

## Leg 6: Meeting Raw Drive ACL/Vault Status Check

Purpose: prove the privacy model covers original Google Drive meeting-note files, not only AIOS responses.

Pass requirements:

- `MEETING-VAULT-ACL-001` is done with an approved dry-run and closeout.
- The system has a meeting-note file inventory with:
  - Drive file ID or metadata-only file ref
  - owner identity
  - current permission classes
  - privacy profile/classification
  - allowed system/vault identity
  - unsafe reader findings or clean status
- Owner-preserving ACL rules are proven: file owner is not stripped, system/vault identity is present where required, and unsafe participant access is removed only after explicit approval.
- Before/after audit snapshots exist for real ACL changes.
- Rollback path is documented.
- Synthetic proof shows a non-owner cannot read a protected raw meeting note through Drive or AIOS.

Fail examples:

- SECURITY-002 is treated as if it changed raw Drive ACLs.
- The system cannot prove who owns a meeting note.
- The active Google account/delegated actor is ambiguous.
- ACL mutation would happen without dry-run diff and Steve approval.

Blocker mapping:

- Raw meeting vault gap: `MEETING-VAULT-ACL-001`.
- Access-request/preflight ambiguity: `DRIVE-ACCESS-REQUEST-001`.
- Future meeting transcript capture gap: `MEETING-FORWARD-TRANSCRIPT-ENFORCEMENT-001` as advisory unless the readiness claim includes future capture completeness.

## Leg 7: Clear Pass/Fail Output

Purpose: make the gate useful to Steve, reviewers, and builders.

Human output should look like:

```text
Foundation readiness exit test
  Status: NOT READY
  Repo: ab3d7ee
  Ready for Strategy: no

FAIL source-verifiable answer
  Blocker: SYNTHESIS-VERIFY-001
  Why: synthesized claims are not yet verified before Strategy/scout consumption.
  Next proof: npm run intelligence:retrieval-eval && npm run process:synthesis-verify-check

PASS tier/redaction safety
  Proof: npm run process:security-002-check
```

Machine output must end with one JSON line:

```text
FOUNDATION_DONE_TEST_SUMMARY {"status":"not_ready","readyForStrategy":false,"failedLegs":[{"key":"source_verifiable_answer","blockerCard":"SYNTHESIS-VERIFY-001","proofCommand":"npm run intelligence:retrieval-eval"}],"blockingCards":["SYNTHESIS-VERIFY-001"]}
```

Exit behavior:

- Exit `0` only when Foundation is ready.
- Exit `1` when Foundation is not ready and blockers are named.
- Exit `2` for script/configuration failure where readiness could not be evaluated.
- Support `--json` for machine-readable output.
- Support `--report-only` for closeout/proof runs that need to prove the detector works while Foundation is honestly not ready. `--report-only` must still print `status:not_ready`; it only changes the process exit code to `0` for the FOUNDATION-DONE-TEST-001 closeout.

## Implementation Sequence After Approval

1. Add `lib/foundation-readiness-gates.js` with the central gate registry and blocker-card mapping.
2. Add `scripts/process-foundation-done-test.mjs` that evaluates the registry against live Foundation snapshot, repo files, and existing proof commands where safe.
3. Add `process:foundation-done-test` to `package.json`.
4. Wire `foundation:verify` to assert the registry, script, package command, output semantics, and required gate-card coverage.
5. Add `docs/process/foundation-done-test.md` with the operator-readable definition.
6. Update `FOUNDATION-DONE-TEST-001` backlog row to done only for the test implementation, not for Foundation readiness.
7. Add build-log closeout `foundation-done-test-v1`.
8. Update current plan/state with the new exit-test status and current ready/not-ready result.
9. Run focused proof and canonical ship gates.

## Proof Commands

Required before closeout:

```bash
npm run process:foundation-done-test -- --report-only
npm run process:security-002-check
npm run intelligence:retrieval-eval
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=FOUNDATION-DONE-TEST-001 --planApprovalRef=docs/process/approvals/FOUNDATION-DONE-TEST-001.json --closeoutKey=foundation-done-test-v1 --commitRef=HEAD
```

If the exit test reports `not_ready`, the closeout is still valid only if:

- `FOUNDATION-DONE-TEST-001` itself is implemented and verifier-covered.
- The not-ready result names blocker cards instead of vague prose.
- The blocker cards remain scoped/ranked/executing and are not silently marked done.
- `foundation:verify` confirms the exit test exists and is structurally covered.

## Rollback And Fail-Closed Behavior

- The new readiness test is read-only. Rollback is removing the npm command, script, registry, verifier coverage, and docs from the commit before ship.
- If any leg cannot be evaluated safely, the result is `not_ready`, not `ready`.
- If a required blocker card is missing, the result is `not_ready` with `FOUNDATION-DONE-TEST-001` as the process blocker.
- If live APIs time out, the result is `not_ready` unless the command is explicitly running a structural-only mode approved later.
- Do not loosen any auth route, increase extraction quota, mutate Drive ACLs, or change public exposure from this card.

## Acceptance Criteria

The card is done when:

- The central readiness registry exists and covers all required legs and blocker cards.
- `npm run process:foundation-done-test -- --report-only` prints clear human output and `FOUNDATION_DONE_TEST_SUMMARY`.
- The default command exits nonzero when Foundation is not ready.
- The report-only command can be used to prove this card without pretending Foundation itself is ready.
- `foundation:verify` guards the registry, package script, output shape, and required P0 gate coverage.
- Current plan/state explain whether Foundation is currently ready and which cards block it.
- The closeout does not reopen SECURITY-002 and does not build broader Foundation features.

## Not Next

- Do not reopen `SECURITY-002`.
- Do not start Strategy Hub work.
- Do not expand Sales.
- Do not expand Agent Feedback.
- Do not build Scoper.
- Do not build Agent Factory.
- Do not broaden corpus extraction.
- Do not do UI polish.
- Do not mutate Drive ACLs.
- Do not broaden public/external access.
