# SOURCE-023 Plan

## What

Harden the remaining connector read paths with shared retry/backoff vocabulary, health-check metadata, and redacted error handling.

V1 does not rewrite every connector client. It creates the common boundary used by the uptime monitor and applies it to the connector groups in scope so source failures become clear health states rather than raw crashes.

## Why

FUB, ClickUp, Slack, Missive, Google, and KPI are Foundation inputs. When they fail, Steve needs a plain-English degraded/down status and next action, not a hard crash or exposed API error body.

This protects the rebuild from another hidden source-truth mess: one connector being down should not make unrelated Foundation or hub surfaces look broken.

## Acceptance Criteria

- Shared connector error classification distinguishes auth, rate limit, timeout, not found, server error, network error, and unknown failure.
- Retry/backoff recommendations are deterministic and never sleep inside the status builder.
- Redaction strips token-like values, authorization headers, cookies, API keys, bearer values, and long opaque IDs from operator-facing error text.
- Existing ClickUp outage boundary stays fail-soft.
- Uptime monitor consumes the shared classifier so connector failures are reported consistently.
- Dogfood proof simulates each failure class and proves no raw secret survives.

## Definition Of Done

- Connector hardening helpers live in the new reliability module or a small adjacent helper, not in a monolith.
- Connector uptime snapshot uses the helper for every in-scope connector group.
- Process proof covers classification, redaction, and backoff recommendation.
- Current Sprint doctrine is populated and the card has a durable Plan Critic pass.
- Full ship gate passes before push.

## Details

Reuse:

- Existing code: `lib/clickup.js`, `lib/source-outage-boundary.js`, `lib/connector-credential-registry.js`, `lib/source-contracts.js`, and the new connector uptime module.
- Existing docs: the deep Foundation audit, Source Outage Boundary closeout, the two-sprint scope handoff, and Current Sprint doctrine.
- Existing scripts: `process:source-outage-boundary-check`, `process:foundation-operating-reliability-check`, `foundation:verify`, and `process:foundation-ship`.
- Live backlog and Current Sprint truth: `SOURCE-023` remains scoped/building/done through the DB-backed sprint overlay, not chat memory.
- `lib/clickup.js` fail-soft precedent.
- `lib/source-outage-boundary.js` outage status shape.
- `lib/connector-credential-registry.js` credential metadata.
- `lib/source-contracts.js` connector/source identity.

Gate decision for this card: full.

Decision tree: static proof is too weak because source-health behavior changes; focused proof is required through the actual function path with synthetic connector errors; full proof is required because the blast radius affects Foundation source health consumed by hubs. The only large-file touch is verifier coverage, and that must be a thin registration/check of the new module, not new business logic in `scripts/foundation-verify.mjs`; no new responsibility is added to the large verifier file.

Operator behavior unlocked: Steve, Nick, and the team get plain-English connector status instead of raw API failure text. That improves quality and speed in the real workflow because hub builders can tell whether a source is degraded before changing hub code.

The focused proof command must be fast, proportional, and target under 2 minutes so connector hardening is checked by default.

## Risks

- Risk: retry/backoff logic is mistaken for an executor and starts sleeping or retrying in API requests.
  - Repair path: V1 returns recommendations and budgets only; it does not run retry loops from the API surface.
- Risk: redaction is too narrow.
  - Repair path: dogfood includes bearer tokens, query keys, cookies, emails, and long opaque IDs.
- Risk: this drifts into connector rewrites.
  - Repair path: V1 is classification and reporting only; connector-client refactors become separate cards.

## Tests

```bash
npm run process:foundation-operating-reliability-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=SOURCE-023 --planApprovalRef=docs/process/approvals/SOURCE-023.json --closeoutKey=foundation-operating-reliability-v1 --commitRef=HEAD
```

Focused dogfood must recreate raw connector failures with secret-bearing messages and prove the public result is redacted, classified, and non-throwing.

The proof command must report pass/revise style checks and reject substring-only proof. A source substring or `.includes()` marker is not accepted unless the real function behavior also passes.

## Not Next

- Do not add external writeback.
- Do not run broad live connector probes during Foundation Hub requests.
- Do not solve every connector-specific retry executor.
- Do not add paid-source auth or Build Intel extraction.
