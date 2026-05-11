# MEETING-VAULT-ACL-001 Protected External-User Removal Batch

Status: approved Phase B batch proposal snapshot for `MEETING-VAULT-ACL-001`.

Dry-run hash: `3e1ce685acfcc95bd6d42a891a50befdb17260ab6e8500bd2c775a7d1faebf6c`

Batch hash: `dd4428a2f453e5b6b632d2e18235da18dae36281487ffe9dc75437617b196f52`

Approved batch:

- batch name: `source_truth_originals_protected_sensitive_unsafe_external_user_removal_v1`;
- operation type: `remove_unsafe_permission`;
- permission category: `unsafe_external_user`;
- scope: owner-clear original Gemini meeting notes only;
- sensitivity: `protected_sensitive` only;
- count: 30 files / 137 permissions.

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
- rollback recreates only the exact removed `unsafe_external_user` permissions captured in the local apply manifest;
- rollback operation count must equal the proven removed count, up to 137;
- any failed removal is reported separately and is not safe-cleared.

Recheck proof required:

- rerun source-truth Phase A after apply;
- confirm live dry-run hash changes from `3e1ce685acfcc95bd6d42a891a50befdb17260ab6e8500bd2c775a7d1faebf6c`;
- confirm protected-sensitive owner-clear original `unsafe_external_user` is zero, or account for failed/blocked items exactly;
- confirm `standard_internal` and `broad_non_sensitive` external removals were untouched;
- confirm no out-of-scope operation occurred;
- run `npm run process:meeting-vault-acl-check -- --json`;
- run `npm run foundation:verify`.
