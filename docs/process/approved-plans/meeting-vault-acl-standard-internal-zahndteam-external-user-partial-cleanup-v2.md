# MEETING-VAULT-ACL-001 Standard-Internal ZahndTeam Partial Cleanup Batch

Status: approved Phase B cleanup batch proposal snapshot for `MEETING-VAULT-ACL-001`.

Dry-run hash: `c3fdd4dd20bde5544c0b662fc1dfaf2de06d247a6a05523fc015fe0a434b3101`

Batch hash: `c5b9c93cdcc5f9e416957f73e7d3b80c6493619454ca41fb182063e8c23c2146`

Approved cleanup batch:

- batch name: `source_truth_originals_standard_internal_zahndteam_external_user_partial_cleanup_v2`;
- operation type: `remove_unsafe_permission`;
- permission category: `unsafe_external_user`;
- principal domain: `zahndteam.ca`;
- scope: owner-clear original Gemini meeting notes only;
- sensitivity: `standard_internal` only;
- cleanup source: still-present failed rows from prior partial batch result manifest hash `043e3ff004e3446a55a2f159c61e703d019377c193420e7ca1b72582a518558c`;
- count: 12 files / 69 permissions.

Explicitly not approved:

- failed-but-disappeared rows from the prior partial proof;
- missing-access or owner-ambiguous rows from the prior partial proof;
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

- local apply manifest captures exact file IDs, permission IDs, and principals under ignored `store/meeting-vault-acl/`;
- rollback recreates only the exact `zahndteam.ca` external-user permissions successfully removed by this cleanup batch;
- rollback operation count must equal the proven removed count, up to 69;
- any failed removal is reported separately and is not safe-cleared.

Recheck proof required:

- rerun source-truth Phase A after apply;
- confirm live dry-run hash changes from `c3fdd4dd20bde5544c0b662fc1dfaf2de06d247a6a05523fc015fe0a434b3101`;
- confirm the 69 scoped `standard_internal` owner-clear original `zahndteam.ca` `unsafe_external_user` permission hashes are gone or account for still-present/failed/disappeared rows exactly;
- confirm failed-but-disappeared, missing-access, and owner-ambiguous rows from the prior proof were untouched;
- confirm `protected_sensitive` and `broad_non_sensitive` external removals were untouched;
- confirm non-`zahndteam.ca` external-user rows were untouched;
- confirm `unsafe_non_owner_user` and every other non-approved category were untouched;
- confirm no out-of-scope operation occurred;
- run `npm run process:meeting-vault-acl-check -- --json`;
- run `npm run backlog:hygiene -- --json`;
- run `npm run foundation:verify`.
