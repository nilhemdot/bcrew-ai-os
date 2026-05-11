# MEETING-VAULT-ACL-001 Standard-Internal ZahndTeam Second Partial Cleanup Batch

Status: approved Phase B cleanup batch proposal snapshot for `MEETING-VAULT-ACL-001`.

Dry-run hash: `b5924001d6b641ea5920ef2c7f533f7ba0f189d7e9f69c418ad8d38f2cebb35b`

Batch hash: `91342d964dd3ef72702fd30c522ad3b8744b722776584abb391ae58e6f7298c9`

Approved cleanup batch:

- batch name: `source_truth_originals_standard_internal_zahndteam_external_user_second_partial_cleanup_v1`;
- operation type: `remove_unsafe_permission`;
- permission category: `unsafe_external_user`;
- principal domain: `zahndteam.ca`;
- scope: owner-clear original Gemini meeting notes only;
- sensitivity: `standard_internal` only;
- cleanup source: still-present failed rows from prior partial cleanup result manifest hash `7dd859298a8f6971b370f881247fe9071110dafdaac28abba2e6dbccb7eb8465`;
- count: 5 files / 12 permissions.

Explicitly not approved:

- failed-but-disappeared rows from the prior partial cleanup proof;
- owner-ambiguous rows from the prior partial cleanup proof;
- missing-access rows;
- `protected_sensitive` external-user removals;
- `broad_non_sensitive` external-user removals;
- non-`zahndteam.ca` external-user removals;
- add Crewbert reader operations;
- `unsafe_anyone`, `unsafe_domain`, `unsafe_front_office`, or `unsafe_non_owner_user` removals;
- moves;
- ownership transfers;
- deletions;
- request-access emails;
- legacy Crewbert duplicate copies;
- original-missing blocked files.

Rollback proof required:

- local apply manifest captures exact file IDs, permission IDs, and principals under ignored `store/meeting-vault-acl/`;
- rollback recreates only the exact `zahndteam.ca` external-user permissions successfully removed by this cleanup batch;
- rollback operation count must equal the proven removed count, up to 12;
- any failed removal is reported separately and is not safe-cleared.

Recheck proof required:

- rerun source-truth Phase A after apply;
- confirm live dry-run hash changes from `b5924001d6b641ea5920ef2c7f533f7ba0f189d7e9f69c418ad8d38f2cebb35b`;
- confirm the 12 scoped `standard_internal` owner-clear original `zahndteam.ca` `unsafe_external_user` permission hashes are gone or account for still-present/failed/disappeared rows exactly;
- confirm failed-but-disappeared, owner-ambiguous, and missing-access rows from the prior proof were untouched;
- confirm `protected_sensitive` and `broad_non_sensitive` external removals were untouched;
- confirm non-`zahndteam.ca` external-user rows were untouched;
- confirm `unsafe_non_owner_user` and every other non-approved category were untouched;
- confirm no out-of-scope operation occurred;
- run `npm run process:meeting-vault-acl-check -- --json`;
- run `npm run backlog:hygiene -- --json`;
- run `npm run foundation:verify`.
