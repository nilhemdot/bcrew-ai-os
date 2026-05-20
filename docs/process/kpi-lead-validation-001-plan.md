# KPI-LEAD-VALIDATION-001 - KPI Lead-Source Validation Audit

## What

Build the governed read-only lead-source validation slice from the existing KPI/FUB data-quality work.

The audit reads live KPI/Supabase lead-stage person truth and governed AIOS FUB lead-source rules, then reports aggregate signals for:

- active lead-stage people with missing source labels
- generic source labels such as `Import`, `<unspecified>`, `Sphere`, and `SOI`
- source labels that are not in governed FUB lead-source rules
- governed FUB source rules that are flagged or classified as invalid/unknown
- unclaimed pond lead-stage context

## Why

Steve needs lead-count and lead-source trust before Sales coaching, reporting, or cleanup workflows can be trusted. FUB can create lead-stage records for realtors, vendors, support-network contacts, imports, duplicates, and other non-leads. If those rows keep generic source labels, KPI can inflate lead counts or misrepresent attribution.

The April 26 audit already proved the problem existed, but it lived as a raw script and archived report. This card promotes the lead-source/fake-lead slice into repo truth, focused proof, Current Sprint truth, and closeout gates.

This is not cleanup automation yet. It is the read-only signal layer that makes later FUB correction prompts, manager review, and apply workflows safe.

## Acceptance Criteria

- The audit reads live KPI/Supabase `users`, `stages`, and active lead-stage `persons` through the governed KPI source path.
- The audit joins governed AIOS FUB lead-source rules through the existing Foundation DB store.
- The audit is aggregate-only for tracked proof and does not write person-level samples into repo artifacts.
- The audit reports active lead-stage people, invalid lead-source rows, generic invalid rows, Import rows, unspecified rows, Sphere rows, missing source rows, sources not in governed rules, flagged-rule rows, invalid-group rows, and unclaimed pond rows.
- The evaluator fails if the audit is missing KPI/FUB source IDs, read-only posture, source-rule proof, core totals, generic-source breakdowns, or aggregate-only sample limits.
- Dogfood proves the audit catches Import, unspecified, Sphere, blank source, source not in governed rules, flagged governed rules, invalid governed groups, and unclaimed pond context.
- Current Sprint marks `KPI-LEAD-VALIDATION-001` done and advances to `INTEL-THREAD-CONTEXT-001`.

## Definition Of Done

- `lib/kpi-lead-validation-audit.js` owns the live audit, evaluator, source classifier, and dogfood proof.
- `scripts/process-kpi-lead-validation-check.mjs` validates approval, Plan Critic, live backlog, Current Sprint truth, dogfood behavior, live KPI/Supabase + FUB rule read, aggregate-only proof, verifier coverage, closeout registry, and no source-write methods.
- `package.json` exposes `process:kpi-lead-validation-check`.
- Closeout registry, verifier coverage, plan, approval, and handoff are wired.
- Full closeout gates pass and main is clean/pushed.

## Details

## Reuse Existing Work

This card reuses the current KPI/Supabase and FUB source-rule foundation instead of rebuilding either system:

- Existing code reused: `scripts/audit-kpi-agent-data-quality.mjs`, `lib/kpi-health.js`, `lib/foundation-fub-lead-source-store.js`, and `scripts/audit-admin-lead-sources.mjs`.
- Existing docs reused: `docs/source-notes/kpi-dashboard.md`, `docs/source-notes/follow-up-boss.md`, `docs/source-notes/fub-kpi-deal-connection-map.md`, and `docs/_archive/audits/2026-04-26-kpi-agent-data-quality-audit.md`.
- Existing scripts reused: `kpi:data-quality`, `lead-sources:audit`, `kpi:health`, `process:kpi-appt-quality-check`, `process:system-health-nightly-audit-check`, `process:build-lane-repeated-failure-action-gate-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.
- Live backlog and Current Sprint truth reused: `KPI-LEAD-VALIDATION-001` is the active blocker and `INTEL-THREAD-CONTEXT-001` is the next safe card.
- `docs/source-notes/kpi-dashboard.md` already defines the KPI read model and states that `persons` own pipeline / lead flow truth.
- `docs/source-notes/follow-up-boss.md` already declares FUB as governed CRM/source context.
- `lib/kpi-health.js` already owns KPI local env loading, Supabase URL normalization, credential lookup, table/RPC expectations, and health proof.
- `lib/foundation-fub-lead-source-store.js` already owns governed FUB lead-source rules and snapshots in AIOS Postgres.
- `scripts/audit-kpi-agent-data-quality.mjs` already contains the first raw lead-source validation logic.
- `docs/_archive/audits/2026-04-26-kpi-agent-data-quality-audit.md` preserves the April aggregate audit and interpretation.
- Existing gates reused: Plan Critic, process write guard, Current Sprint overlay, `process:system-health-nightly-audit-check`, `process:build-lane-repeated-failure-action-gate-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.

The exact gap is governance and repeatability. The old script was useful, but the lead-source/fake-lead slice was not yet a carded, dogfooded, aggregate-only Foundation artifact with closeout truth.

Behavioral rules:

- `Import`, `<unspecified>`, generic `Sphere`, generic `SOI`, blank, and similar placeholders are validation problems, not final attribution truth.
- Source labels not present in governed FUB rules are validation questions.
- Flagged/invalid governed rules stay visible as rule-quality context.
- Unclaimed pond context is tracked separately from agent-owned invalid sources.
- FUB/KPI cleanup writes stay outside this card.

Privacy boundary:

- The live audit can read private KPI/Supabase and AIOS FUB-rule data already approved for Foundation reads.
- Tracked plan/closeout/proof artifacts use aggregate counts only.
- Person-level samples remain local/runtime output only and are disabled in the focused closeout proof.

Gate decision: full gate. The card reads live business source data and affects Sales data-quality truth, so it needs Plan Critic, focused proof, health/repeated-failure/backlog gates, full `foundation:verify`, and `process:foundation-ship`.

Decision tree: this is not a static-only card because it reads live KPI/Supabase data and AIOS FUB source-rule truth, and it is not only a focused gate because it changes live backlog/Current Sprint/closeout truth. The correct decision-tree result is full gates: focused `process:kpi-lead-validation-check`, then System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, fanout, ship, push.

Behavior proof path: the focused proof calls real function paths in `lib/kpi-lead-validation-audit.js`: `fetchLiveKpiLeadValidationAudit()`, `buildKpiLeadValidationAudit()`, `evaluateKpiLeadValidationAudit()`, and `buildKpiLeadValidationDogfoodProof()`. Dogfood fixtures reject weak behavior by proving generic source labels, blank source, missing governed rules, flagged rules, invalid groups, and unclaimed pond context are detected through actual functions, not substring markers.

Operator value: this gives Steve and the Sales team a useful quality signal for the real workflow of reviewing fake/non-lead and source-attribution hygiene before coaching agents or applying FUB cleanup. It improves Sales data quality without forcing Steve to manually inspect KPI tables or letting AI apply risky fixes.

Speed bound: the focused proof is fast enough for default use because it reads only `users`, `stages`, active lead-stage `persons`, and AIOS FUB lead-source rules; it uses bounded Supabase pagination, does no provider/browser/extraction job work, and does not run full `foundation:verify` internally. Full verifier and ship remain closeout gates.

## Risks

- Risk: the audit creates FUB/KPI cleanup write pressure too early. Repair path: proof fails if source write methods appear; cleanup/apply workflows stay out of scope.
- Risk: tracked artifacts leak person-level data. Repair path: focused proof runs with `sampleLimit=0` and asserts aggregate-only sample output.
- Risk: generic labels get treated as final attribution because they are common. Repair path: dogfood requires Import, unspecified, Sphere, and blank-source detection.
- Risk: this drifts into appointment quality or Shopping List discipline. Repair path: `KPI-APPT-QUALITY-001` and `KPI-SHOPPING-001` stay separate, and this card only owns active lead-stage source validation.

## Tests

- `node --check lib/kpi-lead-validation-audit.js scripts/process-kpi-lead-validation-check.mjs`
- `npm run process:kpi-lead-validation-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=KPI-LEAD-VALIDATION-001 --planApprovalRef=docs/process/approvals/KPI-LEAD-VALIDATION-001.json --closeoutKey=kpi-lead-validation-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=KPI-LEAD-VALIDATION-001 --closeoutKey=kpi-lead-validation-v1`
- `npm run process:foundation-ship -- --card=KPI-LEAD-VALIDATION-001 --planApprovalRef=docs/process/approvals/KPI-LEAD-VALIDATION-001.json --closeoutKey=kpi-lead-validation-v1 --commitRef=HEAD`

## Not Next

- No KPI/FUB writes or source-system mutation.
- No FUB cleanup/apply workflow, coaching prompts, manager assignment workflow, or correction queue.
- No person-level tracked report artifacts.
- No broad KPI dashboard rebuild.
- No appointment-quality implementation; `KPI-APPT-QUALITY-001` owns appointment outcomes/stacks.
- No Shopping List discipline implementation; `KPI-SHOPPING-001` remains separate.
- No external sends, credential/key rotation, Drive permission mutation, provider calls, paid/provider access, or browser-auth work.
