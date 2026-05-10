# MEETING-VAULT-ACL-001 Phase A Dry-Run

Status: Phase A dry-run implementation only. The card remains scoped/blocking unless the dry-run proves every in-scope raw meeting file is already safe.

Policy version: `meeting-vault-acl-phase-a-sensitivity-v1`

Phase A inventories raw meeting-note and transcript Drive file refs, applies the owner-preserving sensitivity-aware ACL policy, detects unsafe shares and missing Crewbert access, emits a stable dry-run hash, records a metadata-only audit, and proves the apply path fails closed without a separate Phase B approval artifact. The current sensitivity-aware Sprint Ready addendum lives at `docs/process/meeting-vault-acl-001-sensitivity-aware-phase-a.md`; the original approved `DRIVE-ACCESS-REQUEST-001` plan artifact remains immutable at `docs/process/meeting-vault-acl-001-plan.md`.

## Sensitivity Rule

Training, all-hands, huddles, workshops, sales sessions, and broad team meetings are not sensitive by default.

Leadership, owners, performance, compensation, termination, undisclosed-feedback, legal/HR, or named-person sensitive discussion is protected.

Unknown/unclassified files stay blocked until classified.

Protected raw meeting files use strict owner-plus-Crewbert access. Broad/non-sensitive internal meeting files do not trigger blanket cleanup of internal non-owner raw access.

## Close Rule

`MEETING-VAULT-ACL-001` can close only when one of these is true:

- every in-scope file is already safe from Phase A proof; or
- Phase B is separately approved against the Phase A dry-run hash, applied, rechecked, and backed by rollback proof.

If Phase A finds unsafe shares, missing Crewbert access, missing read access, owner ambiguity, inherited/Shared Drive uncertainty, or an incomplete permission scan, the card stays scoped/blocking.

If Phase A finds unknown/unclassified files, the card stays scoped/blocking until classification is repaired and a new sensitivity-aware dry-run hash exists.

## Latest Sensitivity-Aware Dry Run

Generated: 2026-05-10

Dry-run hash: `31c5bb2cab981f1bb19cb49ff3bdf6b0ea19b0fe1ed871b5d7385f025f34ee4d`

Result: `blocked_phase_b_required`

Inventory:

- in-scope files scanned: `898`
- inventory complete: `yes`

Sensitivity classes:

- `standard_internal`: `501`
- `broad_non_sensitive`: `95`
- `protected_sensitive`: `302`

ACL result counts:

- safe: `0`
- unsafe: `514`
- missing Crewbert: `660`
- missing access: `14`
- owner ambiguous: `224`
- blocked/unclassified: `0`

Proposed operation types:

- `block_owner_ambiguous`
- `add_crewbert_reader`
- `remove_unsafe_permission`
- `request_access`

This is proof only. It does not approve Phase B, mutate Drive permissions, or send request-access emails.

## Not Approved

- real Google Drive permission mutations;
- request-access emails;
- adding Crewbert to files;
- removing unsafe permissions;
- ownership transfer.

## Proof

- `npm run process:meeting-vault-acl-check`
- `npm run process:foundation-done-test -- --report-only`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
