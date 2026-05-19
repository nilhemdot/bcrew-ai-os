# Agent Feedback Routes Split Closeout - 2026-05-15

## Summary

`AGENT-FEEDBACK-ROUTES-SPLIT-001` is closed under `agent-feedback-routes-split-v1`.

Commit subject for Recent Builds matching: `Split Agent Feedback routes`.

## What Changed

- Extracted public Agent Feedback form routes from `server.js` into `lib/agent-feedback-routes.js`.
- `server.js` now delegates through `registerAgentFeedbackRoutes(app, deps)`.
- Moved routes:
  - `GET /api/agent-feedback/session`
  - `POST /api/agent-feedback/submit`
- Left Foundation/Ops Agent Feedback production dry-run routes, Sales routes, Foundation write routes, Strategy routes, hub routes, source routes, auth routes, and Marketing Video Lab wiring out of scope.

## Why It Matters

Public token-scoped Agent Feedback behavior now has a focused owner with privacy and mutation-boundary proof. `server.js` remains below the 5,000-line architecture-risk threshold after the Server Monolith Closeout route split run.

## Proof

Focused proof:

```bash
npm run process:agent-feedback-routes-split-check -- --json
```

Expected result:

- `ok: true`
- `server.js`: `4928 -> 4800` lines
- dogfood rejects:
  - missing module
  - old inline server ownership
  - missing registrar
  - moved admin dry-run route
  - weak proof without live route probes
  - raw token logging proof
- safe invalid route probes return expected `400` errors before mutation:
  - invalid session token
  - invalid submit token
  - synthetic valid token with invalid score
- row-count fingerprints stay unchanged for:
  - `agent_onboarding_feedback_responses`
  - `agent_onboarding_feedback_response_notifications`
- tracked proof remains metadata-only: no raw token, token hash, raw email, or feedback text.

Full ship proof:

```bash
node --check lib/agent-feedback-routes.js scripts/process-agent-feedback-routes-split-check.mjs server.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:agent-feedback-routes-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=AGENT-FEEDBACK-ROUTES-SPLIT-001 --planApprovalRef=docs/process/approvals/AGENT-FEEDBACK-ROUTES-SPLIT-001.json --closeoutKey=agent-feedback-routes-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=AGENT-FEEDBACK-ROUTES-SPLIT-001 --closeoutKey=agent-feedback-routes-split-v1
npm run process:foundation-ship -- --card=AGENT-FEEDBACK-ROUTES-SPLIT-001 --planApprovalRef=docs/process/approvals/AGENT-FEEDBACK-ROUTES-SPLIT-001.json --closeoutKey=agent-feedback-routes-split-v1 --commitRef=HEAD
```

## Known Limits

- This does not change Agent Feedback token format, TTL, signing secret, or validation semantics.
- This does not submit real feedback.
- This does not write ClickUp, Gmail, reminders, or response notifications from proof.
- This does not move Foundation/Ops Agent Feedback production dry-run routes.
- This does not wire Marketing Video Lab live routes.
- This does not split `scripts/foundation-verify.mjs` or `lib/foundation-db.js`.

## Next

Stop for Server Monolith Closeout review after full ship proof. Next cleanup target is Verifier Monolith Closeout before Build Intel or hub feature expansion.
