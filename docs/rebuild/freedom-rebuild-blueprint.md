# Freedom Rebuild Blueprint

Purpose: give future builders the source-owned rebuild map for the Freedom Sheet logic without rereading the full validation chat and source-note history.

This is not a live-value snapshot. It is the target architecture for turning the current Freedom spreadsheet into source-owned inputs, governed calculations, and dashboard reads.

## Source-Owned Inputs

Use the signed-off source contracts before trusting any workbook-derived meaning:

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

## Target Layers

### 1. Team Member Source

Owns the human/team membership record: person identity, team relationship, recruited-by context, role context, and membership lifecycle. This layer must not be confused with live production-roster counting.

Current evidence:

- Freedom carries recruiter/origin and date context.
- ClickUp carries roster/onboarding workflow state.
- FUB/Owners evidence can help resolve source/identity drift, but neither should overwrite the person record silently.

### 2. Production Roster Source

Owns whether a person counts in the Agent Engine production roster. Production-roster status is not the same thing as team membership.

Current rule:

- Active, productive agents count.
- Owners, leadership, and known zero-production agents do not count just because they are associated with the team.
- Non-producing exits should not distort production-roster attrition.

### 3. Community Source

Owns the Real Broker ownership-group/community progress signal behind the 10,000-agent goal. This is not Benson Crew team headcount.

Current rule:

- Community count tracks the combined ownership-group organization.
- Community revenue must stay separated between gross generated revenue and company-kept revenue.

### 4. Deal-Ledger Economics Source

Owns executed deal economics, trade number, firm/executed date, agent-on-deal, split math, cash, and final source-row correction.

Current source boundary:

- Owners is the governed deal/finance ledger.
- `SRC-FINANCE-001` owns finance reconciliation and management picture.
- Freedom hidden Admin mirror is dependency context, not a separate Freedom-owned truth layer.
- ClickUp is workflow follow-through, not final transaction economics.

### 5. BHAG Assumptions Source

Owns the long-range planning assumptions that drive BHAG and Agent Engine math.

Current rule:

- Assumptions need editable source-owned fields, not buried formulas.
- Planning attrition, recruiting pace, active roster count, community growth, and revenue-share assumptions must be inspectable.

### 6. Engine Calculation Layer

Owns governed calculations that transform source-owned inputs into planning outputs.

Current rule:

- Formula meaning from Freedom is accepted as current reality, but the final system should not preserve spreadsheet workarounds as architecture.
- The current `End Date` workaround should split into membership status, production-roster status, onboarding stage, recruited-by attribution, real start date, and real end date.
- Ops self-validation fields are claims, not verified truth.

### 7. Dashboard Read Layer

Owns display, review, and operator interpretation. It reads source-owned inputs and calculation outputs; it does not become source truth.

Current rule:

- Dashboards should show source-backed values and source health.
- Dashboards should not hardcode live values or hide source drift.
- If a source is stale, incomplete, or approval-bound, the dashboard must expose that state.

## Dependency Boundaries

- Freedom remains current strategy process map and spreadsheet-era planning logic.
- Owners remains deal / finance truth for executed transaction economics.
- `SRC-OWNERS-LISTS-001` owns list/dropdown source. Owners Dashboard `Lists` is an imported mirror, not a write surface.
- FUB is CRM profile/source/stage/tag/activity/call/transcript evidence, not final deal ledger truth.
- ClickUp is workflow/accountability, roster/onboarding, conditional forecast, and post-policy follow-through evidence, not final finance truth.
- Finance truth reconciles through `SRC-FINANCE-001`, not Freedom self-entered payout claims.

## Backlog-Owned Gaps

Do not leave rebuild gaps as prose-only notes. Promote them to backlog when they require work:

- Freedom source adapter and schema-drift monitor: `DATA-001`.
- Ops-improvement rollup dead NPS dependency repair: `OPS-003`.
- Planning attrition as first-class Agent Engine input: `ENGINE-001`.
- Source-backed values rendered across the system: `DATA-003`.

## Not Next

- No spreadsheet mutation from this blueprint.
- No ClickUp writes.
- No FUB writes.
- No Drive permission mutation.
- No credential/key rotation.
- No live extraction or broad private source reads.
- No public exposure or external sends.
- No hardcoded live values in markdown.

## Proof Standard

A future rebuild card is not done because it copied formulas. It is done only when it proves:

- source-owned inputs are named by source ID,
- source and dashboard roles stay separated,
- hidden mirrors are not treated as write surfaces,
- self-validation claims are replaced or checked by system-owned validation,
- unresolved attribution is quarantined rather than guessed,
- output values show freshness/provenance instead of relying on stale markdown.
