# MEETING-VAULT-ACL-001 Phase B Protected External-User Apply Proof

Status: protected-sensitive external-user cleanup applied and rechecked on 2026-05-11; `MEETING-VAULT-ACL-001` remains open/blocking.

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

## 8-Row Cleanup Accounting

Status: partial cleanup applied and rechecked on 2026-05-11.

Approved cleanup scope:

- approved dry-run hash: `78bd36deb206bcf0803b60db69d4b1c8a97e1fa0067d4ab6eee78d26d63f7702`
- approved batch hash: `a8e211b59d47301747b080c26785724235d6379bb4e9d74ee88ac8a37ec7b37b`
- cleanup source: remaining permission rows from prior partial batch result manifest hash `dcf5088822f7205e3a9c3082217932f921b9f36771734398f594c54de21241f4`
- approved scope: `8` `unsafe_external_user` permissions on `2` `protected_sensitive` owner-clear original Gemini meeting files
- not approved: `standard_internal` or `broad_non_sensitive` external removals, add-Crewbert operations, `unsafe_anyone`, `unsafe_domain`, `unsafe_front_office`, `unsafe_non_owner_user`, moves, ownership transfers, deletions, owner-ambiguous files, legacy Crewbert duplicate copies, original-missing blocked files, or request-access emails.

Cleanup manifests:

- local apply manifest hash: `a77a30a9bc94c8a118c197bcb0fb65626b43b28ca5a90c88821e57ba79b44ab8`
- local result manifest hash: `196493d0862f6a12d5285e9173fc85d64c60b478b82643c812c624e718d5dc6d`
- local rollback manifest hash: `1827ec7da42844e491f7f73aba0e494fe2d890f4e92278d7fd1ab16bd48c8a85`
- operations attempted: `8`
- clean removals: `4`
- failed operations: `4`
- rollback operation count: `4`

Clean removals:

| File ref hash | Permission hash | Rollback-proven |
| --- | --- | --- |
| `file:5e9cab2f5df097f5` | `perm:2cbb6ffae1d5921a` | yes |
| `file:5e9cab2f5df097f5` | `perm:797926abd453f07d` | yes |
| `file:7069ddea5d7a130d` | `perm:2cbb6ffae1d5921a` | yes |
| `file:7069ddea5d7a130d` | `perm:797926abd453f07d` | yes |

Failed but disappeared on recheck:

| File ref hash | Permission hash | Failure class | Rollback-proven |
| --- | --- | --- | --- |
| `file:5e9cab2f5df097f5` | `perm:ce4ec99df819aa64` | `file_access_changed` | no |
| `file:7069ddea5d7a130d` | `perm:ce4ec99df819aa64` | `file_access_changed` | no |

Still-present unsafe rows:

| File ref hash | Permission hash | Failure class | Recheck state |
| --- | --- | --- | --- |
| `file:5e9cab2f5df097f5` | `perm:a0546dd06fbcb4aa` | `file_access_changed` | still present |
| `file:7069ddea5d7a130d` | `perm:a0546dd06fbcb4aa` | `file_access_changed` | still present |

Failure class summary:

- `file_access_changed`: `4` failed cleanup rows
- `permission_not_found`: `0`
- `insufficient_permission`: `0`
- `inherited_or_shared_drive_permission`: `0`
- `rate_or_api_transient`: `0`
- `other`: `0`

Cleanup accounting conclusion:

- `4` cleanup rows are clean removals and rollback-proven.
- `2` cleanup rows reached the desired removed state despite failed API results, but they are not rollback-proven.
- `2` cleanup rows remain unsafe and still block `MEETING-VAULT-ACL-001`.

## 2-Row Second Cleanup Accounting

Status: second cleanup applied and rechecked on 2026-05-11.

Approved second cleanup scope:

- approved dry-run hash: `353fe3eb298311510c5cbebf8973fd82f7cd478cde6e30fa06b2099eb59207d2`
- approved batch hash: `ec32b9b0bad0b8328d7cda35dfdedb4bcd899462033de121a808c45790cbb7ce`
- cleanup source: remaining permission rows from prior cleanup result manifest hash `196493d0862f6a12d5285e9173fc85d64c60b478b82643c812c624e718d5dc6d`
- approved scope: `2` `unsafe_external_user` permissions on `2` `protected_sensitive` owner-clear original Gemini meeting files
- not approved: `standard_internal` or `broad_non_sensitive` external removals, add-Crewbert operations, `unsafe_anyone`, `unsafe_domain`, `unsafe_front_office`, `unsafe_non_owner_user`, moves, ownership transfers, deletions, owner-ambiguous files, legacy Crewbert duplicate copies, original-missing blocked files, or request-access emails.

Second cleanup manifests:

- local apply manifest hash: `34a915fd4da4022dd57750fd4d06f59f8e0b94eac13a44f202c6cb179430d2c5`
- local result manifest hash: `a970a16868edb7fb43972c2a010d3cc581d16a6bd16d0aa135ecf117c4faf715`
- local rollback manifest hash: `5ab48d961b1b17360ab8a42d38e1d7a5686123d63046e67ac684d1c1188afefd`
- operations attempted: `2`
- clean removals: `2`
- failed operations: `0`
- rollback operation count: `2`

Clean removals:

| File ref hash | Permission hash | Rollback-proven |
| --- | --- | --- |
| `file:5e9cab2f5df097f5` | `perm:a0546dd06fbcb4aa` | yes |
| `file:7069ddea5d7a130d` | `perm:a0546dd06fbcb4aa` | yes |

Second cleanup accounting conclusion:

- The `2` still-present protected-sensitive external-user rows from the prior cleanup proof were removed.
- The `2` removals are rollback-proven by the local ignored rollback manifest.
- No standard/internal or broad/non-sensitive rows were touched.
- No request-access emails, moves, ownership transfers, deletions, or add-Crewbert operations were sent/applied.

## Latest Recheck

Command:

```bash
npm run process:meeting-vault-acl-check -- --json
```

Result:

- status: `blocked_phase_b_required`
- findings: `0`
- recheck dry-run hash after the 2-row second cleanup: `5c61d76a66bd742d218013ebff8a394584a73ec8bba2709c17308e07fdef4830`
- protected-sensitive owner-clear original `unsafe_external_user` rows from this cleanup set remaining: `0`
- current Phase A counts: `898` files; `286` safe; `518` unsafe; `5335` unsafe permissions; `0` missing Crewbert; `0` missing access; `225` owner-ambiguous; `94` blocked.
- current proposed operation types: `5335` `remove_unsafe_permission`; `225` `add_crewbert_reader`; `225` `block_owner_ambiguous`.
- source file roles: `771` original Gemini notes; `33` legacy Crewbert duplicate copies; `94` original-missing blocked refs.

Readiness remains blocked on `MEETING-VAULT-ACL-001`; this cleanup does not close the card.
