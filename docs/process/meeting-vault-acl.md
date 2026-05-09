# MEETING-VAULT-ACL-001 Phase A Dry-Run

Status: Phase A dry-run implementation only. The card remains scoped/blocking unless the dry-run proves every in-scope raw meeting file is already safe.

Policy version: `meeting-vault-acl-phase-a-v1`

Phase A inventories raw meeting-note and transcript Drive file refs, applies the owner-preserving ACL policy, detects unsafe shares and missing Crewbert access, emits a stable dry-run hash, records a metadata-only audit, and proves the apply path fails closed without a separate Phase B approval artifact.

## Close Rule

`MEETING-VAULT-ACL-001` can close only when one of these is true:

- every in-scope file is already safe from Phase A proof; or
- Phase B is separately approved against the Phase A dry-run hash, applied, rechecked, and backed by rollback proof.

If Phase A finds unsafe shares, missing Crewbert access, missing read access, owner ambiguity, inherited/Shared Drive uncertainty, or an incomplete permission scan, the card stays scoped/blocking.

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
