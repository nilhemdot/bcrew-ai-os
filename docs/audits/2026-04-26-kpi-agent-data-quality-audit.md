# 2026-04-26 KPI Agent Data Quality Audit

Purpose: turn Steve's KPI/FUB business logic into a repeatable read-only audit for agent coaching and future Sales Hub signals.

This is an aggregate audit. Client/person-level samples are intentionally left out of this tracked doc.

## Command

```bash
npm run -s kpi:data-quality -- --windowDays=90 --since=2026-01-01 --topLimit=5 --sampleLimit=0
```

## Connector Proof

- KPI Supabase project: `ayqykfsapzgqmqrrhque.supabase.co`
- FUB source rules: `73` governed rules loaded from AIOS Postgres
- Audit mode: read-only

## Appointment Quality

Live snapshot:

- active appointment rows: `3442`
- recent appointment rows used for stacking window since `2026-01-01`: `799`
- missing appointment outcomes: `951`
- non-standard appointment outcome labels: `53`
- known outcome labels used in the wrong appointment-type context: `142`
- likely same-person / same-type appointment stacks inside the `90` day window: `52`
- appointment rows inside likely stacks: `119`
- buy/sell context people detected as likely legitimate exception review: `21`

Interpretation:

- appointment outcome cleanup is a real Sales Hub data-quality gate
- stack detection must ask for context instead of accusing the agent
- buy/sell and separate-property cases need to stay protected as legitimate exception paths
- outcome cleanup needs two buckets: labels that are not canonical at all, and canonical labels used against the wrong appointment type

## Lead Source Validation

Live snapshot:

- active KPI lead-stage person rows: `16657`
- invalid/generic lead-source rows: `6726`
- pond/unclaimed lead-stage rows: `5095`

Invalid/generic source breakdown:

- `Import`: `5030`
- `<unspecified>`: `1485`
- `Sphere`: `208`
- blank source: `3`

Invalid/generic source rows by current stage:

- `Lead`: `6316`
- `Cold Nurture (6-12)`: `167`
- `Active Client`: `97`
- `Hot Lead/Nurture (0-3)`: `84`
- `Warm Nurture (3-6)`: `53`
- `Firm Deal`: `7`
- `Appointment`: `1`
- `Conditional Deal`: `1`

Interpretation:

- generic source labels are not final attribution truth
- `Sphere` is now treated as a relationship bucket, not a validated final source
- the assistant should guide the agent to a governed source path, collect secondary source details, and preserve Ground Zero
- source validation should not use source text alone to accuse an agent; it needs source, stage, owner, timing, tags/person type, and cleanup-window context

## Durable Rules Confirmed

- For source/stage/contact hygiene, write pressure should usually route to FUB first.
- KPI-native writes should focus on goals and Shopping List.
- Appointment cleanup should start as a read-only coaching signal, then become suggested fixes, then agent-authorized apply.
- Invalid lead source cleanup should ask practical questions:
  - was this family, met in person, met social, referral, introduction, or another governed source?
  - who introduced/referred the person?
  - does the origin person exist in FUB?
  - what platform/location/context should be stored in secondary source info?

## Backlog Impact

- `KPI-APPT-QUALITY-001` now has a repeatable script and live proof.
- `KPI-LEAD-VALIDATION-001` now has a repeatable script and live proof.
- `KPI-SHOPPING-001` remains the next related pass because Shopping List is the KPI-native coaching/write surface.
- `SALES-005` remains the apply-layer design destination after read signals are reliable.
