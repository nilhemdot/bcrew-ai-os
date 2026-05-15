# VERIFIER-RECENT-BUILDS-CLOSEOUT-SPLIT-001 Plan

## What

Extract the Recent Builds v2 closeout proof checks from `scripts/foundation-verify.mjs` into `lib/foundation-recent-builds-verifier.js`.

## Why

The verifier is still a high-risk monolith. Recent Builds closeout validation is a coherent trust boundary with dozens of predicates, so it should be owned by a focused verifier module instead of remaining inline in the root verifier.

## Details

Reuse the existing Recent Builds closeout schema from `lib/foundation-build-log.js`, the existing `/api/foundation/build-log` payload shape, and the existing inline verifier predicates in `scripts/foundation-verify.mjs`. This card only moves that predicate domain into `lib/foundation-recent-builds-verifier.js`; it does not change the build-log API, frontend rendering, closeout schema, or closeout record semantics.

Useful operator behavior: when Foundation says Recent Builds closeouts are green, Steve can trust that the build-log schema, grouped closeout view, and individual proof commands still satisfy the same checks. This unlocks speed with quality because engineers can inspect that proof domain in a focused module instead of searching a 15K-line root verifier.

## Existing Work Reused

- Existing code: `scripts/foundation-verify.mjs` existing Recent Builds v2 closeout checks.
- Existing docs: current plan, current state, and the existing Recent Builds closeout handoffs stay informational; repo closeout records remain durable truth.
- Existing scripts: approval validation, backlog hygiene, `foundation:verify`, focused proof scripts, and `process:foundation-ship` gates are reused.
- Live backlog and Current Sprint truth stay in Postgres; this card does not introduce a second backlog or markdown-only sprint state.
- Existing verifier split module patterns from route/server/frontend verifier split work are reused.

## Acceptance Criteria

- `scripts/foundation-verify.mjs` delegates the Recent Builds closeout proof domain to `evaluateFoundationRecentBuildsVerifier`.
- The focused module preserves the old schema, grouped build-log, and per-closeout proof predicates.
- The old inline Recent Builds closeout labels are absent from the root verifier.
- `scripts/process-verifier-recent-builds-closeout-split-check.mjs` is read-only and proves the split with behavior checks.
- dogfood proof recreates the old failure modes: missing proof command, invalid closeout schema, and missing `whereItLives`/closeout metadata.
- Substring-only proof is rejected. The focused proof must execute the module predicates and confirm failing fixtures fail closed.
- Full `foundation:verify` and `process:foundation-ship` pass before push.

## Definition Of Done

- `lib/foundation-recent-builds-verifier.js` owns Recent Builds closeout definitions and dogfood proof.
- `scripts/foundation-verify.mjs` keeps only a thin delegation for this domain.
- `package.json` exposes `process:verifier-recent-builds-closeout-split-check`.
- The plan approval, closeout record, and handoff exist and point to the same closeout key.
- The live backlog card is closed only with proof and the ship gate remains green.

## Gate Decision

Gate decision tree uses static, focused, and full based on blast radius. This card is full gate because it edits the canonical Foundation verifier and `package.json`, so focused proof alone is not enough. Required proof is node syntax check, focused dogfood proof through `process:verifier-recent-builds-closeout-split-check`, backlog hygiene, full `foundation:verify`, ship check, fanout check, and `process:foundation-ship`.

## Risks

- Weakening old inline predicates while moving them.
- Accidentally turning this into a broad verifier rewrite.
- Shipping another green check that only proves strings exist.

Repair path: stop, restore the old predicate strength in the module, rerun the focused dogfood, then rerun full `foundation:verify`.

## Tests

- `node --check lib/foundation-recent-builds-verifier.js scripts/process-verifier-recent-builds-closeout-split-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js`
- `npm run process:verifier-recent-builds-closeout-split-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=VERIFIER-RECENT-BUILDS-CLOSEOUT-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-RECENT-BUILDS-CLOSEOUT-SPLIT-001.json --closeoutKey=verifier-recent-builds-closeout-split-v1 --commitRef=HEAD`

## Not Next

Do not rewrite the whole verifier. Do not change build-log API behavior. Do not touch hub UI, Canva writes, paid-source auth, Build Intel extraction, Meeting Vault Phase B, or Drive permission mutation.
