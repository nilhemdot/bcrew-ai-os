# MEETING-VAULT-ACL-001 Phase B Approval Packet

Status: human approval packet only. This is not an approval artifact, does not apply changes, does not send request-access emails, and does not close `MEETING-VAULT-ACL-001`.

Sensitivity-aware Phase A dry-run hash: `31c5bb2cab981f1bb19cb49ff3bdf6b0ea19b0fe1ed871b5d7385f025f34ee4d`

Policy version: `meeting-vault-acl-phase-a-sensitivity-v1`

Source addendum: `docs/process/meeting-vault-acl-001-sensitivity-aware-phase-a.md`

Supersedes strict packet hash: `bf950c74c80a1e0f5a2a8848fa2c39e6ecda8d89536770a7b2bf44110a88b8d5`

## Boundary

This packet exists so Steve can review possible Phase B batches. It does not approve a blanket repair.

Not approved by this packet:

- real Google Drive permission mutation;
- request-access email sends;
- adding Crewbert to broad/standard internal files without a proven unsafe exposure reason;
- repairing owner-ambiguous files;
- repairing missing-access files;
- closing `MEETING-VAULT-ACL-001`.

## Phase A Summary

Inventory:

- files scanned: `898`
- scan complete: `yes`
- safe files: `0`
- unsafe files: `514`
- unsafe permission operations: `3888`
- missing Crewbert files: `660`
- missing access files: `14`
- owner-ambiguous files: `224`
- blocked files: `0`

Sensitivity classes:

- `protected_sensitive`: `302`
- `standard_internal`: `501`
- `broad_non_sensitive`: `95`

Owner/preflight split:

| Sensitivity class | Owner-clear | Owner-ambiguous | Missing access |
| --- | ---: | ---: | ---: |
| `protected_sensitive` | `190` | `104` | `8` |
| `standard_internal` | `391` | `104` | `6` |
| `broad_non_sensitive` | `79` | `16` | `0` |

Total proposed operation types from Phase A:

- `add_crewbert_reader`: `884`
- `remove_unsafe_permission`: `3888`
- `request_access`: `14`
- `block_owner_ambiguous`: `224`

## Approval Sequence

Recommended order:

1. Protected owner-clear `add_crewbert_reader`.
2. Protected owner-clear `remove_unsafe_permission`, split by unsafe category.
3. Standard/broad owner-clear `remove_unsafe_permission` only for proven external/link/domain exposure.
4. Re-run Phase A after each approved batch.
5. Keep missing-access and owner-ambiguous files blocked until access/ownership proof changes.

## Batch 1: Protected Add Crewbert Reader

Sensitivity class: `protected_sensitive`

Owner state: owner-clear only

Operation type: `add_crewbert_reader`

Count:

- files: `190`
- operations: `190`
- batch hash: `f4e3b19c08f53bd9d476903cc1ebc7d6356b845e590f86b08cfe6960db1d2105`

Risk level: medium

Why it is eligible:

- protected files should have Crewbert vault access;
- owner/preflight authority is clear;
- operation is additive only;
- role is `reader`;
- no existing human, group, domain, external, or link permission is removed.

Approval wording:

`PHASE B APPROVED for MEETING-VAULT-ACL-001 Batch 1 only: add Crewbert reader to 190 protected_sensitive owner-clear files from dry-run hash 31c5bb2cab981f1bb19cb49ff3bdf6b0ea19b0fe1ed871b5d7385f025f34ee4d, batch hash f4e3b19c08f53bd9d476903cc1ebc7d6356b845e590f86b08cfe6960db1d2105. No removals and no request-access emails are approved.`

Rollback requirements:

- create a local ignored apply manifest before mutation;
- record exact raw file ID and created Crewbert permission ID locally after each add;
- rollback deletes only the Crewbert permissions created by this batch;
- re-run Phase A after rollback.

## Batch 2: Protected Remove Unsafe Permissions

Sensitivity class: `protected_sensitive`

Owner state: owner-clear only

Operation type: `remove_unsafe_permission`

Count:

- files: `172`
- operations: `909`
- permission hashes present: `909`
- permission hashes missing: `0`
- batch hash: `edde121b8a9c07779dfb094103a11376b428302cffeac29fe4f8ae8ae6b5fdeb`

Risk level: high

Unsafe category split:

| Sub-batch | Operations | Risk | Why eligible |
| --- | ---: | --- | --- |
| `unsafe_front_office` | `24` | medium | Front-office AI identity should not retain durable raw access to protected files. |
| `unsafe_anyone` | `2` | high | Link-style raw access is unsafe for protected files. |
| `unsafe_external_user` | `146` | high | External raw access is unsafe for protected files. |
| `unsafe_non_owner_user` | `737` | high | Internal non-owner raw access is not approved for protected files by Phase A. |

Approval wording:

`PHASE B APPROVED for MEETING-VAULT-ACL-001 Batch 2 sub-batch <name> only: remove <count> unsafe permissions from protected_sensitive owner-clear files from dry-run hash 31c5bb2cab981f1bb19cb49ff3bdf6b0ea19b0fe1ed871b5d7385f025f34ee4d, batch hash edde121b8a9c07779dfb094103a11376b428302cffeac29fe4f8ae8ae6b5fdeb. No add_crewbert_reader operations, no owner-ambiguous files, no missing-access files, and no request-access emails are approved.`

Rollback requirements:

- create a local ignored before snapshot with exact file ID, permission ID, permission type, role, and principal;
- remove only permission IDs present in the approved manifest;
- rollback recreates the removed permission from the before snapshot and records the recreated permission ID;
- exclude any operation missing exact rollback data;
- re-run Phase A after apply and after any rollback.

## Batch 3: Standard Internal Unsafe-Exposure Removals

Sensitivity class: `standard_internal`

Owner state: owner-clear only

Operation type: `remove_unsafe_permission`

Count:

- files: `104`
- operations: `380`
- permission hashes present: `380`
- permission hashes missing: `0`
- batch hash: `8a26689696b7609dcf18388614f36c05d7507d0a41a18df56e529603baa1dc53`

Risk level: high

Why this class is included:

- standard internal files are not protected by default;
- this batch includes only proven unsafe exposure reasons, not blanket Crewbert vault enforcement.

Unsafe category split:

| Sub-batch | Operations | Why eligible |
| --- | ---: | --- |
| `unsafe_external_user` | `374` | External raw access is unsafe. |
| `unsafe_anyone` | `5` | Link-style raw access is unsafe. |
| `unsafe_domain` | `1` | Domain-wide raw access is unsafe unless separately approved. |

Approval wording:

`PHASE B APPROVED for MEETING-VAULT-ACL-001 Batch 3 sub-batch <name> only: remove <count> proven unsafe permissions from standard_internal owner-clear files from dry-run hash 31c5bb2cab981f1bb19cb49ff3bdf6b0ea19b0fe1ed871b5d7385f025f34ee4d, batch hash 8a26689696b7609dcf18388614f36c05d7507d0a41a18df56e529603baa1dc53. No add_crewbert_reader operations, no owner-ambiguous files, no missing-access files, and no request-access emails are approved.`

Rollback requirements: same as Batch 2.

## Batch 4: Broad Non-Sensitive Unsafe-Exposure Removals

Sensitivity class: `broad_non_sensitive`

Owner state: owner-clear only

Operation type: `remove_unsafe_permission`

Count:

- files: `14`
- operations: `64`
- permission hashes present: `64`
- permission hashes missing: `0`
- batch hash: `115efd686818df915e0ea9aaf370ac51b70402c8e6d0ac175298be6759555d00`

Risk level: high

Why this class is included:

- broad/training/all-hands style files are not sensitive by default;
- this batch includes only proven external/domain exposure, not blanket cleanup.

Unsafe category split:

| Sub-batch | Operations | Why eligible |
| --- | ---: | --- |
| `unsafe_external_user` | `63` | External raw access is unsafe. |
| `unsafe_domain` | `1` | Domain-wide raw access is unsafe unless separately approved. |

Approval wording:

`PHASE B APPROVED for MEETING-VAULT-ACL-001 Batch 4 sub-batch <name> only: remove <count> proven unsafe permissions from broad_non_sensitive owner-clear files from dry-run hash 31c5bb2cab981f1bb19cb49ff3bdf6b0ea19b0fe1ed871b5d7385f025f34ee4d, batch hash 115efd686818df915e0ea9aaf370ac51b70402c8e6d0ac175298be6759555d00. No add_crewbert_reader operations, no owner-ambiguous files, no missing-access files, and no request-access emails are approved.`

Rollback requirements: same as Batch 2.

## Blocked: Missing Access

Count:

- files: `14`
- `protected_sensitive`: `8`
- `standard_internal`: `6`
- `broad_non_sensitive`: `0`
- operation type: `request_access`
- operations: `14`
- batch hash: `5642d789070f57a7fd2f0ce92b72b29b79c9c790b47bb6a02de3c49c54f6d58a`

Status: blocked

Why blocked:

- current delegated preflight cannot safely read or repair these files;
- request-access emails are not approved;
- permission mutation cannot be planned without fresh metadata.

Allowed next action:

- metadata-only owner/access investigation if separately approved;
- no automated request-access emails;
- rerun Phase A after access changes and produce a new dry-run hash.

## Blocked: Owner Ambiguous

Count:

- files: `224`
- `protected_sensitive`: `104`
- `standard_internal`: `104`
- `broad_non_sensitive`: `16`
- associated operations: `2983`
- batch hash: `9e8a9521ad5a19a723db6e838d4e38d756b4eb780bf1d6b7709b82a5fe41e26b`

Associated operations that remain blocked:

- `block_owner_ambiguous`: `224`
- `add_crewbert_reader`: `224`
- `remove_unsafe_permission`: `2535`

Unsafe category split inside the blocked owner-ambiguous set:

- `unsafe_external_user`: `1191`
- `unsafe_non_owner_user`: `1015`
- `unsafe_front_office`: `104`
- `unsafe_anyone`: `1`
- `unsafe_domain`: `1`
- Crewbert role exceeds approved policy: `223`

Status: blocked

Why blocked:

- owner identity is not exactly proven;
- owner-preserving repair cannot be guaranteed;
- adding or removing permissions could alter the wrong owner-controlled file access.

Allowed next action:

- metadata-only owner-resolution investigation;
- rerun Phase A after owner ambiguity is resolved;
- generate a new dry-run hash before any mutation approval.

## Excluded: Non-Sensitive Crewbert Adds

Count:

- files: `470`
- operations: `470`
- operation type: `add_crewbert_reader`
- sensitivity classes: `standard_internal` and `broad_non_sensitive`
- batch hash: `e58442d8889e9ba3d0fda0abf00070a2ca356215b8034b1da166963e76956258`

Status: excluded from this approval packet

Why excluded:

- missing Crewbert is not itself a proven unsafe exposure for non-sensitive files;
- Steve explicitly did not approve broad blanket ACL cleanup;
- standard/broad files are included above only when specific unsafe external/link/domain exposure is proven.

## Required Recheck Proof

After any approved Phase B batch:

- rerun `npm run process:meeting-vault-acl-check`;
- verify the new Phase A dry-run hash and count deltas;
- rerun `npm run process:foundation-done-test -- --report-only`;
- rerun `npm run backlog:hygiene -- --json`;
- rerun `npm run foundation:verify`;
- keep `MEETING-VAULT-ACL-001` scoped/blocking unless the recheck proves every protected in-scope file safe, every unknown file classified, missing-access/owner-ambiguous blockers resolved, and rollback proof recorded.

## Phase B Approval Artifact Requirements

A real approval artifact must be separate from this packet and must include:

- card: `MEETING-VAULT-ACL-001`;
- phase: `Phase B`;
- approved dry-run hash: `31c5bb2cab981f1bb19cb49ff3bdf6b0ea19b0fe1ed871b5d7385f025f34ee4d`;
- approved batch and sub-batch name;
- approved operation type;
- approved file count and operation count;
- approved batch hash;
- local ignored apply-manifest hash;
- local ignored rollback-manifest hash;
- exact no-email boundary;
- exact exclusion of owner-ambiguous and missing-access files;
- fail-closed rule for dry-run mismatch, owner mismatch, permission mismatch, missing rollback data, API error, or raw-proof leak.

Until that artifact exists and an apply path validates it, no Drive permission mutation is approved.
