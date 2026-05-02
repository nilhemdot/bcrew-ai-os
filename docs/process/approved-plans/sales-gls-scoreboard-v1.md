# SALES-GLS-SCOREBOARD-V1 Approved Plan

Approved by: Steve
Approval source: Steve asked to build the reviewed GLS Scoreboard V1 plan, then approved the final review pass with "go for it" and asked to button up the full closeout.

## Card

`SALES-GLS-SCOREBOARD-V1`

## Goal

Make GLS measurable from stale listing identification through action, movement, sale, or failure without turning Sales Hub into a full CRM.

## Scope

- Keep GLS as one system inside Sales Hub.
- Show current active GLS pipeline separately from all-time GLS outcomes.
- Use grouped case counts as the primary dashboard count while preserving listing counts where they clarify multi-unit projects.
- Keep Nick Bergmann's seven 1020 Goderich listings grouped as one GLS case unless a future split/merge override card changes that.
- Show leader ownership, case history, moved/sold visibility, weekly case cohorts, source freshness, save status, and a manual ClickUp refresh path.
- Capture unbuilt ideas as follow-up backlog cards instead of expanding V1.

## Guardrails

- Do not build a CRM, agent coach, GBS, Strategy, Scoper, or broad source expansion.
- Do not add more Sales Hub menu items beyond Dashboard and GLS Manager.
- Do not make users open the ClickUp board for normal GLS work.
- Do not hide sold/closed cases after they leave Active.
- Do not hard-delete history in V1; capture history-control cleanup separately.

## Proof

- `npm run process:sales-listings-hub-check`
- `npm run backlog:hygiene -- --json`
- `npm run backlog:seed-drift -- --json`
- live `/api/sales-hub?refresh=1` proof
- manual `/sales#gls-dashboard` and `/sales#gls-system` review
- `npm run foundation:verify`

## Closeout

Closeout owns only `SALES-GLS-SCOREBOARD-V1`. Follow-up ideas belong to separate backlog cards for grouping overrides, re-stale reopen behavior, manager usability, leader accountability, date filters, history controls, and the future GROW-oriented Sales Dashboard.
