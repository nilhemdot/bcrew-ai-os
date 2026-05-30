# SOURCE-020 Plan

## What

Close `SOURCE-020` as the shared communications source adapter hardening proof.

This card proves that the adapter layer supporting Gmail, Missive, Slack, Google Drive meeting notes/transcripts, calendar-adjacent reads, and Gmail attachments is stable enough for the next source trust layer.

It does not run live private source reruns, broad backfill, browser login, provider/model calls, external writes, Drive permission mutation, credential mutation, or raw content output.

## Why

`SOURCE-019` proved the shared communications archive, candidate, synthesis-control, and action-route layer. That layer depends on stable adapters underneath it.

The fastest credible path is not a blank-sheet connector rebuild. The current repo already has the working Google delegated readers, Missive bridge, Slack bridge, meeting note archive path, and email attachment path. This card hardens that truth by making the adapter contract explicit and behavior-proven.

## Acceptance Criteria

- Proves Google delegated adapter coverage for:
  - Drive search/list/export
  - Gmail list/thread/attachment reads
  - Calendar event reads
  - pagination signals
- Proves Missive adapter coverage for:
  - health
  - inbox/search/conversation
  - messages
  - comments
  - merged thread reads
- Proves Slack adapter coverage for:
  - health
  - channel list
  - paginated channel history
  - thread replies
  - permalinks
- Proves sync/extraction scripts are archive-backed and do not call known mutation APIs.
- Proves active shared communications targets are latest-successful.
- Proves required artifact lanes are populated:
  - Gmail threads
  - Gmail attachments
  - Missive threads
  - Slack threads
  - meeting notes
  - meeting transcripts
- Dogfoods failure cases:
  - missing adapter function
  - unsafe sync mutation token
  - failed active target
  - missing artifact lane
- Current Sprint marks `SOURCE-020` done and advances to `DATA-002`.

## Definition Of Done

- `process:source-020-check` passes with `--close-card --json`.
- System Health remains healthy.
- Repeated-failure gate remains healthy.
- Backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass.
- The closeout registry exposes `source-020-shared-comms-adapters-v1`.
- Main is clean and pushed.

## Details

The card adds:

- `lib/source-020-shared-comms-adapters.js`
- `scripts/process-source-020-check.mjs`
- `docs/process/source-020-shared-comms-adapters-plan.md`
- `docs/process/approvals/SOURCE-020.json`
- `docs/_archive/handoffs/2026-05-19-source-020-shared-comms-adapters-closeout.md`

The focused proof reads local code and bounded DB summaries from:

- `lib/google-delegated.js`
- `lib/missive.js`
- `lib/slack.js`
- shared communications sync/extraction scripts
- `source_crawl_targets`
- `shared_communication_artifacts`

It proves the adapter contract, not raw source contents.

## Reuse Existing Work

Existing code to reuse:

- `lib/google-delegated.js`
- `lib/missive.js`
- `lib/slack.js`
- `scripts/sync-gmail-archive.mjs`
- `scripts/sync-missive-archive.mjs`
- `scripts/sync-slack-archive.mjs`
- `scripts/sync-meeting-notes-archive.mjs`
- `scripts/extract-email-attachments.mjs`
- Current Sprint helpers
- Foundation verifier and ship gates

Existing docs to reuse:

- `docs/source-notes/shared-communications.md`
- `docs/process/source-019-shared-comms-layer-plan.md`
- `docs/_archive/handoffs/2026-05-19-source-019-shared-comms-layer-closeout.md`

Existing backlog to reuse:

- previous card `SOURCE-019`
- active card `SOURCE-020`
- next card `DATA-002`

## Operator Value

Steve gets confidence that shared communications intelligence is not balanced on brittle connector assumptions.

The proof answers:

- Are the actual reader functions present?
- Do the paginated readers exist where the source can page?
- Are the scheduled targets latest-successful?
- Are the archive lanes populated?
- Are sync scripts free of known mutation calls?
- Is `DATA-002` safe to start on top of this?

## Not Next

- no `MEETING-VAULT-ACL-001` Phase B, broad meeting-vault cleanup, or Drive permissions mutation
- no live private source reruns, broad backfill, browser login, paid/provider access, credential mutation, external sends, or public exposure
- no automatic backlog, atom, KB, synthesis, action-route, vector, ClickUp, CRM, or external writes from adapter content
- no raw email, Slack, Missive, meeting note, meeting transcript, or attachment content in proof output

Behavior proof:

- `buildSource020AdapterHardeningSnapshot()` must inspect the real adapter/source files and local target/artifact truth.
- `buildSource020DogfoodProof()` must recreate and reject missing functions, mutation tokens, failed active targets, and missing artifact lanes.
- Current Sprint proof must show `SOURCE-020` done and `DATA-002` as active blocker.

Gate decision tree:

- Gate choice: full gate.
- Blast radius: live backlog, Current Sprint, closeout registry, package script, and Foundation ship proof.
- focused proof is required
- full `foundation:verify` is required
- `process:foundation-ship` is required
- live extraction/provider/private-source work is explicitly not allowed

## Risks

- Risk: static adapter checks become theater. Mitigation: the proof combines file-level function/pagination/script checks with live local `source_crawl_targets` and artifact coverage.
- Risk: sync scripts accidentally use mutation APIs. Mitigation: dogfood and real checks reject known mutation tokens in sync/extraction scripts.
- Risk: paused/approval-bound work is hidden. Mitigation: paused targets are reported as warnings, not silently treated as gone.
- Risk: adapter hardening drifts into live private source reruns. Mitigation: the approval and not-next boundary block live reruns and broad backfill.

Rollback / Repair path:

If proof fails, leave `SOURCE-020` executing and repair the specific adapter contract. If a live target is failed, route that repair through the governed Foundation repair policy. If a source needs new private approval or broad historical extraction, park the action and continue the next safe card only if the remaining sprint can proceed without it.

## Speed Bounded

The focused proof reads local files, bounded target rows, artifact counts, package metadata, approval, and closeout registry only.

It does not crawl, sync, call providers, run LLMs, fetch private source content, or write downstream intelligence records.

The focused proof must stay fast enough to use by default before every ship gate, targeting under 2 minutes locally. Full `foundation:verify` and `process:foundation-ship` remain final protected-path gates, not repeated inner-loop scans.

## Tests

- `node --check lib/source-020-shared-comms-adapters.js scripts/process-source-020-check.mjs`
- `npm run process:source-020-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=SOURCE-020 --planApprovalRef=docs/process/approvals/SOURCE-020.json --closeoutKey=source-020-shared-comms-adapters-v1 --commitRef=HEAD`
