# KPI-APPT-QUALITY-001 - KPI Appointment Quality Audit

## What

Build the governed read-only appointment-quality slice from the existing KPI data-quality work.

The audit reads live KPI/Supabase appointment truth and reports aggregate signals for:

- missing appointment outcomes
- non-standard outcome labels
- known outcome labels used against the wrong appointment-type context
- likely same-person same-type appointment stacks inside the current-year review window
- buy/sell exception context so the system asks questions instead of accusing agents

## Why

Steve needs the Sales/KPI foundation to identify real appointment hygiene problems without waiting for manual spreadsheet review. The April 26 audit already proved the problem existed, but it lived as a raw script and archived report. This card promotes the appointment-quality slice into repo truth, focused proof, Current Sprint truth, and closeout gates.

This is not coaching automation yet. It is the read-only signal layer that makes later coaching, manager review, and apply workflows safe.

## Acceptance Criteria

- The audit reads live KPI/Supabase `users` and `appointments` through the governed KPI source path.
- The audit is aggregate-only for tracked proof and does not write person-level samples into repo artifacts.
- The audit reports active appointment rows, current-year rows used for stack review, missing outcomes, non-standard outcomes, outcome/type mismatches, likely stack clusters, rows inside likely stacks, and buy/sell exception counts.
- The evaluator fails if the audit is missing source ID, read-only posture, period, core totals, stack metrics, or aggregate-only sample limits.
- Dogfood proves the audit catches missing outcomes, non-standard outcomes, wrong-context outcomes, same-type stacks, and buy/sell exception context.
- Current Sprint marks `KPI-APPT-QUALITY-001` done and advances to `KPI-LEAD-VALIDATION-001`.

## Definition Of Done

- `lib/kpi-appointment-quality-audit.js` owns the live audit, evaluator, period contract, and dogfood proof.
- `scripts/process-kpi-appt-quality-check.mjs` validates approval, Plan Critic, live backlog, Current Sprint truth, dogfood behavior, live KPI/Supabase read, aggregate-only proof, verifier coverage, closeout registry, and no source-write methods.
- `package.json` exposes `process:kpi-appt-quality-check`.
- Closeout registry, verifier coverage, plan, approval, and handoff are wired.
- Full closeout gates pass and main is clean/pushed.

## Details

## Reuse Existing Work

This card reuses the current KPI/Supabase foundation instead of rebuilding KPI:

- Existing code reused: `scripts/audit-kpi-agent-data-quality.mjs`, `lib/kpi-health.js`, and `scripts/kpi-supabase-health.mjs`.
- Existing docs reused: `docs/source-notes/kpi-dashboard.md`, `docs/source-notes/fub-kpi-deal-connection-map.md`, and `docs/_archive/audits/2026-04-26-kpi-agent-data-quality-audit.md`.
- Existing scripts reused: `kpi:data-quality`, `kpi:health`, `process:system-health-nightly-audit-check`, `process:build-lane-repeated-failure-action-gate-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.
- Live backlog and Current Sprint truth reused: `KPI-APPT-QUALITY-001` is the active blocker and `KPI-LEAD-VALIDATION-001` is the next safe card.
- `docs/source-notes/kpi-dashboard.md` already defines the KPI read model and states that `persons` + `appointments` own pipeline / appointment / signed-activity truth.
- `lib/kpi-health.js` already owns KPI local env loading, Supabase URL normalization, credential lookup, table/RPC expectations, and health proof.
- `scripts/kpi-supabase-health.mjs` already proves the load-bearing KPI tables/RPCs are readable.
- `scripts/audit-kpi-agent-data-quality.mjs` already contains the first raw appointment/lead-source audit logic.
- `docs/_archive/audits/2026-04-26-kpi-agent-data-quality-audit.md` preserves the April aggregate audit and interpretation.
- Existing gates reused: Plan Critic, process write guard, Current Sprint overlay, `process:system-health-nightly-audit-check`, `process:build-lane-repeated-failure-action-gate-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.

The exact gap is governance and repeatability. The old script was useful, but the appointment-quality slice was not yet a carded, dogfooded, aggregate-only Foundation artifact with closeout truth.

Behavioral rules:

- Missing outcomes and wrong labels are data-quality signals, not accusations.
- Same-person same-type appointment clusters are questions to review.
- Buy/sell and separate-property context must stay visible as legitimate exception context.
- Source/stage/contact hygiene writes stay outside this card.

Privacy boundary:

- The live audit can read private KPI/Supabase data already approved for Foundation reads.
- Tracked plan/closeout/proof artifacts use aggregate counts only.
- Person-level samples remain local/runtime output only and are disabled in the focused closeout proof.

Gate decision: full gate. The card reads a live business source and affects Sales data-quality truth, so it needs Plan Critic, focused proof, health/repeated-failure/backlog gates, full `foundation:verify`, and `process:foundation-ship`.

Decision tree: this is not a static-only card because it reads live KPI/Supabase data, and it is not only a focused gate because it changes live backlog/Current Sprint/closeout truth. The correct decision-tree result is full gates: focused `process:kpi-appt-quality-check`, then System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, fanout, ship, push.

Behavior proof path: the focused proof calls real function paths in `lib/kpi-appointment-quality-audit.js`: `fetchLiveKpiAppointmentQualityAudit()`, `buildKpiAppointmentQualityAudit()`, `evaluateKpiAppointmentQualityAudit()`, and `buildKpiAppointmentQualityDogfoodProof()`. Dogfood fixtures reject weak behavior by proving missing outcomes, non-standard outcomes, wrong-context outcomes, same-type stacks, and buy/sell exception context are detected through actual functions, not substring markers.

Operator value: this gives Steve and the Sales team a useful quality signal for the real workflow of reviewing appointment hygiene before coaching agents. It improves Sales data quality without forcing Steve to manually inspect KPI tables or letting AI apply risky fixes.

Speed bound: the focused proof is fast enough for default use because it reads only `users` and `appointments`, uses bounded Supabase pagination, does no provider/browser/extraction job work, and does not run full `foundation:verify` internally. Full verifier and ship remain closeout gates.

## Risks

- Risk: the audit creates source-system write pressure too early. Repair path: proof fails if source write methods appear; apply/coaching workflows stay out of scope.
- Risk: tracked artifacts leak person-level data. Repair path: focused proof runs with `sampleLimit=0` and asserts aggregate-only sample output.
- Risk: stack detection falsely accuses legitimate buy/sell scenarios. Repair path: buy/sell context is tracked as exception review context, not a stack failure.
- Risk: this drifts into lead-source validation. Repair path: `KPI-LEAD-VALIDATION-001` stays the next card and this card only owns appointment outcomes/stacks.

## Tests

- `node --check lib/kpi-appointment-quality-audit.js scripts/process-kpi-appt-quality-check.mjs`
- `npm run process:kpi-appt-quality-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=KPI-APPT-QUALITY-001 --planApprovalRef=docs/process/approvals/KPI-APPT-QUALITY-001.json --closeoutKey=kpi-appt-quality-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=KPI-APPT-QUALITY-001 --closeoutKey=kpi-appt-quality-v1`
- `npm run process:foundation-ship -- --card=KPI-APPT-QUALITY-001 --planApprovalRef=docs/process/approvals/KPI-APPT-QUALITY-001.json --closeoutKey=kpi-appt-quality-v1 --commitRef=HEAD`

## Not Next

- No KPI/FUB writes or source-system mutation.
- No agent-facing coaching prompts, manager assignment workflow, or apply controls.
- No person-level tracked report artifacts.
- No broad KPI dashboard rebuild.
- No lead-source validation implementation; continue `KPI-LEAD-VALIDATION-001` next.
- No external sends, credential/key rotation, Drive permission mutation, provider calls, paid/provider access, or browser-auth work.
