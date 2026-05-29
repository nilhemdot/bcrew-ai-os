# SOURCE-MATURITY-VERIFIED-MONITORING-GAP-REPAIR-001 Plan

## Card

`SOURCE-MATURITY-VERIFIED-MONITORING-GAP-REPAIR-001`

## What

Repair verified/readable source maturity rows that are blocked only at the monitored stage because their contracts do not state a refresh boundary.

This is a narrow source-contract posture repair. It adds explicit manual/on-demand monitoring boundaries for:

- `SRC-CLICKUP-001`
- `SRC-GDOCS-001`
- `SRC-GSHEETS-001`
- `SRC-DATAFORSEO-001`
- `SRC-GHL-001`
- `SRC-META-001`
- `SRC-SUPABASE-001`

It does not build connector runtime, extraction targets, extraction runs, or automation.

## Why

Live source maturity shows these sources have usable verified/readable contracts, but they block at `monitored` because Foundation cannot see a runtime target or explicit refresh boundary. That creates noisy false blockers and hides the next real gaps.

Useful operator behavior: Foundation should say these sources are manually/on-demand monitored today, then expose whether the next real gap is extracted evidence, atom-flow, routing, connector runtime, or approval.

This unlocks a real operator workflow for Steve and future builders: the source maturity queue stops wasting time on already-verified sources that only need an honest refresh posture, while the next actionable repair stays visible and source-backed.

## Existing Work

- Existing code reused: `lib/source-contracts.js`, `lib/source-contracts-marketing.js`, `lib/source-maturity-grid.js`, `lib/source-maturity-gap-followup.js`, `lib/source-contract-validation-layer.js`, and `lib/build-lane-failure-telemetry.js`.
- Existing docs reused: `docs/source-registry.md`, `docs/rebuild/current-state.md`, `docs/rebuild/current-plan.md`, and `docs/_archive/handoffs/2026-05-29-hot-doc-refresh/2026-05-18-source-maturity-gap-followup-triage.md`.
- Existing scripts reused: `scripts/process-source-maturity-gap-followup-check.mjs`, existing monitoring-gap repair focused scripts, `scripts/foundation-verify.mjs`, backlog hygiene, and `process:foundation-ship`.
- Live backlog and Current Sprint truth are reused through the build-lane scaffold path before `building_now`.
- `SOURCE-MATURITY-GAP-FOLLOWUP-001` scoped safe source maturity child-card repairs from live truth.
- `SOURCE-MATURITY-FUB-MONITORING-GAP-REPAIR-001`, `SOURCE-MATURITY-STRATEGY-MONITORING-GAP-REPAIR-001`, `SOURCE-MATURITY-FINANCE-MONITORING-GAP-REPAIR-001`, and Freedom Sheet monitoring repairs established the manual/on-demand monitoring pattern.
- `lib/source-maturity-grid.js` treats `updateMethod`, `refreshSchedule`, or `manualRefresh` as monitored-stage proof.
- `lib/source-contract-validation-layer.js` keeps source contracts fail-closed.
- `BUILD-LANE-FAILURE-TELEMETRY-001` exists for recurring proof/verifier failure telemetry.
- Live source maturity shows the target sources are blocked at `monitored`; `SRC-SUPABASE-001` already has source fact proof and should expose atom-flow next after monitoring clears.

## Details

- Add explicit `updateMethod`, `refreshSchedule`, and `manualRefresh` posture to each target source contract.
- Keep every boundary manual/on-demand and explicitly non-automation.
- Add focused proof that dogfoods missing monitoring boundaries and proves repaired sources advance to their next real gap.
- Prove behavior through actual function paths, not substring-only markers: `buildSourceMaturityGridSnapshot()` creates before/after source maturity rows, `selectVerifiedMonitoringRepairCandidates()` validates source contracts and registry evidence, and `evaluateVerifiedMonitoringGapRepair()` verifies the repaired state.
- No substring-only proof is accepted. Static string checks can only support artifact coverage after the behavior proof passes.
- Use black-box live source maturity behavior for the final focused check, then use static source checks only as supporting artifact coverage.
- Prove no active extraction target is introduced.
- Add live backlog/current sprint metadata, approval, closeout registry, and done-card verifier coverage.
- Use the same source maturity grid path that operator surfaces use.

## Not Next

- No live extraction, extraction target creation, transcript fetch, screenshot capture, crawl, or model/provider call.
- No auth-required provider call, OAuth repair, paid-source run, or connector live call.
- No ClickUp, GoHighLevel, Meta, DataForSEO, Supabase, Google Docs, or Google Sheets live call.
- No external write.
- No Google Drive permission mutation, request-access email, or raw Drive/Docs exposure.
- Do not mutate Drive permissions.
- No live Agent Feedback auto-send.
- Do not work `MEETING-VAULT-ACL-001` Phase B.
- No Harlan/Fal/voice/Canva/OpenHuman feature work.
- No broad Foundation UI redesign.
- Do not mark extracted, atomized, synthesized, routed, automation, connector runtime, or governed apply complete for sources without proof.

## Acceptance Criteria

- Synthetic dogfood proves verified/readable sources without monitoring boundaries fail at `monitored`.
- Synthetic dogfood proves the same sources with manual/on-demand boundaries advance to the next real gap.
- Live proof shows every target source has a green monitored stage.
- Live proof shows every target source no longer blocks at `monitored`.
- Live proof shows no active extraction target was introduced for the repaired sources.
- Live proof shows downstream gaps remain visible.
- Live backlog card exists and moves through Current Sprint with existing-work metadata, not-next boundaries, proof commands, approval ref, and closeout key.
- Closeout registry and done-card verifier coverage name this card and closeout key.

## Files

- `lib/source-contracts.js`
- `lib/source-contracts-marketing.js`
- `lib/source-maturity-verified-monitoring-gap-repair.js`
- `scripts/process-source-maturity-verified-monitoring-gap-repair-check.mjs`
- `package.json`
- `lib/foundation-build-closeout-source-records.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `docs/source-registry.md`
- `docs/rebuild/current-state.md`
- `docs/rebuild/current-plan.md`
- `docs/process/approvals/SOURCE-MATURITY-VERIFIED-MONITORING-GAP-REPAIR-001.json`
- `docs/_archive/handoffs/2026-05-29-hot-doc-refresh/2026-05-18-source-maturity-verified-monitoring-gap-repair-closeout.md`

## Risks

- False green risk: generic monitoring text could hide missing automation. Mitigation: every boundary says manual/on-demand only and forbids provider calls, extraction targets, and external writes.
- Scope drift risk: connector calls could sneak into a source maturity repair. Mitigation: focused proof and Current Sprint boundaries forbid live calls.
- Completion inflation risk: monitored repair could imply extraction, atom-flow, routing, or apply is done. Mitigation: proof requires each next real gap to remain visible.
- Process drag risk: this card could rerun full verification repeatedly while iterating. Mitigation: use focused proof first and reserve full Foundation ship gate for final ship.
- Regression repair path: if a row does not advance past `monitored`, do not weaken the grid. Repair the contract posture or leave the card blocked with exact failure.

## Tests

Focused/default tests:

- Synthetic verified/readable sources without refresh boundaries fail at `monitored`.
- Synthetic repaired sources advance to their next real gap.
- Live target sources have explicit monitoring boundaries.
- Live source maturity no longer blocks target sources at `monitored`.
- No active extraction target is introduced.
- Current Sprint metadata includes existing-work, not-next, proof commands, approval ref, and closeout key.
- Closeout registry and done-card verifier coverage include this card.

Commands:

- `node --check lib/source-maturity-verified-monitoring-gap-repair.js scripts/process-source-maturity-verified-monitoring-gap-repair-check.mjs`
- `npm run source-contract-registry:sync -- --apply --actor=codex-source-maturity-verified-monitoring-gap-repair --json`
- `npm run process:source-maturity-verified-monitoring-gap-repair-check -- --apply --stage=scoping --json`
- `npm run process:source-maturity-verified-monitoring-gap-repair-check -- --apply --stage=sprint_ready --json`
- `npm run process:source-maturity-verified-monitoring-gap-repair-check -- --apply --stage=building_now --json`
- `npm run process:source-maturity-verified-monitoring-gap-repair-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=SOURCE-MATURITY-VERIFIED-MONITORING-GAP-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-VERIFIED-MONITORING-GAP-REPAIR-001.json --closeoutKey=source-maturity-verified-monitoring-gap-repair-v1 --commitRef=HEAD`

Gate decision tree: static checks for syntax; focused proof while iterating; full `foundation:verify` once focused proof is green because the blast radius touches source-contract truth and source maturity; full `process:foundation-ship` before push.

Speed bound: the focused proof uses local source contracts, Foundation snapshot reads, and metadata checks only. It must stay fast enough to run repeatedly while iterating.

## Definition Of Done

- Target source contracts have explicit manual/on-demand monitoring posture.
- The source maturity grid clears the monitored-stage gap for every target source.
- The next real gap remains visible for every target source.
- No live connector call, provider/model call, extraction target, extraction run, external write, paid run, auth repair, Drive mutation, or Agent Feedback auto-send occurs.
- Focused proof, backlog hygiene, `foundation:verify`, and full `process:foundation-ship` pass.
