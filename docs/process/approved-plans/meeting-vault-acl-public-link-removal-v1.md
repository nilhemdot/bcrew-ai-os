# MEETING-VAULT-ACL-001 Public-Link Removal Batch

Status: approved Phase B batch proposal snapshot for `MEETING-VAULT-ACL-001`.

Dry-run hash: `5cdacede6a2c68dafbf3b77a1530f7c0da0b9a87da9843f9e467524c34925af0`

Batch hash: `6d5f974c028feb5556e667e19367b806a5b0132cd98802503b664761fe2a0597`

Approved batch:

- batch name: `source_truth_originals_unsafe_anyone_removal_v1`;
- operation type: `remove_unsafe_permission`;
- permission category: `unsafe_anyone`;
- scope: owner-clear original Gemini meeting notes only;
- count: 7 files / 7 permissions;
- sensitivity split: `standard_internal` 5, `protected_sensitive` 2.

Explicitly not approved:

- add Crewbert reader operations;
- `unsafe_domain`, `unsafe_external_user`, `unsafe_front_office`, or `unsafe_non_owner_user` removals;
- moves;
- ownership transfers;
- deletions;
- request-access emails;
- owner-ambiguous files;
- legacy Crewbert duplicate copies;
- original-missing blocked files.

Rollback proof required:

- local apply manifest captures exact file IDs and permission IDs under ignored `store/meeting-vault-acl/`;
- rollback recreates only the exact removed `unsafe_anyone` permissions captured in the local apply manifest;
- rollback operation count: 7;
- rollback plan hash set: `ef41cf39cd757c81ff1fe7f1e9edb7358f66ad7f67849c3d82c99d02e10c9d81`.

Recheck proof required:

- rerun source-truth Phase A after apply;
- confirm live dry-run hash changes from `5cdacede6a2c68dafbf3b77a1530f7c0da0b9a87da9843f9e467524c34925af0`;
- confirm the 7 `unsafe_anyone` permissions are gone from original Gemini notes;
- confirm no out-of-scope operation occurred;
- run `npm run process:meeting-vault-acl-check -- --json`;
- run `npm run foundation:verify`.
