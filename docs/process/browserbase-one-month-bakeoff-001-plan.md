# BROWSERBASE-ONE-MONTH-BAKEOFF-001 Plan

Card: `BROWSERBASE-ONE-MONTH-BAKEOFF-001`

## Intent

Use Steve's one paid Browserbase month as a measured proof window, not a default architecture.

Plain English: Browserbase might be useful for hosted browser fallback, but it also adds browser-hour cost plus model/API token cost. The system must compare it against the local virtual browser hands path before any renewal decision or broad extraction loop.

## Scope

- Browserbase stays bakeoff-only.
- Local/deterministic source-browser routes remain the default.
- Bakeoff tasks are exact, tiny, and one-at-a-time:
  - public page
  - public repo
  - newsletter page
  - free community public bridge
  - MyICOR auth-needed boundary
  - browser challenge/fallback case
- Every task compares Browserbase against the local baseline route.
- Every task records browser minutes and model-call cap posture separately.
- No live Browserbase run starts from this proof.

## Acceptance Criteria

- Focused proof shows Browserbase is blocked without explicit bakeoff approval.
- Focused proof shows env keys cannot make Browserbase the default.
- Focused proof shows missing Browserbase credentials are metadata-only blockers.
- Focused proof shows an approved tiny bakeoff caps browser minutes and estimated model calls.
- Focused proof shows broad or misbudgeted Browserbase work fails closed.
- Task catalog covers the six comparison surfaces.
- Proof does not print API keys, project IDs, raw secrets, or token values.
- Proof does not buy, subscribe, submit, download, post, comment, message, mutate credentials/profiles, use normal Chrome, or promote to Scoper.

## Proof

```bash
node --check lib/browserbase-one-month-bakeoff.js scripts/process-browserbase-one-month-bakeoff-check.mjs
npm run process:browserbase-one-month-bakeoff-check -- --json
npm run process:source-browser-runtime-cost-guardrails-check -- --json
npm run process:source-browser-brain-route-policy-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
```

## Not Next

- Do not renew Browserbase from this proof alone.
- Do not run broad Browserbase extraction.
- Do not treat Browserbase as a login/MFA bypass.
- Do not use Browserbase for Instagram/LinkedIn/outreach automation here.
- Do not use Codex/Claude subscription labels as Stagehand model routes.
- Do not run paid/auth/private extraction before Source Session Broker and Harlan auth-resume are proven.

## Done Means

Done means the bakeoff contract is green and visible as a proof. A later operator-approved live bakeoff may run one tiny task at a time and compare it against local hands. Renewal remains blocked until the measured bakeoff wins on reliability, quality, recovery, and cost.
