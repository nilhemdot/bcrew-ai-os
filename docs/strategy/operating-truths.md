# Operating Truths

Purpose: hold the durable business rules and interpretation logic that sit above any one sheet, connector, or dashboard.

Use this page for truths like:

- what counts as an active productive agent
- what is gross versus what the company actually keeps
- which source is operational truth versus workaround math

Do not put live values here. Put the meaning here.

Source IDs behind this page:

- `SRC-FREEDOM-TEAM-001`
- `SRC-FREEDOM-COMMUNITY-001`
- `SRC-FREEDOM-COMMUNITY-REV-001`
- `SRC-FREEDOM-ENGINE-001`
- `SRC-FREEDOM-BHAG-001`
- `SRC-OWNERS-001`
- `SRC-FINANCE-001`
- `SRC-OWNERS-LISTS-001`
- `SRC-CLICKUP-001`
- `SRC-FUB-001`

Routing rule:

- Strategy docs own meaning.
- Source notes own evidence and current process detail.
- Backlog owns unresolved gaps, repairs, and future source-system changes.

## Source Boundary Truth

- Freedom is current strategy process map and spreadsheet-era planning logic, not final system-owned truth.
- Owners is the governed deal / finance ledger for trade number, firm or executed date, agent-on-deal, split math, cash, and final source-row correction.
- Owners Dashboard Lists mirror is not a write surface. `SRC-OWNERS-LISTS-001` owns the list/dropdown source behind Owners Admin `Lead Source` and `Ground Zero`.
- FUB is CRM profile, stage, source, tag, assigned-user, activity, call, and transcript evidence. It is not final deal ledger truth.
- ClickUp owns workflow, accountability, roster/onboarding status, contract-link operations, conditional forecast tasks, and post-policy deal follow-through. It is not final finance, split, commission, or bonus payout truth.
- Finance truth resolves through `SRC-FINANCE-001` and Owners finance context, not Freedom self-entered payout fields.

## Validation Truth

- Ops self-validation fields are claims, not verified truth.
- A field saying `100% Record Completion`, `validated`, or similar is evidence that the process claimed completion. It is not enough for the rebuilt system to pay, route, or report without system-owned validation.
- Bonus/payout truth must reconcile to Owners finance and `Weekly Actuals` before it becomes trusted operating truth.
- For deals executed on or after `2026-04-01`, the old Freedom per-row survey/review fields are historical process context. ClickUp `Deal Data Entry` plus FUB call/transcript evidence is the live follow-through path.

## Attribution Truth

- Company-versus-agent attribution is rule-driven through governed lead-source rules, Owners/FUB evidence, ISA overrides, and signed-off source-row correction. Do not guess.
- `<unspecified>` is quarantine, not final attribution truth.
- `Ground Zero` must trace to the original root source whenever the lead source implies a chain, introduction, referral, or secondary source.
- `No Extra Lead Source` on a chained or referral path is usually wrong until source-truth review proves otherwise.
- If Owners and FUB have different source names but the same governed ownership, the issue is lineage cleanup, not an automatic company/agent credit flip.
- If Owners and FUB have different governed ownership, the row needs source-truth review before attribution is trusted.

## Rebuild Blueprint Truth

The Freedom rebuild target is documented in [Freedom Rebuild Blueprint](../rebuild/freedom-rebuild-blueprint.md). The blueprint exists so future data adapters and dashboard rebuilds do not reread the full validation history to rediscover source roles.

## Roster Truth

- Team membership is not the same thing as counted production roster.
- The Agent Engine should count active, productive agents only.
- A person can still belong to the team without counting in the live production roster.
- If a non-producing agent leaves, that should not count against production-roster attrition.
- `Recruited By` matters because recruiting ownership needs to be measurable by person, not only by legacy team bucket.

## Current Spreadsheet Reality

- In the Freedom Sheet today, `End Date` is doing two jobs:
  - true exit-date tracking
  - workaround filtering for who counts in the Agent Engine
- That is acceptable for the current spreadsheet.
- It should not survive as the clean rebuild model.

## Rebuild Rule

- Separate these concepts explicitly:
  - membership status
  - production-roster status
  - onboarding stage
  - recruited-by attribution
  - real start date
  - real end date

## Community Truth

- The `10,000` agent goal is the combined ownership-group agent organization at Real Broker.
- It is not Benson Crew team headcount.
- Community count is a real progress number against that target.

## Community Revenue Truth

- Gross community revenue and company-kept revenue are not the same thing.
- Gross generated community revenue is useful context.
- Company-kept revenue is the finance-relevant number.

Current operating interpretation:

- Scott:
  - keeps the first `$256k` of revenue share
  - after that, the remainder goes `100%` to the company
- Steve:
  - `80%` company
  - `20%` Steve
- Ryan / Blake / Nick:
  - `100%` to the company

## Source Role Truth

- Freedom currently carries key recruiter/date logic and strategy math.
- ClickUp looks like the better long-term operational roster and onboarding system.
- ClickUp is not the full replacement yet unless it also becomes complete on recruiter/date truth.

## Current Best Source Split

- Freedom Sheet:
  - recruiter / origin context
  - date logic
  - strategy math
  - BHAG and Agent Engine planning layer
- ClickUp Agent Roster:
  - operational status
  - onboarding progress
  - contract / checklist workflow
  - `Real Start Date` as the trigger for AIOS onboarding-feedback checkpoints

## Why This Page Exists

Without this layer, the system has to rediscover company meaning from:

- sheet formulas
- source notes
- chat history
- founder memory

That is not acceptable for long-term intelligence.

## Finance Truth

- `Weekly Actuals` is the bookkeeping / operating-ledger truth for the current system.
- `Cashflow Dash` budget overview is the management-truth view after partner normalization.
- Partner-share rows can remain inside the current finance spine because that reflects how the business is currently operated.
- The current workaround is valid current-state system behavior:
  - extra retained partner share can be added through partner-commission revenue rows
  - matching owner / partner-pay rows offset that inside the budget layer
  - `Cashflow Dash` then backs those rows out to show the real company picture for management
- Future-state rebuild target:
  - separate partner distributions cleanly from company revenue
  - remove the need for dashboard-level normalization later

## Retention And Satisfaction Truth

- The Agent Satisfaction Index is intended to become a real retention and culture signal, not just a one-off survey dashboard.
- The current spreadsheet is a starting point, not the finished system.
- The source tab today tracks:
  - monthly or periodic survey participation
  - town-hall engagement
  - category-level satisfaction scores
  - qualitative notes on what is working, what is missing, and what should change
- The real future-state system should expand beyond that sheet and include:
  - survey cadence that matches how the team actually operates
  - engagement signals from real team meetings, not just culture events
  - flags for the producing agents that matter most
  - retention-risk signals from email, Slack, attendance, and other operating behavior
- Operational truth changes over time:
  - survey cadence may shift to reduce fatigue
  - town-hall cadence may change
  - culture events may change
- The system must absorb those operating changes instead of breaking every time the program changes.
