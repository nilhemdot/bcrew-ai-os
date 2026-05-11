# MEETING-VAULT-AUTO-ENFORCEMENT-001 Automatic Meeting Vault Plan

Status: approved at 9.8 by Steve on 2026-05-11. Implementation is approved only inside this plan: automatic forward-flow proof, daily audit/exception queue, readiness close rule, no historical cleanup batches, and no Drive mutation except a separately approved safe new-note enforcement path. This implementation is report-only.

Card: `MEETING-VAULT-AUTO-ENFORCEMENT-001`

## Current Truth

- Manual `MEETING-VAULT-ACL-001` Phase B permission batching is stopped.
- `MEETING-VAULT-ACL-001` remains open/blocking.
- `DRIVE-ACCESS-REQUEST-001` is closed for delegated Drive dry-run/preflight only.
- Original Gemini meeting notes are the source of truth.
- Legacy Crewbert-owned duplicate docs exist and must be treated as legacy exceptions, not ACL decision targets.
- Existing code already has source-truth inventory, sensitivity classification, duplicate-copy detection, delegated Drive preflight, metadata-only audit rows, and Foundation readiness integration.
- The current gap is operating model: the system is still oriented around historical cleanup batches instead of automatic forward enforcement plus a bounded legacy exception queue.

## Goal

Turn Meeting Vault from historical Drive scrubbing into an automatic system for new meeting notes.

The end state:

- new Gemini notes are discovered automatically;
- originals remain the only source-of-truth Drive files;
- no job creates duplicate Google Docs for archive/search;
- note content and extracted transcript/search text are stored in PostgreSQL;
- Crewbert vault access is enforced or queued from the forward flow;
- every note is classified as protected, standard, broad, or unknown;
- participant and guest access is evaluated against the classification;
- protected notes are locked down or placed in an explicit review queue;
- broad/training meetings keep legitimate participant/guest access;
- public-link and domain-wide raw exposure is always high-risk;
- Steve gets a daily dashboard/audit of processed notes, actions, and exceptions;
- old messy files move to a legacy exception queue instead of driving endless manual cleanup batches.

## Existing Work And Doctrine To Reuse

Reuse:

- `scripts/sync-meeting-notes-archive.mjs`
  - delegated scan over meeting-sync-enabled users;
  - original-vs-Crewbert-copy preference;
  - DB archive writes through `upsertSharedCommunicationArtifact`;
  - content hashes and meeting metadata.
- `lib/meeting-vault-acl.js`
  - source-truth role constants;
  - sensitivity classification;
  - original vs legacy duplicate copy handling;
  - no-duplicate Google Docs proof;
  - dry-run hash and metadata-only proof discipline.
- `lib/drive-access-preflight.js`
  - actor proof;
  - permission inventory;
  - owner ambiguity and missing-access classification;
  - permission operation classification.
- `lib/meeting-classification.js`
  - current broadcast/discussion/sensitive title and participant-count rules.
- `lib/security-access.js`
  - Tier 1 raw shared-comms boundary and redaction posture.
- `source_crawl_targets`, `source_crawl_target_runs`, `source_crawl_items`, and `source_crawl_item_attempts`
  - existing extraction run IDs, retry, lease, and ledger substrate.
- `meeting_vault_acl_audits`
  - existing metadata-only audit history.

Do not rebuild:

- Google delegated auth;
- shared communication archive storage;
- extraction retry/backoff;
- SECURITY-002 redaction;
- Foundation sprint UI;
- historical Phase B batch runners.

## New Meeting-Note Auto-Flow

1. Discovery
   - The scheduled meeting current-day crawl finds `Notes by Gemini` and transcript docs for meeting-sync-enabled users.
   - The crawler groups artifacts by normalized meeting key and observed accounts.
   - Human/organizer-owned original Gemini notes are preferred over Crewbert-owned copies.
   - Legacy Crewbert duplicate copies are recorded only as exceptions.

2. Archive
   - Export the original Gemini note content.
   - Store content, content hash, source account, participants, original file ID, observed file IDs, meeting class, privacy profile, and sensitivity metadata in `shared_communication_artifacts`.
   - Embedded or standalone transcript text is stored as a meeting transcript artifact.
   - No duplicate Google Doc is created for archive, search, or proof.

3. Classification
   - Classify each original as:
     - `protected_sensitive`
     - `standard_internal`
     - `broad_non_sensitive`
     - `unknown_unclassified`
   - Classification uses title, meeting shape, participant/guest signals, candidate sensitivity signals, `subject_people`, `min_tier`, and explicit metadata.
   - Unknown notes fail closed into review.

4. Access preflight
   - Run delegated Drive preflight on the original file.
   - Identify owner, Crewbert status, public/domain exposure, direct users, external users, groups, inherited rows, missing access, and owner ambiguity.
   - Record only metadata-safe hashes and counts.

5. Enforcement decision
   - Produce an enforcement item with action:
     - `safe_noop`
     - `add_crewbert_reader`
     - `remove_high_risk_public_or_domain`
     - `protected_lock_required`
     - `review_required`
     - `legacy_exception`
     - `request_access_needed`
     - `owner_ambiguous_blocked`
   - Default implementation mode is report-only until Steve separately approves live Drive mutations.

6. Review and dashboard
   - Every run records processed count, newly archived count, classification split, safe count, queued count, high-risk count, missing Crewbert count, duplicate count, and exception count.
   - Runtime Health or Current Sprint surfaces the latest status and next safe action.

## Source Truth And No Duplicate Google Docs

Rules:

- Original Gemini note is source truth.
- Crewbert-owned copies are never source truth.
- Meeting sync/archive must not call Google Docs/Drive copy APIs for Gemini notes.
- Mirror/search output must be DB-backed or report-only text evidence, not copied Google Docs.
- ACL/enforcement decisions must target originals only.
- If only a Crewbert-owned copy is found and no original is proven, classify as `legacy_exception_original_missing`.

Verifier requirements:

- fail if `scripts/sync-meeting-notes-archive.mjs` can create/copy Drive docs;
- fail if `scripts/mirror-meeting-archive-to-drive.mjs` can write Drive docs in normal mode;
- fail if ACL/enforcement inventory treats Crewbert-owned copies as originals;
- prove originals are preferred for future sync.

## Meeting Classification Rules

Protected:

- leadership/owners meetings;
- performance, compensation, termination, legal, HR, discipline, payroll, or sensitive review meetings;
- undisclosed feedback;
- named-person sensitive discussion;
- artifacts with subject-person sensitive candidates;
- artifacts requiring Tier 1 by `min_tier` or SECURITY-002 sensitivity metadata.

Standard:

- normal internal operating meetings without protected-person evidence;
- huddles or working sessions that are not broad training and do not carry protected signals.

Broad:

- training;
- all-hands;
- workshops;
- sales sessions;
- broad team meetings;
- broadcast/baseline meetings with no real sensitive/person evidence.

Unknown:

- missing classification inputs;
- conflicting sensitivity signals;
- duplicate-only records with no original;
- missing transcript/context where classification cannot be defended.

Unknown stays blocked until classified.

## Participant And Guest Access Policy

Protected originals:

- allowed raw Drive access:
  - file owner/organizer;
  - Crewbert as vault reader;
  - separately approved Tier 1 break-glass raw reader.
- not allowed by default:
  - non-owner participants;
  - external users;
  - front-office/public identity;
  - broad groups;
  - domain-wide access;
  - anyone-with-link/public access.
- if protected raw access is unsafe, the item enters `protected_lock_required` or `review_required`.

Standard originals:

- allowed:
  - owner/organizer;
  - Crewbert;
  - Benson Crew internal participants;
  - specific external guests who are proven participants/invitees and not attached to sensitive/person content.
- flagged:
  - unknown external users;
  - non-participant external users;
  - stale guest access after participant evidence disappears;
  - public-link/domain exposure.

Broad originals:

- allowed:
  - owner/organizer;
  - Crewbert;
  - legitimate internal participants;
  - legitimate external guest participants;
  - approved broad training distribution where the exact group/domain is known and intentional.
- not allowed silently:
  - anyone-with-link/public access;
  - domain-wide access without explicit broad-distribution policy;
  - unknown external users.

Public-link and domain-wide raw exposure is high-risk for every class. It may be lower priority for broad meetings after review, but it is never silently green.

## Protected-Note Lock Or Review Queue

Forward-flow protected notes must not sit in silent unsafe state.

For each protected original:

- if owner is clear and Crewbert is missing, queue `add_crewbert_reader`;
- if public-link or domain exposure is present, queue `remove_high_risk_public_or_domain`;
- if direct/inherited unsafe access exists and authority is clear, queue `protected_lock_required`;
- if inherited source, owner authority, or participant legitimacy is unclear, queue `review_required`;
- if access is missing, queue `request_access_needed`;
- if owner is ambiguous, queue `owner_ambiguous_blocked`.

Implementation may create apply code paths, but live Drive mutation must remain disabled unless the card is explicitly approved for enforcement mode. Report-only mode must still produce the exact operation type, reason, owner hash, file hash, and next action.

## Extraction Stored In DB

The archive/search layer remains PostgreSQL-backed:

- meeting-note content: `shared_communication_artifacts.content_text`;
- transcript content: `shared_communication_artifacts.content_text`;
- integrity: `content_hash`;
- source metadata: original file ID, original owner account, source account, observed accounts, participants, transcript source, sensitivity class, and classification reason in `metadata`;
- run/item state: `source_crawl_targets`, `source_crawl_target_runs`, `source_crawl_items`, and `source_crawl_item_attempts`;
- no search/archive job writes duplicate Google Docs.

SECURITY-002 remains the read boundary for AIOS responses. This card governs raw Drive access and vault health, not broad shared-comms access.

## Daily Dashboard And Audit

Add a daily Meeting Vault status surface, preferably under Runtime Health first.

It must show:

- latest run time and run ID;
- processed originals;
- archived artifacts;
- classification split;
- safe originals;
- Crewbert access enforced or queued;
- protected lock/review queue count;
- public/domain high-risk count;
- standard/broad guest-preserved count;
- legacy duplicate count;
- original-missing count;
- owner-ambiguous count;
- missing-access count;
- failed/blocked count;
- stable report hash;
- next safe action.

No raw titles, Drive links, transcript text, or email addresses should be shown in tracked proof. UI may show readable operator labels only if already allowed by the authenticated Tier 1 admin route.

## Legacy Exception Queue

Historical messy files stop driving manual cleanup batches and move into a bounded queue.

Queue states:

- `legacy_duplicate_copy`
- `original_missing`
- `owner_ambiguous`
- `missing_access`
- `inherited_permission_unresolved`
- `external_guest_unclassified`
- `high_risk_public_or_domain`
- `protected_review_required`
- `blocked_pending_owner_authority`

Each exception stores:

- file hash;
- source file role;
- sensitivity class;
- owner hash;
- reason;
- risk level;
- first seen;
- last seen;
- latest dry-run/report hash;
- proposed next action;
- blocker card if another card owns it.

Legacy exceptions do not become "safe"; they become visible, owned, and excluded from automatic green readiness until their rules allow it.

## When MEETING-VAULT-ACL-001 Can Stop Blocking Foundation

`MEETING-VAULT-ACL-001` can stop blocking Foundation only after `MEETING-VAULT-AUTO-ENFORCEMENT-001` proves all of this:

- new original Gemini notes in the forward enforcement window are discovered, archived to DB, classified, and preflighted automatically;
- no current meeting job can create duplicate Google Docs;
- ACL/enforcement decisions target originals only;
- Crewbert vault access is present or queued with exact owner/action proof for every new original;
- every protected new original is safe, locked, or in a fail-closed review queue with exact blocker reason and owner/action proof;
- public-link and domain-wide raw exposures on new originals are zero or explicitly queued as high-risk blockers;
- broad/training meetings preserve legitimate participant/guest access and are not blanket-scrubbed;
- unknown/unclassified new notes are blocked and named;
- legacy pre-enforcement files are inventoried into the legacy exception queue with counts, risk classes, owner/missing-access/ambiguity classes, and next action;
- Foundation readiness reports the automatic forward-flow status instead of requiring endless manual historical Drive scrubbing;
- proof is metadata-only and `foundation:verify` is green.

Foundation may stop treating old messy files as the active readiness blocker only when they are bounded in the legacy exception queue and the forward system proves it will not silently create new unsafe meeting notes. Any unresolved high-risk public/domain exposure on a current protected original remains blocking.

## Files And Modules To Inspect Before Implementation

- `docs/process/meeting-vault-acl-001-plan.md`
- `docs/process/meeting-vault-acl-001-sensitivity-aware-phase-a.md`
- `docs/process/meeting-vault-acl.md`
- `docs/process/drive-access-request.md`
- `docs/process/security-002-auth-tier-redaction-plan.md`
- `lib/meeting-vault-acl.js`
- `lib/drive-access-preflight.js`
- `lib/meeting-classification.js`
- `lib/meeting-transcripts.js`
- `lib/security-access.js`
- `lib/foundation-db.js`
- `lib/foundation-readiness-gates.js`
- `scripts/sync-meeting-notes-archive.mjs`
- `scripts/mirror-meeting-archive-to-drive.mjs`
- `scripts/meeting-notes-verify.mjs`
- `scripts/process-meeting-vault-acl-check.mjs`
- `scripts/process-foundation-done-test.mjs`
- `scripts/foundation-verify.mjs`
- `server.js`
- `public/foundation.js`
- `public/styles.css`
- `package.json`

## Likely Files To Touch After Approval

- Add `lib/meeting-vault-auto-enforcement.js`.
- Update `lib/meeting-vault-acl.js` to share source-truth, classification, duplicate, and status helpers instead of duplicating policy strings.
- Update `scripts/sync-meeting-notes-archive.mjs` to emit the forward enforcement ledger after archive/classification.
- Add `scripts/process-meeting-vault-auto-enforcement-check.mjs`.
- Update `scripts/process-meeting-vault-acl-check.mjs` so legacy Phase A remains available but no longer drives manual batch sequencing.
- Update `lib/foundation-db.js` with additive tables or JSON-backed helpers for enforcement runs/items and legacy exceptions.
- Update `lib/foundation-readiness-gates.js` and `scripts/process-foundation-done-test.mjs` so the meeting leg reads the automatic enforcement close rule.
- Update `server.js` and `public/foundation.js` only for the daily dashboard/audit surface.
- Update `scripts/foundation-verify.mjs` for structural coverage.
- Update `package.json` with `process:meeting-vault-auto-enforcement-check`.
- Add `docs/process/meeting-vault-auto-enforcement.md`.
- Add `docs/process/approvals/MEETING-VAULT-AUTO-ENFORCEMENT-001.json` only after Steve approves implementation.
- Update rebuild/current-state and build-log closeout only after proof passes.

## Schema And Ledger Needs

Use additive schema only.

Preferred new tables:

- `meeting_vault_enforcement_runs`
  - run ID, policy version, mode, status, source target/run IDs, processed count, action counts, exception counts, report hash, metadata-only summary.
- `meeting_vault_enforcement_items`
  - item ID, run ID, file hash, source role, sensitivity class, owner hash, action, status, risk level, blocker reason, operation type, rollback requirement, metadata.
- `meeting_vault_legacy_exceptions`
  - exception ID, file hash, source role, sensitivity class, owner hash, reason, risk level, status, blocker card, first seen, last seen, latest report hash, next action.

If schema changes are too large for v1, use `meeting_vault_acl_audits.summary` for the first proof and create a follow-up card for first-class tables. Do not block the automatic forward-flow proof on historical dashboard polish.

## Rollback And Fail-Closed Behavior

- Default mode is `report_only`.
- Apply/live enforcement mode must require explicit approval and an operator-controlled flag.
- If classification is unknown, fail closed to review.
- If owner is ambiguous, fail closed to owner-ambiguous exception.
- If Drive preflight cannot list permissions, fail closed to missing-access/request-access-needed.
- If an operation would touch parent folders, inherited permissions, ownership, moves, deletes, or broad windows, fail closed and create a separate scoped card.
- If no-duplicate proof fails, block the card.
- If proof output includes raw content, Drive links, raw email addresses, or meeting text, fail.
- If the daily dashboard cannot load the latest run/audit, readiness remains blocked.

## Acceptance Criteria

- `MEETING-VAULT-AUTO-ENFORCEMENT-001` has a central policy/check layer.
- New Gemini notes flow through discovery, DB archive, classification, Drive preflight, enforcement decision, and audit.
- Original Gemini notes are the only Drive source truth.
- No duplicate Google Docs can be created by meeting archive/search jobs.
- Crewbert access is enforced or queued with exact action proof.
- Protected, standard, broad, and unknown classes have explicit access policy.
- Participant/guest-aware access keeps legitimate broad/training guest access.
- Public-link/domain exposure is high-risk and never silently green.
- Protected-note unsafe access becomes lock/review/action queue, not silent drift.
- Extraction/search content is stored in DB, not copied docs.
- Daily dashboard/audit shows processed notes, actions, and exceptions.
- Legacy messy files are queued separately and do not restart manual cleanup batching.
- Foundation done test no longer names `MEETING-VAULT-ACL-001` only when the close rule above is satisfied.
- No Google Drive permission mutations happen during proof unless a separate live-enforcement approval exists.

## Proof Commands

- `npm run meeting-notes:verify`
- `npm run process:meeting-vault-auto-enforcement-check`
- `npm run process:meeting-vault-acl-check -- --json`
- `npm run process:foundation-done-test -- --report-only`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=MEETING-VAULT-AUTO-ENFORCEMENT-001 --planApprovalRef=docs/process/approvals/MEETING-VAULT-AUTO-ENFORCEMENT-001.json --closeoutKey=meeting-vault-auto-enforcement-v1 --commitRef=HEAD`

## Not Next

- No manual Meeting Vault cleanup batches.
- No Google Drive permission mutation during planning.
- No request-access emails.
- No file deletes.
- No Drive moves.
- No ownership transfers.
- No duplicate Google Docs.
- No Gmail batch.
- No Strategy, Sales expansion, Agent Feedback expansion, Scoper, Agent Factory, broad corpus, video mining, researcher, public access, broad UI polish, or sprint-board redesign.
