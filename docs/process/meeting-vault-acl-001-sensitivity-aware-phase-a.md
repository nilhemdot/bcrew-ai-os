# MEETING-VAULT-ACL-001 Sensitivity-Aware Phase A Addendum

Status: current Sprint Ready addendum for the returned `MEETING-VAULT-ACL-001` Phase A dry-run. This does not alter the approved `DRIVE-ACCESS-REQUEST-001` plan artifact at `docs/process/meeting-vault-acl-001-plan.md` and does not approve Phase B.

Current truth:

- `FOUNDATION-SPRINT-SYSTEM-001` is shipped, so returned meeting ACL work must pass the Current Sprint existing-work/doctrine check before implementation.
- `DRIVE-ACCESS-REQUEST-001` is closed for delegated Drive dry-run/preflight only.
- The prior strict Phase A dry-run hash `bf950c74c80a1e0f5a2a8848fa2c39e6ecda8d89536770a7b2bf44110a88b8d5` is evidence only. It is not approval-ready because it treated every raw meeting file as protected.
- The earlier sensitivity-aware Phase A dry-run hash `31c5bb2cab981f1bb19cb49ff3bdf6b0ea19b0fe1ed871b5d7385f025f34ee4d` is superseded by the source-truth Phase A repair because it mixed original Gemini notes with legacy Crewbert duplicate copies.
- Historical Phase B permission mutations have been applied only through separate explicit approvals and proof. No approval exists for any next batch tied to the current source-truth dry-run hash.

## Sprint Ready Check

Existing meeting sensitivity doctrine:

- `docs/specs/2026-04-23-auth-tiers-vault.md` defines `subject_people`, `sensitivity`, `min_tier`, and subject-person redaction.
- `docs/process/security-002-auth-tier-redaction-plan.md` defines fail-closed `subject_people` / `sensitivity` / `min_tier` enforcement and unknown-sensitivity blocking for protected reads.
- `lib/security-access.js` implements server-derived actor context, tier/role checks, record access evaluation, and stable redacted response shapes.
- `lib/meeting-classification.js` already distinguishes broadcast/training shapes from discussion and sensitive-title candidates.
- `scripts/extract-meeting-transcript-candidates.mjs` already treats training, all-hands, huddles, sales sessions, workshops, and broad team meetings as neutral or positive unless content contains sensitive people discussion.

Existing meeting extraction scripts:

- Reuse `scripts/sync-meeting-notes-archive.mjs` for raw meeting-note/transcript discovery and `meetingClass`, `privacyProfile`, and `sensitiveMeetingCandidate` metadata.
- Reuse `scripts/extract-meeting-transcript-candidates.mjs` and `lib/shared-candidate-extraction.js` for candidate-level `subjectPeople`, `sensitivity`, and `minTier` signals.
- Reuse `scripts/meeting-notes-verify.mjs`, `scripts/report-meeting-transcript-gaps.mjs`, and `scripts/verify-recent-meeting-transcript-gaps.mjs` for meeting archive health.

Existing security/redaction code:

- Reuse `lib/security-access.js` and SECURITY-002 semantics. Raw Drive ACL risk must not contradict AIOS-side sensitivity and redaction doctrine.
- Do not reopen SECURITY-002 or broaden external/public access.

Existing Drive preflight output:

- Reuse `lib/drive-access-preflight.js`, `drive_access_preflight_runs`, and `drive_access_preflight_items`.
- Treat the old strict dry-run packet as historical evidence only.

What should be reused:

- Existing metadata fields: `meetingClass`, `privacyProfile`, `sensitiveMeetingCandidate`, candidate `subjectPeople`, candidate `sensitivity`, and candidate `minTier`.
- Existing Drive preflight and metadata-only proof ledger.
- Existing Current Sprint/backlog overlay for execution control.

What must not be rebuilt:

- Google Drive delegated helpers.
- Meeting archive sync or extraction.
- SECURITY-002 tier/redaction.
- Current Sprint/backlog infrastructure.
- Phase B apply, request-access emails, broad Drive folder cleanup, filtered shared-comms access, or UI polish.

Exact remaining gap:

- Phase A must classify raw meeting files by sensitivity before repair planning.
- Phase A must treat original Gemini meeting notes as source of truth, identify legacy Crewbert duplicate copies separately, and make ACL repair decisions against originals only.
- A new source-truth dry-run hash must exist before any Phase B approval packet can be considered.

Over-broad risk:

- Do not generate another blanket permission-repair packet. Phase A must distinguish broad/non-sensitive internal meetings from protected sensitive meetings, and unknown/unclassified files must stay blocked until classified.
- Do not repair legacy duplicate copies as if they were originals. If a Crewbert-owned copy has no proven original Gemini note for the meeting key, block it until source truth is corrected.

## Source-Truth And Sensitivity Rules

Source of truth:

- original Gemini meeting notes are the ACL decision targets;
- meeting sync/archive must not create duplicate Google Docs for Gemini notes;
- archive/search stores metadata, content, and hashes in the database, not copied Drive docs;
- legacy Crewbert-owned duplicate copies are detected and counted separately;
- Crewbert access must be guaranteed on originals, not only on duplicate copies;
- protected originals require strict owner-plus-Crewbert access;
- future meeting-note sync must prefer non-Crewbert-owned Gemini originals over Crewbert-owned copies for archive metadata.

Broad/non-sensitive by default:

- training;
- all-hands;
- huddles;
- workshops;
- sales sessions;
- broad team meetings.

Protected when evidence indicates:

- leadership or owners-sensitive discussion;
- performance concerns;
- compensation, payroll, or employment terms;
- termination risk;
- undisclosed feedback;
- legal or HR discussion;
- named-person sensitive discussion;
- candidate metadata with protected `sensitivity`, subject-person evidence, or non-broadcast `minTier` 1 signals.

Broad/team meeting safeguard:

- a training, huddle, sales session, workshop, all-hands, or broad team meeting does not become protected from neutral `minTier` 1 metadata alone;
- real protected sensitivity, subject-person evidence, protected title/meeting privacy signal, or sensitive discussion evidence still makes it protected.

Unknown/unclassified:

- fail closed;
- no claim of safe raw access;
- block until classification is repaired and a new dry-run hash is produced.

## Current Phase A Dry-Run Result

Latest source-truth dry-run:

- hash: `c97e5362819b31b7568aa8db90d24b5116edb417206f07dbaf23518af3a8bb68`;
- scanned files: 895;
- `standard_internal`: 402;
- `broad_non_sensitive`: 43;
- `protected_sensitive`: 450;
- status: `blocked_phase_b_required`;
- card can close: no.

Source file roles:

- `original_gemini_note`: 776;
- `legacy_crewbert_duplicate_copy`: 25;
- `original_gemini_note_missing`: 94.

Counts:

- safe: 278;
- unsafe: 518;
- unsafe permissions: 5335;
- missing Crewbert on originals: 5;
- missing access: 0;
- owner ambiguous: 225;
- blocked: 94.

Proposed operation types:

- `block_owner_ambiguous`;
- `add_crewbert_reader`;
- `remove_unsafe_permission`.

This output is metadata-only proof. It is not permission-mutation approval.

## Approval Boundary

Not approved:

- MEETING-VAULT-ACL-001 Phase B;
- adding Drive permissions;
- removing Drive permissions;
- transferring ownership;
- sending request-access emails.

Next approval needed:

- a separate Phase B permission-mutation approval artifact tied to current dry-run hash `c97e5362819b31b7568aa8db90d24b5116edb417206f07dbaf23518af3a8bb68`, with safe original-note batches, rollback path, recheck proof, and exact operation scope.

## Historical Phase B Add-Crewbert Batch Proposal

Status: applied after separate explicit Phase B approval. This section is historical proof context, not a current approval artifact.

Recommended next batch:

- batch name: `source_truth_originals_missing_crewbert_add_reader_v1`;
- dry-run hash: `b25bbd105fcdca10971c497b22038565d5e4d4fa8a90b0b13b766232af420c90`;
- batch hash: `4cd211642c2ff8d842d20a6d798cb4a8c5a2105a1fc44bed7de3bdb97e565f70`;
- operation type: `add_crewbert_reader`;
- role: `reader`;
- send notification email: no;
- scope: original Gemini notes only, owner-clear, readable, missing Crewbert;
- file count: 418;
- operation count: 418.

Sensitivity split:

- `standard_internal`: 282;
- `protected_sensitive`: 106;
- `broad_non_sensitive`: 30.

Residual risk after this add-only batch:

- 213 selected files already have unsafe permissions and will still require a later removal batch after Crewbert access is guaranteed on originals;
- 205 selected files have no unsafe permissions and should become safe if the add succeeds and no external permissions drift;
- no legacy Crewbert duplicate copies, owner-ambiguous files, original-missing blocked files, removals, moves, ownership transfers, deletions, or request-access emails are included.

Approval wording needed:

`PHASE B APPROVED for MEETING-VAULT-ACL-001 source-truth originals add-Crewbert batch only: add Crewbert reader access with sendNotificationEmail=false to 418 owner-clear original Gemini meeting files missing Crewbert from dry-run hash b25bbd105fcdca10971c497b22038565d5e4d4fa8a90b0b13b766232af420c90, batch hash 4cd211642c2ff8d842d20a6d798cb4a8c5a2105a1fc44bed7de3bdb97e565f70. No removals, no moves, no ownership transfers, no deletions, no request-access emails, no owner-ambiguous files, no legacy Crewbert duplicate copies, and no original-missing blocked files are approved.`

Rollback proof required:

- apply manifest records only metadata plus local exact file IDs and created permission IDs under ignored `store/meeting-vault-acl/`;
- rollback deletes only the Crewbert reader permissions created by this approved batch;
- rollback must not remove pre-existing Crewbert permissions;
- rollback runs with `sendNotificationEmail=false`;
- rollback plan hash set: `b4abf2599e2d0d967c54357cded6d414269005ca30d7a51de6f9b50ca3cfc6ae`.

Recheck proof required:

- rerun source-truth Phase A after apply;
- confirm live dry-run hash changed because the approved add operations were applied;
- confirm `missingCrewbertCount` for original Gemini notes is 0, unless external drift creates a new blocker;
- confirm remaining add-Crewbert operations, if any, are only owner-ambiguous or otherwise blocked and not part of the approved batch;
- confirm no emails, removals, moves, ownership transfers, deletions, or duplicate-copy repairs occurred;
- run `npm run process:meeting-vault-acl-check -- --json` and `npm run foundation:verify`.

## Later Phase: Legacy Duplicate Cleanup

Duplicate cleanup is separate future work after original Gemini meeting notes are repaired.

Required later scope:

- inventory legacy Crewbert duplicate Google Docs separately from originals;
- map each duplicate to its original Gemini note and source DB artifact using meeting key, source ID, artifact ID, original file metadata, content hash, and archive metadata;
- propose delete/archive cleanup batches with exact counts, export proof, rollback path, and approval wording;
- prove no duplicate is deleted or archived unless its original and source DB artifact are mapped and rechecked.

Not approved now:

- deleting duplicate docs;
- moving duplicate docs;
- ownership transfers;
- permission mutation on duplicate copies;
- treating duplicate copies as ACL source of truth.

## Proof Commands

- `npm run meeting-notes:verify`
- `npm run process:drive-access-request-check`
- `npm run process:meeting-vault-acl-check`
- `npm run process:foundation-done-test -- --report-only`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

Expected readiness result:

- Foundation remains `not_ready`.
- The only blocking card should be `MEETING-VAULT-ACL-001`.
- `MEETING-VAULT-ACL-001` remains scoped/blocking until Phase A proves every in-scope file safe or Phase B is separately approved, applied, rechecked, and rollback-proofed.
