# CODE-QUALITY-AUDIT-GUARDED-MUTATOR-CLASSIFIER-001 Plan

## What
Build a narrow V1 repair for `CODE-QUALITY-AUDIT-GUARDED-MUTATOR-CLASSIFIER-001`: make the Code Quality Nightly Audit call the existing process-check readonly classifier before it reports a process-check mutator as a P0 sprint-state mutation risk.

The root invariant is: a process-check script should be red only when its live mutation path is unguarded or unclassified. A guarded, report-only, read-only, or explicitly historical process-check script is not a live state-mutation failure. Non-process mutators and unguarded process-check mutators must still stay red.

## Why
Steve asked to continue the remaining P0 audit/process queue after `BUILD-LANE-VERIFIER-SNAPSHOT-WIRING-REPAIR-001` shipped. The current audit output was noisy: protected process-check scripts created 99 P0 mutation rows, drowning out the real remaining process risks. The useful operator value is a cleaner audit priority list that speeds Foundation work without hiding true write-boundary failures.

## Acceptance Criteria
- The audit uses the existing `classifyProcessCheckSource` behavior instead of a new policy.
- A guarded process-check mutator fixture returns zero mutation findings.
- An unguarded process-check mutator fixture still returns one mutation finding.
- A non-process mutator fixture still returns one mutation finding.
- The actual no-write audit has zero protected process-check false positives and at most one remaining `PROCESS-CHECK-READONLY-MODE-001` finding.
- The actual no-write audit remains report-only: no backlog writes, no DB mutation, no auto-fixes.
- Live Backlog, Current Sprint, Plan Critic, closeout registry, focused proof, `foundation:verify`, and `process:foundation-ship` all pass for this card.

## Definition Of Done
- `lib/code-quality-nightly-audit.js` routes process-check mutator detections through `classifyProcessCheckSource`.
- Focused proof calls the actual detector and audit function path; substring-only proof is rejected.
- The live backlog card and Current Sprint item exist with approval, closeout key, proof commands, existing-work check, and not-next boundaries.
- The closeout document and closeout registry row exist under `code-quality-audit-guarded-mutator-classifier-v1`.
- Proof commands pass:
  - `node --check lib/code-quality-nightly-audit.js lib/code-quality-audit-guarded-mutator-classifier.js scripts/process-code-quality-audit-guarded-mutator-classifier-check.mjs`
  - `npm run process:code-quality-audit-guarded-mutator-classifier-check -- --close-card --json`
  - `npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch`
  - `npm run backlog:hygiene -- --json`
  - `npm run foundation:verify -- --json-summary`
  - `npm run process:ship-check -- --card=CODE-QUALITY-AUDIT-GUARDED-MUTATOR-CLASSIFIER-001 --planApprovalRef=docs/process/approvals/CODE-QUALITY-AUDIT-GUARDED-MUTATOR-CLASSIFIER-001.json --closeoutKey=code-quality-audit-guarded-mutator-classifier-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
  - `npm run process:fanout-check -- --card=CODE-QUALITY-AUDIT-GUARDED-MUTATOR-CLASSIFIER-001 --closeoutKey=code-quality-audit-guarded-mutator-classifier-v1`
  - `npm run process:foundation-ship -- --card=CODE-QUALITY-AUDIT-GUARDED-MUTATOR-CLASSIFIER-001 --planApprovalRef=docs/process/approvals/CODE-QUALITY-AUDIT-GUARDED-MUTATOR-CLASSIFIER-001.json --closeoutKey=code-quality-audit-guarded-mutator-classifier-v1 --commitRef=HEAD`

## Details
Reuse existing code, existing docs, existing scripts, live backlog, and Current Sprint truth:

- Existing code: `lib/code-quality-nightly-audit.js`, `lib/process-check-readonly-mode.js`, `lib/process-write-guard.js`, and `lib/process-plan-critic.js`.
- Existing docs: the May 13 Code Quality Nightly Audit closeout plus the May 15 process-check readonly and historical-mode closeouts.
- Existing scripts: `process:code-quality-nightly-audit-check`, `process:process-check-readonly-mode-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.
- Existing policy: audit jobs are report-only; process checks are read-only by default; live writes require explicit posture.

The focused proof uses real function behavior: `detectMutationPatternsInText`, `classifyProcessCheckSource`, `buildSyntheticCodeQualityNightlyAuditProof`, and `buildCodeQualityNightlyAudit({ skipEndpointFetch: true })`. It rejects substring-only proof by requiring synthetic guarded/unguarded/non-process behavior and by checking the actual audit summary.

Architecture and shared-file coordination:

- This is direct main-session Foundation work approved by Steve in the active builder lane, not side work, hub work, a separate chat, or a hidden worker. Main-session approved coordination owns the shared files for this card before build, commit, push, merge, and ship.
- Requested shared files are declared in this plan: `package.json`, `scripts/process-code-quality-audit-guarded-mutator-classifier-check.mjs`, `docs/process/code-quality-audit-guarded-mutator-classifier-001-plan.md`, `docs/process/approvals/CODE-QUALITY-AUDIT-GUARDED-MUTATOR-CLASSIFIER-001.json`, `lib/foundation-verify-coverage-card-ids.js`, and `lib/foundation-build-closeout-control-plane-records.js`.
- `lib/foundation-build-closeout-control-plane-records.js` is above the preferred hand-written module budget, so this card adds one closeout record only, with no new responsibility, no new behavior, and no additional registry framework in that file. Split plan if it grows again: move code-quality audit closeout rows into a dedicated control-plane audit closeout module and import it from `lib/foundation-build-closeout-records.js`.
- `lib/foundation-verify-coverage-card-ids.js` gets one coverage constant only, with no new verifier behavior.
- Explicit file-size budget: the new proof module stays under 300 lines, the focused process script stays under 500 lines, the approval JSON data record stays under 80 lines, and the handoff report artifact stays under 80 lines.

Not Next:

- Do not auto-fix remaining audit findings in this card.
- Do not demote real unguarded mutators.
- Do not weaken process-check readonly mode.
- Do not run live extraction, auth-required or paid jobs, provider/model probes, external writes, Drive permission mutation, Gmail/ClickUp sends, or Agent Feedback auto-send.
- Do not work MEETING-VAULT-ACL-001 Phase B.
- Do not build Harlan/Fal/voice/Canva/OpenHuman feature work.
- Do not spawn hidden subagents.

## Risks
The main risk is a symptom patch that simply suppresses P0 rows. The repair path is fail closed: if dogfood shows a non-process mutator or unguarded process-check mutator no longer fails, revert or reopen this card before shipping. If the real no-write audit changes because repo truth moved, update the threshold only with evidence from the audit summary and keep the real remaining P0s visible.

This touches a full-risk Foundation audit path, so the gate decision is full: static `node --check`, focused proof, code-quality no-write proof, backlog hygiene, full `foundation:verify`, and `process:foundation-ship`. The focused proof is fast and bounded, under 2 minutes without endpoint fetch, so builders can use it before the heavier gates.

## Tests
Run the proof commands listed in Definition Of Done. The card is not accepted until the focused proof, no-write audit, backlog hygiene, full verifier, and ship gate pass.
