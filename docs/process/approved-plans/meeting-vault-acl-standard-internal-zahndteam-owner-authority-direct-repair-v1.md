# MEETING-VAULT-ACL-001 Standard-Internal ZahndTeam Owner-Authority Direct Repair Batch

Status: approved Phase B owner-authority repair proposal snapshot for `MEETING-VAULT-ACL-001`.

Dry-run hash: `a44cb42580f4a938212599626b8b3112c2f06167f74f88b9b8c7ef388dbd6852`

Batch hash: `b42972a72b62065acbb9f9723eed71c7d12fa79d914a6c9d6f1284410e90f279`

Approved repair batch:

- batch name: `source_truth_originals_standard_internal_zahndteam_owner_authority_direct_permission_repair_v1`;
- repair method: `delete_exact_direct_file_permissions_as_current_file_owner_via_delegated_domain_authority`;
- operation type: `remove_unsafe_permission`;
- permission category: `unsafe_external_user`;
- principal domain: `zahndteam.ca`;
- scope: owner-clear original Gemini meeting notes only;
- sensitivity: `standard_internal` only;
- owner authority: current owner account only;
- cleanup source: still-present blocked rows from second partial cleanup result manifest hash `8808fd10af655d8cf67c27420c1bf79cedc83b7163262704220a980992dccc7c`;
- prior approved batch hash: `91342d964dd3ef72702fd30c522ad3b8744b722776584abb391ae58e6f7298c9`;
- count: 1 file / 7 direct permissions.

Explicitly not approved:

- normal batch remover retry;
- Gmail batch;
- inherited permission rows;
- Clare-owned rows;
- non-`zahndteam.ca` external-user removals;
- `protected_sensitive` external-user removals;
- `broad_non_sensitive` external-user removals;
- add Crewbert reader operations;
- `unsafe_anyone`, `unsafe_domain`, `unsafe_front_office`, or `unsafe_non_owner_user` removals;
- moves;
- ownership transfers;
- file deletions;
- request-access emails;
- owner-ambiguous files;
- legacy Crewbert duplicate copies;
- original-missing blocked files.

Rollback proof required:

- local apply manifest captures exact file IDs, permission IDs, current owner actor, permission principals, and permission roles under ignored `store/meeting-vault-acl/`;
- tracked proof uses metadata-only hashes and counts;
- rollback recreates only the exact `zahndteam.ca` external-user permissions successfully removed by this owner-authority repair batch;
- rollback uses `sendNotificationEmail=false`;
- rollback operation count must equal the proven removed count, up to 7;
- any failed removal is reported separately and is not safe-cleared.

Recheck proof required:

- rerun source-truth Phase A after apply;
- confirm the 7 scoped `standard_internal` owner-clear original `zahndteam.ca` direct permission hashes are gone from the Steve-owned file;
- confirm inherited permission rows were untouched;
- confirm Clare-owned rows were untouched;
- confirm non-`zahndteam.ca` external-user rows were untouched;
- confirm `protected_sensitive` and `broad_non_sensitive` external removals were untouched;
- confirm `unsafe_non_owner_user` and every other non-approved category were untouched;
- confirm no out-of-scope operation occurred;
- run `npm run process:meeting-vault-acl-check -- --json`;
- run `npm run backlog:hygiene -- --json`;
- run `npm run foundation:verify`.
