# MEMORY-003 Conversation Archive Plan

## What

Build the first real conversation archive model.

The v1 archive generates a metadata-only manifest from tracked repo handoffs, archived conversation artifacts, audit handoffs, and existing shared-communications archive evidence. Each record is browsable by path, date, source type, fidelity class, privacy class, topics, linked backlog IDs, and linked decision IDs.

Closeout key: `memory-003-conversation-archive-v1`.

## Why

Steve keeps surfacing high-value context in long chats: sprint decisions, old-system lessons, builder failures, extraction boundaries, and operating doctrine. If that gold stays only in chat windows or local memory, it gets lost and the system repeats mistakes.

The archive has to come before lessons/IP extraction. `MEMORY-004` should extract reusable lessons from a real archive, not from vibes or whatever context is still visible in one chat.

## Definition Of Done

- A reusable archive module defines source types, fidelity classes, privacy/redaction posture, ingest paths, and browse metadata.
- The archive labels transcript fidelity clearly:
  - raw native export
  - provider/session export
  - reconstructed near-verbatim transcript
  - summary/checkpoint
  - extracted doctrine
- Reconstructed conversations cannot be presented as exact raw transcripts.
- Private local memory files are excluded from scans.
- The generated archive manifest and README exist under `docs/conversation-archive/`.
- Existing meeting/shared-comms archive ledger evidence is checked as an ingest path, without reading broad private content into the manifest.
- `MEMORY-003` closes and Current Sprint advances to `MEMORY-004`.
- Focused proof and full Foundation gates pass.

## Acceptance Criteria

- `buildConversationArchiveSnapshot()` returns at least 20 tracked archive records.
- Every record has path, title, date if available, source type, fidelity class, exact-transcript flag, privacy class, content hash, line count, linked backlog IDs, linked decision IDs, and topics.
- `evaluateConversationArchiveSnapshot()` fails if records are missing metadata, fidelity classes are incomplete, private local memory paths are scanned, or ingest paths are missing.
- Dogfood proves raw exports may be exact, reconstructed artifacts are not exact, summaries are not transcripts, private local memory paths are excluded, and doctrine artifacts are classified separately.
- `docs/conversation-archive/MANIFEST.json` and `docs/conversation-archive/README.md` match the generated snapshot.
- Live backlog and Current Sprint show `MEMORY-003` done and `MEMORY-004` active next.

## Details

Implement `lib/memory-003-conversation-archive.js` as the archive owner. It scans only tracked repo evidence:

- `docs/handoffs/`
- `docs/_archive/handoffs/`
- `docs/_archive/audits/`

The scanner is metadata-only. It records hashes, counts, classification, and links; it does not copy private local chat logs or local memory content into repo truth.

Ingest paths:

- Codex/main-session handoff and native export path
- Google Meet transcript archive through governed meeting artifacts
- Gmail/Missive/Slack shared-comms thread archive
- future native provider/session import path

Behavior proof is through real function paths, not substring-only checks:

- `buildConversationArchiveSnapshot({ repoRoot })` scans tracked archive roots and returns real records.
- `evaluateConversationArchiveSnapshot(snapshot)` enforces metadata, fidelity, privacy, and ingest-path invariants.
- `buildConversationArchiveDogfoodProof()` proves raw exports can be exact, reconstructed conversations are not exact, summaries are not transcripts, doctrine artifacts are separate, and private local memory paths are excluded.
- `scripts/process-memory-003-conversation-archive-check.mjs` writes generated reports only behind the explicit `--write-report` process flag and closes live sprint/backlog truth only behind `--close-card`.

No substring-only proof is accepted as the root behavior proof. Source text checks are secondary wiring checks only; the core invariant is the generated snapshot, evaluator, dogfood, and live Current Sprint/backlog mutation path.

## Reuse Existing Work

Reuse existing artifacts:

- Existing code: `lib/foundation-db.js`, `lib/foundation-build-log.js`, `lib/approval-integrity.js`, `lib/process-plan-critic.js`, and `lib/process-write-guard.js`.
- Existing scripts: `scripts/process-memory-002-openclaw-native-memory-preflight-check.mjs`, `scripts/process-data-002-check.mjs`, `process:system-health-nightly-audit-check`, `process:build-lane-repeated-failure-action-gate-check`, and `process:foundation-ship`.
- Existing docs: `docs/source-notes/shared-communications.md`, May 19 reconstructed full-conversation handoffs, Harlan transcript-promotion review, and the hot handoff archive manifest.
- Live backlog and Current Sprint truth: `MEMORY-003`, `MEMORY-004`, and `FOUNDATION-GOLD-CAPTURE-AND-CAPABILITY-2026-05-19`.
- `MEMORY-003` live backlog card
- `MEMORY-004` dependent card
- shared communication artifact archive
- meeting-note/transcript archive lanes
- May 19 full-conversation reconstructed handoff
- Harlan transcript-promotion review
- hot handoff archive manifest

Reuse existing proof patterns:

- `scripts/process-memory-002-openclaw-native-memory-preflight-check.mjs`
- `scripts/process-data-002-check.mjs`
- `process:system-health-nightly-audit-check`
- `process:build-lane-repeated-failure-action-gate-check`
- `process:foundation-ship`

## Operator Value

Steve gets one place to see that the conversation gold is preserved and labeled honestly. Future agents can search the manifest without pretending a reconstructed transcript is a raw export.

Useful operator behavior:

- Steve can confirm whether a long chat, checkpoint, or transcript-like artifact exists before asking another agent to reconstruct it.
- The team can browse by date, source type, topic, backlog ID, and fidelity class instead of hunting through random handoffs.
- Future `MEMORY-004` work can extract lessons/IP from an archive with clear privacy and redaction posture.
- This unlocks better quality for self-improvement loops because "gold from chat" becomes source-backed evidence, not an operator memory burden.

## Risks

- Privacy risk: mitigate by excluding local-only memory files and scanning tracked repo artifacts only.
- Fidelity risk: mitigate by explicit exact-transcript flags and dogfood proof.
- Report-only drift risk: mitigate by closing the live backlog card and advancing Current Sprint to `MEMORY-004`.
- Manifest drift risk: focused proof compares generated output to committed manifest files.

Rollback/repair:

- If manifest generation is wrong, remove `docs/conversation-archive/` and keep the module unused until fixed.
- If the scanner finds secret-like content, fail the card and route a cleanup card before shipping.
- If Current Sprint cannot advance cleanly, leave `MEMORY-003` executing and repair sprint truth before continuing.

## Tests

Gate decision:

- Static gate: `node --check` for the new module and process script.
- Focused gate: `process:memory-003-conversation-archive-check` because the main behavior is local archive scanning, manifest generation, and sprint/backlog mutation.
- Full gate: required at closeout because the card touches package scripts, closeout registry, live backlog, Current Sprint, generated docs, and Foundation ship proof.
- Blast radius: local/tracked repo archive metadata plus live Foundation sprint/backlog rows only. No source-system, provider, or external writes.

Focused proof:

- `node --check lib/memory-003-conversation-archive.js scripts/process-memory-003-conversation-archive-check.mjs`
- `npm run process:memory-003-conversation-archive-check -- --write-report --close-card --json`

Full gates:

- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=MEMORY-003 --planApprovalRef=docs/process/approvals/MEMORY-003.json --closeoutKey=memory-003-conversation-archive-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=MEMORY-003 --closeoutKey=memory-003-conversation-archive-v1`
- `npm run process:foundation-ship -- --card=MEMORY-003 --planApprovalRef=docs/process/approvals/MEMORY-003.json --closeoutKey=memory-003-conversation-archive-v1 --commitRef=HEAD`

Speed:

- The focused gate is bounded and should run under 2 minutes.
- It reads tracked archive files, local DB metadata, approval/closeout records, and generated manifest output only.
- Full `foundation:verify` stays a ship gate, not the inner development loop.

## Not Next

- No `MEMORY-004` lessons/IP extraction yet.
- No private chat upload to external providers.
- No model summarization over private chats.
- No local-only memory, `MEMORY.md`, `USER.md`, raw chat database, token, or private runtime-state ingestion.
- No source-system mutation.
- No Drive permission mutation.
- No credential or provider config mutation.
- No external sends or public exposure.
- No Value Builder split.
