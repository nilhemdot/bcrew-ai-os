# GEMINI-VIDEO-BRAIN-ROUTE-001 Closeout

Closeout key: `gemini-video-brain-route-v1`

Next card: `CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001`

## Summary

`GEMINI-VIDEO-BRAIN-ROUTE-001` adds a bounded Gemini API route proof for Brain Fleet video/vision and long-context readiness. The route uses existing LLM runtime truth, writes Brain Fleet quota ledger truth before provider execution, records route-probe capability evidence, and fails closed through Harlan when auth/API-key repair is needed.

The card does not process source video, upload files, store raw video, run broad extraction, create atoms, create training notes, mutate credentials, or send external writes.

## Changed Files

- `lib/gemini-video-brain-route.js`
- `lib/llm-router.js`
- `scripts/process-gemini-video-brain-route-check.mjs`
- `docs/process/gemini-video-brain-route-001-plan.md`
- `docs/process/approvals/GEMINI-VIDEO-BRAIN-ROUTE-001.json`
- `docs/handoffs/2026-05-20-gemini-video-brain-route-closeout.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `lib/foundation-build-closeout-model-records.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `lib/foundation-verify-live-api-snapshot.js`
- `scripts/foundation-verify.mjs`
- `package.json`

## Proof

Focused behavior proof:

```bash
node --check lib/gemini-video-brain-route.js lib/llm-router.js scripts/process-gemini-video-brain-route-check.mjs
npm run process:gemini-video-brain-route-check -- --close-card --json
npm run process:foundation-verify-llm-auth-audit-check -- --json
```

Foundation gates:

```bash
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=GEMINI-VIDEO-BRAIN-ROUTE-001 --planApprovalRef=docs/process/approvals/GEMINI-VIDEO-BRAIN-ROUTE-001.json --closeoutKey=gemini-video-brain-route-v1 --commitRef=HEAD
```

## Evidence Contract

The close-card proof records:

- Gemini account label from canonical `GEMINI_API_KEY`, without storing the secret.
- Selected model, primary/fallback availability, model metadata, and supported `generateContent` method.
- Video/vision/long-context capability posture from live model metadata plus official Gemini docs.
- Quota tier/reset as explicit unknown unless the provider response exposes quota headers.
- Artifact contract for future approved public video or transcript fallback items.
- Fallback route `foundation-extraction-openai-api` for transcript/text-only fallback.
- Brain Fleet ledger row before provider execution, finished with succeeded/failed status and stop condition.
- Harlan auth-needed dry-run behavior on auth/API-key failure.
- No credential mutation and no external sends.

The final verifier run also proves `foundation:verify` reads the dedicated LLM runtime endpoint with enough recent call history to retain the LLM auth dry-run proof after bounded provider route probes push new ledger rows into the capped Foundation Hub payload.

## Boundary

This closeout only makes Gemini route readiness visible to Brain Fleet. `EXTRACTOR-BRAIN-FLEET-PROOF-001` and exact source approval cards still own source selection, transcripts/artifacts, provenance links, atoms, training notes, Build Intel review routes, duplicate/staleness guards, and skipped/error reason logging.

Continue `CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001`. Do not start extractor proof, YouTube runtime proof, Skool, MyICOR, Strategy, or People work from this closeout.
