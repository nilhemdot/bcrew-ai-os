# Verifier Follow-Up Backlog Assurance Split Closeout

Date: 2026-05-17

Card: `VERIFIER-FOLLOWUP-BACKLOG-ASSURANCE-SPLIT-001`
Closeout key: `verifier-followup-backlog-assurance-split-v1`

## What Changed

Extracted follow-up backlog assurance verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-followup-backlog-assurance.js`.

The root verifier still gathers the live Foundation payloads and sources. The new module owns checks that keep runtime-health simplification, access-control admin work, dashboard deploy freshness, extraction retry/control/schedule/metrics closeouts, strategy input closeouts, strategic-intelligence next-leg cards, marketing source lifecycle capture, and Owners/FUB source closeout guardrails visible and honest.

## Proof

- `lib/foundation-verifier-followup-backlog-assurance.js` adds the focused evaluator and dogfood proof.
- `scripts/process-verifier-followup-backlog-assurance-split-check.mjs` proves the split is read-only, delegated, line-count reducing, and behavior-backed.
- Dogfood rejects hidden runtime-health follow-up, hidden access follow-up, hidden deploy-freshness follow-up, hidden extraction follow-ups, hidden strategic-intelligence follow-ups, hidden source closeouts, and old-inline-predicate failures.
- `scripts/foundation-verify.mjs` delegates through `evaluateFoundationVerifierFollowupBacklogAssurance({ ... })`.

## Expected Gates

```bash
node --check lib/foundation-verifier-followup-backlog-assurance.js
node --check scripts/process-verifier-followup-backlog-assurance-split-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-followup-backlog-assurance-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-FOLLOWUP-BACKLOG-ASSURANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-FOLLOWUP-BACKLOG-ASSURANCE-SPLIT-001.json --closeoutKey=verifier-followup-backlog-assurance-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:foundation-ship -- --card=VERIFIER-FOLLOWUP-BACKLOG-ASSURANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-FOLLOWUP-BACKLOG-ASSURANCE-SPLIT-001.json --closeoutKey=verifier-followup-backlog-assurance-split-v1 --commitRef=HEAD
```

## Not Changed

- No active sprint overlay replacement.
- No behavior rewrite of runtime health, access control, deploy freshness, extraction jobs, strategic intelligence, source closeouts, process hardening, runtime reliability, or source extraction.
- No connector auth, source extraction job, paid call, email send, Canva, Fal, ElevenLabs, voice, Harlan runtime work, or UI feature work.

## Next

Continue verifier monolith reduction from repo truth. Under 5K remains the clean target, and the next sprint should choose another coherent verifier domain instead of moving code just for line count.
