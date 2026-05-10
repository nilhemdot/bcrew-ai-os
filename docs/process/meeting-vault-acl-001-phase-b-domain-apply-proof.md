# MEETING-VAULT-ACL-001 Phase B Domain Apply Proof

Status: applied and rechecked on 2026-05-10.

This proof is metadata-only. Raw Drive file IDs, permission IDs, principals, and per-file manifests are stored only under ignored local storage at `store/meeting-vault-acl/`.

## Approval

- Approval artifact: `docs/process/approvals/MEETING-VAULT-ACL-001-PHASE-B-DOMAIN-REMOVAL.json`
- Approved dry-run hash: `2770617db5fa4013aa25c41e5f42845a37f52eef84906d2140409af6ad1ce60c`
- Approved batch hash: `79c879769805e137b6f2efcfd0ac9325bde08a034ad1181dd572228ae8e2b382`
- Approved operation: `remove_unsafe_permission`
- Approved permission category: `unsafe_domain`
- Approved scope: `1` operation on `1` `protected_sensitive` owner-clear original Gemini meeting file
- Not approved: `add_crewbert_reader`, `unsafe_anyone`, `unsafe_external_user`, `unsafe_front_office`, `unsafe_non_owner_user`, moves, ownership transfers, deletions, owner-ambiguous files, legacy Crewbert duplicate copies, original-missing blocked files, or request-access emails.

## Apply Manifest

- Local apply manifest hash: `f56b85e9cf2314f1bf96a4e7df129b918037a678693232a621c32d3469a321fa`
- Local result manifest hash: `070be01242038d84a51e45356ca9a5bebc8afd9257202f4142ff0f29219e17df`
- Local rollback manifest hash: `89d56a311b3813c240be8eb7ac7d572a33a002cec347b94cd7766da5dff2670d`
- Operations attempted: `1`
- Permissions removed: `1`
- Failed operations: `0`
- Skipped operations: `0`
- Request-access emails sent: `0`
- Add-Crewbert operations applied: `0`
- Other removal categories applied: `0`

Rollback proof:

- Rollback operation count: `1`
- Rollback operation type: recreate only the exact domain permission removed by this batch.
- Rollback command shape: `npm run process:meeting-vault-acl-domain-batch -- --rollback --rollbackManifest=<local ignored rollback manifest>`

## Recheck

Command:

```bash
npm run process:meeting-vault-acl-check -- --json
```

Result:

- status: `blocked_phase_b_required`
- findings: `0`
- recheck dry-run hash: `6511fd575fc43be2648d722418c90f9d815f33245c8660d4fd44306d25257ff4`
- owner-clear original `unsafe_domain` remaining: `0`
- remaining owner-clear original removal categories:
  - `unsafe_non_owner_user`: `1786`
  - `unsafe_external_user`: `570`
  - `unsafe_front_office`: `33`

Readiness remains blocked on `MEETING-VAULT-ACL-001`; this batch does not close the card.
