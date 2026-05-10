# MEETING-VAULT-ACL-001 Sensitivity-Aware Phase A Addendum

Status: current Sprint Ready addendum for the returned `MEETING-VAULT-ACL-001` Phase A dry-run. This does not alter the approved `DRIVE-ACCESS-REQUEST-001` plan artifact at `docs/process/meeting-vault-acl-001-plan.md` and does not approve Phase B.

Current truth:

- `FOUNDATION-SPRINT-SYSTEM-001` is shipped, so returned meeting ACL work must pass the Current Sprint existing-work/doctrine check before implementation.
- `DRIVE-ACCESS-REQUEST-001` is closed for delegated Drive dry-run/preflight only.
- The prior strict Phase A dry-run hash `bf950c74c80a1e0f5a2a8848fa2c39e6ecda8d89536770a7b2bf44110a88b8d5` is evidence only. It is not approval-ready because it treated every raw meeting file as protected.
- No Google Drive permission mutation, request-access email, or Phase B approval exists.

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
- A new sensitivity-aware dry-run hash must exist before any Phase B approval packet can be considered.

Over-broad risk:

- Do not generate another blanket permission-repair packet. Phase A must distinguish broad/non-sensitive internal meetings from protected sensitive meetings, and unknown/unclassified files must stay blocked until classified.

## Sensitivity Rules

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
- candidate metadata with protected `sensitivity`, `subjectPeople`, or `minTier` 1 signals.

Unknown/unclassified:

- fail closed;
- no claim of safe raw access;
- block until classification is repaired and a new dry-run hash is produced.

## Phase A Dry-Run Result

Latest sensitivity-aware dry-run:

- hash: `31c5bb2cab981f1bb19cb49ff3bdf6b0ea19b0fe1ed871b5d7385f025f34ee4d`;
- scanned files: 898;
- `standard_internal`: 501;
- `broad_non_sensitive`: 95;
- `protected_sensitive`: 302;
- status: `blocked_phase_b_required`;
- card can close: no.

Counts:

- safe: 0;
- unsafe: 514;
- unsafe permissions: 3888;
- missing Crewbert: 660;
- missing access: 14;
- owner ambiguous: 224;
- blocked: 0.

Proposed operation types:

- `block_owner_ambiguous`;
- `add_crewbert_reader`;
- `remove_unsafe_permission`;
- `request_access`.

This output is metadata-only proof. It is not permission-mutation approval.

## Approval Boundary

Not approved:

- MEETING-VAULT-ACL-001 Phase B;
- adding Drive permissions;
- removing Drive permissions;
- transferring ownership;
- sending request-access emails.

Next approval needed:

- a separate Phase B permission-mutation approval artifact tied to dry-run hash `31c5bb2cab981f1bb19cb49ff3bdf6b0ea19b0fe1ed871b5d7385f025f34ee4d`, with safe batches, rollback path, and exact operation scope.

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
