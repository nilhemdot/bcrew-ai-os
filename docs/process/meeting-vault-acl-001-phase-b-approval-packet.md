# MEETING-VAULT-ACL-001 Phase B Approval Packet

Status: superseded review proposal only. This is not a Phase B approval artifact and is not approval-ready.

Dry-run hash: `bf950c74c80a1e0f5a2a8848fa2c39e6ecda8d89536770a7b2bf44110a88b8d5`

Source audit: `meeting-vault-acl-20260509225533-ecf2b739`

Policy version: `meeting-vault-acl-phase-a-v1`

Superseded reason: this packet came from the strict Phase A policy that treated every raw meeting file as protected. The current sensitivity-aware Phase A addendum is `docs/process/meeting-vault-acl-001-sensitivity-aware-phase-a.md`. The next valid Phase B approval packet must be generated from a new sensitivity-aware Phase A dry-run hash. Training, all-hands, huddles, workshops, sales sessions, and broad team meetings are not sensitive by default; leadership/owners/performance/comp/termination/undisclosed-feedback/named-person sensitive discussion is protected; unknown/unclassified files stay blocked until classified.

## Boundary

This packet turns the Phase A dry-run into human-reviewable Phase B batches. It does not approve, apply, or close anything.

Do not use this packet for mutation approval. Use it only as historical evidence of why blanket strict-policy cleanup was paused.

Not approved by this packet:

- real Google Drive permission mutation;
- request-access email sends;
- blanket repair of all unsafe files;
- closing `MEETING-VAULT-ACL-001`.

`MEETING-VAULT-ACL-001` remains scoped/blocking until Phase B is separately approved, applied, rechecked, and rollback proof exists, or a later dry-run proves every in-scope file is already safe.

## Phase A Proof Summary

Phase A scanned `898` in-scope raw meeting-note/transcript files and found no file already safe.

Counts:

- safe files: `0`
- unsafe files: `814`
- missing Crewbert files: `660`
- missing access files: `14`
- owner-ambiguous files: `224`
- blocked files: `0`
- unsafe permission operations proposed: `7082`

Operation counts from Phase A:

- `add_crewbert_reader`: `884`
- `remove_unsafe_permission`: `7082`
- `request_access`: `14`
- `block_owner_ambiguous`: `224`

Additional read-only batch tally on 2026-05-10:

- owner/preflight-clear files: `660`
- owner/preflight-clear files needing Crewbert reader: `660`
- owner/preflight-clear files with unsafe permissions: `590`
- owner/preflight-clear unsafe permission removal ops: `3278`
- owner/preflight-blocked unsafe permission removal ops: `3804`
- removal ops with permission hash present: `7082`
- removal ops missing permission hash: `0`

The tracked proof stays metadata-only. Raw file IDs, raw permission IDs, file names, Drive links, meeting titles, and raw owner emails are not included here.

## Batch 1: Add Crewbert Reader, Owner-Clear

Count: `660` files / `660` operations

Risk level: medium

Operation type: `add_crewbert_reader`

Batch hash: `7acfd58fdbf55f3f81fe2932083a57ed2497889308489cfb05779db108b10969`

Why this is the safest first batch:

- the file is readable by the delegated preflight actor;
- owner/preflight authority is clear;
- the operation is additive only;
- the owner is preserved;
- Crewbert receives `reader`, not `writer`;
- no participant, group, domain, external, or link permission is removed in this batch.

Rollback path:

- record the before snapshot locally before apply;
- record the created Crewbert permission ID after each add;
- rollback deletes only the Crewbert permission created by this batch;
- rerun Phase A after rollback to confirm the file returns to the previous metadata state.

Exact approval needed:

- approve only Batch 1 against dry-run hash `bf950c74c80a1e0f5a2a8848fa2c39e6ecda8d89536770a7b2bf44110a88b8d5`;
- allowed operation class must be exactly `add_crewbert_reader`;
- approved Crewbert role must be exactly `reader`;
- apply must first regenerate a local ignored manifest and confirm the live preflight still matches this batch hash;
- no removal operations and no emails are included.

## Batch 2: Remove Unsafe Permissions, Owner-Clear

Count: `3278` removal operations across `590` owner/preflight-clear files

Risk level: high

Operation type: `remove_unsafe_permission`

Batch hash: `c2ac58b2dc42d0a70c0fd3b7be0c583c568c72a2d403eb37b227b1b72886a5bf`

Why this is not a blanket approval:

- removals affect existing raw Drive access;
- tracked proof includes permission hashes, not raw permission IDs;
- rollback requires a local before snapshot with the exact raw permission shape;
- some removals may affect humans who currently rely on direct raw Drive access, even if that access is not allowed by the strict Phase A policy.

Owner-clear removal sub-batches:

| Sub-batch | Count | Files | Risk | Why |
| --- | ---: | ---: | --- | --- |
| `unsafe_front_office` | `59` | `59` | medium | Removes durable raw access for the front-office AI identity where owner authority is clear. |
| `unsafe_anyone` + `unsafe_domain` | `9` | `9` | high | Removes broad link/domain exposure; small but sensitive because rollback must preserve exact prior shape. |
| `unsafe_external_user` | `583` | `145` | high | Removes external raw access; needs exact ID, exact prior role/type, and owner-aware review. |
| `unsafe_non_owner_user` | `2627` | `481` | high | Removes internal non-owner raw access; largest operational-impact batch and should be split further before approval. |

Rollback path:

- record a local ignored before snapshot with exact file ID, permission ID, permission type, role, and principal for every removal;
- remove only permission IDs present in the approved manifest;
- rollback recreates the removed permission from the before snapshot and records the recreated permission ID;
- if any permission lacks exact rollback data, that operation is excluded from apply.

Exact approval needed:

- do not approve all `3278` owner-clear removals at once;
- approve one sub-batch at a time, preferably by category and then by smaller owner/file cohorts;
- each approval must name the dry-run hash, sub-batch, operation class, count, batch hash or sub-batch hash, and rollback manifest hash;
- apply must fail closed if live preflight, permission hash, owner hash, or rollback manifest hash differs from the approved packet.

## Batch 3: Request-Access Needed

Count: `14` files / `14` operations

Risk level: low for this packet; high if automated email is introduced later

Operation type: `request_access`

Batch hash: `153f1b09c028544c46fb2a4874422c77ba97dbc673148c70672ab6b93e004904`

Why this is blocked:

- AIOS could not safely read or repair these files through the current delegated preflight;
- owner identity and repair authority are not sufficiently proven for mutation;
- Phase B permission mutation approval is not request-access email approval.

Rollback path:

- no Drive mutation occurs in this packet;
- no email is sent in this packet;
- if a future request-access flow is approved, it needs its own send ledger and rollback/stop policy.

Exact approval needed:

- manual owner/access investigation is approved only if Steve explicitly approves it;
- automated request-access emails require a separate explicit approval artifact;
- after access changes, rerun Phase A and generate a new dry-run hash before any repair approval.

## Batch 4: Owner-Ambiguous Blocked Items

Count: `224` files / `224` `block_owner_ambiguous` operations

Risk level: blocked

Operation type: `block_owner_ambiguous`

Batch hash: `7342c14beab9bb7332f1889ce4755c878aece9d345de824fbb9b1f7529e3e53f`

Associated blocked operations:

- `224` blocked `add_crewbert_reader` candidates;
- `3804` blocked `remove_unsafe_permission` candidates.

Why this is blocked:

- owner identity is not exactly proven by the permission inventory;
- owner-preserving repair cannot be guaranteed;
- deleting or adding permissions here could remove the wrong access or grant Crewbert on a file without confirmed authority.

Rollback path:

- no mutation is allowed from this packet;
- first resolve owner ambiguity through metadata-only investigation or owner confirmation;
- rerun Phase A after owner resolution;
- only a new dry-run hash can produce a later approval packet for these files.

Exact approval needed:

- no Phase B mutation approval should include owner-ambiguous files;
- approval needed now is only for owner-resolution investigation, not permission mutation.

## Recommended Approval Sequence

1. Approve Batch 1 only: add Crewbert reader to the `660` owner/preflight-clear files.
2. Re-run Phase A and compare against a new dry-run hash.
3. If Batch 1 succeeds, consider removal sub-batches in this order:
   - `unsafe_front_office` owner-clear removals;
   - broad `anyone` / `domain` owner-clear removals;
   - external-user owner-clear removals, split by owner/file cohort;
   - internal non-owner owner-clear removals, split into smaller cohorts.
4. Keep request-access and owner-ambiguous files blocked until access/owner proof changes.

This sequence avoids approving a blanket `814`-file repair and keeps the highest-risk removals behind smaller explicit approvals.

## Phase B Approval Artifact Requirements

A real Phase B approval artifact must be separate from this packet and must include:

- card: `MEETING-VAULT-ACL-001`;
- phase: `Phase B`;
- dry-run hash: `bf950c74c80a1e0f5a2a8848fa2c39e6ecda8d89536770a7b2bf44110a88b8d5`;
- approved batch name and batch hash;
- approved operation classes;
- approved counts;
- Crewbert role, if adding Crewbert;
- explicit statement that request-access emails remain disallowed unless separately approved;
- local ignored apply-manifest hash;
- local ignored rollback-manifest hash;
- freshness window;
- fail-closed requirements for dry-run mismatch, owner mismatch, permission mismatch, missing rollback data, API error, or raw-proof leak.

Until that artifact exists and an apply path validates it, `MEETING-VAULT-ACL-001` stays scoped/blocking.
