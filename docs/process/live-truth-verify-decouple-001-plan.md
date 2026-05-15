# LIVE-TRUTH-VERIFY-DECOUPLE-001 Plan

Status: revised after Plan Critic feedback
Card: `LIVE-TRUTH-VERIFY-DECOUPLE-001`
Sprint: `live-truth-verify-decouple-2026-05-15`
Closeout key: `live-truth-verify-decouple-v1`

## What

Separate active Current Sprint truth from historical/bootstrap sprint references in the code quality auditor and verifier proof path.

V1 changes the nightly hardcoded-truth detector so it no longer treats explicitly labeled historical closeout proof or bootstrap defaults as active live Current Sprint truth. It keeps unlabeled current-sprint literals as P0 failures. It labels the eight baseline audit references from `docs/handoffs/nightly-deep-audit-2026-05-14.md`, adds a focused proof module/script, adds thin verifier coverage, and closes `LIVE-TRUTH-VERIFY-DECOUPLE-001`.

## Why

The 2026-05-14 nightly audit found eight P0 `hardcoded-current-sprint-truth` rows. Some were real active-truth risk, and some were historical proof scripts or bootstrap defaults. Treating all of them the same creates noise and makes Steve doubt the audit. Ignoring them broadly would be worse because active command truth can drift again.

The correct invariant is narrower: active Current Sprint command truth must come from live DB/API state, while old sprint IDs can remain only when explicitly labeled as `historical_closeout_only` or `bootstrap_default_only`.

Root invariant: this card is not allowed to silence an audit symptom by hiding strings. It must prove through actual function behavior that active live sprint literals still fail, while explicitly labeled historical/bootstrap literals are classified as non-active truth. This gives Steve and the team useful operator behavior: the morning audit becomes higher quality, less noisy, and still catches real drift before it blocks a sprint.

## Acceptance Criteria

- The current codebase produces zero P0 `hardcoded-current-sprint-truth` findings from `buildCodeQualityNightlyAudit()`.
- The eight baseline audit refs are classified as historical/bootstrap rather than active live truth.
- A synthetic unlabeled `control-plane-connector-readiness-2026-05-12` active-sprint snippet still produces a P0 `hardcoded-current-sprint-truth` finding.
- Synthetic `liveTruthPosture: historical_closeout_only` and `liveTruthPosture: bootstrap_default_only` snippets do not produce P0 hardcoded current-sprint findings.
- The focused proof is read-only by default and does not mutate backlog, Current Sprint, jobs, source truth, or files.
- The closeout appears in Recent Builds with proof commands and `whereItLives`.

## Definition Of Done

- `docs/process/approvals/LIVE-TRUTH-VERIFY-DECOUPLE-001.json` exists and validates at score `>= 9.8`.
- `npm run process:live-truth-verify-decouple-check -- --json` passes.
- `npm run process:code-quality-nightly-audit-check -- --json` passes and no longer routes active hardcoded current-sprint P0s to this card.
- `npm run foundation:verify -- --json-summary` passes.
- `npm run process:foundation-ship -- --card=LIVE-TRUTH-VERIFY-DECOUPLE-001 --planApprovalRef=docs/process/approvals/LIVE-TRUTH-VERIFY-DECOUPLE-001.json --closeoutKey=live-truth-verify-decouple-v1 --commitRef=HEAD` passes before push.
- Live backlog card is `done`, Current Sprint shows the card in `done_this_sprint`, and closeout key `live-truth-verify-decouple-v1` is in the build-log registry.

## Details

Implementation path:

1. Add `lib/live-truth-verify-decouple.js` with constants, baseline refs, classification evaluation, and dogfood fixtures.
2. Update `lib/code-quality-nightly-audit.js` to classify current-sprint literals using local context instead of a raw regex only.
3. Add explicit `liveTruthPosture` labels around the eight known baseline refs:
   - `lib/foundation-current-sprint.js`
   - `scripts/foundation-verify.mjs`
   - `scripts/process-connector-credential-check.mjs`
   - `scripts/process-current-sprint-dynamic-truth-check.mjs`
   - `scripts/process-foundation-plan-reconcile-check.mjs`
   - `scripts/process-llm-auth-audit-check.mjs`
   - `scripts/process-source-extraction-gap-followup-check.mjs`
   - `scripts/process-sprint-stage-gate-check.mjs`
4. Add `scripts/process-live-truth-verify-decouple-check.mjs`.
5. Add package script `process:live-truth-verify-decouple-check`.
6. Add thin verifier coverage that calls the focused module proof and checks the package script.
7. Add closeout record and update current rebuild docs.

Existing code/docs/scripts/backlog truth reused: existing code in `lib/code-quality-nightly-audit.js`, `lib/foundation-current-sprint.js`, and `scripts/foundation-verify.mjs`; existing docs in `docs/handoffs/nightly-deep-audit-2026-05-14.md`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`; existing scripts `process:code-quality-nightly-audit-check`, `process:sprint-check-historical-mode-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`; live backlog and Current Sprint DB truth for card state and closeout.

Split plan for oversized files: `scripts/foundation-verify.mjs` receives only thin import/delegation coverage. New behavior lives in `lib/live-truth-verify-decouple.js` and `lib/code-quality-nightly-audit.js`. This card does not expand verifier responsibility beyond one canonical row.

Gate decision tree: static syntax checks cover changed JS/JSON, focused proof uses `npm run process:live-truth-verify-decouple-check -- --json` against the actual function path, and full ship gate is required because this touches the nightly auditor, verifier coverage, package scripts, docs, Current Sprint truth, and Recent Builds closeout. The blast radius is Foundation process/verifier truth, so `process:foundation-ship` remains mandatory.

The focused check script is read-only by default. It must not include `updateBacklogItem`, `createBacklogItem`, `upsertFoundationCurrentSprintOverlay`, SQL `INSERT/UPDATE/DELETE`, or `fs.writeFile`; if a future version needs writes it must add explicit `--apply` posture and a separate approval.

## Risks

- Risk: Over-broad suppression could hide a real active current-sprint hardcode.
  - Repair path: dogfood requires an unlabeled active snippet to remain P0, and the implementation must use explicit local labels rather than file allowlists.
- Risk: Historical labels become a loophole for active proof scripts.
  - Repair path: focused proof checks the eight baseline refs specifically and does not mark arbitrary files safe by path.
- Risk: The verifier monolith grows again.
  - Repair path: only thin verifier coverage is allowed; all substantive proof logic lives in a focused module.
- Risk: Nightly audit summary counts change and break old assumptions.
  - Repair path: focused proof checks the specific current-sprint finding class, not an exact total finding count.

## Tests

Run in order:

```bash
node --check lib/live-truth-verify-decouple.js lib/code-quality-nightly-audit.js scripts/process-live-truth-verify-decouple-check.mjs scripts/foundation-verify.mjs
npm run process:live-truth-verify-decouple-check -- --json
npm run process:code-quality-nightly-audit-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=LIVE-TRUTH-VERIFY-DECOUPLE-001 --planApprovalRef=docs/process/approvals/LIVE-TRUTH-VERIFY-DECOUPLE-001.json --closeoutKey=live-truth-verify-decouple-v1 --commitRef=HEAD
```

Not next: broad historical script rewrite, `activeSprintAtOrPast` bypass, hub UI, Marketing Video Lab wiring, Build Intel extraction, paid-source auth, Meeting Vault Phase B, Drive permission mutation, or source connector work.
