# VERIFIER-RUNTIME-RELIABILITY-SPLIT-001 Plan

Card: `VERIFIER-RUNTIME-RELIABILITY-SPLIT-001`
Sprint: `verifier-runtime-reliability-split-2026-05-15`
Closeout key: `verifier-runtime-reliability-split-v1`

## What

Extract the runtime reliability verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-runtime-reliability-verifier.js`.

The moved proof domain covers:

- source outage boundary,
- Foundation Operating Reliability,
- Plan Critic architectural rules,
- Foundation Hub performance,
- full diagnostics performance boundary,
- ship-gate speed/preflight/payload cleanup,
- ClickUp verifier health boundary.

The canonical verifier still emits the same PASS/FAIL rows. It delegates the predicates to a focused module and keeps `planCriticArchitecturalRulesProof` available for the later Foundation Verification + Cleanup aggregate check.

## Why

`scripts/foundation-verify.mjs` is still over 15,000 lines. Runtime reliability proof is one of the highest-value domains inside it because it guards the exact failures Steve has been worried about: false-green gates, slow routes, stale source health, ship-gate drag, and ClickUp outages.

This card makes that proof domain inspectable without weakening the gate. It also continues the cleanup program after the server and Foundation DB split closeouts were documented.

Operator value: Steve gets faster, higher-quality Foundation ship gates because runtime reliability failures are easier to inspect and fix from one focused module instead of hunting through a 15K-line verifier. The useful real workflow is: a future ClickUp outage, route payload regression, stale LLM auth audit, or ship-gate drag points to a small runtime reliability proof surface with clear ownership.

## Acceptance Criteria

- `lib/foundation-runtime-reliability-verifier.js` owns the runtime reliability verifier definitions and evaluation logic.
- `scripts/foundation-verify.mjs` imports and delegates runtime reliability checks through `evaluateFoundationRuntimeReliabilityVerifier`.
- The canonical verifier still records the same runtime reliability check labels for source outage, operating reliability, Plan Critic architecture rules, hub performance, full diagnostics, ship-gate speed, and ClickUp health.
- Focused dogfood proof accepts healthy synthetic runtime reliability proof and rejects:
  - missing ClickUp/source outage fail-soft wiring,
  - missing operating reliability status,
  - missing Plan Critic architecture dogfood,
  - oversized Foundation Hub payload,
  - missing ship-gate preflight wiring,
  - missing ClickUp verifier slow-budget proof.
- `scripts/foundation-verify.mjs` line count decreases from the `15,623` baseline.
- The proof script is read-only by default and has no DB mutation, file-write, or `--apply` path.
- Live backlog, Current Sprint, Plan Critic run, approval, closeout, Recent Builds, and verifier coverage all name `VERIFIER-RUNTIME-RELIABILITY-SPLIT-001` and `verifier-runtime-reliability-split-v1`.

## Definition Of Done

- `VERIFIER-RUNTIME-RELIABILITY-SPLIT-001` closes under `verifier-runtime-reliability-split-v1`.
- `docs/process/verifier-runtime-reliability-split-001-plan.md` and `docs/process/approvals/VERIFIER-RUNTIME-RELIABILITY-SPLIT-001.json` exist and validate.
- `plan_critic_runs` has a durable pass row at `9.8+`.
- `scripts/process-verifier-runtime-reliability-split-check.mjs` passes and proves healthy/broken reliability fixtures.
- `foundation:verify` and `process:foundation-ship` pass before push.

## Details

Existing code to reuse:

- current runtime reliability checks in `scripts/foundation-verify.mjs`,
- source outage, connector uptime, Plan Critic architecture, Foundation Hub performance, full diagnostics, ship preflight, ClickUp verifier, and slow-budget dogfood helpers,
- prior verifier module patterns in `lib/foundation-server-route-split-verifier.js` and `lib/foundation-recent-builds-verifier.js`,
- `lib/approval-integrity.js`.

Existing docs to reuse:

- `docs/process/verifier-server-route-split-module-001-plan.md`,
- `docs/process/verifier-recent-builds-closeout-split-001-plan.md`,
- `docs/handoffs/2026-05-15-server-monolith-closeout-summary.md`,
- `docs/handoffs/2026-05-15-foundation-db-split-summary.md`,
- `AGENTS.md` Foundation rebuild discipline.

Existing scripts to reuse:

- `npm run process:plan-critic-architectural-rules-check -- --json`,
- `npm run foundation:verify -- --json-summary`,
- `npm run backlog:hygiene -- --json`,
- `npm run process:foundation-ship`.

Gate decision tree uses static, focused, and full based on blast radius. Static syntax checks run first. Focused proof covers the extracted module behavior through `process:verifier-runtime-reliability-split-check`. Full `foundation:verify` and full `process:foundation-ship` are required before push because this touches the canonical verifier, a new verifier module, package scripts, closeout records, live Current Sprint, live backlog truth, and process proof.

Large-file split/extraction plan: this card touches `scripts/foundation-verify.mjs`, already over the `5,000` line architecture-risk threshold, but the change removes a coherent inline domain and replaces it with a thin delegation call. No new verifier responsibility is added to the large file. If the work starts expanding into runtime behavior changes, stop and create a separate card.

## Risks

- Risk: runtime reliability semantics change while moving code.
  - Response: focused dogfood covers healthy and broken fixtures, and full `foundation:verify` must still pass.
- Risk: this becomes a broad verifier rewrite.
  - Response: only the runtime reliability proof group moves. No DB split, hub feature, Build Intel, Canva write, or Marketing route work moves in this card.
- Risk: proof becomes substring theater.
  - Response: Dogfood proof recreates the old failure modes. Substring-only proof is rejected.
- Risk: proof script mutates live truth.
  - Response: focused proof script is read-only and checks its own source for mutation tokens.

Repair path: if focused proof fails, keep the card in Building Now, restore the current inline runtime reliability predicates, fix the extracted module fixture that failed, rerun the focused proof, and only then rerun full `foundation:verify`. If ship fails after focused proof passes, do not weaken the verifier; either preserve the old row exactly or revert this card's extraction and leave it open for a smaller reliability slice.

## Tests

```bash
node --check lib/foundation-runtime-reliability-verifier.js scripts/process-verifier-runtime-reliability-split-check.mjs scripts/foundation-verify.mjs
npm run process:verifier-runtime-reliability-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=VERIFIER-RUNTIME-RELIABILITY-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-RUNTIME-RELIABILITY-SPLIT-001.json --closeoutKey=verifier-runtime-reliability-split-v1 --commitRef=HEAD
```

The dogfood proof recreates the old failure modes by feeding the focused module bad runtime reliability fixtures that would be easy to miss in a 15K-line verifier. Substring-only proof is rejected because the focused proof must demonstrate real pass/fail behavior from the extracted module.

## Not Next

- Do not rewrite the whole verifier.
- Do not change runtime behavior, source-health behavior, ClickUp behavior, or ship-gate semantics.
- Do not split `lib/foundation-db.js` in this card.
- Do not split frontend, CSS, or app hub files in this card.
- Do not wire Marketing Video Lab live routes.
- Do not create or mutate Canva assets.
- Do not build Build Intel extraction.
- Do not build hub features, paid-source auth, autonomous dev, Meeting Vault Phase B, or Drive permission mutation.
