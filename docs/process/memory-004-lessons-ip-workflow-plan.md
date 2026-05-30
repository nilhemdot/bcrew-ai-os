# MEMORY-004 Lessons And IP Workflow Plan

## What

Turn the committed `MEMORY-003` conversation archive into a source-linked workflow for lessons learned and reusable IP.

This card does not create polished ebooks, sales copy, training scripts, or quote packs. It creates the governed workflow and generated indexes that tell the system what can become:

- lessons learned records
- implementation timelines
- case study candidates
- training asset candidates
- sales or marketing proof candidates
- quote or clip review candidates

Closeout key: `memory-004-lessons-ip-workflow-v1`.

## Why

The build conversations contain real operating gold: what broke, what got fixed, what the old system taught us, how Foundation evolved, and what should become doctrine, training, marketing proof, or product packaging.

Without a workflow, that gold either stays buried in long chats or turns into another loose report. The system needs a source-linked queue that says which archive records support which reusable outputs, what approval/redaction posture applies, and what is explicitly not ready for quote/content production.

## Definition Of Done

- `MEMORY-004` consumes the `MEMORY-003` archive manifest as input truth.
- A generated lessons/IP manifest and README exist under `docs/conversation-archive/`.
- Outputs are source-linked by archive IDs and paths.
- Lesson, timeline, reusable asset, and quote/clip review candidate lanes are present.
- No generated output stores raw private transcript text, quote text, or local memory content.
- External model/provider use is explicitly off.
- Quote/clip candidates require exact transcript/manual review posture before excerpt use.
- `MEMORY-004` closes and Current Sprint advances to `PILLAR-4-SYSTEM-CAPABILITIES-001`.
- Focused proof and full Foundation gates pass.

## Acceptance Criteria

- `buildLessonsIpSnapshot()` returns at least:
  - 4 lesson candidate lanes
  - 5 timeline milestones
  - 3 reusable IP candidates
  - 2 quote/clip review candidates
- Every output has `sourceRecordIds`.
- The input manifest points at `MEMORY-003` and `memory-003-conversation-archive-v1`.
- The privacy boundary says no raw private transcript text and no external model upload.
- Dogfood fails source-less outputs, raw quote text, external model use, and unapproved quote capture.
- Generated JSON/README match the current snapshot.
- Live backlog and Current Sprint show `MEMORY-004` done and `PILLAR-4-SYSTEM-CAPABILITIES-001` active next.

## Details

Implement `lib/memory-004-lessons-ip.js` as the workflow owner.

Input:

- `docs/conversation-archive/MANIFEST.json`

Generated outputs:

- `docs/conversation-archive/LESSONS-IP-MANIFEST.json`
- `docs/conversation-archive/LESSONS-IP-README.md`

The workflow is deterministic and local. It scores archive records by topics, backlog links, decision links, transcript fidelity, and extracted-doctrine signals. It then creates candidate lanes without copying raw transcript content.

Root invariant: `MEMORY-004` is healthy only when the real `buildLessonsIpSnapshot()` function path consumes the committed `MEMORY-003` manifest and produces source-linked, metadata-only outputs that fail closed on missing source IDs, raw private text, external model use, or unapproved quote capture. The proof must reject weak substring-only checks; source text markers are wiring checks only, not the behavior proof.

The quote/clip lane is deliberately conservative:

- exact transcript records become `exact_transcript_manual_review`
- reconstructed records become `manual_reconstruction_review_required`
- no quote text is stored by this card

## Reuse Existing Work

Reuse:

- Existing code: `lib/memory-003-conversation-archive.js`, `lib/foundation-lessons-learned-loop.js`, `lib/approval-integrity.js`, `lib/process-plan-critic.js`, `lib/process-write-guard.js`, live backlog helpers, and Current Sprint helpers.
- Existing docs: `docs/conversation-archive/MANIFEST.json`, `docs/conversation-archive/README.md`, `docs/_archive/handoffs/2026-05-19-memory-003-conversation-archive-closeout.md`, and `docs/process/foundation-lessons-learned-loop-001-plan.md`.
- Existing scripts: `scripts/process-memory-003-conversation-archive-check.mjs`, `scripts/process-foundation-lessons-learned-loop-check.mjs`, `process:system-health-nightly-audit-check`, `process:build-lane-repeated-failure-action-gate-check`, `backlog:hygiene`, and `process:foundation-ship`.
- Existing backlog truth: live `MEMORY-004`, `PILLAR-4-SYSTEM-CAPABILITIES-001`, and Current Sprint `FOUNDATION-GOLD-CAPTURE-AND-CAPABILITY-2026-05-19`.
- Existing downstream spine: intelligence atom/synthesis/retrieval/action-router records are downstream consumers, not rebuilt here.

Do not rebuild:

- lesson scheduler
- retrieval
- atom schema
- synthesis engine
- Action Router
- content production UI
- native chat export tooling

## Operator Value

Steve gets a practical bridge between “we saved the conversations” and “we can use the conversations.”

Useful outputs:

- where to look for lessons by topic
- which dates have implementation timeline evidence
- which case studies have enough source support
- which transcripts might contain quote/clip material
- which outputs are safe draft metadata versus human-review-only

## Risks

- Privacy risk: mitigate with source-linked metadata only, no raw private text, no local memory reads, and no external model/provider upload.
- Fidelity risk: reconstructed conversations can inform lessons, but cannot be quoted as exact evidence.
- Report-only drift: close the backlog card and advance Current Sprint; do not leave a disconnected README.
- Scope creep: polished content is explicitly not next.

Rollback/repair:

- If the generated workflow is wrong, remove `LESSONS-IP-*` generated files and keep `MEMORY-003` archive intact.
- If any raw private excerpt appears, fail the card and repair before shipping.
- If Current Sprint cannot advance cleanly, leave `MEMORY-004` executing and repair sprint truth.

## Tests

Gate decision tree:

- Static gate: `node --check` for the new module and process script.
- Focused gate: `process:memory-004-lessons-ip-check` because the behavior is local archive-manifest transformation, generated docs, privacy dogfood, and sprint/backlog closeout.
- Full gate: required at closeout because the card touches package scripts, closeout registry, live backlog, Current Sprint, generated docs, and Foundation ship proof.
- Blast radius: local generated repo artifacts plus live Foundation sprint/backlog rows only. No source-system, provider, Drive permission, credential, public route, or external write mutation.

Behavior proof:

- `buildLessonsIpSnapshot()` is the actual function path for generating outputs.
- `evaluateLessonsIpSnapshot()` checks real output objects, source links, privacy posture, and quote-review posture.
- `buildLessonsIpDogfoodProof()` uses synthetic failing cases to prove missing source links, raw quote text, external model use, and unapproved quote capture fail closed.
- The process script compares generated JSON/README files to the function output instead of trusting substring-only markers.

Focused proof:

- `node --check lib/memory-004-lessons-ip.js scripts/process-memory-004-lessons-ip-check.mjs`
- `npm run process:memory-004-lessons-ip-check -- --write-report --close-card --json`

Full gates:

- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=MEMORY-004 --planApprovalRef=docs/process/approvals/MEMORY-004.json --closeoutKey=memory-004-lessons-ip-workflow-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=MEMORY-004 --closeoutKey=memory-004-lessons-ip-workflow-v1`
- `npm run process:foundation-ship -- --card=MEMORY-004 --planApprovalRef=docs/process/approvals/MEMORY-004.json --closeoutKey=memory-004-lessons-ip-workflow-v1 --commitRef=HEAD`

Speed:

- The focused gate is bounded and should run under 2 minutes.
- It reads the committed archive manifest, generated docs, approval/closeout records, and live sprint/backlog rows only.

## Not Next

- No polished content production.
- No ebook, sales page, training module, or social post drafting.
- No raw quote extraction into repo truth.
- No external model/provider upload of private conversation content.
- No local-only `memory/`, `MEMORY.md`, `USER.md`, raw chat database, token, or runtime-state ingestion.
- No source-system mutation.
- No Drive permission mutation.
- No credential or provider config mutation.
- No external sends or public exposure.
- No Value Builder split.
