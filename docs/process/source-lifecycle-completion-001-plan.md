# SOURCE-LIFECYCLE-COMPLETION-001 Source Lifecycle Completion Plan

Status: approved at 9.8 on 2026-05-09. Implementation is limited to this plan.

Card: `SOURCE-LIFECYCLE-COMPLETION-001`

Current truth:

- `SYSTEM-010-GHOST-CLOSEOUT-001` is shipped at `800f0bf`.
- Runtime/process-control readiness now passes.
- `npm run process:foundation-done-test -- --report-only` still reports `not_ready`.
- Remaining readiness blockers are source completion, synthesis verification, extraction hardening, and meeting Drive ACL/vault proof.
- `SOURCE-LIFECYCLE-EXPANSION-001` is already done under `source-lifecycle-expansion-v1`; it provides visibility/control for 35 source contracts and 12 extraction targets, but it does not prove completion/revalidation.

## Goal

Close the source lifecycle completion/revalidation blocker honestly.

Foundation can stop naming `SOURCE-LIFECYCLE-COMPLETION-001` only when every source contract has a current, evidence-backed terminal state:

- complete for its declared role, or
- accepted blocked/parked with owner, reason, follow-up card, and no hidden Strategy-readiness dependency.

This card does not make synthesized answers trustworthy by itself. `SYNTHESIS-VERIFY-001` still owns claim-level verification.

## Current Source Lifecycle State

Live source lifecycle currently reports:

- 35 source contracts.
- 13 connectors.
- 12 governed extraction targets.
- 4 lifecycle lanes.
- 0 lane completeness failures.
- 0 target baseline changes.
- 8 active targets, 2 planned targets, 1 blocked target, 1 paused target.
- Source lifecycle stages: 9 reviewed, 7 verified, 6 extracted, 1 connected, 12 parked.

That is enough for visibility. It is not enough for readiness because `Pending Revalidation`, `Gap`, and `Verified Readable / Not Signed Off` states are not yet classified into pass/block terminal states.

## Completion Criteria

Each source contract must have a `completionState`:

- `complete`: source is connected or no connector is required, verified for its declared role, reviewed or explicitly readable-only/current-reality, freshness/coverage proof exists, privacy tier is classified, and any extraction target needed for its declared role is healthy enough or explicitly deferred to another blocker.
- `accepted_blocked`: source is not complete, but the reason is explicit, owner is assigned, blocker/follow-up card exists, and the source is not required for owner-only Foundation Strategy readiness.
- `read_only_complete`: source is intentionally readable-only. Reads are proven and write/mutation authority remains out of scope.
- `current_reality_complete`: source meaning is signed off for current reality, even if a rebuilt freshness-managed pipeline is future work.
- `not_applicable`: source has no extraction requirement for this readiness gate, but still has contract, owner, status, and evidence refs.

Completion fails closed when:

- a source contract has no terminal state;
- a Strategy-critical source is `accepted_blocked`;
- a source is `Pending Revalidation` without a bounded decision;
- a source is `Gap` without a blocker card and owner;
- a source has an extraction target but no current/backfill coverage proof;
- a source exposes evidence without sensitivity/tier classification;
- source content, raw emails, transcripts, private tokens, or private local files appear in proof output.

## Lifecycle Meanings

Use these definitions in code, proof output, and docs:

- `connected`: A source contract exists and one of these is true: connector works, source path is readable, source is a repo/doc source, or the source is explicitly marked no-connector-required for its current role.
- `verified`: Source meaning and trust boundary are documented with source ID, owner, validation scope, sensitivity tier, and current proof command or evidence ref.
- `extracted`: Existing governed target/job has archived/extracted evidence with provenance, caps, run/item ledger counts, and no unclassified failures for the role this source serves.
- `reviewed`: Human/source-owner signoff, readable-only acceptance, current-reality signoff, or explicit not-signed-off decision is recorded with next action.
- `blocked`: The source cannot be treated as complete. It has blocker type, owner, next action, follow-up card, and `blocksStrategyReadiness` true/false. Blocked sources never silently count as healthy.

Keep `parked` as a display synonym for non-blocking `accepted_blocked` / future-lane sources, but the proof script should use the stricter `blocked` classification.

## Source Contracts To Revalidate

All 35 source contracts must be revalidated. The completion check should group them by required terminal state.

### Must Become Complete For Readiness

These are load-bearing for current Foundation/Strategy answers or core operating truth:

| Source ID | Current status | Required terminal state |
| --- | --- | --- |
| `SRC-STRATEGY-001` | Verified / Signed Off | `complete` |
| `SRC-FREEDOM-TEAM-001` | Current reality captured | `current_reality_complete` |
| `SRC-FREEDOM-COMMUNITY-001` | Current reality captured | `current_reality_complete` |
| `SRC-FREEDOM-COMMUNITY-REV-001` | Current reality captured | `current_reality_complete` |
| `SRC-FREEDOM-ENGINE-001` | Current reality captured | `current_reality_complete` |
| `SRC-FREEDOM-BHAG-001` | Current reality captured | `current_reality_complete` |
| `SRC-OWNERS-001` | Signed Off | `complete` |
| `SRC-OWNERS-LISTS-001` | Current reality captured | `current_reality_complete` |
| `SRC-FINANCE-001` | Current reality captured | `current_reality_complete` |
| `SRC-CLICKUP-001` | V1 Source Boundary Locked | `complete` |
| `SRC-FUB-001` | Verified Readable / Readable Only | `read_only_complete` |
| `SRC-SUPABASE-001` | Verified Readable / Readable Only | `read_only_complete` |
| `SRC-GMAIL-001` | Verified Readable / extracted | `complete` |
| `SRC-GCAL-001` | Verified Readable | `complete` |
| `SRC-GDRIVE-001` | Pending Revalidation / extracted | `complete` for existing Drive inventory/content lanes, with rich media/ACL gaps blocked separately |
| `SRC-VIDEO-001` | Pending Revalidation / extracted | `complete` for existing manifest/subtitle transcript lanes, with rich video/vision gaps blocked separately |
| `SRC-SLACK-001` | Verified Readable / extracted | `complete` |
| `SRC-MISSIVE-001` | Verified Readable / extracted | `complete` |
| `SRC-MEETINGS-001` | Verified Readable / extracted | `complete` for readable/archive use; raw Drive ACL/vault still blocked by `MEETING-VAULT-ACL-001` |
| `SRC-DATAFORSEO-001` | Verified Readable | `complete` |
| `SRC-GHL-001` | Verified Readable | `complete` |
| `SRC-META-001` | Verified Readable | `complete` |

### Must Become Accepted Blocked/Parked

These do not need to become fully connected/extracted for owner-only Strategy readiness, but they must be explicitly classified so they cannot hide behind vague gaps:

| Source ID | Current status | Required terminal state |
| --- | --- | --- |
| `SRC-STRATEGY-QUARTER-001` | Scoped, not connected | `accepted_blocked`; future Strategy Quarter input layer |
| `SRC-MYICRO-001` | Scoped, not connected | `accepted_blocked`; authorization/content-use proof required later |
| `SRC-CREATOR-WATCHLIST-001` | Pending Revalidation | `accepted_blocked`; future governed watchlist |
| `SRC-YOUTUBE-INTEL-001` | Pending Revalidation | `accepted_blocked` for scout/discovery/Gemini video work; subtitle transcript v1 remains covered under `SRC-VIDEO-001`/DataForSEO |
| `SRC-LOOM-001` | Gap | `accepted_blocked`; no approved extractor/API proof |
| `SRC-SKOOL-001` | Gap / blocked target | `accepted_blocked`; no approved crawler/API proof |
| `SRC-GADS-001` | Pending Revalidation | `accepted_blocked`; OAuth `invalid_grant` remains a connector repair, not Strategy readiness |
| `SRC-PUBLISH-001` | Gap | `accepted_blocked`; publishing API candidate not validated |
| `SRC-REAL-001` | Gap | `accepted_blocked`; not connected |
| `SRC-EMAIL-TEAM-001` | Gap | `accepted_blocked`; not connected |
| `SRC-REVIEWS-001` | Gap | `accepted_blocked`; not connected |
| `SRC-TRAINING-001` | Gap | `accepted_blocked`; live source unknown |
| `SRC-CONTENT-001` | Gap | `accepted_blocked`; not connected |

If implementation finds any of the accepted-blocked sources are required by current Strategy-ready answers, fail the card instead of downgrading the dependency.

## Freshness And Coverage Proof

Add a source completion status model that derives from existing source truth and lifecycle payloads. It should not ingest new content.

For every source:

- `sourceId`
- `title`
- `owner`
- `currentStatus`
- `validation`
- `completionState`
- `blocksStrategyReadiness`
- `freshnessStatus`: `fresh`, `current_reality`, `readable_only`, `stale`, `blocked`, or `not_applicable`
- `coverageStatus`: `covered`, `partial_with_blocker`, `blocked`, or `not_applicable`
- `sensitivityTier`: minimum tier needed to inspect raw source evidence
- `evidenceRefs`: source IDs, target keys, job keys, run IDs, counts, proof command names only
- `blockerCards`
- `nextAction`
- `lastProofCommand`

Freshness requirements:

- Signed/current-reality spreadsheet/doc sources can be `current_reality` if their signoff note and verification date remain present.
- Readable API sources must have a working connector or health command where one exists.
- Governed extraction targets must expose recent run/item ledger counts, target state, and failures/skips classified.
- Existing current-day lanes must show recent successful or explicitly skipped item proof.
- Backfill lanes must show bounded caps and latest ledger/artifact counts; unbounded backfill fails.
- Sources with no extraction requirement must say `not_applicable` and why.
- Accepted-blocked sources must be explicit and must not count as freshness proof.

Coverage requirements:

- All 35 source contracts are represented.
- All 12 governed extraction targets are represented.
- All source IDs used by Strategy/source-verifiable answer paths must be either `complete`, `read_only_complete`, or `current_reality_complete`.
- All pending/gap sources have owner, blocker/follow-up card, and `blocksStrategyReadiness`.
- No raw source content appears in output.

## Files And Routes To Inspect

Inspect before implementation:

- `lib/source-lifecycle.js`
- `lib/source-contracts.js`
- `lib/foundation-readiness-gates.js`
- `lib/foundation-db.js`
- `lib/foundation-build-log.js`
- `lib/foundation-surface-map.js`
- `server.js`
- `scripts/process-source-lifecycle-expansion-check.mjs`
- `scripts/process-foundation-done-test.mjs`
- `scripts/foundation-verify.mjs`
- `scripts/clickup-source-verify.mjs`
- `scripts/backlog-hygiene.mjs`
- `docs/source-registry.md`
- `docs/process/foundation-done-test.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- Existing APIs:
  - `GET /api/source-of-truth`
  - `GET /api/foundation/source-lifecycle`
  - `GET /api/foundation-hub`
  - `GET /api/foundation/extraction-control`

## Likely Files To Touch After Approval

- Add `lib/source-lifecycle-completion.js`
  - Owns terminal-state rules, source groups, freshness/coverage checks, sensitivity/tier classification, and no-content leak inspection.
- Add `scripts/process-source-lifecycle-completion-check.mjs`
  - Focused proof script for all source contracts and completion states.
- Update `package.json`
  - Add `process:source-lifecycle-completion-check`.
- Update `lib/foundation-readiness-gates.js`
  - Add closeout key `source-lifecycle-completion-v1`.
  - Source-verifiable answer leg should stop naming `SOURCE-LIFECYCLE-COMPLETION-001` once this card is done, while still naming `SYNTHESIS-VERIFY-001` until that card closes.
- Update `scripts/process-foundation-done-test.mjs` only if output needs to expose the refined blocker split.
- Update `scripts/foundation-verify.mjs`
  - Verify plan/approval, script, source groups, completion states, no-content proof, readiness integration, and closeout.
- Update `server.js` only if the implementation exposes a read-only API such as `GET /api/foundation/source-lifecycle-completion`.
- Update `lib/source-lifecycle.js` only if completion status should be embedded in the existing source lifecycle response.
- Update docs after implementation:
  - `docs/process/source-lifecycle-completion.md`
  - `docs/process/approvals/SOURCE-LIFECYCLE-COMPLETION-001.json`
  - `lib/foundation-build-log.js`
  - `docs/process/foundation-done-test.md`
  - `docs/rebuild/current-plan.md`
  - `docs/rebuild/current-state.md`

Do not add broad UI work. If a visible surface is needed, keep it to existing Source Lifecycle / Runtime proof fields, not a sprint overlay or redesign.

## Build Sequence After Approval

1. Central completion registry first:
   - Create the source completion rule set and exact per-source expectations.
   - Do not start with scattered verifier edits.
2. Read-only status builder:
   - Derive completion from `/api/source-of-truth`, `/api/foundation/source-lifecycle`, extraction control, and connector/source health evidence.
3. Freshness and coverage checks:
   - Implement all-source coverage, all-target coverage, current/backfill proof, blocked-source proof, and no raw-content proof.
4. Focused process script:
   - Add `process:source-lifecycle-completion-check`.
   - Script output must print each failed source with source ID, failed leg, blocker card, and next action.
5. Readiness integration:
   - Wire the readiness gate so the source lifecycle blocker clears only after the card is done with closeout proof.
   - `SYNTHESIS-VERIFY-001` should remain a blocker until its own proof closes.
6. Closeout docs and build log:
   - Add proof doc, approval artifact, build-log closeout, current plan/state updates.
   - Do not mark any accepted-blocked source's future feature card done.

## Acceptance Criteria

`SOURCE-LIFECYCLE-COMPLETION-001` is done only when all are true:

- All 35 source contracts have a terminal completion state.
- The 22 Strategy/load-bearing sources listed above are complete/read-only/current-reality for their declared current role.
- The 13 future/gap sources listed above are accepted-blocked with owner, reason, next action, and blocker/follow-up card.
- All 12 extraction targets remain represented.
- No new extraction target, quota increase, broad corpus build, or crawler is introduced.
- Existing target status/runtime/budget caps do not silently change.
- Source lifecycle proof names every source that fails and why.
- Output includes freshness and coverage status for every source.
- Output includes sensitivity/tier classification for raw evidence inspection.
- Proof output is metadata-only and contains no raw source content, private local memory, email bodies, transcripts, raw tokens, or feedback content.
- `npm run process:foundation-done-test -- --report-only` no longer names `SOURCE-LIFECYCLE-COMPLETION-001`.
- Foundation can still report `not_ready` because of `SYNTHESIS-VERIFY-001`, `EXTRACT-RUN-HARDENING-001`, `MEETING-VAULT-ACL-001`, and `DRIVE-ACCESS-REQUEST-001`.

## Proof Commands

Minimum proof after implementation:

```bash
node --check lib/source-lifecycle-completion.js
node --check scripts/process-source-lifecycle-completion-check.mjs
node --check scripts/foundation-verify.mjs
npm run process:source-lifecycle-completion-check
npm run process:source-lifecycle-expansion-check
npm run process:foundation-done-test -- --report-only
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=SOURCE-LIFECYCLE-COMPLETION-001 --planApprovalRef=docs/process/approvals/SOURCE-LIFECYCLE-COMPLETION-001.json --closeoutKey=source-lifecycle-completion-v1 --commitRef=HEAD
```

The focused proof script must include:

- all 35 source contracts represented;
- all 12 extraction targets represented;
- required complete/read-only/current-reality source set passes;
- accepted-blocked source set has owner, reason, blocker card, and `blocksStrategyReadiness=false`;
- `SRC-GDRIVE-001`, `SRC-VIDEO-001`, and `SRC-MEETINGS-001` current-role scope is explicit so rich-media/raw-ACL gaps remain on separate cards;
- target caps/status/runtime unchanged from approved lifecycle baseline unless explicitly approved;
- freshness/coverage proof output present for each source;
- sensitivity/tier classification present for each source;
- no raw/private content leak in output;
- readiness summary no longer includes `SOURCE-LIFECYCLE-COMPLETION-001`.

## Rollback And Fail-Closed Behavior

- If source completion cannot evaluate, readiness remains `not_ready`.
- If a source has no terminal state, the source lifecycle completion script exits nonzero.
- If a Strategy/load-bearing source is blocked, readiness continues to name `SOURCE-LIFECYCLE-COMPLETION-001`.
- If accepted-blocked sources lack owner, blocker card, or next action, the script fails.
- If an extraction target disappears or target caps change unexpectedly, the script fails.
- If raw source content leaks into proof output, the script fails.
- If the card is rolled back, remove readiness closeout recognition and leave `SOURCE-LIFECYCLE-COMPLETION-001` scoped/blocking.

## Not Included

Do not build in this card:

- Strategy Hub expansion or advisor activation.
- Sales expansion.
- Agent Feedback expansion.
- Scoper.
- Agent Factory.
- broad corpus expansion.
- researcher/self-improvement agent.
- video mining, YouTube scout expansion, Gemini video understanding, or creator watchlist implementation.
- Mycro, Skool, Loom, Google Ads, publishing, reviews, training, content, Real Broker, or team-wide-email connector builds.
- meeting Drive ACL/vault changes.
- extraction retry/backoff hardening beyond reading existing target/item proof.
- synthesis/claim verification; that remains `SYNTHESIS-VERIFY-001`.
- sprint overlay, sprint view, velocity graph, or UI sprint work.
