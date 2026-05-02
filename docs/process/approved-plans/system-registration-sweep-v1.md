# System Registration Sweep V1

## Card

`SYSTEM-REGISTRATION-SWEEP-001`

## Goal

Make shipped systems discoverable in Foundation Systems and `/api/source-of-truth`, starting with the missing GLS registration, and add verifier protection so closed system builds cannot disappear from the Systems map.

## Scope

- Register `SYS-SALES-GLS-001` as `GLS System / Get Listings Sold`.
- Put GLS under service area `Sales` with implementation state `live`.
- Map GLS routes: `/sales#gls-dashboard` and `/sales#gls-system`.
- Set GLS source truth to ClickUp Deal Data Entry / `SRC-CLICKUP-001`.
- Set KPI Shopping List / `SRC-SUPABASE-001` as supporting evidence only.
- Record GLS trigger as active listings crossing the stale threshold.
- Record GLS owner lane as Sales Leadership.
- Link proof to the `SALES-GLS-SCOREBOARD-V1` closeout.
- Confirm `SYS-AGENT-ONBOARDING-FEEDBACK-001` remains visible as live under Agent Onboarding.
- Add a shipped-system registration check and verifier coverage.

## Hard Boundaries

- Do not build new GLS features.
- Do not build new onboarding features.
- Do not start Strategy, Scoper, Agent, or corpus work.
- Do not broaden Foundation cleanup beyond this registration/protection slice.

## Proof

- `/api/source-of-truth` groupedSystems includes `SYS-SALES-GLS-001`.
- Foundation Systems can render GLS under Sales from the groupedSystems record.
- Agent Onboarding Feedback remains visible and live.
- `npm run process:system-registration-sweep-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- Dashboard and worker serve HEAD.

## Closeout

`SYSTEM-REGISTRATION-SWEEP-001` ships only `system-registration-sweep-v1`. Closeout owns only `SYSTEM-REGISTRATION-SWEEP-001`. After ship, stop.
