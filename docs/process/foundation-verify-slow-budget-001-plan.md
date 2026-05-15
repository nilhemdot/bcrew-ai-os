# FOUNDATION-VERIFY-SLOW-BUDGET-001 Plan

## What

Add a verifier timing budget so `foundation:verify --profile=true` names slow sections over the agreed budget with owner/repair context. This card does not skip checks; it makes slow checks visible before they become accepted drag.

## Why

The ClickUp bottleneck was only obvious after the new profile output. Steve needs the Foundation gate to keep surfacing slow sections automatically so future sprints do not quietly rebuild a 90-second verifier.

## Acceptance Criteria

- `FOUNDATION_VERIFY_PROFILE` includes a slow-section budget value.
- Profile output includes sections over budget, not just the top slowest list.
- The ClickUp health check is owned by a clear repair target when over budget.
- A focused proof dogfoods a synthetic slow section and proves it appears in over-budget output.
- No verifier checks are skipped, downgraded, or auto-repaired.

## Definition Of Done

- Focused proof validates the profile shape and synthetic slow-section budget behavior.
- Focused proof calls the actual function path for profile budget classification, dogfoods a synthetic slow section, and rejects substring-only proof.
- `FOUNDATION-VERIFY-SLOW-BUDGET-001` has a durable Plan Critic pass row with score at least 9.8 before build.
- Proof command `npm run process:clickup-verify-health-boundary-check -- --json` returns pass/revise-style checks and names this card.
- Live profile proof shows `health:clickup:verify` is no longer the dominant unbounded drag, or clearly reports it over budget with owner and next action.
- Current Sprint doctrine and Plan Critic rows are populated.
- Full ship gate passes before push.

## Details

Reuse existing code: `scripts/foundation-verify.mjs` timing profile, `scripts/process-foundation-verify-profile-check.mjs`, and the new ClickUp verifier health-boundary proof. Reuse existing docs, existing scripts, live backlog, and Current Sprint truth from the `foundation-ship-gate-speed-payload-cleanup-v1` closeout and this sprint sequence handoff. Keep any change inside `scripts/foundation-verify.mjs` thin: only profile-budget metadata and reporting, no new business logic in the oversized verifier file.

Gate decision: full. The card touches `scripts/foundation-verify.mjs`, so focused proof is not enough for the final ship. The useful operator behavior for Steve and the team is a fast profile that names slow sections before they become accepted gate drag.

## Risks

- Risk: budget output becomes another warning nobody reads. Repair path: include owner and next action in profile JSON and closeout.
- Risk: budget enforcement blocks legitimate one-off vendor latency. Repair path: report and route first; only fail closed if the focused proof or required source-health semantics break.
- Risk: adding more verifier logic to the monolith. Repair path: keep the verifier touch tiny and move reusable proof behavior into the focused process script.
- Risk: proof becomes marker-based. Repair path: fail closed unless the proof calls the actual function path and rejects substring-only evidence.

## Tests

- Static: `node --check scripts/foundation-verify.mjs scripts/process-foundation-verify-profile-check.mjs scripts/process-clickup-verify-health-boundary-check.mjs`
- Focused: `npm run process:clickup-verify-health-boundary-check -- --json`
- Profile: `npm run process:foundation-verify-profile-check -- --json`
- Full: `npm run process:foundation-ship -- --card=FOUNDATION-VERIFY-SLOW-BUDGET-001 --planApprovalRef=docs/process/approvals/FOUNDATION-VERIFY-SLOW-BUDGET-001.json --closeoutKey=foundation-clickup-verify-health-boundary-v1 --commitRef=HEAD`

## Not Next

- Do not fail every transient slow external call automatically in v1.
- Do not weaken `foundation:verify`.
- Do not add broad verifier refactors.
- Do not build product or hub features.
