# MEETING-VAULT-ACL-001 Phase B Standard-Internal ZahndTeam Apply Proof

Status: partial apply, partial cleanup, and recheck on 2026-05-11; `MEETING-VAULT-ACL-001` remains open/blocking.

This proof is metadata-only. Raw Drive file IDs, permission IDs, principals, and per-file manifests are stored only under ignored local storage at `store/meeting-vault-acl/`.

## Approval

- Approval artifact: `docs/process/approvals/MEETING-VAULT-ACL-001-PHASE-B-STANDARD-INTERNAL-ZAHNDTEAM-EXTERNAL-USER-REMOVAL.json`
- Approved dry-run hash: `c97e5362819b31b7568aa8db90d24b5116edb417206f07dbaf23518af3a8bb68`
- Approved batch hash: `75f1ac6a23c2e9b6240a5688a5185e61a89a3697d0e56efeb30d2d2dc6fc7692`
- Live scope hash recorded by apply manifest: `1ea6bd33fde97d0a8bfb6d0d2abc1a306b11a6ee0e3c402dea8822dc2d838c2d`
- Approved operation: `remove_unsafe_permission`
- Approved permission category: `unsafe_external_user`
- Approved principal domain: `zahndteam.ca`
- Approved scope: `357` operations on `90` `standard_internal` owner-clear original Gemini meeting files
- Not approved: `protected_sensitive` or `broad_non_sensitive` external removals, non-`zahndteam.ca` external-user removals, `add_crewbert_reader`, `unsafe_anyone`, `unsafe_domain`, `unsafe_front_office`, `unsafe_non_owner_user`, moves, ownership transfers, deletions, owner-ambiguous files, legacy Crewbert duplicate copies, original-missing blocked files, or request-access emails.

## Apply Manifest

- Local apply manifest hash: `376003b234f78e282302a300f5a36c9b320a49ab6b7cde3ef0db6ffe69870a50`
- Local result manifest hash: `043e3ff004e3446a55a2f159c61e703d019377c193420e7ca1b72582a518558c`
- Local rollback manifest hash: `1afd91561a2a66049e0a3cf9153278aeb76bb910921c9b29eec2d250aff1461a`
- Operations attempted: `357`
- Permissions removed with success result: `272`
- Failed operations: `85`
- Skipped operations: `0`
- Request-access emails sent: `0`
- Add-Crewbert operations applied: `0`
- Other removal categories applied: `0`

Rollback proof:

- Rollback operation count: `272`
- Rollback operation type: recreate only the exact `zahndteam.ca` external-user permissions removed with success result by this batch.
- Rollback command shape: recreate from the local ignored rollback manifest captured under `store/meeting-vault-acl/`.
- The `85` failed rows do not have rollback operations because the apply result did not prove successful removal at mutation time.

## Failure Accounting

Apply result failure class:

- `google_api_error`: `85`

Failure class by current proof state:

| Failure class | Rows | Reason | Cleanup meaning |
| --- | ---: | --- | --- |
| `google_api_error_still_present` | `69` | Delete call failed and fallback read-only recheck still sees the approved unsafe permission row. | These rows remain unsafe and need a later explicitly approved cleanup batch. |
| `google_api_error_disappeared_unrollbackable` | `15` | Delete call returned failure, but fallback read-only recheck no longer sees the permission row. | Desired access state appears reached, but the rows are not rollback-proven because failed operations did not capture rollback operations. |
| `google_api_error_missing_access_on_recheck` | `1` | Delete call failed and the file is now unreadable to all governed fallback accounts used by the proof. | This row is blocked by missing access and cannot be retried safely until access/classification is repaired. |

Failure classification basis:

- The apply result captured only `google_api_error` for failed mutation calls.
- A read-only fallback recheck then separated failed rows into still-present, disappeared, and missing-access states.
- No failed row is counted as cleanly removed because failed rows did not produce rollback operations.
- No failure class proves request-access emails, moves, ownership transfers, deletions, add-Crewbert operations, or out-of-scope permission categories.

Read-only recheck accounting:

- failed rows still present: `69`
- failed rows no longer present on fallback recheck: `15`
- failed rows blocked by missing access on fallback recheck: `1`
- files with still-present failed rows: `12`
- files with disappeared failed rows: `15`
- files blocked by missing access: `1`

The `15` failed-but-disappeared rows are not rollback-proven because no rollback operations were captured for failed rows.

Still-present failed rows by file ref:

| File ref hash | Still-present rows |
| --- | ---: |
| `file:32f9edcd5cfdedc3` | `12` |
| `file:52a1afe3cc4ebedf` | `9` |
| `file:5d799d894ec5a19c` | `13` |
| `file:6205c2420ef3eb31` | `1` |
| `file:6f9561dbe8e53683` | `1` |
| `file:81c664b6b0062b3b` | `2` |
| `file:83872037ce3e5337` | `1` |
| `file:8808b42938207b00` | `1` |
| `file:b7aa066fac0d6c4b` | `12` |
| `file:e7f88e3375942d7f` | `6` |
| `file:f6728bf2e691ab3a` | `10` |
| `file:f7b3a73362a343a2` | `1` |

Failed rows no longer present on fallback recheck:

| File ref hash | Disappeared rows |
| --- | ---: |
| `file:063e248d3d2ac3dd` | `1` |
| `file:2844800719be0916` | `1` |
| `file:32f9edcd5cfdedc3` | `1` |
| `file:52a1afe3cc4ebedf` | `1` |
| `file:5d799d894ec5a19c` | `1` |
| `file:6205c2420ef3eb31` | `1` |
| `file:70217dae5648dd63` | `1` |
| `file:81c664b6b0062b3b` | `1` |
| `file:83872037ce3e5337` | `1` |
| `file:8808b42938207b00` | `1` |
| `file:b7aa066fac0d6c4b` | `1` |
| `file:e7f88e3375942d7f` | `1` |
| `file:f24d309d98ee6c23` | `1` |
| `file:f6728bf2e691ab3a` | `1` |
| `file:fecce9355541b0d9` | `1` |

Blocked failed row:

| File ref hash | Blocked rows | Reason |
| --- | ---: | --- |
| `file:48eff02fe871ed30` | `1` | `missing_access_on_fallback_recheck` |

Accounting conclusion:

- `272` removals are clean and rollback-proven.
- `15` failed rows appear to have reached the desired removed state despite the API failure result, but they are not rollback-proven.
- `69` failed rows remain unsafe and still require a later cleanup approval.
- `1` failed row is now blocked by missing access and needs access repair/classification before it can be safely retried.

## Recheck

Command:

```bash
npm run process:meeting-vault-acl-check -- --json
```

Result:

- status: `blocked_phase_b_required`
- findings: `0`
- recheck dry-run hash: `e22e127d6d9b43456560c26c22d1eeec67eb4588018fff9a65b02d78d27f6c50`
- current Phase A counts: `895` files; `351` safe; `444` unsafe; `5047` unsafe permissions; `5` missing Crewbert; `1` missing access; `225` owner-ambiguous; `94` blocked.
- current proposed operation types: `5047` `remove_unsafe_permission`; `230` `add_crewbert_reader`; `225` `block_owner_ambiguous`; `1` `request_access`.
- source file roles: `776` original Gemini notes; `25` legacy Crewbert duplicate copies; `94` original-missing blocked refs.

Readiness remains blocked on `MEETING-VAULT-ACL-001`; this partial batch does not close the card.

## Partial Cleanup Batch

Cleanup approval:

- Approval artifact: `docs/process/approvals/MEETING-VAULT-ACL-001-PHASE-B-STANDARD-INTERNAL-ZAHNDTEAM-EXTERNAL-USER-PARTIAL-CLEANUP.json`
- Approved plan snapshot: `docs/process/approved-plans/meeting-vault-acl-standard-internal-zahndteam-external-user-partial-cleanup-v2.md`
- Approved dry-run hash: `c3fdd4dd20bde5544c0b662fc1dfaf2de06d247a6a05523fc015fe0a434b3101`
- Approved batch hash: `c5b9c93cdcc5f9e416957f73e7d3b80c6493619454ca41fb182063e8c23c2146`
- Approved cleanup source result manifest hash: `043e3ff004e3446a55a2f159c61e703d019377c193420e7ca1b72582a518558c`
- Approved operation: `remove_unsafe_permission`
- Approved permission category: `unsafe_external_user`
- Approved principal domain: `zahndteam.ca`
- Approved scope: `69` still-present rows on `12` `standard_internal` owner-clear original Gemini meeting files.
- Not approved: failed-but-disappeared rows, missing-access rows, owner-ambiguous rows, `protected_sensitive` or `broad_non_sensitive` external removals, non-`zahndteam.ca` external-user removals, `add_crewbert_reader`, `unsafe_anyone`, `unsafe_domain`, `unsafe_front_office`, `unsafe_non_owner_user`, moves, ownership transfers, deletions, legacy Crewbert duplicate copies, original-missing blocked files, or request-access emails.

Cleanup apply manifest:

- Local apply manifest hash: `bfd3543464e888344ec28681b406bcac87ab422d0570f301fab54c0e4337159e`
- Local result manifest hash: `7dd859298a8f6971b370f881247fe9071110dafdaac28abba2e6dbccb7eb8465`
- Local rollback manifest hash: `29d72c35beef19c604d66c3a3274a4360e02b4559594aeac74a42830c7761827`
- Operations attempted: `69`
- Permissions removed with success result: `55`
- Failed operations: `14`
- Skipped operations: `0`
- Request-access emails sent: `0`
- Add-Crewbert operations applied: `0`
- Other removal categories applied: `0`

Cleanup rollback proof:

- Rollback operation count: `55`
- Rollback operation type: recreate only the exact `zahndteam.ca` external-user permissions removed with success result by this cleanup batch.
- Rollback command shape: recreate from the local ignored rollback manifest captured under `store/meeting-vault-acl/`.
- The `14` failed cleanup rows do not have rollback operations because the cleanup apply result did not prove successful removal at mutation time.

Cleanup failure accounting:

| Failure class | Rows | Reason | Cleanup meaning |
| --- | ---: | --- | --- |
| `google_api_error_still_present` | `12` | Delete call failed and fallback read-only recheck still sees the approved unsafe permission row. | These rows remain unsafe and need a later explicitly approved cleanup batch. |
| `google_api_error_disappeared_unrollbackable` | `1` | Delete call returned failure, but fallback read-only recheck no longer sees the permission row. | Desired access state appears reached, but the row is not rollback-proven because the failed operation did not capture a rollback operation. |
| `google_api_error_owner_ambiguous_on_recheck` | `1` | Delete call failed and the file is now owner-ambiguous under fallback recheck. | This row is blocked until owner ambiguity is resolved or separately approved. |

Cleanup failed rows by file ref:

| File ref hash | Failed rows | Current proof state |
| --- | ---: | --- |
| `file:52a1afe3cc4ebedf` | `9` | `8` still present, `1` failed-but-disappeared |
| `file:6205c2420ef3eb31` | `1` | `1` still present |
| `file:6f9561dbe8e53683` | `1` | `1` still present |
| `file:81c664b6b0062b3b` | `1` | `1` still present |
| `file:83872037ce3e5337` | `1` | `1` owner-ambiguous |
| `file:f7b3a73362a343a2` | `1` | `1` still present |

Cleanup accounting conclusion:

- Cleanup clean removals: `55`, rollback-proven.
- Cleanup failed rows still present: `12`.
- Cleanup failed-but-disappeared rows: `1`, not rollback-proven.
- Cleanup rows now owner-ambiguous: `1`.
- Total clean rollback-proven ZahndTeam removals across the original batch and this cleanup: `327`.
- Total failed-but-disappeared ZahndTeam rows without rollback proof across both batches: `16`.
- `MEETING-VAULT-ACL-001` remains open/blocking.

## Recheck After Cleanup

Command:

```bash
npm run process:meeting-vault-acl-check -- --json
```

Result:

- status: `blocked_phase_b_required`
- findings: `0`
- recheck dry-run hash: `b5924001d6b641ea5920ef2c7f533f7ba0f189d7e9f69c418ad8d38f2cebb35b`
- current Phase A counts: `895` files; `357` safe; `438` unsafe; `4994` unsafe permissions; `5` missing Crewbert; `2` missing access; `225` owner-ambiguous; `94` blocked.
- current proposed operation types: `4994` `remove_unsafe_permission`; `230` `add_crewbert_reader`; `225` `block_owner_ambiguous`; `2` `request_access`.
- source file roles: `776` original Gemini notes; `25` legacy Crewbert duplicate copies; `94` original-missing blocked refs.

This cleanup does not close `MEETING-VAULT-ACL-001`.
