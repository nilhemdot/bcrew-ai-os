# MEETING-VAULT-ACL-001 Phase B Front-Office Apply Proof

Status: partially applied and rechecked on 2026-05-10.

This proof is metadata-only. Raw Drive file IDs, permission IDs, principals, and per-file manifests are stored only under ignored local storage at `store/meeting-vault-acl/`.

## Approval

- Approval artifact: `docs/process/approvals/MEETING-VAULT-ACL-001-PHASE-B-FRONT-OFFICE.json`
- Approved dry-run hash: `758e60d077e28f369b5f5c6774bf975152a0c1add77d0e615da451bf12932138`
- Approved batch hash: `cad317e4090b11170560e32aaedcfd26d5983884e435be6d8d6d8b420b5780d5`
- Approved operation: `remove_unsafe_permission`
- Approved permission category: `unsafe_front_office`
- Approved scope: `24` operations on `24` `protected_sensitive` owner-clear files
- Not approved: `add_crewbert_reader`, `unsafe_anyone`, `unsafe_external_user`, `unsafe_non_owner_user`, owner-ambiguous files, missing-access files, request-access emails.

## Apply Manifest

- Local apply manifest hash: `490667faf8aee644db2dc5a11321189914df8ff4a99c805d57b6381df6b01645`
- Local result manifest hash: `e478b849e42facf01003277b6aee8cc22cbc99a2a354bedd66058325aee423c5`
- Local rollback manifest hash: `7dd72e3b27e853b350fd45d9ec3965e53a46ae226e0a1621f912233e9dbd8ae6`
- Operations attempted: `24`
- Permissions removed: `22`
- Failed operations: `2`
- Request-access emails sent: `0`
- Add-Crewbert operations applied: `0`
- Other removal categories applied: `0`

Failed operation proof:

- `file:8608196e461a0c6d` / `perm:6d05525ae19ac204` / error hash `err:0e9eea76b30d3cbb`
- `file:d8550b547edc3476` / `perm:6d05525ae19ac204` / error hash `err:672d2c97a8908587`

Rollback proof:

- Rollback operation count: `22`
- Rollback operation type: recreate only the front-office permissions removed by this batch.
- Rollback excludes the `2` failed operations because no mutation was proven for them.
- Rollback command shape: `npm run process:meeting-vault-acl-front-office-batch -- --rollback --rollbackManifest=<local ignored rollback manifest>`

## Recheck

Command:

```bash
npm run process:meeting-vault-acl-check -- --json
```

Result:

- status: `blocked_phase_b_required`
- findings: `0`
- recheck dry-run hash: `c8804da13cca90d202f1a8c3c377c3366d1ee0328af7ef17cf6cee9609b309c4`
- protected owner-clear `unsafe_front_office` remaining: `0`
- protected states after recheck: `104` owner-ambiguous, `167` unsafe, `21` safe, `10` missing access
- remaining protected owner-clear removal batches:
  - `unsafe_anyone`: `2` operations / batch hash `ec56005904cb56a8f53971105df9190adb0fa25a938cfb232e1f894d6b3a252d`
  - `unsafe_external_user`: `146` operations / batch hash `815acdef8f7274e036b36222128f16f599a3059237d0eb6b5e978a2e5d3ca576`
  - `unsafe_non_owner_user`: `686` operations / batch hash `509543e6031f96c9db508024005fac85dc2f78c2e14c8300bf95bae65a1f6971`

This does not close `MEETING-VAULT-ACL-001`.
