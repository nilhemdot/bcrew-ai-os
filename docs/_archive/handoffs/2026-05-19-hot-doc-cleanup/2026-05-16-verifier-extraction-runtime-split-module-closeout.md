# VERIFIER-EXTRACTION-RUNTIME-SPLIT-MODULE-001 Closeout

Date: 2026-05-16
Closeout key: `verifier-extraction-runtime-split-module-v1`
Sprint: `verifier-extraction-runtime-split-module-2026-05-16`

## Summary

Extracted the extraction/runtime verifier proof domain from `scripts/foundation-verify.mjs` into `lib/foundation-extraction-runtime-verifier.js`.

The root verifier now delegates the existing PASS/FAIL rows for:

- Foundation worker stale job, LLM call, and source-crawl reapers
- video-link inventory control through `extraction:target`
- corpus mission quota doctrine and seed controls
- scheduled current-day, history, Drive, attachment, and video extraction lanes
- Drive content extraction support for Docs, Sheets, PDF, text, markdown, OCR, and link inventory
- governed Gmail attachment and video transcript extraction targets
- shared-comms content-hash processing scope
- shared-comms LLM route provenance
- stale planned/started LLM call detection

## What Changed

- Added `lib/foundation-extraction-runtime-verifier.js`.
- Added `scripts/process-verifier-extraction-runtime-split-module-check.mjs`.
- Registered `process:verifier-extraction-runtime-split-module-check` in `package.json`.
- Updated `scripts/foundation-verify.mjs` to call `evaluateFoundationExtractionRuntimeVerifier()` and to verify the split module itself.
- Added plan and approval docs for `VERIFIER-EXTRACTION-RUNTIME-SPLIT-MODULE-001`.
- Added closeout registry entry under `verifier-extraction-runtime-split-module-v1`.
- Updated rebuild current plan/state for the active/closed sprint truth.

## Dogfood Proof

The focused proof recreates the failure modes this card claims to block:

- missing Foundation worker stale-run/LLM/source-crawl reaper wiring
- missing corpus daily quota controls
- missing Drive extraction support for governed document/spreadsheet/PDF/OCR/link workflows
- missing shared-comms LLM provenance and stale planned/started LLM calls

Healthy fixtures pass. Each broken fixture fails closed.

## Proof

Commands run:

```bash
node --check lib/foundation-extraction-runtime-verifier.js
node --check scripts/process-verifier-extraction-runtime-split-module-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-overnight-records.js
npm run process:verifier-extraction-runtime-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=VERIFIER-EXTRACTION-RUNTIME-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-EXTRACTION-RUNTIME-SPLIT-MODULE-001.json --closeoutKey=verifier-extraction-runtime-split-module-v1 --commitRef=HEAD
```

Pre-closeout proof status:

- Focused proof: `24/24`
- Root verifier before split: `14,081` lines
- Root verifier after split: about `13,992` lines before final closeout edits
- Full `foundation:verify -- --json-summary`: `367/367`

## Not Changed

This card did not run extraction, change extraction schedules, change connector credentials, change source contracts, change route/auth behavior, change DB schema, change backlog mutation behavior, wire Marketing Video Lab live routes, create Canva assets, use paid-source auth, build hub feature UI, mutate Drive permissions, send request-access emails, or run `MEETING-VAULT-ACL-001` Phase B.

## Next

Continue the standard-mode overnight Foundation cleanup queue with the next coherent verifier proof-domain split until `scripts/foundation-verify.mjs` drops below the 5,000-line danger line. Then return to bounded `lib/foundation-db.js` store splits.
