# MEETING-VAULT-ACL-001 Standard-Internal ZahndTeam External-User Removal Batch

Status: approved Phase B batch proposal snapshot for `MEETING-VAULT-ACL-001`.

Dry-run hash: `c97e5362819b31b7568aa8db90d24b5116edb417206f07dbaf23518af3a8bb68`

Batch hash: `75f1ac6a23c2e9b6240a5688a5185e61a89a3697d0e56efeb30d2d2dc6fc7692`

Approved batch:

- batch name: `source_truth_originals_standard_internal_zahndteam_external_user_removal_v1`;
- operation type: `remove_unsafe_permission`;
- permission category: `unsafe_external_user`;
- principal domain: `zahndteam.ca`;
- scope: owner-clear original Gemini meeting notes only;
- sensitivity: `standard_internal` only;
- count: 90 files / 357 permissions.

Explicitly not approved:

- `protected_sensitive` external-user removals;
- `broad_non_sensitive` external-user removals;
- non-`zahndteam.ca` external-user removals;
- add Crewbert reader operations;
- `unsafe_anyone`, `unsafe_domain`, `unsafe_front_office`, or `unsafe_non_owner_user` removals;
- moves;
- ownership transfers;
- deletions;
- request-access emails;
- owner-ambiguous files;
- legacy Crewbert duplicate copies;
- original-missing blocked files.

Rollback proof required:

- local apply manifest captures exact file IDs, permission IDs, roles, permission type, and principals under ignored `store/meeting-vault-acl/`;
- rollback recreates only the exact `zahndteam.ca` external-user permissions successfully removed by this batch;
- rollback operation count must equal the proven removed count, up to 357;
- any failed removal is reported separately and is not safe-cleared.

Recheck proof required:

- rerun source-truth Phase A after apply;
- confirm live dry-run hash changes from `c97e5362819b31b7568aa8db90d24b5116edb417206f07dbaf23518af3a8bb68`;
- confirm this approved `zahndteam.ca` `standard_internal` batch is removed or account for failed/blocked rows exactly;
- confirm protected-sensitive, broad-non-sensitive, and non-ZahndTeam external removals were untouched;
- confirm no out-of-scope operation occurred;
- run `npm run process:meeting-vault-acl-check -- --json`;
- run `npm run foundation:verify`.
