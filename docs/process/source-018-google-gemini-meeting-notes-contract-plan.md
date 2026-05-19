# SOURCE-018 Google Gemini Meeting Notes Contract Plan

## What

Close `SOURCE-018` by signing off `SRC-MEETINGS-001` for current Foundation/Steve owner use only.

This card updates the Google Meeting Notes / Transcripts source contract from readable but not signed off to signed off for current reality. The approved current reality is narrow: delegated Google Workspace scans discover original Gemini meeting notes and transcripts, archive `meeting_note` and `meeting_transcript` artifacts into PostgreSQL, preserve privacy/read-side boundaries, and feed transcript candidate extraction only from transcript evidence.

It does not approve broad raw transcript access, future team/agent query access, Drive permission mutation, meeting-video understanding, or broad historical extraction.

## Why

Extraction work needs a clean meeting-note source boundary before it expands. A connector can read Google Workspace, but that alone does not prove the source is trusted, current, privacy-safe, or usable by extraction.

Steve needs the system to know the difference between:

- current owner-usable meeting-note archives,
- transcript evidence that can support extraction candidates,
- raw transcripts or meeting intelligence that must stay gated,
- future team/agent read-side access that still needs separate approval.

## Acceptance Criteria

- `SRC-MEETINGS-001` is marked `Signed Off For Current Reality`.
- The contract states that current signoff is limited to Foundation/Steve owner use.
- The contract explicitly blocks raw transcript broad exposure and future team/agent query access until separate approval.
- `meetings-current-day` is active, scheduled, and latest state succeeded.
- Latest governed `meeting-notes-sync-current` job succeeded recently.
- Latest governed `meeting-transcripts-extract-backlog` job succeeded recently.
- Meeting note and transcript artifacts exist in PostgreSQL with meeting-key coverage.
- Transcript candidate extraction still requires transcript evidence and rejects Gemini summary-only evidence.
- Source lifecycle still distinguishes current signoff from future blockers.
- Current Sprint advances to `EXTRACT-CURRENT-001` after closeout.

## Definition Of Done

- `process:source-018-check` passes with `--apply --close-card --json`.
- System Health remains healthy.
- Repeated-failure gate remains healthy.
- Backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass before push.
- The closeout registry exposes `source-018-google-gemini-meeting-notes-contract-v1`.
- Main is clean and pushed.

## Details

The implementation reuses the existing source contract registry, source lifecycle completion rules, source layer model, meeting vault ACL proof, meeting current-day target, Foundation job registry, and shared communications artifact archive.

The focused proof reads only metadata and counts from live PostgreSQL:

- `source_crawl_targets` for the `meetings-current-day` target state,
- `foundation_job_runs` for latest governed current-sync and transcript-extraction job status,
- `shared_communication_artifacts` for `meeting_note`, `meeting_transcript`, and meeting-key counts.

The proof does not print private meeting contents, participants, source URLs, transcripts, summaries, or raw evidence.

## Reuse Existing Work

Reuse existing code:

- `lib/source-contracts.js`
- `lib/source-lifecycle-completion.js`
- `lib/source-012-source-connector-layers.js`
- `lib/meeting-vault-acl.js`
- `lib/foundation-jobs.js`
- `lib/source-of-truth-payload.js`

Reuse existing docs:

- `docs/source-registry.md`
- `docs/source-notes/shared-communications.md`
- `docs/process/source-012-source-connector-live-layers-plan.md`
- `docs/process/source-lifecycle-completion.md`

Reuse existing scripts:

- `scripts/extract-meeting-transcript-candidates.mjs`
- `scripts/process-system-health-nightly-audit-check.mjs`
- `scripts/process-build-lane-repeated-failure-action-gate-check.mjs`
- `scripts/process-foundation-ship.mjs`

## Behavioral Proof

The dogfood proof simulates the exact false positives this card must block:

- connector/readability only cannot become source signoff,
- Gemini summary-only evidence cannot become transcript extraction readiness,
- Drive mutation cannot be accepted as part of this contract,
- raw transcript broad access must remain blocked.

Live proof checks the real source contract, source layer, source lifecycle completion row, latest governed meeting jobs, target state, and artifact metadata counts through actual function path and process path assertions. The `buildSource018ContractStatus()` function calls the source-layer evaluator, source-lifecycle completion status, meeting vault no-duplicate/no-Drive-write proof, and live PostgreSQL metadata queries instead of relying on substring-only checks.

The only source text checks are guardrails around known scripts, and substring-only proof is explicitly rejected as sufficient for P0 closeout. The behavior gate requires the function path to prove the live state, the dogfood path to reject weak false-green fixtures, and the focused process check to exercise the API route/source-contract payload shape before closeout.

## Tests

- `node --check lib/source-018-google-gemini-meeting-notes-contract.js lib/source-contracts.js lib/source-lifecycle-completion.js scripts/process-source-018-check.mjs`
- `npm run process:source-018-check -- --apply --close-card --json`
- `npm run source-contract-registry:sync -- --apply --actor=codex-source-018 --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=SOURCE-018 --planApprovalRef=docs/process/approvals/SOURCE-018.json --closeoutKey=source-018-google-gemini-meeting-notes-contract-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=SOURCE-018 --closeoutKey=source-018-google-gemini-meeting-notes-contract-v1`
- `npm run process:foundation-ship -- --card=SOURCE-018 --planApprovalRef=docs/process/approvals/SOURCE-018.json --closeoutKey=source-018-google-gemini-meeting-notes-contract-v1 --commitRef=HEAD`

Gate decision tree: static checks are not enough because this changes source trust semantics and Current Sprint progression. Focused proof is `process:source-018-check`. Full verification is required because the blast radius touches source contracts, lifecycle completion, live DB metadata proof, package scripts, closeout registry, and `foundation:verify`.

Operator value: this unlocks extraction work without fuzzy meeting-note trust. Steve can treat meeting notes/transcripts as current owner-usable Foundation source evidence while the system still blocks broad raw transcript/team/agent access.

Speed bound: the focused proof is metadata-only plus existing fast health gates and should run under 2 minutes.

## Risks

- Risk: this is misread as broad raw transcript access approval. Mitigation: contract, lifecycle, dogfood, and closeout all state current Foundation/Steve owner use only.
- Risk: this mutates Drive permissions or creates duplicate Gemini docs. Mitigation: reuse meeting vault ACL no-duplicate/no-write proof.
- Risk: this starts broad meeting extraction. Mitigation: V1 only proves existing governed jobs and archive metadata; broad backfill remains separate.
- Risk: private meeting content leaks into proof output. Mitigation: proof emits counts/status only.

Rollback or repair path: if focused proof fails, do not close the card or advance to `EXTRACT-CURRENT-001`. Fix the exact failing proof path and rerun `process:source-018-check`. If a later health run shows meeting jobs degraded, park the affected operation or run an existing governed repair rerun under the approved repair policy; do not classify broken workflow health as green.

## Not Next

- Do not mutate Google Drive permissions.
- Do not expose raw transcripts to broad team or agent query surfaces.
- Do not extract from Gemini summaries when transcript evidence is missing.
- Do not run broad historical meeting extraction from this card.
- Do not start Value Builder split.
