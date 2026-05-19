# FOUNDATION-LESSONS-LEARNED-LOOP-001 Plan

## What

Build the Foundation lessons-learned loop.

V1 adds a read-only scheduled process check that evaluates nightly audit signals, System Health, repeated-failure telemetry, recent job failures, live Current Sprint truth, and local/private conversation memory metadata. Every lesson must route to behavior-changing action. Documentation-only lessons fail.

## Why

The May 19 recovery showed the system could surface failures without forcing repair: repeated failures were visible, false-green health was possible, active blocker truth drifted, and role boundaries blurred. That burned time because Steve had to notice the same patterns manually.

The system needs to learn from those patterns every night and every closeout. The useful output is not another report. The useful output is repair motion: a live/scoped card, verifier rule, Plan Critic rule, Current Sprint gate, durable doctrine, approval-required exception, or explicit no-op with proof.

## Acceptance Criteria

- `lib/foundation-lessons-learned-loop.js` owns reusable lesson action evaluation.
- A lesson with `documented_only`, `note_only`, `report_only`, or handoff-only output fails.
- Repeated failure, workflow failure, raw-health, and false-green lessons must route to a repair/card/gate/verifier action.
- Private conversation and local memory review stays `local_private_metadata_only`.
- Private chat/memory lessons cannot carry raw transcript excerpts and cannot use external model/provider upload without explicit Steve approval.
- `foundation-lessons-learned-loop` is registered as a scheduled read-only Foundation job after System Health.
- If closeout proof exposes a raw workflow failure, a tiny support fix may be included only to repair that exact failure mode before progression.
- The focused proof dogfoods documented-only failure, repeated-failure repair routing, private external-model rejection, role-boundary doctrine, and closeout metadata verifier routing.
- Current Sprint advances to `FOUNDATION-BACKLOG-P0-REALITY-CLEANUP-001` after closeout.

## Definition Of Done

- `process:foundation-lessons-learned-loop-check` passes with `--apply --close-card --json`.
- System Health remains healthy. The only non-strict case is the scheduled lessons job checking System Health while its own governed run is in progress; that self-run transition may pass only for `foundation-lessons-learned-loop` and only outside closeout/apply mode. Closeout remains strict.
- Repeated-failure gate remains healthy.
- The scheduled job has `runtimeMode=scheduled`, `mutationPosture=read_only`, and `scheduleLocalTime=05:45`.
- AGENTS durable doctrine captures repeated-failure repair trigger, lessons-not-done-by-docs, and lane-ownership boundaries.
- The closeout registry exposes `foundation-lessons-learned-loop-v1`.
- Verifier coverage includes `FOUNDATION-LESSONS-LEARNED-LOOP-001`.
- Backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass before push.

## Details

The loop evaluates lessons into one of these accepted output types:

- `active_repair_blocker`
- `existing_live_backlog_card`
- `new_scoped_backlog_card`
- `verifier_rule`
- `plan_critic_rule`
- `current_sprint_gate`
- `durable_doctrine`
- `approval_required_exception`
- `no_op_with_proof`

Root invariant: a lesson is not complete until it changes future behavior or proves no action is required. A note, handoff, report row, or memory entry is only a source signal.

The scheduled job is read-only. It can fail and become a Foundation Builder blocker, but it does not mutate backlog, Current Sprint, code, docs, source systems, providers, or external systems. Mutating closeout for this card happens only through the focused script with explicit `--apply --close-card`.

Local/private conversation review is metadata-only. The loop can identify approved signal categories from local memory files, but it does not copy private text into repo docs and does not call an external model.

## Reuse Existing Work

Reuse existing code:

- `lib/foundation-system-health.js`
- `lib/connector-uptime-monitor.js`
- `lib/foundation-jobs.js`
- `scripts/sync-missive-archive.mjs`
- `scripts/extract-drive-content.mjs`
- `lib/foundation-shared-comms-store.js`
- `lib/foundation-job-mutation-allowlist.js`
- `lib/hub-read-routes.js`
- `lib/audit-finding-to-backlog-router.js`
- `lib/foundation-db.js`
- `lib/process-plan-critic.js`

Reuse existing docs:

- `docs/process/builder-lesson-linker-001-plan.md`
- `docs/process/recurring-deep-audit-001-plan.md`
- `docs/process/foundation-health-green-lock-001-plan.md`
- `AGENTS.md`
- live Current Sprint truth
- live backlog truth

Reuse existing scripts:

- `scripts/process-system-health-nightly-audit-check.mjs`
- `scripts/process-build-lane-repeated-failure-action-gate-check.mjs`
- `scripts/process-audit-finding-to-backlog-router-check.mjs`
- `scripts/process-foundation-ship.mjs`

## Behavioral Proof

The focused proof uses function paths, live checks, and synthetic dogfood.

Dogfood cases:

- A repeated-failure lesson routed to `BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001` passes.
- A documented-only lesson fails.
- A private conversation lesson that tries external model use fails.
- A role-boundary lesson routed to `AGENTS.md` durable doctrine passes without raw transcript text.
- A repeated closeout metadata lesson routed to `process:foundation-ship` verifier/ship proof passes.

Live proof checks:

- `process:system-health-nightly-audit-check -- --json`
- `process:build-lane-repeated-failure-action-gate-check -- --json`
- live `foundation_job_runs` snapshot
- live Backlog IDs
- live Current Sprint IDs and active blocker
- local memory files for metadata-only signal categories

The scheduled job dogfoods one self-health edge case: a read-only scheduled proof cannot require System Health to ignore every running job, but it also cannot create false green. The focused proof allows only its own in-progress `foundation-lessons-learned-loop` scheduled/runtime row during the governed job run. Any other raw health row, and every `--apply --close-card` closeout run, stays strict.

The first closeout run exposed a real raw health blocker: `missive-current-day` had one per-item Postgres deadlock and the runner marked the scheduled sync failed. The support fix is deliberately narrow: `scripts/sync-missive-archive.mjs` now retries transient per-item archive failures through the existing Foundation gate retry classifier and records retry metadata in the extraction summary. This is not source/extract feature expansion.

The same closeout cycle exposed another raw health blocker: `drive-content-extract-bite` failed because extracted Drive text contained Postgres-incompatible NUL bytes. The support fix is deliberately narrow: Drive content strips NUL bytes before hashing/storing, and the shared communication artifact store sanitizes text/json payloads at the write boundary. This is not broad Drive extraction expansion.

The lessons loop itself is scheduled, so it also needs an explicit mutation allowlist row. The row is read-only and states that closeout/backlog writes require explicit `--apply` outside the scheduler.

The full diagnostics route also drifted slightly over its payload budget during closeout. The support fix is deliberately narrow: full diagnostics backlog rows retain verifier-needed status/closeout fields but trim nonessential `createdAt`/`updatedAt` timestamps and point detailed card reads at the backlog detail route.

## Risks

- Risk: the loop becomes another report-only artifact.
  - Mitigation: documented-only action types fail dogfood and live evaluation.
- Risk: private conversation review leaks raw chat text.
  - Mitigation: private sources must be metadata-only, no raw excerpts, and no external model use.
- Risk: the scheduled job mutates backlog or sprint truth.
  - Mitigation: scheduled job has no write flags and is registered read-only; closeout writes require explicit `--apply --close-card`.
- Risk: the loop becomes autonomous feature work.
  - Mitigation: V1 only evaluates and routes lessons; implementation stays with named Foundation cards.

## Tests

- `node --check lib/foundation-lessons-learned-loop.js lib/foundation-jobs.js scripts/sync-missive-archive.mjs scripts/extract-drive-content.mjs lib/foundation-shared-comms-store.js lib/foundation-job-mutation-allowlist.js lib/hub-read-routes.js scripts/process-foundation-lessons-learned-loop-check.mjs`
- `npm run process:foundation-lessons-learned-loop-check -- --apply --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=FOUNDATION-LESSONS-LEARNED-LOOP-001 --planApprovalRef=docs/process/approvals/FOUNDATION-LESSONS-LEARNED-LOOP-001.json --closeoutKey=foundation-lessons-learned-loop-v1 --commitRef=HEAD`

Gate decision tree: static-only proof is insufficient because this card changes scheduled job truth, live Current Sprint progression, backlog card closeout, durable doctrine, verifier coverage, and ship/closeout registries. The focused gate is `process:foundation-lessons-learned-loop-check`, which proves the lesson-action invariant and privacy boundary through real function paths and dogfood. The full gate is required before push because the blast radius includes Foundation process truth; it includes `foundation:verify`, `process:ship-check`, `process:fanout-check`, and `process:foundation-ship`.

## Operator Value

Steve gets a Foundation system that learns from repeated waste without needing him to babysit every morning. If the same class of failure repeats, or a builder pattern creates process debt, the loop either routes it to repair or fails the Foundation lane until someone fixes the behavior.

## Speed And File-Size Budget

The focused proof is designed to stay under 2 minutes. It reads existing summaries and local metadata instead of running a deep audit or model review. It does not add logic to `scripts/foundation-verify.mjs`.

## Rollback Or Repair Path

If the scheduled loop creates noisy failures, keep the card open and adjust signal thresholds or action routing. If private metadata handling is wrong, disable memory-signal loading first and keep System Health/repeated-failure/job-run evaluation. If closeout fails, repair the focused script before moving to P0 backlog cleanup.

## Not Next

- Do not start Value Builder split.
- Do not run source/extract/value/agent feature work from this card.
- Do not upload private conversation logs or local memory to external providers.
- Do not mutate Drive permissions, send emails, rotate provider keys, or run paid/provider/model calls.
- Do not auto-implement lesson output from scheduled runs.
