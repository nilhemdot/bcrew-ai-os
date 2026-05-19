# Connector Hardening Checkpoint

Date: 2026-04-21

Purpose: make the current connector knowledge layer explicit so we do not re-do the same discovery work later.

## Straight answer

The knowledge layer is now strong enough for Foundation.

What was missing before was not raw detail.
It was the boundary between:

- what Foundation needs now
- what later hub / coaching work can discover later

That boundary is now written into the source notes.

## What is locked now

### KPI / Supabase

Locked for Foundation:

- KPI is a live foundation system, not a rebuild target
- KPI runs on multiple truth layers, not one flat source
- the critical read layers are known:
  - `users`
  - `persons`
  - `appointments`
  - `leads`
  - `deal_data`
  - goals tables
  - `users_activity`
- the major business split is documented:
  - pipeline truth
  - shopping-list truth
  - executed-deal / finance truth
- AI OS now has a defined read-discipline surface instead of vague Supabase access

### Follow Up Boss

Locked for Foundation:

- FUB is the CRM source for person records, user roster, source context, and person linkage
- FUB is not the final finance truth
- lead-source taxonomy and parity work are the right current foundation scope
- the support-network / non-lead / re-entry doctrine is documented
- the assigned collections have enough meaning captured for foundation-level understanding
- rough UI grouping is explicitly separated from signed doctrine

## What is intentionally not locked yet

These are later hub / coaching questions:

- every exact smart-list rule
- every day-to-day agent workflow
- every coaching sequence
- every manager SOP
- every cleanup automation
- every edge-case interpretation of HOT / WARM / COLD

Those are important.
They are just not required to close the foundation understanding of these sources.

## Where the notes live

- [KPI Dashboard / Supabase](/Users/bensoncrew/bcrew-ai-os/docs/source-notes/kpi-dashboard.md)
- [Follow Up Boss](/Users/bensoncrew/bcrew-ai-os/docs/source-notes/follow-up-boss.md)
- [KPI system audit checkpoint](/Users/bensoncrew/bcrew-ai-os/docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-04-20-kpi-system-audit-checkpoint.md)
- [FUB live collections audit](/Users/bensoncrew/bcrew-ai-os/docs/handoffs/2026-04-20-fub-live-collections-audit.md)

## What this means

We do not need to re-learn these systems from zero.

Next time we go deeper, the job is:

- extend the notes
- answer the next layer of questions
- move from foundation meaning into hub-specific operating logic

Not:

- rediscover the connector
- remap the whole system
- argue again about what the source basically is
