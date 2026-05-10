# MEETING-VAULT-ACL-001 Domain Removal Batch

Status: approved Phase B batch proposal snapshot for `MEETING-VAULT-ACL-001`.

Dry-run hash: `2770617db5fa4013aa25c41e5f42845a37f52eef84906d2140409af6ad1ce60c`

Batch hash: `79c879769805e137b6f2efcfd0ac9325bde08a034ad1181dd572228ae8e2b382`

Approved batch:

- batch name: `source_truth_originals_unsafe_domain_removal_v1`;
- operation type: `remove_unsafe_permission`;
- permission category: `unsafe_domain`;
- scope: owner-clear original Gemini meeting notes only;
- count: 1 file / 1 permission;
- sensitivity split: `protected_sensitive` 1.

Explicitly not approved:

- add Crewbert reader operations;
- `unsafe_anyone`, `unsafe_external_user`, `unsafe_front_office`, or `unsafe_non_owner_user` removals;
- moves;
- ownership transfers;
- deletions;
- request-access emails;
- owner-ambiguous files;
- legacy Crewbert duplicate copies;
- original-missing blocked files.

Rollback proof required:

- local apply manifest captures exact file ID and permission ID under ignored `store/meeting-vault-acl/`;
- rollback recreates only the exact removed `unsafe_domain` permission captured in the local apply manifest;
- rollback operation count: 1;
- rollback plan hash set: `9c24abe6077bdf240c9ba1b559059d32998abc9721dd3e5d614a5b120563ac1a`.

Recheck proof required:

- rerun source-truth Phase A after apply;
- confirm live dry-run hash changes from `2770617db5fa4013aa25c41e5f42845a37f52eef84906d2140409af6ad1ce60c`;
- confirm the `unsafe_domain` permission is gone from original Gemini notes;
- confirm no out-of-scope operation occurred;
- run `npm run process:meeting-vault-acl-check -- --json`;
- run `npm run foundation:verify`.
