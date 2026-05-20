# SOURCE-001 Gmail Source Contract Plan

## What

Close `SOURCE-001` by signing off `SRC-GMAIL-001` for current Foundation read-side use.

This card updates Gmail from readable-but-not-signed-off to a locked V1 source boundary. The approved current reality is narrow: delegated Google Workspace reads, governed `gmail-current-day` thread archive, governed `gmail-extract-latest` candidate extraction, and `email-attachments-backfill` PDF/text/calendar attachment V1 artifacts.

It does not approve Gmail sends, broad team-mailbox exposure, credential mutation, broad historical private extraction, Drive permission mutation, or treating Gmail as Missive internal-comment / mention / assignment / routing truth.

## Why

Gmail is already feeding real extraction and intelligence artifacts, but the source contract still said `Not Signed Off`. That mismatch makes the system look less trustworthy than the actual governed lanes, and it leaves future builders guessing what Gmail owns versus what Missive owns.

Steve needs Gmail to be usable as source-backed context without turning it into an unsafe send engine or a substitute for Missive collaboration metadata.

## Acceptance Criteria

- `SRC-GMAIL-001` is marked `V1 Source Boundary Locked`.
- `SRC-GMAIL-001` validation is `Signed Off For Current Reality`.
- The contract explicitly limits sign-off to delegated read-side current reality.
- The contract explicitly blocks Gmail sends, broad mailbox exposure, credential/provider mutation, broad historical private extraction, and Missive-comment/assignment conflation.
- `gmail-current-day` is active, scheduled, and latest state succeeded with archived threads.
- `email-attachments-backfill` is active, scheduled, and latest state succeeded with archived attachment artifacts.
- Latest governed `gmail-sync-current`, `gmail-extract-latest`, and `email-attachment-extract-bite` jobs succeeded recently.
- Gmail thread and Gmail attachment artifacts exist in PostgreSQL with counts only in proof output.
- The DB `source_contract_registry` row is synced to the updated source contract.
- Current Sprint advances to `SOURCE-002` after closeout.

## Definition Of Done

- `process:source-001-check` passes with `--apply --close-card --json`.
- System Health remains healthy.
- Repeated-failure gate remains healthy.
- Backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass before push.
- The closeout registry exposes `source-001-gmail-source-contract-v1`.
- Main is clean and pushed.

## Details

The implementation reuses the existing source contract registry, source lifecycle completion rules, source target ledger, Foundation job registry, shared communications archive, and Current Sprint overlay.

The focused proof reads only metadata and counts from local PostgreSQL:

- `source_crawl_targets` for `gmail-current-day` and `email-attachments-backfill`,
- `foundation_job_runs` for latest governed Gmail sync / candidate / attachment jobs,
- `shared_communication_artifacts` for `email_thread` and `gmail_attachment` counts,
- `source_contract_registry` for synced source-contract truth.

The proof does not print private email bodies, subjects, snippets, recipients, attachment contents, source URLs, or raw message payloads.

## Reuse Existing Work

Reuse existing code:

- `lib/source-contracts.js`
- `lib/source-lifecycle-completion.js`
- `lib/source-contract-registry-table.js`
- `lib/foundation-jobs.js`
- `scripts/sync-gmail-archive.mjs`
- `scripts/extract-gmail-thread-candidates.mjs`
- `scripts/extract-email-attachments.mjs`

Reuse existing docs:

- `docs/source-registry.md`
- `docs/source-notes/shared-communications.md`
- `docs/process/source-018-google-gemini-meeting-notes-contract-plan.md`
- `docs/process/source-012-source-connector-live-layers-plan.md`

Reuse existing scripts:

- `scripts/process-system-health-nightly-audit-check.mjs`
- `scripts/process-build-lane-repeated-failure-action-gate-check.mjs`
- `scripts/process-foundation-ship.mjs`

## Behavioral Proof

Dogfood proof rejects the exact false-greens this card must block:

- connector readability alone cannot become source sign-off,
- missing current-day sync cannot become current source truth,
- missing attachment artifacts cannot satisfy the V1 attachment boundary,
- Gmail send approval cannot sneak into a read-side source contract,
- Gmail cannot become Missive internal-comment / assignment truth.

Live proof checks the real source contract, DB registry sync, source lifecycle completion row, latest governed Gmail jobs, target state, and artifact metadata counts through an actual function path and focused process path. The proof is not a string-match verifier: no substring-only proof is accepted, and the process fails unless the live function/API-backed status, dogfood false-green rejections, and local DB metadata all agree.

The dogfood path also rejects weak false-green fixtures so a future builder cannot close Gmail from markers alone.

## Tests

- `node --check lib/source-001-gmail-source-contract.js lib/source-contracts.js lib/source-lifecycle-completion.js scripts/process-source-001-check.mjs`
- `npm run process:source-001-check -- --apply --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=SOURCE-001 --planApprovalRef=docs/process/approvals/SOURCE-001.json --closeoutKey=source-001-gmail-source-contract-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=SOURCE-001 --closeoutKey=source-001-gmail-source-contract-v1`
- `npm run process:foundation-ship -- --card=SOURCE-001 --planApprovalRef=docs/process/approvals/SOURCE-001.json --closeoutKey=source-001-gmail-source-contract-v1 --commitRef=HEAD`

Gate decision tree: static checks are not enough because this changes source trust semantics, DB registry truth, and Current Sprint progression. Focused proof is `process:source-001-check`. Full verification is required because the blast radius touches source contracts, lifecycle completion, registry sync, package scripts, closeout registry, and `foundation:verify`.

Operator value: Steve can trust Gmail as current source-backed email context while the system still blocks sends, broad mailbox exposure, credential mutation, and Missive collaboration conflation.

Speed bound: the focused proof is metadata-only plus existing fast health gates and should run under 2 minutes.

## Risks

- Risk: this is misread as approval for Gmail sends. Mitigation: contract, source note, dogfood, and closeout all state no-send.
- Risk: this becomes broad mailbox/team exposure. Mitigation: V1 signs off existing delegated read-side lanes only.
- Risk: Gmail is treated as Missive. Mitigation: source note and proof preserve Missive as the internal-comment/assignment source.
- Risk: private email content leaks into proof output. Mitigation: proof emits counts/status only.

Rollback or repair path: if focused proof fails, do not close the card or advance to `SOURCE-002`. Fix the exact failing proof path and rerun `process:source-001-check`. If later health shows Gmail jobs degraded, run existing governed repair reruns under the approved repair policy or park the blocked action; do not classify broken workflow health as green.

## Not Next

- Do not send Gmail.
- Do not mutate Gmail settings, credentials, labels, filters, or provider configuration.
- Do not approve broad team-mailbox exposure.
- Do not run broad historical private Gmail extraction from this card.
- Do not treat Gmail as Missive internal-comment, mention, assignment, or routing truth.
- Do not mutate Drive permissions.
