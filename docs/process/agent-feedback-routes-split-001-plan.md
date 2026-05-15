# AGENT-FEEDBACK-ROUTES-SPLIT-001 Plan

## What

Extract the public Agent Onboarding Feedback form API routes from `server.js` into `lib/agent-feedback-routes.js`.

V1 moves only:

- `GET /api/agent-feedback/session`
- `POST /api/agent-feedback/submit`

Behavior stays unchanged. `server.js` becomes a thin registrar call through `registerAgentFeedbackRoutes(app, deps)`.

## Why

`server.js` is now below the 5,000-line architecture-risk line after the Foundation write route split, but it still owns the public Agent Feedback form behavior inline. Agent Feedback is operationally distinct from Foundation writes, hub reads, Strategy routes, auth, and source routes. A narrow route split finishes this part of the server monolith closeout without adding product behavior.

This unlocks useful operator behavior: Agent Feedback form routes have one named owner, future feedback changes do not require editing the server monolith, and the public token route privacy boundary is tested directly.

## Acceptance Criteria

- `lib/agent-feedback-routes.js` owns the two moved public Agent Feedback route strings.
- `server.js` imports `registerAgentFeedbackRoutes` and delegates the public Agent Feedback routes through a thin registrar call.
- `server.js` no longer owns the moved inline public Agent Feedback route handlers.
- Foundation admin dry-run routes, Ops dry-run routes, Sales routes, Marketing Video Lab routes, Strategy routes, hub routes, and Foundation write routes do not move in this card.
- Focused proof live-probes public Agent Feedback behavior using safe invalid paths:
  - missing/invalid session token returns the existing invalid-token posture,
  - invalid submit token returns the existing submit-failed posture,
  - invalid score with a synthetic valid token returns `invalid_agent_feedback_score` before DB/ClickUp/Gmail mutation.
- Focused proof records row-count fingerprints before and after live probes for `agent_onboarding_feedback_responses` and `agent_onboarding_feedback_response_notifications`; they must be unchanged.
- Dogfood proof rejects missing module, old inline server ownership, missing registrar, moved admin dry-run routes, weak substring-only proof, and proof that logs raw token material.
- Tracked proof and closeout must be metadata-only: no raw feedback tokens, no raw token hashes, no raw email addresses, and no feedback text.
- Performance budget: every moved public Agent Feedback probe has a latency budget under `2000ms` and a payload budget under `256KB`.
- Current Sprint, live backlog, Plan Critic run, approval, closeout, Recent Builds, and verifier coverage all name this card and `agent-feedback-routes-split-v1`.

## Definition Of Done

- `AGENT-FEEDBACK-ROUTES-SPLIT-001` is in the live backlog and closes under `agent-feedback-routes-split-v1`.
- `docs/process/agent-feedback-routes-split-001-plan.md` and `docs/process/approvals/AGENT-FEEDBACK-ROUTES-SPLIT-001.json` exist and validate.
- `plan_critic_runs` has a durable pass row at `9.8+`.
- `lib/agent-feedback-routes.js` owns only the public session/submit route cluster.
- `scripts/process-agent-feedback-routes-split-check.mjs` passes with live route probes, source ownership checks, dogfood failure fixtures, privacy checks, and mutation fingerprint checks.
- `server.js` remains below `5,000` lines after the split.
- Full `process:foundation-ship` passes before push.

## Details

Existing code to reuse:

- current inline `/api/agent-feedback/session` and `/api/agent-feedback/submit` route bodies in `server.js`,
- `verifyAgentFeedbackToken` from `lib/agent-feedback.js`,
- `writeAgentFeedbackToClickUp` from `lib/agent-feedback-clickup.js`,
- `sendAgentFeedbackResponseNotification` from `lib/agent-feedback-response-notify.js`,
- `getAgentOnboardingFeedbackResponseByTokenHash`, `getAgentOnboardingFeedbackResponseForMilestone`, and `upsertAgentOnboardingFeedbackResponse` from `lib/foundation-db.js`,
- `sendApiError` and `cacheHeadersNoStore`,
- prior route-split registrar/proof patterns.

Existing docs to reuse:

- `docs/process/auth-routes-split-001-plan.md`,
- `docs/process/foundation-write-routes-split-001-plan.md`,
- `docs/rebuild/current-plan.md`,
- `docs/rebuild/current-state.md`.

Existing scripts to reuse:

- `scripts/process-auth-routes-split-check.mjs`,
- `scripts/process-foundation-write-routes-split-check.mjs`,
- `scripts/foundation-verify.mjs`,
- `process:foundation-ship`.

Live backlog and Current Sprint truth to reuse: `AGENT-FEEDBACK-ROUTES-SPLIT-001` is the active blocker in `foundation-server-monolith-closeout-2026-05-15`, currently in Scoping until this plan, approval, and focused proof are present.

Gate decision tree: this is a full-risk Foundation runtime change because it touches public token-scoped form routes, `server.js`, a new route module, package scripts, canonical verifier coverage, closeout records, and Current Sprint truth. Static syntax checks and the focused proof run first. Full `process:foundation-ship` is required before push.

Large-file rule: this card touches `scripts/foundation-verify.mjs`, which is already over the `5,000` line architecture-risk threshold. The verifier touch is limited to adding one bounded check for this route split and imports for `lib/agent-feedback-routes.js`; it does not add a new verifier responsibility family. The split/extraction plan for that file remains the already-next cleanup track: Verifier Monolith Closeout, where checks move into focused verifier modules. If this card needs more than bounded verifier coverage, stop and split verifier coverage first.

Hot-route proof budget: the focused proof must call the actual public route behavior for `/api/agent-feedback/session` and `/api/agent-feedback/submit`, and each probe must be under `2000ms` / `256KB`. Manual spot-check route proof command if the focused proof regresses:

```bash
curl --max-time 5 -o /tmp/agent-feedback-session.json -w "time=%{time_total} bytes=%{size_download}\n" "http://localhost:3000/api/agent-feedback/session?token=invalid"
```

The full ship gate still runs after the focused route proof.

## Risks

- Risk: public Agent Feedback privacy posture changes.
  - Response: keep token validation behavior unchanged and require tracked proof to be metadata-only with no raw token, token hash, raw email, or feedback text.
- Risk: proof accidentally submits real feedback or writes ClickUp/Gmail.
  - Response: live probes use invalid token paths and one synthetic valid token with invalid score, which exits before DB insert, ClickUp writeback, and notification send. Row-count fingerprints must remain unchanged.
- Risk: moving routes accidentally pulls production dry-run/admin routes out of their existing owners.
  - Response: source dogfood rejects movement of `foundation/agent-feedback-production-dry-run` and `ops/agent-feedback-production-dry-run`.
- Risk: route split becomes substring theater.
  - Response: focused proof must call live HTTP routes and dogfood weak proof fixtures.
- Risk: full ship gate fails after focused proof passes.
  - Repair path: keep the card in Building Now, fix the failing boundary, rerun focused proof, then rerun full `process:foundation-ship`.

## Tests

```bash
node --check lib/agent-feedback-routes.js scripts/process-agent-feedback-routes-split-check.mjs server.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:agent-feedback-routes-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=AGENT-FEEDBACK-ROUTES-SPLIT-001 --planApprovalRef=docs/process/approvals/AGENT-FEEDBACK-ROUTES-SPLIT-001.json --closeoutKey=agent-feedback-routes-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=AGENT-FEEDBACK-ROUTES-SPLIT-001 --closeoutKey=agent-feedback-routes-split-v1
npm run process:foundation-ship -- --card=AGENT-FEEDBACK-ROUTES-SPLIT-001 --planApprovalRef=docs/process/approvals/AGENT-FEEDBACK-ROUTES-SPLIT-001.json --closeoutKey=agent-feedback-routes-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the failure class by checking that the old inline public Agent Feedback route cluster in `server.js` is gone while live public route behavior remains healthy, privacy proof stays metadata-only, and safe invalid probes do not mutate response/notification tables. Substring-only proof is rejected.

## Not Next

- Do not change Agent Feedback token format, TTL, signing secret, or validation semantics.
- Do not submit real feedback.
- Do not write ClickUp, Gmail, reminders, or response notifications from the focused proof.
- Do not move Foundation or Ops Agent Feedback production dry-run/admin routes.
- Do not wire Marketing Video Lab live routes.
- Do not build feedback product expansion, Telegram, Slack, or new feedback capture.
- Do not move Sales, Strategy, Foundation write, hub read, auth, source, or app page routes.
- Do not split the verifier or Foundation DB in this card.
