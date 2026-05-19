# System Health Red-To-Green Closeout

Date: 2026-05-17
Queue card: `SYSTEM-HEALTH-RED-TO-GREEN-001`
Gate card used: `SYSTEM-HEALTH-NIGHTLY-AUDIT-001`
Closeout key used: `system-health-nightly-audit-v1`
Status: shipped and pushed on clean Foundation branch

## Outcome

System health is green without rerunning the live Agent Feedback auto-send job.

- `docs/handoffs/system-health-2026-05-17.md`: `healthy`
- Risk findings: 0
- Watch findings: 0
- Scheduled job red/yellow: 0/0
- Connector down/degraded/blocked: 0/0/0
- Endpoint risk/review: 0/0
- Doc/report bloat risk/review: 0/0

## Agent Feedback Auto-Send Readiness

Failed run investigated:

- Job key: `agent-feedback-auto-send-readiness`
- Run ID: `job-agent-feedback-auto-send-readiness-20260517123043-di6mcq`
- Started: `2026-05-17T12:30:43.025Z`
- Failed: `2026-05-17T12:41:25.825Z`
- Failure: `Marked failed by stale active-run reaper.`
- Command on failed run: `npm run agent-feedback:auto-send -- --mode=live --includeCandidates=false`

The failed job was not blindly rerun. `AGENT_FEEDBACK_AUTO_SEND_ENABLED=true` means the live command can send Gmail and write ClickUp Requested, so repair used metadata-only reconciliation.

Root cause: the production auto-send side effect completed, but the governed job runner did not record completion before the stale active-run reaper marked the active DB row failed. The child process was no longer running by investigation time.

Production send ledger evidence for logical run `agent-feedback-production-autosend-20260517123043`:

- Attempt count: 1
- Latest attempt status: `clickup_requested`
- Gmail send succeeded: true
- ClickUp Requested written: true
- Resend allowed: false
- Open `sending` attempts: 0
- Gmail-without-ClickUp attempts: 0
- Private leak flags: 0

Safe report proof:

- Command: `npm run agent-feedback:auto-send -- --mode=report --includeCandidates=false`
- Would-send count: 0
- Repair count: 0
- Report Gmail sends: 0
- Report ClickUp Requested writes: 0

The repair wrote only sanitized reconciliation metadata back to the failed `foundation_job_runs` row. The run status remains `failed`; health code treats it as `reconciled`, not hidden green.

Recorded reconciliation metadata:

- `status`: `reconciled_no_open_side_effects`
- `repairSentGmail`: false
- `repairWroteClickUp`: false
- `hiddenGreen`: false
- `attemptCount`: 1
- `completedExternalWriteCount`: 1
- `clickUpRequestedCount`: 1
- `openSendingCount`: 0
- `resendAllowedCount`: 0
- `gmailSucceededWithoutClickUpCount`: 0
- `privateLeakCount`: 0
- `wouldSendCount`: 0
- `repairCount`: 0

## Code Changes

- Added `lib/agent-feedback-auto-send-reconciliation.js` as a pure reconciliation gate for this exact stale-reaped external-write failure class.
- Added DB-store accessors for production auto-send attempts and exposed them through `lib/foundation-db.js`.
- Updated Agent Feedback production enablement and verifier checks to accept a reconciled failed job only when the evidence proves no open side effects and no resend path.
- Updated system-health scheduled-job classification to surface `latestRunHealthStatus: reconciled` and keep the failed run visible.
- Updated connector uptime classification so reconciled external-write failures no longer degrade ClickUp connector health while still exposing the reconciliation state.
- Updated Agent Onboarding Feedback proof to hydrate full backlog card details from DB and rely on the production send ledger when review queues have already cleared old due items.
- Updated Foundation verify health repair proof to fall back to durable build closeout registry when the API payload omits older closeout entries.

## Focused Proof

- `node --check` passed for all changed JS modules.
- `npm run process:agent-feedback-production-autosend-enable-check` passed and reports `lastRunHealthStatus: reconciled`.
- `npm run process:agent-feedback-auto-send-check` passed without sending.
- `npm run process:agent-onboarding-feedback-system-check` passed.
- `npm run process:foundation-verify-health-repair-check` passed.
- `npm run process:foundation-operating-reliability-check -- --json` passed with connector status counts healthy 6, degraded 0.
- `npm run process:system-health-nightly-audit-check -- --json --write-report` passed and regenerated the May 17 health report as healthy.
- `npm run backlog:hygiene -- --json` passed with 0 findings.
- `npm run foundation:verify` passed `443/443`.
- `npm run process:foundation-ship -- --card=SYSTEM-HEALTH-NIGHTLY-AUDIT-001 --planApprovalRef=docs/process/approvals/SYSTEM-HEALTH-NIGHTLY-AUDIT-001.json --closeoutKey=system-health-nightly-audit-v1 --commitRef=HEAD` passed on the clean Foundation branch.

## Dogfood

The reconciliation fixtures reject:

- a stale-reaped auto-send failure with no send attempt evidence
- an open `sending` attempt
- a Gmail-succeeded attempt without ClickUp Requested written
- a resend-allowed attempt
- report proof with `wouldSendCount > 0`
- report proof with `repairCount > 0`
- leaked private output flags
- unrelated generic failed job runs

System health dogfood still proves:

- failed latest runs remain red unless they carry valid external-write reconciliation metadata
- stale active runs remain red
- fresh active runs remain yellow watch
- overdue missing runs remain red

## Capability Gate Scope

Scoped but not built: `FOUNDATION-UP-CAPABILITY-GATE-001`.

Proposed rule: no durable agent, hub, or tool capability can ship agent-down. Foundation owns the underlying capability first; agents consume it second.

Likely inputs:

- capability registry or source contract row for the Foundation capability
- system-health and scheduled-job health for the capability owner
- connector/source health for required external systems
- closeout evidence for explicit operator-blocked exceptions

Required acceptance proof:

- A downstream agent/tool closeout fails when its required Foundation capability is red or missing.
- The same closeout passes only when the Foundation capability is healthy, accepted as watch with an owner/action/date, or explicitly operator-blocked with owner/action/approval.
- Harlan, Fal, voice, hub, and feature work consume the gate but do not define the gate.

Build note: this belongs after the current system-health closeout unless it fits as a narrow Foundation verifier/source-health extension. Do not bury it in a feature surface.

## Push Status

`main` already had unrelated local Harlan/Fal work (`739c37d Add Harlan voice and Fal image tools`), so this sprint did not push `main`.

Foundation-only push route:

- Branch: `foundation/system-health-red-to-green-001`
- Base: `origin/main`
- Commit: branch `HEAD` / `Reconcile Agent Feedback auto-send readiness`
- Remote: `origin/foundation/system-health-red-to-green-001`

The local `main` branch still contains the unrelated Harlan/Fal commit and should remain unpushed until Steve explicitly approves that separate work.
