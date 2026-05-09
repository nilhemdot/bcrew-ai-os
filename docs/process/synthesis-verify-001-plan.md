# SYNTHESIS-VERIFY-001 Synthesized Claim Verification Plan

Status: approved at 9.8 on 2026-05-09. Implementation is limited to this plan.

Card: `SYNTHESIS-VERIFY-001`

Current truth:

- `SYSTEM-010-GHOST-CLOSEOUT-001` is shipped.
- `SOURCE-LIFECYCLE-COMPLETION-001` is shipped at `148f868`.
- `npm run process:foundation-done-test -- --report-only` still reports `not_ready`.
- The source-verifiable answer leg now blocks only on `SYNTHESIS-VERIFY-001`.
- `SYNTHESIS-FACTS-001`, `SYNTHESIS-ENGINE-001`, and `ACTION-ROUTER-001` are done for v1, but none of them is a claim-level verification gate.

## Goal

Close the source-verifiable answer blocker for synthesized claims before Strategy, researcher, scout, advisor, or action-routing consumers rely on generated conclusions.

This card does not build new Strategy features. It adds the safety layer that says: a generated claim is either verified against governed source evidence, clearly downgraded, or excluded from decision-grade output.

Foundation readiness may still report `not_ready` after this card because of:

- `EXTRACT-RUN-HARDENING-001`
- `MEETING-VAULT-ACL-001`
- `DRIVE-ACCESS-REQUEST-001`

## Current Synthesis Model

Existing source-backed substrate:

- `lib/intelligence-retrieval.js`
  - `intelligence_retrieval_chunks`
  - lexical, semantic, and hybrid evidence search
  - tier/sensitivity on chunks
- `lib/intelligence-synthesis-facts.js`
  - `intelligence_synthesis_facts`
  - fact types: `source_contract`, `goal_truth`, `operating_truth`, `kpi_truth`, `source_snapshot`, `source_health`, `retrieved_evidence`
  - source IDs, evidence IDs, artifact IDs, atom IDs, candidate keys, min tier, sensitivity, and `as_of`
- `lib/intelligence-synthesis.js`
  - `intelligence_synthesized_items`
  - synthesized items carry `source_ids`, `fact_refs`, `evidence_refs`, `evidence_chunk_refs`, `atom_refs`, `candidate_keys`, `artifact_ids`, `sensitivity`, `min_tier`, and route metadata
- `lib/intelligence-action-router.js`
  - routes synthesized items into decisions, backlog, open questions, ignore/snooze, or owner actions
  - routes preserve fact/evidence/chunk provenance and require human approval before destination writes
- `scripts/generate-shared-comms-synthesis.mjs`
  - older LLM synthesis path over shared communication candidates
  - writes `shared_communication_synthesis_runs` and `shared_communication_synthesized_items`
  - items carry `source_ids`, `candidate_keys`, `source_count`, confidence, and evidence summary, but not per-claim fact/chunk refs

Current gap:

- Synthesis v1 proves that items have refs.
- It does not prove every generated claim in the item is actually supported by those refs.
- Strategy Hub v2 filters for strategy routes, but it does not yet require claim-verification status.
- The older shared-comms synthesis route can still expose generated copy whose support level is not mechanically classified.

## Synthesized Claim Definition

A synthesized claim is any generated assertion, interpretation, ranking, recommendation, or conclusion that is not a direct deterministic source read.

This includes:

- an item title that states a problem, opportunity, risk, decision, pattern, or owner need
- a summary sentence that combines facts, evidence, or source records
- a `why_it_matters`, `one_line`, `recommended_next_action`, `owner_action`, or `routing_reason`
- a claim that something is active, stale, resolved, repeated, cross-source, strategy-grade, or owner-relevant
- a confidence, priority, severity, staleness, or route-scope classification
- a suggested owner when ownership is inferred from content
- a recommendation to create a backlog item, decision, open question, route, or Strategy issue
- a claim that relies on retrieved evidence, shared-comms candidates, atoms, facts, or generated synthesis output

Not synthesized claims:

- raw source IDs, fact IDs, atom IDs, chunk IDs, candidate keys, run IDs, route IDs, and counts copied directly from DB rows
- deterministic source snapshots such as current goal truth, operating truth, source contract status, and retrieval eval result
- route approval status, backlog lane, decision status, or open-question status read directly from live tables

If a deterministic value is embedded in generated explanatory copy, the explanatory copy is still a synthesized claim and must carry evidence/provenance.

## Verification States

Every synthesized claim must resolve to one of these states:

- `verified`: claim is supported by active, tier-allowed, source-backed evidence that satisfies the claim class rules.
- `partially_supported`: claim has some evidence but not enough for decision-grade output.
- `unsupported`: no valid source evidence supports the claim.
- `contradicted`: active source evidence conflicts with the claim.
- `stale`: evidence exists but is outside freshness rules for that claim class.
- `blocked`: verification cannot be evaluated because refs are missing, unclassified, disallowed by tier/sensitivity, or source lifecycle state blocks use.

Only `verified` claims can feed Strategy/researcher/scout/advisor decision-grade output.

`partially_supported`, `unsupported`, `contradicted`, `stale`, and `blocked` must fail closed. They can be shown only as verification diagnostics or advisory review items, never as trusted Strategy facts or recommendations.

## Evidence Requirements By Claim Class

All evidence must be metadata-safe. Proof output may include IDs, source labels, counts, status, dates, and hashes. It must not dump raw email, transcript, Drive note, private chat, private credential, or raw attachment content.

### Direct Source Fact Claim

Examples: current source status, goal truth, operating truth, KPI truth, source health.

Required evidence:

- at least one active `intelligence_synthesis_facts` row
- `fact_id`
- `fact_type`
- `source_id`
- `source_ids`
- `status = active`
- `min_tier <= actor/server max tier`
- sensitivity classification present
- registered source contract ID
- `as_of` or explicit current-reality/read-only proof where applicable

Pass rule: one valid fact can verify a direct source fact claim if it is current for its source class.

### Retrieved Evidence Claim

Examples: a communication pattern, meeting/email/slack signal, repeated objection, candidate-backed issue.

Required evidence:

- at least one active synthesis fact of type `retrieved_evidence`
- at least one active `intelligence_atoms` ref or governed candidate ref
- at least one active `intelligence_retrieval_chunks` ref
- source ID on the fact, atom/candidate, and chunk must agree or be explicitly related
- min tier and sensitivity must be present on all involved refs

Pass rule: one valid evidence chain can verify a low-risk observation. A Strategy-grade item must meet the multi-evidence rules below.

### Cross-Source Or Strategy-Grade Claim

Examples: "this is a Strategy issue", "repeated pattern", "cross-source blocker", "active operating gap", "owner decision needed".

Required evidence:

- at least two independent evidence refs, or one source-backed operating/goal fact plus one retrieved-evidence chain
- at least two active chunk refs for claims marked `strategyHubEligible`
- at least one source-backed fact when the claim talks about goals, KPIs, source health, finance, owners, FUB, or operating state
- no active contradiction fact or route/destination record that shows the issue is resolved
- route scope/severity/confidence must be derived from evidence counts, source class, freshness, and support state, not model vibes

Pass rule: Strategy-grade claims require multi-evidence or source-fact-plus-evidence support. Single-evidence Strategy claims fail closed.

### Recommendation Or Action Claim

Examples: recommended next action, backlog route, open question, decision route, owner action.

Required evidence:

- a verified underlying problem/opportunity claim
- explicit destination/reason mapping from `lib/intelligence-action-router.js`
- owner or `needs-owner-decision`
- human approval required before destination write
- source IDs, fact refs, evidence refs, and chunk refs preserved into the route

Pass rule: action/recommendation claims can be `verified` only if the underlying claim is verified and the route preserves provenance.

### Shared-Comms LLM Synthesis Claim

Examples: older `synthesis:brief` ranked item title, one-line, why-it-matters, recommendation, confidence.

Required evidence:

- candidate keys exist and resolve to governed shared communication candidates
- source IDs exist and resolve to registered source contracts
- item `source_count` matches distinct valid source IDs or is downgraded
- candidate refs have sensitivity/min-tier classification through metadata or source defaults
- generated text is treated as one claim pack unless implementation extracts smaller claims safely

Pass rule: v1 can verify a shared-comms item only when the whole claim pack is backed by valid candidate/source refs. Otherwise it is `blocked` or `partially_supported` and must be excluded from Strategy/advisor/scout/researcher reliance.

## Confidence, Citation, And Provenance Rules

Confidence is a derived verification result, not an LLM self-rating.

Allowed output confidence fields:

- `supportLevel`: `verified`, `partially_supported`, `unsupported`, `contradicted`, `stale`, or `blocked`
- `confidenceLabel`: `high`, `medium`, `low`, or `none`
- `confidenceReason`: short machine-generated reason code
- `verifiedAt`
- `verificationVersion`

Rules:

- `high` requires `supportLevel = verified` and no freshness, contradiction, or tier warnings.
- `medium` requires `supportLevel = verified` with a limitation clearly captured, such as single-source but valid direct fact.
- `low` is allowed only for `partially_supported` diagnostics.
- `none` is required for unsupported, contradicted, stale, or blocked claims.
- Existing numeric confidence from shared-comms synthesis is not trusted by itself. It can be preserved as `modelConfidence` but cannot make a claim verified.

Citation/provenance shape:

```json
{
  "claimId": "claim:<stable-hash>",
  "surface": "intelligence_synthesized_items",
  "recordId": "synthesized-item-id",
  "claimClass": "strategy_grade",
  "claimTextHash": "sha256:<hash>",
  "supportLevel": "verified",
  "confidenceLabel": "high",
  "sourceIds": ["SRC-GMAIL-001", "SRC-STRATEGY-001"],
  "factRefs": ["fact:..."],
  "evidenceRefs": ["atom:..."],
  "evidenceChunkRefs": ["retrieval-chunk:..."],
  "candidateKeys": ["candidate:..."],
  "artifactIds": ["artifact:..."],
  "routeRefs": ["action-route:..."],
  "freshness": {
    "status": "fresh",
    "asOf": "2026-05-09T00:00:00.000Z"
  },
  "warnings": [],
  "blockedReason": null
}
```

No raw source excerpt is required in the verification proof. If a UI later needs human-readable evidence, it must use existing access-controlled/redacted response helpers from `SECURITY-002`.

## Fail-Closed Behavior

Implementation must fail closed in all ambiguous cases:

- Missing `min_tier`, sensitivity, source IDs, fact refs, evidence refs, or chunk refs means `blocked`.
- Missing source contract means `blocked`.
- Source lifecycle accepted-blocked sources cannot verify decision-grade claims unless the source is explicitly allowed for current role.
- Stale evidence means `stale`, not verified.
- Contradictory route/status/resolution evidence means `contradicted` or `blocked`.
- Single-evidence Strategy items cannot be `verified`.
- Shared-comms LLM synthesis without resolvable candidate/source refs cannot be decision-grade.
- Strategy Hub, advisor, scout, researcher, and action-router proposal paths must exclude unverified synthesized claims.
- If a route cannot be filtered safely, leave it Tier 1/admin-only and exclude it from Strategy-grade reliance.

Failure output should name:

- failed surface
- failed record ID
- claim ID or record ID
- failed rule
- blocker card when applicable
- next command/action

## Read Surfaces Covered

The implementation must cover every current read surface that exposes or consumes synthesized output:

- `GET /api/shared-communications/synthesis`
  - reads `getSharedCommunicationSynthesisSnapshot`
  - must return verification status and exclude/downgrade unsupported decision-grade items
- `GET /api/strategic-execution/v2`
  - builds Strategy Hub v2 payload from goal truth, operating truth, Action Router, and retrieval status
  - must include only verified Strategy-route synthesized claims in `routeReview.recentRoutes`
- `GET /api/strategic-execution/action-routes`
  - reads Action Router snapshot
  - must expose verification status for routes and make unverified routes visible as blocked diagnostics, not trusted recommendations
- `POST /api/strategic-execution/action-routes/:routeId/review`
  - must refuse approval/apply of routes whose synthesized source claim is not verified, unless the route type is explicit ignore/snooze/rejection diagnostic
- `POST /api/strategic-execution/advisor`
  - currently returns `423 strategy_hub_v2_in_progress`
  - must remain fail-closed; no advisor output may re-open without this verification gate
- `getStrategyAdvisorContext` in `server.js`
  - currently dormant behind the offline advisor endpoint
  - must be guarded if reused later
- `POST /api/intelligence/evidence`
  - not a synthesis output, but it is the source evidence API used to verify claims
  - must remain tier-filtered/redacted and cannot trust client `maxTier`
- `GET /api/foundation-hub`
  - may expose card/readiness status; it must not turn unverified synthesis into live Strategy claims
- any dashboard panels in `public/foundation.js` or Strategy route review that render action routes from `getActionRouterSnapshot`
  - must show verification status and avoid presenting unsupported generated copy as decision-grade

## Jobs And Engines Covered

The implementation must cover these current writers and consumers:

- `npm run synthesis:brief`
  - `scripts/generate-shared-comms-synthesis.mjs`
  - `recordSharedCommunicationSynthesisRun`
  - legacy shared-comms LLM synthesis output
- `npm run intelligence:synthesis-facts-proof`
  - `scripts/intelligence-synthesis-facts-proof.mjs`
  - `upsertSynthesisFactsBundle`
  - source-backed fact ledger
- `npm run intelligence:synthesis-proof`
  - `scripts/intelligence-synthesis-engine-proof.mjs`
  - `runGovernedSynthesis`
  - proof governed synthesized items
- `npm run intelligence:synthesis-refresh`
  - scheduled/manual governed synthesis refresh
- `npm run intelligence:action-router-proof`
  - route proof from synthesized items
- `npm run intelligence:action-router-proposals`
  - proposal writer from routeable synthesized items
- `npm run intelligence:action-router-apply`
  - human-approved destination application; must refuse unverified source claims except diagnostic ignore/snooze handling
- `getSynthesisFactsSnapshot`
- `getSynthesisEngineSnapshot`
- `getActionRouterSnapshot`
- `proposeActionRoutes`
- `buildStrategyHubV2Payload`

Future researcher/scout/advisor work is not implemented here. This card only creates the gate those future consumers must use.

## Files And Routes To Inspect Before Implementation

Inspect before coding:

- `lib/intelligence-retrieval.js`
- `lib/intelligence-synthesis-facts.js`
- `lib/intelligence-synthesis.js`
- `lib/intelligence-action-router.js`
- `lib/foundation-db.js`
- `lib/foundation-readiness-gates.js`
- `lib/security-access.js`
- `lib/source-lifecycle-completion.js`
- `lib/foundation-build-log.js`
- `scripts/generate-shared-comms-synthesis.mjs`
- `scripts/intelligence-retrieval-eval.mjs`
- `scripts/intelligence-synthesis-facts-proof.mjs`
- `scripts/intelligence-synthesis-engine-proof.mjs`
- `scripts/intelligence-action-router-proof.mjs`
- `scripts/intelligence-action-router-proposals.mjs`
- `scripts/intelligence-action-router-apply.mjs`
- `scripts/process-foundation-done-test.mjs`
- `scripts/foundation-verify.mjs`
- `server.js`
- `public/foundation.js`
- `package.json`
- `docs/process/foundation-done-test.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/specs/2026-04-23-synthesis-engine-v1.md`
- `docs/specs/2026-04-28-strategic-intelligence-loop.md`

Routes to inspect:

- `POST /api/intelligence/evidence`
- `GET /api/shared-communications/synthesis`
- `GET /api/strategic-execution/v2`
- `GET /api/strategic-execution/action-routes`
- `POST /api/strategic-execution/action-routes/:routeId/review`
- `POST /api/strategic-execution/advisor`
- `GET /api/foundation-hub`

## Likely Files To Touch After Approval

Implementation should start with the central verification layer before broad route edits:

- Add `lib/synthesis-claim-verification.js`
  - Owns claim classification, evidence indexing, verification rules, fail-closed statuses, and safe proof output.
  - Exports the route/job consumer helpers listed below.
- Add `scripts/process-synthesis-verify-check.mjs`
  - Focused proof script for current synthesized rows, route consumers, legacy shared-comms synthesis, unsupported-claim fixtures, and readiness integration.
- Update `package.json`
  - Add `process:synthesis-verify-check`.
- Update `lib/intelligence-synthesis.js`
  - Stamp verification metadata on governed synthesized items, or expose enough stable refs for the verifier to evaluate them.
  - Do not weaken existing clustered/multi-evidence gates.
- Update `lib/intelligence-action-router.js`
  - `selectRouteableSynthesizedItems` must require verified synthesis for routeable decision-grade items.
  - `proposeActionRoutes` must preserve verification metadata into routes.
  - approval/application paths must refuse unverified decision-grade routes.
- Update `lib/foundation-db.js`
  - Export verification helpers and any read/write wrappers needed by scripts/routes.
  - Store verification metadata in existing JSONB metadata fields for v1 unless implementation proves a separate table is necessary.
- Update `scripts/generate-shared-comms-synthesis.mjs`
  - Record verification metadata or mark legacy claim packs as unverified/blocked until checked.
- Update `scripts/intelligence-synthesis-engine-proof.mjs`
  - Run claim verification after governed synthesis and fail if generated proof items cannot verify.
- Update `scripts/intelligence-action-router-proof.mjs`
  - Prove router only sees verified synthesized items.
- Update `scripts/intelligence-action-router-proposals.mjs`
  - Preserve verified-only route proposal behavior.
- Update `scripts/intelligence-action-router-apply.mjs`
  - Refuse applying unverified decision-grade routes.
- Update `server.js`
  - Filter/label synthesis and action-route responses through the central verifier.
  - Keep advisor fail-closed.
- Update `public/foundation.js` only if needed to display verification status on existing panels.
  - This is not UI polish; it is safety/status visibility.
- Update `lib/foundation-readiness-gates.js`
  - Add closeout key `synthesis-verify-v1` for `SYNTHESIS-VERIFY-001`.
  - Source-verifiable answer leg should pass only after this card is done with closeout proof.
- Update `scripts/foundation-verify.mjs`
  - Verify central layer, script registration, route integration, fail-closed behavior, and readiness closeout.
- Add closeout docs only after implementation:
  - `docs/process/synthesis-verify.md`
  - `docs/process/approvals/SYNTHESIS-VERIFY-001.json`
  - `lib/foundation-build-log.js`
  - `docs/process/foundation-done-test.md`
  - `docs/rebuild/current-plan.md`
  - `docs/rebuild/current-state.md`

## Central Verifier API Shape

`lib/synthesis-claim-verification.js` should expose a small, route-safe API:

```js
export const SYNTHESIS_VERIFY_CARD_ID = 'SYNTHESIS-VERIFY-001'
export const SYNTHESIS_VERIFY_CLOSEOUT_KEY = 'synthesis-verify-v1'

export const SYNTHESIS_CLAIM_SURFACES = {
  intelligenceSynthesizedItems: { /* registry entry */ },
  sharedCommunicationSynthesis: { /* registry entry */ },
  actionRoutes: { /* registry entry */ },
}

export function classifySynthesizedClaim(claimInput)
export function buildSynthesisEvidenceIndex(input)
export function verifySynthesizedClaim(claimInput, evidenceIndex, options = {})
export function verifySynthesizedRecord(recordInput, evidenceIndex, options = {})
export function isSynthesisRecordVerified(recordInput)
export function requireVerifiedSynthesisRecord(recordInput, options = {})
export function filterVerifiedSynthesisRecords(records, options = {})
export async function buildSynthesisVerificationReport(options = {})
```

Expected record verification shape:

```json
{
  "recordId": "synthesized-item-id-or-route-id",
  "surface": "intelligence_synthesized_items",
  "verificationVersion": "synthesis-verify-v1",
  "status": "verified",
  "supportLevel": "verified",
  "claimCount": 3,
  "verifiedClaimCount": 3,
  "failedClaimCount": 0,
  "sourceIds": ["SRC-STRATEGY-001"],
  "factRefs": ["fact:..."],
  "evidenceRefs": ["atom:..."],
  "evidenceChunkRefs": ["retrieval-chunk:..."],
  "candidateKeys": [],
  "artifactIds": [],
  "warnings": [],
  "blockedReasons": [],
  "verifiedAt": "2026-05-09T00:00:00.000Z"
}
```

`requireVerifiedSynthesisRecord` must throw a typed error or return a stable denial object that routes can convert into the existing access/error response shape.

## Metadata And Backfill Plan

Use existing JSONB metadata for v1 unless a code inspection proves that a separate table is required.

Target metadata key:

- `metadata.synthesisVerification`

Applies to:

- `intelligence_synthesized_items.metadata`
- `intelligence_action_routes.metadata`
- `shared_communication_synthesized_items.metadata`
- run metadata where useful for summary counts

Backfill behavior:

- The focused process script scans current active synthesized items and current route records.
- It writes or refreshes `metadata.synthesisVerification`.
- It does not mutate raw source content.
- It does not auto-approve, auto-apply, or create Strategy/researcher/scout output.
- If existing records lack enough evidence, they are marked `blocked`, `unsupported`, `stale`, or `partially_supported`.
- Unverified existing routes remain visible as blocked diagnostics but cannot be approved/applied as decision-grade work.

If implementation finds JSONB metadata cannot support safe route filtering, add an additive `synthesis_claim_verifications` table with no raw content:

- `verification_id`
- `surface`
- `record_id`
- `claim_id`
- `status`
- `claim_class`
- `claim_text_hash`
- `source_ids`
- `fact_refs`
- `evidence_refs`
- `evidence_chunk_refs`
- `candidate_keys`
- `artifact_ids`
- `warnings`
- `blocked_reasons`
- `verified_at`
- `metadata`

No destructive migration is allowed.

## Build Sequence After Approval

1. Central verifier first:
   - Add `lib/synthesis-claim-verification.js`.
   - Define the surface registry, claim classes, evidence rules, verification states, and output shapes.
2. Focused proof script:
   - Add `scripts/process-synthesis-verify-check.mjs`.
   - Build synthetic records that prove unsupported, stale, contradicted, missing-tier, and single-evidence Strategy claims fail closed.
   - Build live-safe checks against current synthesis/fact/retrieval/router snapshots.
3. Governed synthesis stamping:
   - Run verification after `runGovernedSynthesis`.
   - Persist `metadata.synthesisVerification` for generated items.
   - Ensure proof synthesis fails when generated items cannot verify.
4. Shared-comms legacy path:
   - Verify old `shared_communication_synthesized_items` as claim packs using candidate/source refs.
   - Mark unverifiable items blocked/advisory instead of treating model copy as trusted.
5. Action Router gate:
   - Route selection requires verified synthesis for decision-grade route types.
   - Routes preserve verification metadata.
   - Approval/apply refuses unverified decision-grade routes.
6. Strategy/read routes:
   - Strategy Hub v2 only includes verified Strategy routes.
   - Shared-comms synthesis route returns stable verification status and avoids trusted unsupported copy.
   - Advisor remains offline/fail-closed.
7. Verifier/readiness integration:
   - Add package script.
   - Add `foundation:verify` checks.
   - Add readiness closeout key.
8. Closeout:
   - Add approval artifact, process doc, build-log entry, current-plan/current-state updates, and live backlog done update.
   - Run ship gate only after focused proof, backlog hygiene, foundation verify, and readiness proof pass.

## Acceptance Criteria

The card is done only when all are true:

- Central verifier registry covers `intelligence_synthesized_items`, `shared_communication_synthesized_items`, and `intelligence_action_routes`.
- Every active governed synthesized item has verification metadata.
- Every active decision-grade Action Router route has verification metadata.
- Route proposal excludes unverified synthesized items.
- Route approval/apply fails closed for unverified decision-grade routes.
- Strategy Hub v2 excludes unverified synthesized claims from Strategy route review.
- Shared-comms synthesis route labels verification status and does not present unsupported generated copy as trusted Strategy output.
- Advisor remains fail-closed.
- Synthetic unsupported claims fail with stable status and blocker reason.
- Synthetic single-evidence Strategy claims fail closed.
- Synthetic missing-tier/sensitivity/source classification fails closed.
- Live proof confirms current active Strategy-eligible synthesis is verified or excluded.
- Proof output contains no raw/private source content.
- `npm run process:foundation-done-test -- --report-only` no longer names `SYNTHESIS-VERIFY-001` after closeout.
- Foundation may still be `not_ready` because of extraction hardening and meeting Drive ACL/vault blockers.

## Proof Commands

Minimum proof after implementation:

```bash
node --check lib/synthesis-claim-verification.js
node --check scripts/process-synthesis-verify-check.mjs
node --check scripts/intelligence-synthesis-engine-proof.mjs
node --check scripts/intelligence-action-router-proof.mjs
npm run process:synthesis-verify-check
npm run intelligence:retrieval-eval
npm run intelligence:synthesis-facts-proof
npm run intelligence:synthesis-proof
npm run intelligence:action-router-proof
npm run process:foundation-done-test -- --report-only
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=SYNTHESIS-VERIFY-001 --planApprovalRef=docs/process/approvals/SYNTHESIS-VERIFY-001.json --closeoutKey=synthesis-verify-v1 --commitRef=HEAD
```

The focused proof script must output:

- summary status
- checked surfaces
- verified record counts
- failed/blocked record counts
- unsupported claim fixture result
- single-evidence Strategy fixture result
- missing-tier/sensitivity fixture result
- stale/contradicted fixture result
- no-raw-content proof
- readiness blocker expectation

## Readiness-Test Integration

Current readiness source leg fails when either source lifecycle or synthesis verification is open.

After implementation:

- Add `closeoutKey: synthesis-verify-v1` for `SYNTHESIS-VERIFY-001` in `lib/foundation-readiness-gates.js`.
- Keep proof commands as:
  - `npm run process:synthesis-verify-check`
  - `npm run intelligence:retrieval-eval`
- The source-verifiable answer leg passes only when:
  - `SOURCE-LIFECYCLE-COMPLETION-001` is done with `source-lifecycle-completion-v1`;
  - `SYNTHESIS-VERIFY-001` is done with `synthesis-verify-v1`;
  - the package script exists;
  - `foundation:verify` confirms the verifier integration.
- If the verifier script is missing, the readiness registry must treat this as structural failure.
- If the focused proof fails, do not mark the card done.

## Rollback And Fail-Closed Behavior

Rollback must be safe:

- Remove or disable route filtering only by reverting the card commit; do not silently bypass the verifier.
- If verification metadata is absent after rollback, consumers treat records as unverified.
- If verification script cannot read the DB, it exits nonzero and readiness remains `not_ready`.
- If route filtering throws, Strategy Hub should return degraded/blocked synthesis status rather than unverified recommendations.
- If shared-comms verification cannot evaluate legacy rows, mark them advisory/blocked rather than trusted.
- If an existing route was created before verification and cannot be proven, it stays pending/blocked until human review or regeneration from verified synthesis.

## Not Included

Do not implement:

- Strategy Hub expansion
- Strategy UI polish
- Sales expansion
- Agent Feedback expansion
- Scoper
- Agent Factory
- broad corpus expansion
- researcher/self-improvement agent
- scout/video mining expansion
- extraction retry/backoff
- meeting Drive ACL or vault changes
- raw evidence rendering beyond existing redacted/access-controlled surfaces
- public/external access expansion
- new recommendation/advisor chat surface

## Open Risk To Resolve During Implementation

The legacy shared-comms LLM synthesis path may not have enough per-claim evidence to verify every generated sentence. The approved implementation should not force it to pass. If current legacy rows cannot be verified from candidate/source refs, mark them blocked/advisory and exclude them from Strategy-grade reliance.

That is still a valid closeout if governed synthesis, Action Router, Strategy route review, and readiness proof all fail closed for unverified legacy output.
