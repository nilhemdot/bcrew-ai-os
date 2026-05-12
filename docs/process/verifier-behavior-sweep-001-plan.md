# VERIFIER-BEHAVIOR-SWEEP-001 Plan

Status: approved for v1 under `verifier-behavior-sweep-v1`
Card: `VERIFIER-BEHAVIOR-SWEEP-001`
Date: 2026-05-12

## What

Add a focused behavior sweep for the highest-risk Foundation verifier closeouts.

V1 does not rewrite every `foundation:verify` assertion. It creates a top-P0 behavior registry and proof that calls the actual function, synthetic behavior, or focused process path behind each selected closeout. Text markers can support context, but a target cannot pass this sweep only because a status note or source string exists.

## Why

The audit consensus was that Foundation is drifting toward process proof over product behavior. The canonical verifier has many useful checks, but too many critical closeouts can still look healthy because the right words are present in docs, status notes, or source files.

The operator value is safer speed: Steve can keep building while the riskiest P0 claims are protected by behavior proof instead of weekly manual audit pressure.

## Acceptance Criteria

- `lib/verifier-behavior-sweep.js` defines a top-P0 behavior target registry for at least 10 closeouts.
- Each target records the card ID, closeout key, proof command or script, behavior claim, actual proof symbols, and whether it is direct behavior proof, synthetic behavior proof, or focused process proof.
- `buildSyntheticVerifierBehaviorSweepProof` calls real proof paths for the selected targets; it does not accept substring-only or string-match proof as closeout.
- V1 covers security behavior, proportional verification, Plan Critic, Current Sprint command truth, Meeting Vault ACL, Meeting Vault auto-enforcement, Drive preflight, extraction hardening, synthesis verification, runtime process control, Foundation readiness, and source lifecycle completion.
- The synthesis target proves verified records pass and unverified decision-grade records are rejected through `verifySynthesizedRecord`, `requireVerifiedSynthesisRecord`, and `filterVerifiedSynthesisRecords`.
- The runtime target proves stop/decommission/restart-on-push decisions through `buildStopDecision`, `buildDecommissionDecision`, and `buildServiceRestartOnPushStatus`.
- `scripts/process-verifier-behavior-sweep-check.mjs` validates the 9.8 approval, dogfoods Plan Critic against this plan, runs the sweep, checks live backlog/current sprint state, and emits `VERIFIER_BEHAVIOR_SWEEP_SUMMARY`.
- Current Sprint moves `VERIFIER-BEHAVIOR-SWEEP-001` to Done This Sprint and advances the active blocker to `STRATEGY-HUB-MEETING-READY-001`.
- Current plan, current state, Recent Work, package scripts, and `foundation:verify` all name `verifier-behavior-sweep-v1`.

## Definition Of Done

- The sweep fails if any selected target loses its behavior proof path.
- The sweep fails if a target is registered as substring-only proof.
- The sweep fails if fewer than 10 top-P0 targets are behavior-covered.
- The focused proof is fast enough to run before product work.
- The card is closed in the live backlog with proof commands and closeout trail.

## Details

Reuse existing work:

- `lib/process-verify-gate-tiering.js` for proportional gate behavior.
- `lib/process-plan-critic.js` for pre-build scoring behavior.
- `lib/security-behavior-proof.js` for route and subject-person security behavior.
- `lib/foundation-current-sprint.js` for Current Sprint command-truth behavior.
- `lib/meeting-vault-acl.js` and `lib/meeting-vault-auto-enforcement.js` for Meeting Vault proof behavior.
- `lib/drive-access-preflight.js` for dry-run Drive preflight behavior.
- `lib/extraction-run-hardening.js` for retry/backoff/ledger behavior.
- `lib/synthesis-claim-verification.js` for verified synthesis record behavior.
- `lib/runtime-process-control.js` for stop/decommission/restart decisions.
- `lib/foundation-readiness-gates.js` for Foundation readiness behavior.
- `lib/source-lifecycle-completion.js` for terminal source lifecycle behavior.
- `scripts/foundation-verify.mjs` remains the canonical verifier.
- Live Backlog and Current Sprint remain task truth.

Gate decision for this card: full.

Reason: this card changes the canonical verifier, live backlog seed, Current Sprint, package scripts, build log, and process proof code. The focused sweep must be fast, but closeout still needs the full Foundation ship gate because the blast radius includes verifier behavior and Foundation command truth.

Behavior proof shape:

- Target registry rows are data, not claims of done by themselves.
- Every selected target must map to callable proof behavior, a focused process script, and a closeout key.
- Synthesis and runtime get direct synthetic behavior cases because their prior verifier risk was text-marker heavy.
- Foundation readiness gets a synthetic readiness round trip with all required gates closed and a failing variant with a missing closeout.
- Source lifecycle gets a synthetic terminal-source round trip with 35 source contracts and 12 approved targets.
- Substring-only proof is rejected for this card; a weak proof that only says `currentState.includes('verifier-behavior-sweep-v1')` is rejected because it does not call real behavior.

## Risks

- Risk: the card becomes an over-broad rewrite of the whole verifier.
  - Repair path: V1 is a bounded top-P0 registry. Remaining weak checks become follow-up work only after Strategy product proof resumes.
- Risk: the sweep becomes another process artifact.
  - Repair path: proof target rows must call actual functions or focused process paths and fail if behavior regresses.
- Risk: the new proof slows the sprint.
  - Repair path: keep the focused proof small and run the full ship gate only at closeout or full-risk changes.
- Risk: a selected target has no good behavior path.
  - Repair path: mark it as unsupported and reopen or rescope that target instead of pretending status-note text is enough.

## Tests

```bash
npm run process:verifier-behavior-sweep-check -- --json=true
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=VERIFIER-BEHAVIOR-SWEEP-001 --planApprovalRef=docs/process/approvals/VERIFIER-BEHAVIOR-SWEEP-001.json --closeoutKey=verifier-behavior-sweep-v1 --commitRef=HEAD
```

The focused proof must call behavior, not markers:

- `buildSyntheticVerifierBehaviorSweepProof`
- `buildSyntheticVerifyGateTieringProof`
- `buildSyntheticPlanCriticProof`
- `buildSyntheticSecurityBehaviorProof`
- `buildSyntheticFoundationCurrentSprintProof`
- `buildSyntheticMeetingVaultAclProof`
- `buildSyntheticMeetingVaultAutoEnforcementProof`
- `buildSyntheticDriveAccessPreflightProof`
- `buildSyntheticExtractionRunHardeningProof`
- `verifySynthesizedRecord`
- `buildStopDecision`
- `buildFoundationReadinessStatus`
- `buildSourceLifecycleCompletionStatus`

## Not Next

- Do not rewrite every verifier check in this card.
- Do not build Strategy Hub meeting-ready UI in this card.
- Do not start avatar import, Telegram bots, Directors, Marketing pipeline, or broad old-system parity work.
- Do not open shared communications or Strategy routes to non-Tier-1 users.
- Do not mutate Google Drive permissions or restart Meeting Vault historical cleanup.
