# SOURCE-BROWSER-BRAIN-ROUTE-POLICY-001 Plan

Card: `SOURCE-BROWSER-BRAIN-ROUTE-POLICY-001`

## Intent

Make source-browser work choose the right brain/runtime before it runs.

Plain English: the system should not guess between deterministic readers, local browser Hands, paid API model routes, Browserbase, and Harlan auth escalation. Every source packet should get an explicit route decision with cost, auth, and stop boundaries before any browser worker starts.

## Scope

- Prefer deterministic worker first for normal public/free reads.
- Prefer public repo/newsletter/source-specific runners over a generic agent when those lanes fit.
- Use local virtual browser hands for source-specific page interaction when no model or hosted browser is needed.
- Use Source Session Broker before login, Google OAuth, MFA, paid/private/member areas, or free-community sessions that need a source identity.
- Use API/Stagehand only for proof-sized source-browser reasoning with explicit model route and model-call cap.
- Use Browserbase only during the one-month bakeoff or approved fallback, never because env keys exist.
- Keep Harlan Telegram as prepared auth-needed escalation from proofs; live sending remains separately approved.

## Not Allowed

- Unsupported subscription-style routes such as `codex/gpt-5.5` as a Stagehand model; unsupported subscription-style labels must fail before any provider spend starts.
- Browserbase as default.
- Broad Browserbase/API loops without explicit caps.
- Steve normal Chrome profile.
- Purchases, downloads, posts, comments, DMs, external sends, profile/account changes, or credential mutation.

## Acceptance

- Focused proof shows deterministic, local-hands, source-session, API model, Browserbase bakeoff, and blocked-action routing.
- Source Browser Agent plans record the selected brain route before runner execution.
- Source-run readback exposes brain route counts so Dev can see why a row used local hands, Source Session Broker, API/Stagehand, or Browserbase.
- Existing source-browser harness and executor proofs remain green.

## Proof

```bash
node --check lib/source-browser-brain-route-policy.js scripts/process-source-browser-brain-route-policy-check.mjs lib/source-browser-agent-harness.js lib/dev-source-run-readback.js
npm run process:source-browser-brain-route-policy-check -- --json
npm run process:source-browser-agent-harness-check -- --json
npm run process:source-browser-agent-executor-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
```

## Next

After this route policy is green, continue the first real bounded free-community/session proof and MyICOR auth/connector proof. Browserbase stays bakeoff-only until a measured comparison says it is worth keeping.
