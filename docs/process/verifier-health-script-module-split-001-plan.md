# VERIFIER-HEALTH-SCRIPT-MODULE-SPLIT-001 Plan

## What

Extract the tail health-script verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-health-script-verifier.js`.

V1 moves the canonical checks for:

- `google:health`
- `fub:health`
- `kpi:health`
- `backlog:hygiene --includeSynthetic=true`
- `clickup:verify`
- `sheets:verify`

`scripts/foundation-verify.mjs` remains the orchestrator that runs the scripts. The module owns parsing, pass/fail rules, degraded ClickUp outage acceptance, and dogfood proof.

## Why

`scripts/foundation-verify.mjs` is still over 15,000 lines. The last remaining tail block mixes subprocess execution, output parsing, vendor-outage classification, and canonical PASS/FAIL rows inline. That makes the verifier harder to inspect and easier to weaken by accident.

Steve needs speed with quality, not another hidden verifier knot. The useful operator behavior is a tighter trust boundary: health checks still run through the full verifier, but their interpretation lives in one small module that can be dogfooded without running every source script. When Google, FUB, KPI, ClickUp, backlog hygiene, or Sheets breaks, the team gets a clear product behavior failure that points to one inspectable health-script module instead of another inline block buried in a 15K-line file.

## Acceptance Criteria

- New module `lib/foundation-health-script-verifier.js` owns health-script output parsing and check evaluation.
- `scripts/foundation-verify.mjs` still executes each health script but delegates the PASS/FAIL checks to the module.
- The canonical verifier keeps the same six health-script PASS/FAIL row labels.
- Focused proof script `scripts/process-verifier-health-script-module-check.mjs` validates the module, approval, live backlog, Current Sprint, Plan Critic row, package script, and read-only posture.
- Dogfood proof calls the real exported `evaluateFoundationHealthScriptVerifier` function path. It accepts healthy synthetic outputs and rejects missing Google delegated access, risky KPI health, missing backlog synthetic stale-card proof, ClickUp hard failure without degraded source health, and broken Sheets output.
- ClickUp vendor outage behavior remains explicit: a ClickUp failure only passes when Foundation source-outage/connector health reports a degraded provider state.
- `scripts/foundation-verify.mjs` line count decreases from the approved baseline.

## Definition Of Done

- Live backlog card `VERIFIER-HEALTH-SCRIPT-MODULE-SPLIT-001` is closed under `verifier-health-script-module-split-v1`.
- `docs/process/verifier-health-script-module-split-001-plan.md` and `docs/process/approvals/VERIFIER-HEALTH-SCRIPT-MODULE-SPLIT-001.json` exist and validate.
- Durable Plan Critic pass row is logged at 9.8+.
- `lib/foundation-health-script-verifier.js` exports evaluator, dogfood proof, and card constants.
- `npm run process:verifier-health-script-module-check -- --json` passes.
- `npm run foundation:verify -- --json-summary` passes.
- Full Foundation ship gate passes before push.

## Details

Existing code to reuse: `runHealthScript`, `runHealthScriptSafe`, `foundationHub.sourceOutageBoundary`, `foundationHubFull.foundationOperatingReliability.connectorUptime`, `EXPECTED_KPI_TABLES`, `EXPECTED_KPI_RPCS`, `getActiveFoundationCurrentSprint`, `getBacklogItemsByIds`, `getPlanCriticRunsByCardIds`, `validatePlanApprovalFile`, and the existing verifier module split proof script pattern.

Existing docs to reuse: `docs/handoffs/2026-05-15-server-monolith-closeout-summary.md`, `docs/handoffs/2026-05-15-foundation-db-split-summary.md`, `docs/handoffs/2026-05-15-canva-client-closeout.md`, and the current verifier split closeouts.

Gate decision tree: static proof (`node --check`) is required for the new module, proof script, and canonical verifier edit; focused proof (`npm run process:verifier-health-script-module-check -- --json`) is required because this card must exercise the real exported function/API/process path and reject bad health-script fixtures; full proof (`npm run foundation:verify -- --json-summary` and `npm run process:foundation-ship`) is required because this edits canonical verifier behavior, package scripts, build closeout records, and live sprint/backlog state.

Preflight status: Server Monolith and Foundation-DB split summaries already exist. `PLAN-CRITIC-ARCH-RULES-DOGFOOD-001` is closed in live backlog and its proof remains available. Canva client commit `fb66e52` is an accepted governed Canva client closeout, not a dirty working-tree change. No `status.html` files are present in this working tree; unrelated local dirty files are `scripts/codex-usage-web.mjs` and untracked marketing assets, which are out of scope and must not be committed.

Split plan: this card touches `scripts/foundation-verify.mjs`, a file over 5,000 lines, only to remove a coherent inline tail block and add a thin module delegation. New responsibility goes into `lib/foundation-health-script-verifier.js`.

## Risks

- Risk: health-script interpretation changes and the verifier passes unhealthy source state.
  - Repair path: keep the old labels and dogfood each failure class before full verify.
- Risk: ClickUp outage acceptance becomes too broad.
  - Repair path: require both ClickUp outage-looking output and degraded source/connector health evidence.
- Risk: this becomes a broad verifier rewrite.
  - Repair path: only the six health-script checks move. No source scripts, source clients, or hub routes change.
- Risk: proof becomes substring theatre.
  - Repair path: dogfood calls the exported evaluator and verifies passing/failing synthetic outputs through the same module function the canonical verifier delegates to.

## Tests

```bash
node --check lib/foundation-health-script-verifier.js scripts/process-verifier-health-script-module-check.mjs scripts/foundation-verify.mjs
npm run process:verifier-health-script-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=VERIFIER-HEALTH-SCRIPT-MODULE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-HEALTH-SCRIPT-MODULE-SPLIT-001.json --closeoutKey=verifier-health-script-module-split-v1 --commitRef=HEAD
```

## Not Next

- Do not rewrite the whole verifier.
- Do not change Google, FUB, KPI, ClickUp, Sheets, or backlog health script behavior.
- Do not add durable caching or retries.
- Do not split `lib/foundation-db.js`.
- Do not wire Marketing Video Lab live routes.
- Do not create, mutate, upload, or export Canva assets.
- Do not build hub feature UI, paid-source auth, Build Intel extraction, Meeting Vault Phase B, or Drive permission mutation.
