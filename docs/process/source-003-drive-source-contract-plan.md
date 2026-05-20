# SOURCE-003 Google Drive Source Contract Plan

## What

Close `SOURCE-003` by signing off `SRC-GDRIVE-001` for current Foundation read-side use.

This card updates Google Drive from readable / partially proven posture to a locked V1 source boundary. The approved current reality is narrow: delegated Google Workspace Drive reads, governed `drive-corpus-backfill` inventory, governed `drive-content-extract-backfill` content extraction, and local Drive document/PDF/spreadsheet/text artifacts with provenance.

It does not approve Drive permission mutation, sharing or ACL changes, request-access sends, file creation/update/delete, credential or OAuth scope mutation, broad private Drive sweeps, raw Drive exposure to broad team or agent surfaces, media/video/vision/provider extraction, browser-auth work, or treating the Strategy Folder as canonical strategy truth.

## Why

Drive is the largest shared-memory source in the rebuild. It already has governed inventory and content lanes, but the source contract still needed a signed-off boundary so future builders know what Drive owns and what it does not own.

Steve needs Drive to be usable as evidence intake and source-backed archive material without turning every readable file into canonical strategy truth, widening Drive permissions, or starting broad private extraction.

## Acceptance Criteria

- `SRC-GDRIVE-001` is marked `V1 Source Boundary Locked`.
- `SRC-GDRIVE-001` validation is `Signed Off For Current Reality`.
- The contract explicitly limits sign-off to delegated read-side Drive inventory/content lanes and local Drive artifacts.
- The contract explicitly blocks Drive permission mutation, request-access sends, file writes, credential/OAuth changes, broad Drive sweeps, raw broad exposure, media/video/vision/provider extraction, and canonical-strategy confusion.
- `drive-corpus-backfill` is active, scheduled, and latest state succeeded with material inspected count.
- `drive-content-extract-backfill` is active, scheduled, and latest state succeeded with material archived/extracted count.
- Drive document/PDF/spreadsheet/text artifacts exist in PostgreSQL with counts only in proof output.
- The DB `source_contract_registry` row is synced to the updated source contract.
- Current Sprint closes after `SOURCE-003`.

## Definition Of Done

- `process:source-003-check` passes with `--apply --close-card --json`.
- System Health remains healthy.
- Repeated-failure gate remains healthy.
- Backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass before push.
- The closeout registry exposes `source-003-drive-source-contract-v1`.
- Main is clean and pushed.

## Details

The implementation reuses the existing source contract registry, source lifecycle completion rules, Drive extraction targets, Drive worker proof, Drive content proof, shared communications archive, and Current Sprint overlay.

Existing code reused:

- `lib/source-contracts.js`
- `lib/source-lifecycle-completion.js`
- `lib/source-contract-registry-table.js`
- `lib/drive-worker-proof.js`
- `lib/drive-content-next-bite.js`
- `scripts/inventory-drive-corpus.mjs`
- `scripts/extract-drive-content.mjs`
- `scripts/run-extraction-target.mjs`

Existing docs reused:

- `docs/source-registry.md`
- `docs/source-notes/google-drive-corpus.md`
- `docs/process/drive-content-001-plan.md`
- `docs/process/drive-worker-001-plan.md`
- `docs/process/source-012-source-connector-live-layers-plan.md`

Existing scripts reused:

- `scripts/process-drive-content-check.mjs`
- `scripts/process-drive-worker-check.mjs`
- `scripts/process-system-health-nightly-audit-check.mjs`
- `scripts/process-build-lane-repeated-failure-action-gate-check.mjs`
- `scripts/process-foundation-ship.mjs`

The focused proof reads only metadata and counts from local PostgreSQL:

- `source_crawl_targets` for Drive target status,
- `source_crawl_items` for bounded ledger summaries and skip-reason counts,
- `shared_communication_artifacts` for Drive artifact counts by type,
- `source_contract_registry` for synced source-contract truth.

The proof does not print raw document text, raw file contents, source URLs, web-view links, file IDs, folder listings, owner payloads, or raw Drive API responses.

## Behavioral Proof

Dogfood proof rejects the exact false-greens this card must block:

- connector readability alone cannot become source sign-off,
- missing Drive inventory cannot become source sign-off,
- missing Drive content artifacts cannot satisfy the V1 archive boundary,
- Drive permission mutation cannot sneak into a read-side source contract,
- Strategy Folder evidence intake cannot become canonical strategy truth,
- media/video/vision/provider extraction cannot leak into the Drive source contract.

Live proof checks the real source contract, DB registry sync, source lifecycle completion row, target states, artifact metadata counts, Drive worker ledger summary, and no-mutation script posture through actual function/process paths. The proof is not a string-match verifier: no substring-only proof is accepted, and the process fails unless function/API-backed status, dogfood false-green rejections, and local DB metadata all agree.

## Tests

- `node --check lib/source-003-drive-source-contract.js lib/source-contracts.js lib/source-lifecycle-completion.js scripts/process-source-003-check.mjs`
- `npm run process:source-003-check -- --apply --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=SOURCE-003 --planApprovalRef=docs/process/approvals/SOURCE-003.json --closeoutKey=source-003-drive-source-contract-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=SOURCE-003 --closeoutKey=source-003-drive-source-contract-v1`
- `npm run process:foundation-ship -- --card=SOURCE-003 --planApprovalRef=docs/process/approvals/SOURCE-003.json --closeoutKey=source-003-drive-source-contract-v1 --commitRef=HEAD`

Gate decision tree: static checks are not enough because this changes source trust semantics, DB registry truth, Drive boundary policy, Current Sprint progression, and closeout coverage. Focused proof is `process:source-003-check`. Full verification is required because the blast radius touches source contracts, lifecycle completion, registry sync, package scripts, closeout registry, and `foundation:verify`.

Operator value: Steve can trust Drive as source-backed evidence intake and bounded archive material while the system still blocks Drive permission changes, broad exposure, media/vision extraction, and canonical-strategy drift.

Speed bound: the focused proof is metadata-only plus existing fast health gates and should run under 2 minutes.

## Risks

- Risk: this is misread as approval for Drive permission or sharing changes. Mitigation: contract, source note, dogfood, and closeout all state no permission mutation, ACL changes, request-access sends, or file writes.
- Risk: this becomes broad private Drive extraction. Mitigation: V1 signs off only the existing governed inventory/content lanes.
- Risk: readable Strategy Folder files are treated as canonical strategy truth. Mitigation: source note and proof preserve Drive as evidence intake; canonical strategy surfaces own cleaned strategy truth.
- Risk: private Drive content leaks into proof output. Mitigation: proof emits counts/status only.

Rollback or repair path: if focused proof fails, do not close the card or mark the sprint complete. Fix the exact failing proof path and rerun `process:source-003-check`. If later health shows Drive jobs degraded, run existing governed repair reruns under the approved repair policy or park the blocked action; do not classify broken workflow health as green.

## Not Next

- Do not mutate Drive permissions, sharing, ACLs, owners, or file locations.
- Do not send request-access emails or external messages.
- Do not create, update, delete, trash, untrash, copy, or move Drive files.
- Do not mutate Drive credentials, OAuth scopes, provider config, or source access.
- Do not approve broad Drive extraction outside the existing governed targets.
- Do not expose raw Drive content to broad team or agent surfaces.
- Do not treat the Strategy Folder as canonical strategy truth.
- Do not add media/video/vision/provider/browser-auth extraction in `SOURCE-003`.
