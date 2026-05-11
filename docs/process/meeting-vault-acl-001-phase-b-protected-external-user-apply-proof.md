# MEETING-VAULT-ACL-001 Phase B Protected External-User Apply Proof

Status: partially applied and rechecked on 2026-05-11.

This proof is metadata-only. Raw Drive file IDs, permission IDs, principals, and per-file manifests are stored only under ignored local storage at `store/meeting-vault-acl/`.

## Approval

- Approval artifact: `docs/process/approvals/MEETING-VAULT-ACL-001-PHASE-B-PROTECTED-EXTERNAL-USER-REMOVAL.json`
- Approved dry-run hash: `3e1ce685acfcc95bd6d42a891a50befdb17260ab6e8500bd2c775a7d1faebf6c`
- Approved batch hash: `dd4428a2f453e5b6b632d2e18235da18dae36281487ffe9dc75437617b196f52`
- Approved operation: `remove_unsafe_permission`
- Approved permission category: `unsafe_external_user`
- Approved scope: `137` operations on `30` `protected_sensitive` owner-clear original Gemini meeting files
- Not approved: `standard_internal` or `broad_non_sensitive` external removals, `add_crewbert_reader`, `unsafe_anyone`, `unsafe_domain`, `unsafe_front_office`, `unsafe_non_owner_user`, moves, ownership transfers, deletions, owner-ambiguous files, legacy Crewbert duplicate copies, original-missing blocked files, or request-access emails.

## Apply Manifest

- Local apply manifest hash: `1ae0c4adc311f15cc21699df06eec8122d873ae17a6cf075e76b7a781aedd363`
- Local result manifest hash: `dcf5088822f7205e3a9c3082217932f921b9f36771734398f594c54de21241f4`
- Local rollback manifest hash: `15cbe3838efd721208c935097158993f317ded49eccee8eb0075f5c7d5b9bef3`
- Operations attempted: `137`
- Permissions removed with success result: `127`
- Failed operations: `10`
- Skipped operations: `0`
- Request-access emails sent: `0`
- Add-Crewbert operations applied: `0`
- Other removal categories applied: `0`

Rollback proof:

- Rollback operation count: `127`
- Rollback operation type: recreate only the exact external-user permissions removed with success result by this batch.
- Rollback command shape: recreate from the local ignored rollback manifest captured under `store/meeting-vault-acl/`.
- The `10` failed rows do not have rollback operations because the apply result did not prove successful removal at mutation time.

## Failure Accounting

The `10` failed removal rows were on `2` protected-sensitive owner-clear original file refs. Read-only recheck showed `8` of those failed permission rows still present and `2` no longer present.

Failure class summary:

- `file_access_changed`: `10`
- `permission_not_found`: `0`
- `insufficient_permission`: `0`
- `inherited_or_shared_drive_permission`: `0`
- `rate_or_api_transient`: `0`
- `other`: `0`

Classification basis: the approved apply actor now receives file-not-found/no-access for both file refs, while a fallback governed account can still read the files and confirm the remaining permission rows. Current permission details for the `8` still-present rows do not mark them as inherited, and the files did not present as shared-drive-backed in the read-only accounting pass. This makes the batch failure an apply-actor file-access change, not a permission-not-found, inherited/shared-drive, insufficient-permission, or transient-rate class.

Remaining unsafe external permissions from failed rows:

| File ref hash | Remaining failed permission rows |
| --- | ---: |
| `file:5e9cab2f5df097f5` | `4` |
| `file:7069ddea5d7a130d` | `4` |

Permission rows still present:

| File ref hash | Permission hash |
| --- | --- |
| `file:5e9cab2f5df097f5` | `perm:2cbb6ffae1d5921a` |
| `file:5e9cab2f5df097f5` | `perm:797926abd453f07d` |
| `file:5e9cab2f5df097f5` | `perm:a0546dd06fbcb4aa` |
| `file:5e9cab2f5df097f5` | `perm:ce4ec99df819aa64` |
| `file:7069ddea5d7a130d` | `perm:2cbb6ffae1d5921a` |
| `file:7069ddea5d7a130d` | `perm:797926abd453f07d` |
| `file:7069ddea5d7a130d` | `perm:a0546dd06fbcb4aa` |
| `file:7069ddea5d7a130d` | `perm:ce4ec99df819aa64` |

Failed permission rows no longer present on recheck:

| File ref hash | Permission hash |
| --- | --- |
| `file:5e9cab2f5df097f5` | `perm:239a07716021450b` |
| `file:7069ddea5d7a130d` | `perm:239a07716021450b` |

Failure class by failed row:

| File ref hash | Permission hash | Failure class | Recheck state |
| --- | --- | --- | --- |
| `file:5e9cab2f5df097f5` | `perm:239a07716021450b` | `file_access_changed` | no longer present |
| `file:5e9cab2f5df097f5` | `perm:2cbb6ffae1d5921a` | `file_access_changed` | still present |
| `file:5e9cab2f5df097f5` | `perm:797926abd453f07d` | `file_access_changed` | still present |
| `file:5e9cab2f5df097f5` | `perm:a0546dd06fbcb4aa` | `file_access_changed` | still present |
| `file:5e9cab2f5df097f5` | `perm:ce4ec99df819aa64` | `file_access_changed` | still present |
| `file:7069ddea5d7a130d` | `perm:239a07716021450b` | `file_access_changed` | no longer present |
| `file:7069ddea5d7a130d` | `perm:2cbb6ffae1d5921a` | `file_access_changed` | still present |
| `file:7069ddea5d7a130d` | `perm:797926abd453f07d` | `file_access_changed` | still present |
| `file:7069ddea5d7a130d` | `perm:a0546dd06fbcb4aa` | `file_access_changed` | still present |
| `file:7069ddea5d7a130d` | `perm:ce4ec99df819aa64` | `file_access_changed` | still present |

Accounting conclusion:

- `2` failed rows appear to have reached the desired removed state despite the API failure result.
- Those `2` rows are not counted as rollback-proven because no rollback operation was captured for failed rows.
- The batch is therefore not cleanly complete and must remain blocked until the remaining `8` protected-sensitive external permissions are separately handled or explicitly accepted as blocked.

## Recheck

Command:

```bash
npm run process:meeting-vault-acl-check -- --json
```

Result:

- status: `blocked_phase_b_required`
- findings: `0`
- recheck dry-run hash: `78bd36deb206bcf0803b60db69d4b1c8a97e1fa0067d4ab6eee78d26d63f7702`
- protected-sensitive owner-clear original `unsafe_external_user` remaining: `8` operations / `2` files
- `standard_internal` owner-clear original `unsafe_external_user` remaining: `370` operations / `95` files
- `broad_non_sensitive` owner-clear original `unsafe_external_user` remaining: `63` operations / `13` files
- remaining owner-clear original removal categories:
  - `unsafe_external_user`: `441`
  - `unsafe_non_owner_user`: `1786`

Readiness remains blocked on `MEETING-VAULT-ACL-001`; this partial batch does not close the card.
