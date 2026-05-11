# MEETING-VAULT-ACL-001 Protected External-User Partial Cleanup Batch

Status: approved Phase B cleanup batch proposal snapshot for `MEETING-VAULT-ACL-001`.

Dry-run hash: `78bd36deb206bcf0803b60db69d4b1c8a97e1fa0067d4ab6eee78d26d63f7702`

Batch hash: `a8e211b59d47301747b080c26785724235d6379bb4e9d74ee88ac8a37ec7b37b`

Approved cleanup batch:

- batch name: `source_truth_originals_protected_sensitive_unsafe_external_user_partial_cleanup_v1`;
- operation type: `remove_unsafe_permission`;
- permission category: `unsafe_external_user`;
- scope: owner-clear original Gemini meeting notes only;
- sensitivity: `protected_sensitive` only;
- cleanup source: remaining permission rows from prior partial batch result manifest hash `dcf5088822f7205e3a9c3082217932f921b9f36771734398f594c54de21241f4`;
- count: 2 files / 8 permissions.

Explicitly not approved:

- `standard_internal` external-user removals;
- `broad_non_sensitive` external-user removals;
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
- rollback recreates only the exact `unsafe_external_user` permissions successfully removed by this cleanup batch;
- rollback operation count must equal the proven removed count, up to 8;
- any failed removal is reported separately and is not safe-cleared.

Recheck proof required:

- rerun source-truth Phase A after apply;
- confirm live dry-run hash changes from `78bd36deb206bcf0803b60db69d4b1c8a97e1fa0067d4ab6eee78d26d63f7702`;
- confirm the 8 scoped protected-sensitive owner-clear original `unsafe_external_user` permission hashes are gone;
- confirm `standard_internal` and `broad_non_sensitive` external removals were untouched;
- confirm `unsafe_non_owner_user` and every other non-approved category were untouched;
- confirm no out-of-scope operation occurred;
- run `npm run process:meeting-vault-acl-check -- --json`;
- run `npm run backlog:hygiene -- --json`;
- run `npm run foundation:verify`.
