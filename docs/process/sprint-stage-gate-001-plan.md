# SPRINT-STAGE-GATE-001 Plan

## What

Enforce Current Sprint stage transitions so cards cannot move to Sprint Ready, Building Now, or Done This Sprint without the required doctrine, Plan Critic row, proof, and closeout state for that stage.

## Why

The dashboard showed six real shipped Connector/Routing cards with Doctrine missing because they skipped the visible stage journey. The operator value is mechanical protection: Steve should not need to catch process skips by eye.

## Acceptance Criteria

- `SPRINT-STAGE-GATE-001` gets a Plan Critic pass score at or above 9.8; revise blocks Sprint Ready.
- Sprint Ready requires complete `existing_work_check` doctrine and a passing `plan_critic_runs` row for the card.
- Building Now requires Sprint Ready prerequisites and no conflicting active Building Now card unless explicitly allowed.
- Done This Sprint requires a valid Recent Work closeout/build proof for the card.
- Returned requires a returned reason.
- The proof command `npm run process:sprint-stage-gate-check -- --json` dogfoods the gate and rejects the original six-card Connector/Routing skipped state.
- The proof command accepts the repaired after-action Connector/Routing state.
- The proof calls actual validation functions and DB-shaped sprint payloads, and rejects substring-only marker proof.

## Definition Of Done

- Stage validation is reusable from code, not only embedded in a one-off script.
- Current Sprint API reports risk when stage prerequisites are missing.
- Future transition helpers fail closed on missing doctrine, missing Plan Critic, missing returned reason, or missing closeout.
- The original skip pattern would be blocked before sprint exit.

## Details

Reuse existing code in `lib/foundation-current-sprint.js`, `lib/foundation-db.js`, and `scripts/process-repair-verifier-sprint-check.mjs`. Reuse existing docs in `docs/process/foundation-sprint-system-001-plan.md`, `docs/process/connector-routing-truth-process-repair.md`, and the control-plane sprint handoff. Reuse existing scripts, live backlog truth, Current Sprint overlay behavior, and Plan Critic run logs. Reuse the existing Connector/Routing repaired state as the accepted fixture and create a synthetic original-skipped fixture for rejection.

The root invariant is: a sprint stage is valid only when the artifacts the stage claims are present. The behavior proof uses actual function paths over DB-shaped items, includes a DB/API-shaped round-trip, and rejects weak substring-only proof. Gate decision tree: static, focused, or full is chosen by blast radius; this card changes Foundation stage-gate substrate, so use a focused process proof first and full `process:foundation-ship` / `foundation:verify` for the shipping gate.

This unlocks a real workflow for Steve and future operators: speed with quality because stage movement becomes mechanical, not a chat reminder. The V1 is thin and proportional: validate stage transitions and dogfood the known bad state, not build a broad project manager.

## Risks

- Risk: stage validation becomes too strict for legitimate Scoping. Mitigation: Scoping may be incomplete by design; enforcement begins at Sprint Ready and later stages.
- Risk: after-action repairs are incorrectly treated as fake history. Mitigation: accept repaired state only when metadata marks after-action repair and doctrine exists.
- Risk: future builders bypass helpers with direct SQL. Mitigation: add verifier/process proof that invalid live states surface risk.
- Repair path: fail closed, revise the card, reopen `SPRINT-STAGE-GATE-001`, or return the active sprint card if the dogfood proof fails.

## Tests

- `npm run process:sprint-stage-gate-check -- --json`
- Dogfood skipped-state rejection
- Dogfood repaired-state acceptance
- `/api/foundation/current-sprint` risk readback for invalid fixture where possible
- `npm run process:foundation-ship -- --card=SPRINT-STAGE-GATE-001 --planApprovalRef=docs/process/approvals/SPRINT-STAGE-GATE-001.json --closeoutKey=sprint-stage-gate-v1 --commitRef=HEAD`

## Not Next

Do not build a broad project manager, Scrum bot, UI redesign, Reply/Watching Loop, source ingestion, MEETING-VAULT-ACL-001 Phase B, Drive permissions mutation, request-access emails, or autonomous sprint rollover.
