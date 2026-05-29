# SOURCE-MATURITY-GAP-FOLLOWUP-001 Plan

## What

Turn the source coverage closeout rows routed to `SOURCE-MATURITY-GAP-FOLLOWUP-001` into a ranked, source-backed maturity-gap triage. V1 is triage and child-card scoping only: it groups each maturity gap by the next missing stage, creates the scoped repair queues, writes an operator report, and proves no live extraction, provider call, auth repair, paid run, model call, Drive mutation, Agent Feedback auto-send, or external write starts.

## Why

Foundation now shows source maturity and source coverage closeout truth, but non-green maturity rows are still too vague for fast overnight building. Steve needs the build machine to turn repeated source gaps into exact safe next cards without inventing source truth or waking him for auth/spend decisions. The operator value is a real workflow that improves speed and quality: Steve can wake up to a ranked maturity queue instead of another pile of vague source warnings.

## Acceptance Criteria

- `SOURCE-MATURITY-GAP-FOLLOWUP-001` has a live backlog card, complete Current Sprint metadata, Plan Critic score at or above 9.8, approval JSON, closeout key, focused proof command, and closeout registry record.
- The focused proof calls the real `buildSourceMaturityGridSnapshot`, `buildSourceExtractionCoverageSnapshot`, and `buildSourceCoverageCloseoutSnapshot` path before building the triage.
- Every source coverage closeout row with `advance_maturity_gap` and `SOURCE-MATURITY-GAP-FOLLOWUP-001` appears in the triage exactly once.
- Each triage row has source ID, next maturity gap, bucket, proposed child repair card, operator action, evidence refs when present, and a not-next boundary.
- The proof dogfoods a synthetic missing maturity row and fails closed if the triage omits it.
- Scoped child repair cards are created for atom-flow, contract, source-evidence, and routing maturity gaps without marking them executing.
- The report is written to `docs/_archive/handoffs/2026-05-29-hot-doc-refresh/2026-05-18-source-maturity-gap-followup-triage.md` and states that it is not live extraction or external write work.
- `foundation:verify` and full `process:foundation-ship` remain green.

## Definition Of Done

- `lib/source-maturity-gap-followup.js` owns the triage contract, child card definitions, synthetic dogfood, missing-row check, and report renderer.
- `scripts/process-source-maturity-gap-followup-check.mjs` handles scaffold, focused proof, Current Sprint progression, child-card scoping, and close-card behavior with explicit write flags.
- Live backlog has `SOURCE-MATURITY-GAP-FOLLOWUP-001` closed for v1 and the child repair cards scoped.
- Closeout says which buckets were created, how many live rows were routed, what proof ran, and what remains next.

## Details

Reuse existing code: `lib/source-maturity-grid.js`, `lib/source-extraction-coverage.js`, `lib/source-coverage-closeout.js`, `lib/source-contracts.js`, the existing source extraction gap follow-up proof, build-lane scaffold validators, Current Sprint overlay code, Plan Critic, and the closeout registry.

Reuse existing docs: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, source once-over handoffs, source maturity/extraction/coverage closeout plans, and the existing extraction gap triage report.

Reuse existing scripts: `scripts/process-source-maturity-grid-check.mjs`, `scripts/process-source-extraction-coverage-check.mjs`, `scripts/process-source-coverage-closeout-check.mjs`, `scripts/process-source-extraction-gap-followup-check.mjs`, backlog hygiene, `foundation:verify`, and `process:foundation-ship`.

Reuse live backlog and Current Sprint truth: the live card already exists, and this main-session approved active sprint scope explicitly requested shared Foundation files. This is not hub side work; it is Foundation source/process work with requested shared files and main session approval to commit, push, and ship when green.

Do not rebuild the source maturity model, source coverage closeout, extraction runtime, source connector matrix, Foundation UI, or backlog system. This card only converts already-routed maturity gaps into actionable repair queues.

Split plan and no-new-responsibility plan: do not add new responsibility to `scripts/foundation-verify.mjs`, `server.js`, `lib/foundation-db.js`, `public/foundation.js`, or `lib/foundation-verifier-source-once-over-progression.js`. New behavior lives in a new module, `lib/source-maturity-gap-followup.js`; the focused script is a thin wrapper/check path. The existing source once-over verifier may receive only a targeted compatibility repair so `SOURCE-COVERAGE-CLOSEOUT-001` accepts the maturity follow-up card as `scoped` or `done` after this sprint ships. Shared docs and closeout records get small append-only updates only.

File-size and artifact budgets: keep the hand-written module and focused proof under 1,500 lines each, keep the generated report under 12 KB, keep the closeout under 8 KB, and keep docs as concise append-only records. If any generated report grows beyond that budget, split the report or add an archive route before expanding it.

## Proof Plan

The focused proof must validate live DB/backlog truth, approval integrity, Plan Critic coverage, Current Sprint metadata, real source snapshot wiring, full triage coverage, child card creation, synthetic missing-gap rejection, closeout registry, report contents, and forbidden runtime tokens.

Behavior proof is through actual function paths: `buildSourceMaturityGridSnapshot`, `buildSourceExtractionCoverageSnapshot`, `buildSourceCoverageCloseoutSnapshot`, and `buildSourceMaturityGapFollowupSnapshot`. The dogfood proof uses a synthetic bad/missing maturity row and fails closed if it is omitted. Substring-only proof is rejected; source markers can support coverage checks only after the real function path and dogfood behavior pass.

Gate decision tree: static check for syntax, focused proof for source-maturity triage behavior, and full `process:foundation-ship` for protected-path ship. The blast radius touches shared Foundation process files and source docs, so full `foundation:verify` and `process:foundation-ship` are required before push. The focused proof is fast and proportional, targeting under 2 minutes, while the full ship gate remains the final protected-path proof.

## Risks

- Risk: triage becomes extraction. Mitigation: no extraction target creation, no live runs, no transcript/screenshot/crawl/model/provider calls, and no external writes.
- Risk: source maturity is marked complete from labels. Mitigation: every repair queue requires source-backed evidence and the triage does not edit maturity rows.
- Risk: too many child cards create backlog noise. Mitigation: create four bucket-level cards only, not one card per source.
- Risk: auth-required sources get pulled accidentally. Mitigation: auth/provider/paid/Drive mutation work stays blocked pending Steve approval.

## Tests

- `npm run process:source-maturity-gap-followup-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=SOURCE-MATURITY-GAP-FOLLOWUP-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-GAP-FOLLOWUP-001.json --closeoutKey=source-maturity-gap-followup-v1 --commitRef=HEAD`

## Not Next

No live extraction, extraction target creation, transcript fetch, screenshot capture, crawl, model summarization, OAuth repair, auth-required provider call, paid-source run, external write, Google Drive permission mutation, request-access email, ClickUp write, Gmail send, live Agent Feedback auto-send, Harlan, Fal, voice, Canva, OpenHuman, Marketing Hub production, broad UI redesign, or `MEETING-VAULT-ACL-001` Phase B.
