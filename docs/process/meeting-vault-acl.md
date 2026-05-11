# MEETING-VAULT-ACL-001 Phase A Dry-Run

Status: Phase A dry-run implementation only. The card remains scoped/blocking unless the dry-run proves every in-scope raw meeting file is already safe.

Policy version: `meeting-vault-acl-phase-a-source-truth-v2`

Phase A inventories raw meeting-note and transcript Drive file refs, applies the owner-preserving source-truth ACL policy, detects unsafe shares and missing Crewbert access on original Gemini notes, emits a stable dry-run hash, records a metadata-only audit, and proves the apply path fails closed without a separate Phase B approval artifact. The current source-truth Sprint Ready addendum lives at `docs/process/meeting-vault-acl-001-sensitivity-aware-phase-a.md`; the original approved `DRIVE-ACCESS-REQUEST-001` plan artifact remains immutable at `docs/process/meeting-vault-acl-001-plan.md`.

## Sensitivity Rule

Training, all-hands, huddles, workshops, sales sessions, and broad team meetings are not sensitive by default.

Leadership, owners, performance, compensation, termination, undisclosed-feedback, legal/HR, or named-person sensitive discussion is protected.

Unknown/unclassified files stay blocked until classified.

Protected raw meeting files use strict owner-plus-Crewbert access. Broad/non-sensitive internal meeting files do not trigger blanket cleanup of internal non-owner raw access.

Original Gemini meeting notes are the ACL source of truth. Legacy Crewbert-owned duplicate copies are identified separately and are not used as the file targets for Phase B original-note ACL repair. If a Crewbert-owned copy is visible but no original Gemini note is proven for that meeting key, Phase A blocks until the original is found or the source record is corrected.

## No Duplicate Google Docs Rule

Meeting sync/archive jobs must not create duplicate Google Docs for Gemini meeting notes. Sync reads originals, exports content into the database archive, and records metadata/content hashes there. Any operator-facing mirror may be text-only evidence and must not become a second Gemini-note document. The verifier fails if the current meeting jobs can copy/create duplicate Gemini-note Google Docs, if future sync stops preferring originals, or if ACL inventory treats Crewbert-owned copies as source truth.

## Close Rule

`MEETING-VAULT-ACL-001` can close only when one of these is true:

- every in-scope file is already safe from Phase A proof; or
- Phase B is separately approved against the Phase A dry-run hash, applied, rechecked, and backed by rollback proof.

If Phase A finds unsafe shares, missing Crewbert access, missing read access, owner ambiguity, inherited/Shared Drive uncertainty, or an incomplete permission scan, the card stays scoped/blocking.

If Phase A finds unknown/unclassified files, the card stays scoped/blocking until classification is repaired and a new sensitivity-aware dry-run hash exists.

## Latest Source-Truth Dry Run

Generated: 2026-05-11 after approved source-truth originals add-Crewbert, public-link, domain, front-office, and protected-sensitive external-user cleanup batches.

Dry-run hash: `c97e5362819b31b7568aa8db90d24b5116edb417206f07dbaf23518af3a8bb68`

Result: `blocked_phase_b_required`

Inventory:

- in-scope files scanned: `895`
- inventory complete: `yes`

Sensitivity classes:

- `standard_internal`: `402`
- `broad_non_sensitive`: `43`
- `protected_sensitive`: `450`

Source file roles:

- `original_gemini_note`: `776`
- `legacy_crewbert_duplicate_copy`: `25`
- `original_gemini_note_missing`: `94`

ACL result counts:

- safe: `278`
- unsafe: `518`
- unsafe permissions: `5335`
- missing Crewbert on originals: `5`
- missing access: `0`
- owner ambiguous: `225`
- blocked: `94`

Proposed operation types:

- `block_owner_ambiguous`
- `add_crewbert_reader`
- `remove_unsafe_permission`

Current state remains blocking because unsafe permissions, owner ambiguity, five missing-Crewbert original refs, and original-missing duplicate blockers remain. The applied batches below are historical proof and do not authorize any next mutation.

## Applied Phase B Add-Crewbert Batch

Applied on 2026-05-10 under explicit Steve approval.

- batch name: `source_truth_originals_missing_crewbert_add_reader_v1`
- approved dry-run hash: `b25bbd105fcdca10971c497b22038565d5e4d4fa8a90b0b13b766232af420c90`
- batch hash: `4cd211642c2ff8d842d20a6d798cb4a8c5a2105a1fc44bed7de3bdb97e565f70`
- operation: add Crewbert as reader with `sendNotificationEmail=false`
- scope: original Gemini notes only, owner-clear, readable, missing Crewbert
- applied count: `418` files / `418` operations
- sensitivity split: `standard_internal` 282, `protected_sensitive` 106, `broad_non_sensitive` 30
- result: `418` applied, `0` failed, `0` skipped
- residual unsafe exposure inside selected files: `213` files / `1663` unsafe permissions remain for later removal batches only after separate approval
- recheck dry-run hash: `5cdacede6a2c68dafbf3b77a1530f7c0da0b9a87da9843f9e467524c34925af0`
- recheck result: original-note missing Crewbert is `0`

Rollback proof:

- apply manifest hash: `9df89c4994120aef47df93389aa55b2f957b437627ea65f6ec0a8a96c5945ad6`
- result manifest hash: `ba421deda3908dd94dda7cfde8f7df113c1eaa63a1b15d87753bb4fb4b45b66b`
- rollback manifest hash: `5897bcdc09a61e4f0a2f73fee3655cb4d7a86629109048a2cf7e061ac69f2bb7`
- rollback operations: `418`
- rollback scope: delete only Crewbert reader permissions created by this approved batch; do not remove pre-existing Crewbert access.

No removals, moves, ownership transfers, deletions, request-access emails, owner-ambiguous files, legacy Crewbert duplicate copies, or original-missing blocked files were included.

## Applied Phase B Public-Link Removal Batch

Applied on 2026-05-10 under explicit Steve approval.

- batch name: `source_truth_originals_unsafe_anyone_removal_v1`
- approved dry-run hash: `5cdacede6a2c68dafbf3b77a1530f7c0da0b9a87da9843f9e467524c34925af0`
- batch hash: `6d5f974c028feb5556e667e19367b806a5b0132cd98802503b664761fe2a0597`
- permission category: `unsafe_anyone`
- operation: remove public/anyone-with-link permission from original Gemini notes only
- scope: owner-clear, readable, original Gemini notes; no owner-ambiguous files, no legacy duplicate copies, no original-missing blocked files
- applied count: `7` files / `7` permissions
- sensitivity split: `standard_internal` 5, `protected_sensitive` 2
- result: `7` removed, `0` failed, `0` skipped
- recheck dry-run hash: `2770617db5fa4013aa25c41e5f42845a37f52eef84906d2140409af6ad1ce60c`
- recheck result: `unsafe_anyone` is `0` on owner-clear original Gemini notes

Other available original-note removal categories remain out of scope for this applied batch:

- `unsafe_non_owner_user`: 1786
- `unsafe_external_user`: 570
- `unsafe_front_office`: 33
- `unsafe_domain`: 1

Rollback proof:

- apply manifest hash: `bb3bf121ecfe346b60e7c659e33d7249c0cc78c027208472d015b40b164feb83`
- result manifest hash: `81dae1345ad653208699286fb65d17759395feb5121bb5fb18b0346f686cdc85`
- rollback manifest hash: `b3c8529de7709c3b0e49d40a537356d382214b6a7d0d819ca354d05206ffc357`
- rollback operations: `7`
- rollback scope: recreate only the exact `unsafe_anyone` permissions removed by this approved batch.

No add-Crewbert operations, other removal categories, moves, ownership transfers, deletions, request-access emails, owner-ambiguous files, legacy duplicate copies, or original-missing blocked files were included.

## Applied Phase B Domain Removal Batch

Status: applied after explicit Phase B approval artifact:
`docs/process/approvals/MEETING-VAULT-ACL-001-PHASE-B-DOMAIN-REMOVAL.json`.

- batch name: `source_truth_originals_unsafe_domain_removal_v1`
- approved dry-run hash: `2770617db5fa4013aa25c41e5f42845a37f52eef84906d2140409af6ad1ce60c`
- approved batch hash: `79c879769805e137b6f2efcfd0ac9325bde08a034ad1181dd572228ae8e2b382`
- permission category: `unsafe_domain`
- operation: remove domain-wide permission from original Gemini notes only
- scope: owner-clear, readable, original Gemini notes; no owner-ambiguous files, no legacy duplicate copies, no original-missing blocked files
- count: `1` file / `1` permission
- sensitivity split: `protected_sensitive` 1
- result: `1` removed, `0` failed, `0` skipped
- recheck dry-run hash: `6511fd575fc43be2648d722418c90f9d815f33245c8660d4fd44306d25257ff4`
- recheck result: `unsafe_domain` is `0` on owner-clear original Gemini notes

Other available original-note removal categories remain out of scope for this applied batch:

- `unsafe_non_owner_user`: 1786
- `unsafe_external_user`: 570
- `unsafe_front_office`: 33

Rollback proof:

- apply manifest hash: `f56b85e9cf2314f1bf96a4e7df129b918037a678693232a621c32d3469a321fa`
- result manifest hash: `070be01242038d84a51e45356ca9a5bebc8afd9257202f4142ff0f29219e17df`
- rollback manifest hash: `89d56a311b3813c240be8eb7ac7d572a33a002cec347b94cd7766da5dff2670d`
- rollback operation count: `1`;
- rollback scope: recreate only the exact removed `unsafe_domain` permission captured in the local apply manifest.

No add-Crewbert operations, other removal categories, moves, ownership transfers, deletions, request-access emails, owner-ambiguous files, legacy duplicate copies, or original-missing blocked files were included.

## Applied Phase B Protected External-User Cleanup

Protected-sensitive external-user cleanup proof lives in `docs/process/meeting-vault-acl-001-phase-b-protected-external-user-apply-proof.md`.

Current protected-sensitive external-user cleanup state:

- initial protected-sensitive batch: `127` clean removals, `10` failed rows accounted;
- first cleanup batch: `4` clean removals, `2` failed-but-disappeared rows, `2` still-present rows;
- second cleanup batch: `2` clean removals, `0` failed;
- latest recheck hash after second cleanup: `5c61d76a66bd742d218013ebff8a394584a73ec8bba2709c17308e07fdef4830`;
- current canonical dry-run hash after later live metadata drift: `c97e5362819b31b7568aa8db90d24b5116edb417206f07dbaf23518af3a8bb68`.

No `standard_internal` or `broad_non_sensitive` external-user removals were approved or applied in those protected-sensitive batches.

## Partial Phase B Standard-Internal ZahndTeam External-User Batch

Standard-internal ZahndTeam external-user proof lives in `docs/process/meeting-vault-acl-001-phase-b-standard-internal-zahndteam-apply-proof.md`.

Current standard-internal ZahndTeam external-user state:

- approved dry-run hash: `c97e5362819b31b7568aa8db90d24b5116edb417206f07dbaf23518af3a8bb68`;
- approved batch hash: `75f1ac6a23c2e9b6240a5688a5185e61a89a3697d0e56efeb30d2d2dc6fc7692`;
- scope: `357` `unsafe_external_user` permissions for principal domain `zahndteam.ca` on `90` `standard_internal` owner-clear original Gemini meeting files;
- result: `272` clean removals, `85` failed rows;
- rollback-proven removals: `272`;
- failed-row accounting: `69` still present, `15` failed-but-disappeared and not rollback-proven, `1` blocked by missing access on fallback recheck;
- latest recheck hash after the partial batch: `e22e127d6d9b43456560c26c22d1eeec67eb4588018fff9a65b02d78d27f6c50`.
- partial cleanup approved from dry-run hash `c3fdd4dd20bde5544c0b662fc1dfaf2de06d247a6a05523fc015fe0a434b3101` and batch hash `c5b9c93cdcc5f9e416957f73e7d3b80c6493619454ca41fb182063e8c23c2146`;
- cleanup result: `55` clean removals, `14` failed rows;
- cleanup rollback-proven removals: `55`;
- cleanup failed-row accounting: `12` still present, `1` failed-but-disappeared and not rollback-proven, `1` owner-ambiguous on fallback recheck;
- latest recheck hash after the cleanup batch: `b5924001d6b641ea5920ef2c7f533f7ba0f189d7e9f69c418ad8d38f2cebb35b`.
- second cleanup approved from dry-run hash `b5924001d6b641ea5920ef2c7f533f7ba0f189d7e9f69c418ad8d38f2cebb35b` and batch hash `91342d964dd3ef72702fd30c522ad3b8744b722776584abb391ae58e6f7298c9`;
- second cleanup result: `0` clean removals, `12` failed rows;
- second cleanup rollback-proven removals: `0`;
- second cleanup failed-row accounting: `11` still present and now classified as `blocked/file-access-changed`, `1` failed-but-disappeared and not rollback-proven;
- the `11` `blocked/file-access-changed` ZahndTeam rows must not be retried with the normal batch remover in this sprint; next action is to scope an owner-authority repair method;
- latest recheck hash after the second cleanup attempt: `a44cb42580f4a938212599626b8b3112c2f06167f74f88b9b8c7ef388dbd6852`;
- owner-authority direct repair approved from dry-run hash `a44cb42580f4a938212599626b8b3112c2f06167f74f88b9b8c7ef388dbd6852` and batch hash `b42972a72b62065acbb9f9723eed71c7d12fa79d914a6c9d6f1284410e90f279`;
- owner-authority direct repair result: `7` clean removals from `1` standard-internal owner-clear original Gemini note;
- owner-authority direct repair rollback-proven removals: `7`;
- owner-authority direct repair manifest hashes: apply `b99e677b202b0ba6b7aa9c3709a11ed2bb082b9de4070af17acab6cbe2acbaaa`, result `983c0953b76d8cd5e9a15e25ee07f88c751b2416c602f52057098c27d241d2e9`, rollback `ac12ca7df3341435ae6584910019887122d7969ac5a8dacfa92843b2ed77b553`;
- targeted readback proved the `7` scoped direct permission hashes are gone;
- `4` ZahndTeam rows remain present and untouched because they include inherited permission details and require a separate inherited/parent-source or limited-access repair scope;
- latest recheck hash after the owner-authority direct repair: `277a4fafa52d3aabfb4bd4ecd902fc2e84fe96507a570677af7a1ccc2fab427b`.

No protected-sensitive removals, broad-non-sensitive removals, non-ZahndTeam external removals, add-Crewbert operations, request-access emails, moves, ownership transfers, deletions, owner-ambiguous files, legacy duplicate copies, or original-missing blocked files were approved or applied in this partial batch.

## Later Duplicate Cleanup Phase

Legacy Crewbert duplicate docs are not repaired or deleted under the original-note ACL batches. After originals are repaired, a separate cleanup phase must inventory legacy duplicate docs, map each duplicate to its original/source DB artifact, and propose delete/archive batches with export proof, rollback proof, exact counts, and separate approval.

## Not Approved

- further unapproved Google Drive permission mutations;
- request-access emails;
- adding Crewbert to files;
- removing unsafe permissions;
- ownership transfer.

## Automatic Forward-Flow Supersession

Manual historical permission batching is stopped.

`MEETING-VAULT-AUTO-ENFORCEMENT-001` under `meeting-vault-auto-enforcement-v1` is the active readiness path for `MEETING-VAULT-ACL-001`. It does not declare old messy files safe. It moves old duplicate/missing-access/owner-ambiguous/high-risk rows into a bounded legacy exception queue, proves original Gemini notes are the source of truth, blocks duplicate Google Docs, and verifies that new original Gemini notes are classified/preflighted with Crewbert/high-risk actions queued.

Any later historical cleanup batch, Drive permission mutation, request-access email, delete, move, or ownership transfer still needs a separate explicit approval artifact.

## Proof

- `npm run process:meeting-vault-acl-check`
- `npm run process:meeting-vault-auto-enforcement-check`
- `npm run process:foundation-done-test -- --report-only`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
