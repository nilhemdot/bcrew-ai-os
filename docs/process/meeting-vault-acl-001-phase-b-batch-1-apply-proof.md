# MEETING-VAULT-ACL-001 Phase B Batch 1 Apply Proof

Status: applied and rechecked on 2026-05-10.

This proof is metadata-only. Raw Drive file IDs, permission IDs, and per-file manifests are stored only under ignored local storage at `store/meeting-vault-acl/`.

## Approval

- Approval artifact: `docs/process/approvals/MEETING-VAULT-ACL-001-PHASE-B-BATCH-1.json`
- Approved dry-run hash: `31c5bb2cab981f1bb19cb49ff3bdf6b0ea19b0fe1ed871b5d7385f025f34ee4d`
- Approved batch hash: `f4e3b19c08f53bd9d476903cc1ebc7d6356b845e590f86b08cfe6960db1d2105`
- Approved operation: `add_crewbert_reader`
- Approved scope: `190` `protected_sensitive` owner-clear files
- Not approved: removals, request-access emails, owner-ambiguous files, missing-access files, standard/broad Crewbert adds.

## Apply Manifest

- Local apply manifest hash: `b4e528efcd9d44a41faf0fde3a6b8956732d7ef436846e72b19998ee43e2fcb8`
- Local result manifest hash: `d1f33cbc43549ec05f82fe2781c6b43e3f642d767ce5d73b9bef7aba58f56bef`
- Local rollback manifest hash: `a034f24f5c9230ec85d07ac3d00fc792f07c608e1817c9fe42f923764433f24c`
- Files processed: `190`
- New Crewbert reader permissions created: `128`
- Already Crewbert-owned no-op files: `62`
- Failed operations: `0`
- Request-access emails sent: `0`
- Permission removals applied: `0`

Rollback proof:

- Rollback operation count: `128`
- Rollback operation type: delete only the Crewbert reader permissions created by this batch.
- Rollback explicitly excludes owner permissions, including the `62` files already owned by Crewbert.
- Rollback command shape: `npm run process:meeting-vault-acl-apply-batch -- --rollback --rollbackManifest=<local ignored rollback manifest>`

## Recheck

Command:

```bash
npm run process:meeting-vault-acl-check -- --json
```

Result:

- status: `blocked_phase_b_required`
- findings: `0`
- recheck dry-run hash: `758e60d077e28f369b5f5c6774bf975152a0c1add77d0e615da451bf12932138`
- `protected_sensitive` owner-clear `add_crewbert_reader` remaining: `0`
- protected owner-clear states after Batch 1: `172` unsafe, `18` safe
- Foundation readiness remains blocked by remaining unsafe permissions, missing access, owner ambiguity, and non-approved Crewbert gaps.

This does not close `MEETING-VAULT-ACL-001`.
