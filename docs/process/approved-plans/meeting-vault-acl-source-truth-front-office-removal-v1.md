# MEETING-VAULT-ACL-001 Source-Truth Front-Office Removal Batch

Status: approved Phase B batch proposal snapshot for `MEETING-VAULT-ACL-001`.

Dry-run hash: `6511fd575fc43be2648d722418c90f9d815f33245c8660d4fd44306d25257ff4`

Batch hash: `b84dd1caa8ef461ec24c667e8af791d0186eac6f8512ab2596ae8531955ff36d`

Approved batch:

- batch name: `source_truth_originals_unsafe_front_office_removal_v1`;
- operation type: `remove_unsafe_permission`;
- permission category: `unsafe_front_office`;
- scope: owner-clear original Gemini meeting notes only;
- count: 33 files / 33 permissions;
- sensitivity split: `protected_sensitive` 33.

Explicitly not approved:

- add Crewbert reader operations;
- `unsafe_anyone`, `unsafe_domain`, `unsafe_external_user`, or `unsafe_non_owner_user` removals;
- moves;
- ownership transfers;
- deletions;
- request-access emails;
- owner-ambiguous files;
- legacy Crewbert duplicate copies;
- original-missing blocked files.

Rollback proof required:

- local apply manifest captures exact file IDs, permission IDs, and principals under ignored `store/meeting-vault-acl/`;
- rollback recreates only the exact removed `unsafe_front_office` permissions captured in the local apply manifest;
- rollback operation count must equal the proven removed count, up to 33;
- any failed removal is reported separately and is not safe-cleared.

Recheck proof required:

- rerun source-truth Phase A after apply;
- confirm live dry-run hash changes from `6511fd575fc43be2648d722418c90f9d815f33245c8660d4fd44306d25257ff4`;
- confirm owner-clear original `unsafe_front_office` is zero, or account for failed/blocked items exactly;
- confirm no out-of-scope operation occurred;
- run `npm run process:meeting-vault-acl-check -- --json`;
- run `npm run foundation:verify`.
