# Control Plane + Connector Readiness Sprint Plan

## What

Run a backend-only Foundation sprint that makes sprint truth, stage progression, rebuild docs, connector readiness, model route truth, and source-gap triage harder to fake before product work resumes.

## Why

Steve caught the exact failure pattern Foundation exists to prevent: real work shipped, but the process record skipped doctrine and stage progression. The next sprint must make the control plane enforceable before more source or product behavior is added.

## Acceptance Criteria

- The sprint is visible in live DB before scoping starts.
- All six cards start in Scoping and move through Sprint Ready, Building Now, and Done This Sprint with real timestamps/change events.
- Every card has complete `existing_work_check` doctrine and one `plan_critic_runs` pass row before build starts.
- The stage gate rejects the original skipped Connector/Routing state and accepts the repaired state.
- Sprint #2 cards are captured as scoped follow-ups but not pulled tonight.

## Definition Of Done

- All six cards close with focused or full proof as appropriate.
- Current Sprint ends with 6/6 Done This Sprint, no active blocker, and sprint-review next action.
- No product expansion, external extraction, Drive ACL mutation, request-access email, or UI polish ships.

## Details

Use existing Foundation sprint overlay tables, backlog items, Plan Critic ledger, Recent Work closeouts, and focused proof scripts. Live DB is the operator truth; code defaults are bootstrap and validation only.

## Risks

- Risk: the repair sprint repeats the skip pattern. Mitigation: the sprint opened in Scoping only before scoping doctrine.
- Risk: source-gap triage turns into ingestion. Mitigation: source follow-up card is triage/report only.
- Risk: connector credential work leaks secrets. Mitigation: metadata-only registry and no raw values in docs/logs/chat.

## Tests

- Per-card focused proof commands.
- Plan Critic pass rows for all cards.
- `npm run backlog:hygiene -- --json`
- Final `process:foundation-ship` when protected code changes require it.

## Not Next

- Reply/Watching Loop
- Strategy Hub expansion
- Mycro, Skool, Loom, Zoom, Real, SocialPilot, or new external extraction
- Telegram bots
- Marketing production or Brand Guardian enforcement
- Directors or Master Director rebuild
- Drive ACL Phase B mutation
- request-access emails
- broad UI polish
