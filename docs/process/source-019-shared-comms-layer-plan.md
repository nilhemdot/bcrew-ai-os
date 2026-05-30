# SOURCE-019 Plan

## What

Close `SOURCE-019` as the shared communications control layer for Gmail, Missive, Slack, and meetings.

This card proves the existing shared communications stack as one governed layer:

- source archives
- normalized communication artifacts
- extraction candidates
- deterministic synthesis controls
- approval-gated action routes

It does not run new private source syncs, call model/provider synthesis, send messages, write ClickUp/CRM, mutate Drive permissions, or expose raw communication bodies in proof output.

## Why

Steve wants the system to understand what work is happening, what decisions were made, what blockers exist, and what follow-through should be proposed without rereading every email, Missive thread, Slack thread, meeting note, and transcript.

The shared archive and candidate queue are already materially real. The missing step is proving they are one usable operating layer instead of separate source piles. This card makes the layer explicit and private-safe before `SOURCE-020` hardens the adapters further.

## Acceptance Criteria

- Proves artifact coverage for the required shared communications sources:
  - `SRC-GMAIL-001`
  - `SRC-MISSIVE-001`
  - `SRC-SLACK-001`
  - `SRC-MEETINGS-001`
- Proves candidate coverage includes task, decision, and blocker signals.
- Builds deterministic current control items with:
  - cross-artifact linking signal
  - cross-source dedupe key
  - staleness status
  - actionability score
- Proves existing synthesis packet visibility without pretending stale/provider synthesis was rerun.
- Proves action routes are proposal-only and approval-gated.
- Dogfoods failure cases:
  - missing source coverage
  - missing dedupe/control key
  - raw content leakage in proof output
  - auto-write or non-approval-gated route
- Current Sprint marks `SOURCE-019` done and advances to `SOURCE-020`.

## Definition Of Done

- `process:source-019-check` passes with `--close-card --json`.
- System Health remains healthy.
- Repeated-failure gate remains healthy.
- Backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass.
- The closeout registry exposes `source-019-shared-comms-layer-v1`.
- Main is clean and pushed.

## Details

The card adds:

- `lib/source-019-shared-comms-layer.js`
- `scripts/process-source-019-check.mjs`
- `docs/process/source-019-shared-comms-layer-plan.md`
- `docs/process/approvals/SOURCE-019.json`
- `docs/_archive/handoffs/2026-05-19-source-019-shared-comms-layer-closeout.md`

The focused proof reads bounded DB summaries from:

- `shared_communication_artifacts`
- `shared_communication_candidates`
- `shared_communication_synthesis_runs`
- `shared_communication_synthesized_items`
- `intelligence_action_routes`

The proof output is count/hash/control metadata only. It does not print raw email, Slack, Missive, transcript, participant-sensitive text, or message bodies.

## Reuse Existing Work

Existing code to reuse:

- `lib/foundation-shared-comms-store.js`
- `getSharedCommunicationSynthesisSnapshot`
- `lib/strategy-shared-comms-routes.js`
- `scripts/generate-shared-comms-synthesis.mjs`
- intelligence action router tables and proof paths
- Current Sprint helpers
- Foundation verifier and ship gates

Existing docs to reuse:

- `docs/source-notes/shared-communications.md`
- `docs/_archive/handoffs/2026-05-19-build-intel-daily-extraction-review-closeout.md`
- `docs/_archive/handoffs/2026-05-19-old-system-research-team-harvest-closeout.md`

Existing backlog to reuse:

- prior card `BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001`
- active card `SOURCE-019`
- next card `SOURCE-020`
- follow-on trust card `DATA-002`

## Operator Value

Steve gets a proof-backed answer to: "Do we have one shared communications intelligence layer, or just four disconnected archives?"

The closeout should make clear:

- what sources are covered
- what candidate signals exist
- whether synthesis is current or stale
- whether proposed routes are approval-gated
- what stays parked for later source/adapter hardening

## Not Next

- no live Gmail/Missive/Slack/meeting reruns
- no browser login, paid/private source access, Skool/Loom/Mycro extraction, screenshots, OCR, keyframes, audio/video transcription, or model/provider calls
- no raw communication body exposure in proof output
- no automatic backlog, decision, question, ClickUp, CRM, KB, vector, atom, or external writes from shared communications content
- no `MEETING-VAULT-ACL-001` Phase B, broad meeting-vault cleanup, Drive permissions mutation, credential mutation, public exposure, or sends

Behavior proof:

- `buildSource019SharedCommsLayerSnapshot()` must prove the layer from existing bounded summaries.
- `buildSource019DogfoodProof()` must recreate and reject the unsafe failure modes.
- Current Sprint proof must show `SOURCE-019` done and `SOURCE-020` as active blocker.

Gate decision tree:

- Gate choice: full gate.
- Blast radius: live backlog, Current Sprint, closeout registry, package script, and Foundation ship proof.
- focused proof is required
- full `foundation:verify` is required
- `process:foundation-ship` is required
- private/provider/live extraction work is explicitly not allowed

## Risks

- Risk: the card hides stale synthesis. Mitigation: expose synthesis freshness as a field and do not rerun private/provider synthesis.
- Risk: raw private content leaks into proof output. Mitigation: proof output uses hashes/counts/control metadata and dogfood rejects forbidden raw-content keys.
- Risk: action routes become automatic writes. Mitigation: the proof requires approval-gated routes and rejects unsafe destinations.
- Risk: this becomes another passive report. Mitigation: the card advances to `SOURCE-020` and keeps route/actionability controls explicit.

Rollback / Repair path:

If proof fails, leave `SOURCE-019` executing and repair the bounded control proof. If live data is missing for a source, park the exact source and continue only safe follow-on work. If private/provider rerun is required for freshness, do not run it from this card; route it as approval-bound.

## Speed Bounded

The focused proof reads bounded aggregate DB summaries, up to 240 current candidate rows for private-safe hashing/scoring, existing synthesis snapshot metadata, route counts, package metadata, plan approval, and closeout registry.

It does not crawl, sync, fetch private sources, call providers, run LLM synthesis, or write downstream intelligence records. It is intended to run under two minutes.

The focused proof must stay fast enough to use by default before every ship gate, targeting under 2 minutes locally. Full `foundation:verify` and `process:foundation-ship` remain final protected-path gates, not repeated inner-loop scans.

## Tests

- `node --check lib/source-019-shared-comms-layer.js scripts/process-source-019-check.mjs`
- `npm run process:source-019-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=SOURCE-019 --planApprovalRef=docs/process/approvals/SOURCE-019.json --closeoutKey=source-019-shared-comms-layer-v1 --commitRef=HEAD`
