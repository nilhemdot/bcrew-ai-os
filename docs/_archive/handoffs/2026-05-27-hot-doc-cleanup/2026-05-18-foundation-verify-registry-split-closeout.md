# FOUNDATION-VERIFY-REGISTRY-SPLIT-001 Closeout

Closed `FOUNDATION-VERIFY-REGISTRY-SPLIT-001` under `foundation-verify-registry-split-v1`.

## What Changed

- Added `lib/foundation-verify-registry-split.js` with the verifier split-domain registry, evaluator, and dogfood proof.
- Moved nested module-assurance/backend-split structural dependency ownership out of `scripts/foundation-verify.mjs` and into `lib/foundation-verifier-structural-assurance-core.js`.
- Wired registry-split assurance through `lib/foundation-verifier-module-assurance.js`, so `foundation:verify` proves the root remains under the 5,000-line budget with registered split domains.
- Updated `lib/code-quality-nightly-audit.js` so `foundation-verify-monolith` is not hard-flagged when the root is under 5,000 lines and the registry split exists.
- Added focused proof, package script, approval, closeout metadata, and done-card verifier coverage.

## Proof

```bash
node --check lib/foundation-verify-registry-split.js lib/foundation-verifier-structural-assurance-core.js lib/foundation-verifier-module-assurance.js lib/code-quality-nightly-audit.js scripts/foundation-verify.mjs scripts/process-foundation-verify-registry-split-check.mjs
npm run process:foundation-verify-registry-split-check -- --json
npm run process:verifier-structural-assurance-core-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-VERIFY-REGISTRY-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-VERIFY-REGISTRY-SPLIT-001.json --closeoutKey=foundation-verify-registry-split-v1 --commitRef=HEAD
```

## Boundaries

- No arbitrary tail extraction.
- No verifier scoring behavior change.
- No source extraction, connector auth, paid run, provider probe, external write, Drive permissions mutation, Agent Feedback auto-send, Harlan/Fal/Canva feature work, voice work, or UI redesign.
- Do not work `MEETING-VAULT-ACL-001` Phase B.
