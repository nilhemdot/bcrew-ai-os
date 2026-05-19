# Critical Files Under 5K Closeout

Card: `CRITICAL-FILES-UNDER-5K-001`
Closeout key: `critical-files-under-5k-v1`

## What Changed

Split verifier root support out of `scripts/foundation-verify.mjs` by domain:

- `lib/foundation-verify-coverage-card-ids.js` now owns shipped-card coverage ID registries.
- `lib/foundation-verify-runtime-support.js` now owns verifier CLI/runtime support, timing/profile helpers, health-script runners, repo/runtime probes, and the direct model host audit.
- `lib/foundation-verify-coverage-source.js` lets historical status builders prove coverage against the root verifier plus extracted coverage IDs.
- `scripts/foundation-verify.mjs` stays as the root orchestration map and includes the extracted support module in internal source-proof bundles.

## Line Counts

Before this sprint:

- `scripts/foundation-verify.mjs`: 5,375
- `server.js`: 4,831
- `lib/foundation-db.js`: 4,734
- `public/foundation.js`: 4,909

After this sprint:

- `scripts/foundation-verify.mjs`: 4,997
- `server.js`: 4,831
- `lib/foundation-db.js`: 4,735
- `public/foundation.js`: 4,909
- `lib/foundation-verify-coverage-card-ids.js`: 121
- `lib/foundation-verify-runtime-support.js`: 352
- `lib/foundation-verify-coverage-source.js`: 11

All four critical files are now below 5,000 lines.

## What It Proves

The focused proof recreates an unsafe direct model host reference and proves the extracted runtime-support audit still fails closed while clean and adapter-owned host references pass.

The Plan Critic architecture proof remains healthy after moving coverage literals out of the root verifier.

Historical status builders that require verifier card coverage now read the coverage bundle instead of assuming all coverage IDs live in `scripts/foundation-verify.mjs`.

## Boundaries

No Harlan, Fal, Canva, voice, hub feature, route behavior, DB schema, external-send, or Agent Feedback auto-send work was changed.

The live `agent-feedback-auto-send-readiness` job was not rerun.

## Proof

```bash
node --check scripts/foundation-verify.mjs
node --check lib/foundation-verify-coverage-card-ids.js
node --check lib/foundation-verify-runtime-support.js
node --check lib/foundation-verify-coverage-source.js
node --check lib/foundation-followup-card-capture.js
node --check lib/foundation-systems-service-grouping.js
node --check lib/system-registration-sweep.js
node --input-type=module -e "import { buildFoundationVerifyRuntimeSupportDogfoodProof } from './lib/foundation-verify-runtime-support.js'; const proof = buildFoundationVerifyRuntimeSupportDogfoodProof(); console.log(JSON.stringify({ ok: proof.ok, invariant: proof.dogfoodInvariant, rejected: proof.rejected }, null, 2)); if (!proof.ok) process.exit(1)"
npm run process:plan-critic-architectural-rules-check
npm run foundation:verify -- --failures-only
npm run foundation:verify
npm run backlog:hygiene -- --json
npm run process:ship-check -- --card=CRITICAL-FILES-UNDER-5K-001 --planApprovalRef=docs/process/approvals/CRITICAL-FILES-UNDER-5K-001.json --closeoutKey=critical-files-under-5k-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=CRITICAL-FILES-UNDER-5K-001 --closeoutKey=critical-files-under-5k-v1
npm run process:post-ship-fanout -- --card=CRITICAL-FILES-UNDER-5K-001 --closeoutKey=critical-files-under-5k-v1 --commitRef=HEAD
npm run process:foundation-ship -- --card=CRITICAL-FILES-UNDER-5K-001 --planApprovalRef=docs/process/approvals/CRITICAL-FILES-UNDER-5K-001.json --closeoutKey=critical-files-under-5k-v1 --commitRef=HEAD
```

Observed proof:

- `foundation:verify -- --failures-only`: 444/444 checks passed.
- `foundation:verify`: 444/444 checks passed.
- `backlog:hygiene -- --json`: healthy, 0 findings.
- Plan Critic architectural rules proof: healthy, self-review 10/10.

## Ship Gate Status

Steve approved canonicalizing `CRITICAL-FILES-UNDER-5K-001` as Foundation process work after the initial code proof passed. Canonical process artifacts now live at:

- `docs/process/critical-files-under-5k-001-plan.md`
- `docs/process/approvals/CRITICAL-FILES-UNDER-5K-001.json`
- `lib/foundation-build-closeout-size-records.js`

The live backlog card is created as done with `critical-files-under-5k-v1` closeout proof before the final ship wrapper.

## Next

Next queued sprint: `FILE-SIZE-ENGINEERING-STANDARD-001`.

Do not start it until the full `process:foundation-ship` wrapper passes and this sprint is committed/pushed.
