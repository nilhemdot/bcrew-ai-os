# MARKETING-VIDEO-LAB-LIVE-SAFETY-001 Plan

Sprint: `FOUNDATION-TRUSTED-LOOP-AND-SAFE-SURFACES-2026-05-20`

Closeout key: `marketing-video-lab-live-safety-v1`

## What

Harden the Marketing Video Lab backend before any route wiring or paid provider generation. The card fixes two live-safety findings from the dry-run lab: concurrent submits can create duplicate running jobs, and placeholder/sample/private/mock asset URLs can pass live validation.

## Why

Tanner needs a real video lab later, but live provider routes cannot be allowed to spend money while duplicate-submit and fake-asset bugs exist. This card creates useful operator behavior: future route work has a backend guard that blocks duplicate running jobs and rejects fake/live-unsafe assets before any paid provider submission can happen.

## Operator Value

The useful operator behavior is concrete: when Tanner eventually clicks Generate twice or submits a fake/sample asset, the backend will reject the unsafe action before provider spend. This gives Steve and the Marketing team a real workflow safety unlock: better speed and quality later because route work can reuse a proven guard instead of relying on Tanner or Steve to notice a duplicate submit or fake asset manually.

## Details

Build reusable safety primitives and a focused proof only:

- atomic in-process submit lock for same template/assets/provider/model intent;
- live asset URL validation for HTTPS-only, non-placeholder, non-local, non-private assets;
- dogfood proof that concurrent mock submit accepts one job and rejects the duplicate;
- dogfood proof that placeholder, sample, mock, local, private-network, non-HTTPS, and mock-scheme asset URLs fail live validation;
- Current Sprint/backlog closeout wiring that advances to `STRATEGY-004` after the safety card ships.

This card is not a live Marketing Video Lab launch. It does not submit to Google, FAL, Canva, or any provider.

## Reuse Existing Work

- `lib/marketing-video-lab.js` dry-run job, asset validation, mock lifecycle, and no-spend proof.
- `lib/marketing-video-providers.js` payload builders and cost estimator.
- `lib/marketing-video-prompts.js` sold-sign prompt compiler.
- `scripts/process-marketing-video-lab-check.mjs` existing dry-run proof.
- `docs/marketing/video-lab/README.md` Marketing-owned lab boundary.
- Existing code reused: `lib/marketing-video-lab.js`, `lib/marketing-video-providers.js`, and `lib/marketing-video-prompts.js`.
- Existing docs reused: `docs/process/marketing-video-lab-001-plan.md` and `docs/marketing/video-lab/README.md`.
- Existing scripts reused: `scripts/process-marketing-video-lab-check.mjs`.
- Live backlog and Current Sprint truth reused: `MARKETING-VIDEO-LAB-LIVE-SAFETY-001` is the active blocker and `STRATEGY-004` is the next safe card.

## Implementation Notes

Add the live-safety layer to `lib/marketing-video-lab.js`:

- `validateMarketingVideoLiveAssetSource()` rejects missing, invalid, non-HTTPS, mock, local, private-network, sample, placeholder, and synthetic asset URLs.
- `normalizeMarketingVideoSubmitLockKey()` creates a stable lock key from template, provider, model, prompt basics, and normalized asset roles/IDs.
- `createMarketingVideoSubmitLockState()` creates an explicit lock state for proof and future route integration.
- `submitMarketingVideoMockJobWithLock()` performs the atomic check/set before any async work so concurrent mock submits cannot both enter running state.
- `buildMarketingVideoLiveSafetyDogfoodProof()` proves healthy approved URLs pass while unsafe fixtures fail closed and no provider call/spend occurs.

Add `scripts/process-marketing-video-lab-live-safety-check.mjs` as the focused proof and card closeout path. It may write live backlog/current-sprint truth only when called with `--apply` or `--close-card`; the safety proof itself stays local, no-spend, and provider-free.

Behavior proof path:

- `buildMarketingVideoLiveSafetyDogfoodProof()` constructs healthy live-like assets and unsafe fixtures, then proves the exact accepted/rejected outcomes through exported functions.
- `submitMarketingVideoMockJobWithLock()` performs check/set before any async work; the dogfood uses `Promise.all()` to recreate concurrent submit pressure.
- `validateMarketingVideoAssets({ live: true })` calls `validateMarketingVideoLiveAssetSource()` and fails closed on placeholder/sample/private/local/mock URLs.
- No substring-only proof is accepted as the behavioral proof. String checks only verify wiring and docs after function-level dogfood passes.

Gate decision tree:

- Static gate: `node --check` for changed JS modules/scripts.
- Focused gate: `process:marketing-video-lab-check` and `process:marketing-video-lab-live-safety-check`.
- Full gate: System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship`.
- The focused proof is fast enough for default closeout because it does not call providers, launch jobs, fetch network resources, or read private source data.

## Acceptance Criteria

- Focused proof passes at 9.8+ Plan Critic level.
- Concurrent mock submit dogfood returns exactly one accepted/running result and one `duplicate_running_job` rejection.
- Live validation rejects:
  - `https://assets.example.invalid/sample-placeholder.png`;
  - `http://localhost/...`;
  - `https://192.168.x.x/...`;
  - `mock://...`;
  - mock/synthetic/sample source types.
- Healthy approved HTTPS asset URLs pass.
- Existing dry-run lab proof still passes.
- Proof records `liveGenerationAttempted=false`, `providerSpendUsd=0`, and `liveProviderCalls=0`.
- Current Sprint moves from `MARKETING-VIDEO-LAB-LIVE-SAFETY-001` to `STRATEGY-004` only after closeout.

## Definition Of Done

- `lib/marketing-video-lab.js` exposes reusable live URL validation and submit-lock primitives.
- `scripts/process-marketing-video-lab-live-safety-check.mjs` proves the failure classes through function behavior, not just text markers.
- Live backlog row for `MARKETING-VIDEO-LAB-LIVE-SAFETY-001` is `done`.
- Current Sprint active blocker advances to `STRATEGY-004`.
- Closeout registry and handoff document the no-spend safety proof.
- All closeout gates listed below pass and main is pushed clean.

## Risks

- Overbuilding risk: this can drift into provider route integration. The card explicitly blocks routes, UI wiring, storage schema, provider calls, and spend.
- False-proof risk: placeholder rejection could be proven by string checks only. The acceptance path requires exported function dogfood with unsafe fixtures.
- Concurrency risk: a lock that sets state after async work would still allow duplicate jobs. The dogfood uses concurrent mock submits and expects one `duplicate_running_job`.
- Provider safety risk: future route work could bypass these helpers. The closeout records the helpers as the route-integration prerequisite.

## Tests

- Unit-like focused proof: `npm run process:marketing-video-lab-live-safety-check -- --close-card --json`.
- Regression proof for existing dry-run lab: `npm run process:marketing-video-lab-check -- --json`.
- System gates: System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, ship-check, fanout-check, and foundation-ship.

## Not Next

- No live provider video generation.
- No Google/FAL/Canva API submission.
- No provider spend.
- No Marketing Hub UI, home-nav wiring, or route integration.
- No credential mutation, key rotation, auth scope, provider config, or source access change.
- No external sends/writes.
- No Drive permission mutation.
- No paid/browser-auth work.
- No broad extraction or private backfill.
- Do not work `MEETING-VAULT-ACL-001` Phase B.

## Proof Commands

```bash
node --check lib/marketing-video-lab.js scripts/process-marketing-video-lab-check.mjs scripts/process-marketing-video-lab-live-safety-check.mjs
npm run process:marketing-video-lab-check -- --json
npm run process:marketing-video-lab-live-safety-check -- --close-card --json
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=MARKETING-VIDEO-LAB-LIVE-SAFETY-001 --planApprovalRef=docs/process/approvals/MARKETING-VIDEO-LAB-LIVE-SAFETY-001.json --closeoutKey=marketing-video-lab-live-safety-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=MARKETING-VIDEO-LAB-LIVE-SAFETY-001 --closeoutKey=marketing-video-lab-live-safety-v1
npm run process:foundation-ship -- --card=MARKETING-VIDEO-LAB-LIVE-SAFETY-001 --planApprovalRef=docs/process/approvals/MARKETING-VIDEO-LAB-LIVE-SAFETY-001.json --closeoutKey=marketing-video-lab-live-safety-v1 --commitRef=HEAD
```
