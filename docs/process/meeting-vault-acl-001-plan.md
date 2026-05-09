# MEETING-VAULT-ACL-001 / DRIVE-ACCESS-REQUEST-001 Raw Meeting Drive ACL Plan

Status: approved at 9.8 for `DRIVE-ACCESS-REQUEST-001` dry-run/preflight and `MEETING-VAULT-ACL-001` Phase A dry-run safety proof only. Phase B real Drive permission mutation is not approved.

Cards:

- `DRIVE-ACCESS-REQUEST-001`
- `MEETING-VAULT-ACL-001`

Current truth:

- `SYSTEM-010-GHOST-CLOSEOUT-001` is shipped.
- `SOURCE-LIFECYCLE-COMPLETION-001` is shipped.
- `SYNTHESIS-VERIFY-001` is shipped.
- `EXTRACT-RUN-HARDENING-001` is shipped at `ed39e69`.
- `FOUNDATION-DONE-TEST-001` still reports `not_ready` only because of the meeting raw Drive ACL/vault leg.
- Remaining readiness blockers are `MEETING-VAULT-ACL-001` and `DRIVE-ACCESS-REQUEST-001`.
- `SECURITY-002` protects AIOS responses. It does not change original Google Drive file permissions.
- `lib/google-delegated.js` already has delegated Drive read/write helper primitives, including permission list/create/delete. The missing layer is governed preflight, meeting-specific policy, dry-run approval, audit/rollback, and process proof.

## Goal

Prove raw Google Drive meeting-note and meeting-transcript access is safe before Foundation is called ready.

The end state is owner-preserving raw Drive control:

- original meeting files stay with their real owner/organizer;
- `crewbert@bensoncrew.ca` has the approved system/vault access needed for AIOS archive and review;
- non-owner participants do not retain raw Drive access to protected meeting notes/transcripts just because they attended a meeting;
- every repair is preceded by an exact dry-run report and explicit approval artifact;
- all proof is metadata-only and contains no raw transcript, meeting note text, Drive links, or sensitive meeting titles.

If current access cannot prove or safely repair a file, the system must fail closed with the exact blocker, owner/request path, and next safe action. It must not silently claim Foundation is ready.

## Implementation Split And Approval Boundary

Implement this as three distinct approval zones. Do not let dry-run proof imply approval for real Google Drive permission changes.

### 1. DRIVE-ACCESS-REQUEST-001: dry-run/preflight only

This card is first. It is inventory/dry-run only and can close from preflight proof.

It owns:

- central delegated Drive preflight policy;
- actor proof;
- metadata-only permission inventory;
- missing access classification;
- owner ambiguity classification;
- request-access-needed classification for files AIOS cannot safely read or repair;
- metadata-only preflight ledger;
- `npm run process:drive-access-request-check`.

It must not:

- send access-request emails;
- add Drive permissions;
- remove Drive permissions;
- transfer ownership;
- mutate any Google Drive state.

`DRIVE-ACCESS-REQUEST-001` may close before `MEETING-VAULT-ACL-001` if it proves the preflight layer is safe and explicitly leaves the meeting readiness leg blocked until meeting ACL state is proven or repaired.

### 2. MEETING-VAULT-ACL-001 Phase A: dry-run safety proof only

Phase A uses the preflight layer for meeting notes/transcripts. It is still dry-run only.

It owns:

- meeting raw-file inventory;
- owner-preserving ACL policy;
- unsafe-share detection;
- missing Crewbert detection;
- dry-run repair plan;
- stable dry-run hash;
- proof that the apply path fails closed without approval;
- metadata-only proof;
- readiness integration;
- `npm run process:meeting-vault-acl-check`.

Phase A must not:

- send access-request emails;
- add Drive permissions;
- remove Drive permissions;
- transfer ownership;
- mutate any Google Drive state.

If Phase A finds every in-scope file already safe, `MEETING-VAULT-ACL-001` can close without Phase B because no real permission mutation is needed.

If Phase A finds unsafe files and no separate mutation approval exists, stop after dry-run. Keep `MEETING-VAULT-ACL-001` scoped/blocking and report:

- dry-run hash;
- safe, unsafe, missing Crewbert, missing access, owner ambiguous, and blocked counts;
- proposed operation types;
- blocker reason;
- exact approval artifact needed for Phase B.

A dry-run repair plan alone is not enough to close `MEETING-VAULT-ACL-001` when unsafe raw access remains.

### 3. MEETING-VAULT-ACL-001 Phase B: separately approved mutation only

Phase B is optional and only exists if Phase A proves unsafe files that need real Drive permission changes.

Phase B owns:

- exact apply behavior for separately approved permission changes only;
- fresh preflight comparison against the approved dry-run hash;
- before/after metadata snapshots;
- rollback ledger;
- post-apply recheck.

Phase B requires a separate explicit approval artifact tied to the Phase A dry-run hash. Without that approval, the apply path must fail closed and no Drive permission mutation is allowed.

`MEETING-VAULT-ACL-001` can close only if:

- every in-scope file is already safe from Phase A; or
- Phase B is separately approved, applied, rechecked, and rollback proof exists.

## Raw Files In Scope

V1 enforcement scope:

- Google Docs named or classified as `Notes by Gemini` discovered by `scripts/sync-meeting-notes-archive.mjs`.
- Google Docs named or classified as standalone `Transcript` discovered by `scripts/sync-meeting-notes-archive.mjs`.
- File IDs referenced by `shared_communication_artifacts` where:
  - `source_id = 'SRC-MEETINGS-001'`
  - `artifact_type IN ('meeting_note', 'meeting_transcript')`
  - `metadata.primaryFileId`, `metadata.noteFileIds`, `metadata.transcriptFileIds`, or `metadata.observedFileIds` identifies original Drive files.
- File IDs referenced by `source_crawl_items` for the `meetings-current-day` crawl target when metadata contains meeting note/transcript file IDs.

Discovery-only, not ACL-enforcement in V1 unless already represented as a meeting note/transcript artifact:

- Google Meet recording binaries.
- Chat text files.
- rich video/recording artifacts.
- unknown Drive shortcuts or linked docs found near meeting artifacts.

Those are classified as follow-up work, not silently ignored. Rich video/recording understanding remains outside this card.

Out of scope:

- Gmail, Missive, Slack, and Drive corpus files unrelated to meeting notes/transcripts.
- copied text mirror files created by `scripts/mirror-meeting-archive-to-drive.mjs`, except to verify they are not being mistaken for original raw meeting files.
- broad Drive folder recursion beyond the files explicitly identified by meeting archive metadata or current meeting crawl items.

## Where Files Currently Live

Current raw locations:

- Original Google Drive files live in the meeting owner/organizer's Drive, usually under Google's meeting artifact folders such as Meet Recordings.
- Delegated scans currently run across `users.meeting_sync_enabled = true` from `lib/foundation-db.js`.
- Meeting text is archived in PostgreSQL `shared_communication_artifacts.content_text`.
- Meeting crawl item state lives in `source_crawl_items` under `meetings-current-day`.
- Optional Crewbert Drive mirror output may live under `CREWBERT_MEETING_ARCHIVE_ROOT_FOLDER_ID`, but that mirror is not the original raw Drive ACL boundary.

Current AIOS access reality:

- `ai@bensoncrew.ca` is the front-office/public meeting identity and delegated read actor.
- `crewbert@bensoncrew.ca` is the private system/vault identity.
- Human users are seeded in `users` with `tier`, `user_type`, and `meeting_sync_enabled`.
- SECURITY-002 keeps raw shared-comms/intelligence reads Tier 1-only unless filtered access is proven, but Drive itself still needs ACL enforcement.

## Raw Access Rules

For protected original meeting note/transcript files, allowed raw Drive readers are:

- the actual file owner/organizer;
- `crewbert@bensoncrew.ca` as the private system/vault identity;
- a specifically approved break-glass Tier 1 raw reader only if the approval artifact names that account and why it is required.

Default V1 policy should not require direct Steve Drive sharing for every raw file. Steve's Tier 1 access is through the governed AIOS/vault path unless a break-glass raw-reader approval says otherwise.

Not allowed by default:

- non-owner participants;
- `ai@bensoncrew.ca` as a durable raw-file reader when it is not the file owner;
- broad `domain` permissions;
- `anyoneWithLink` permissions;
- Google groups unless explicitly allowlisted in the dry-run approval;
- external emails outside the known `@bensoncrew.ca` user/system set;
- inherited or Shared Drive permissions that cannot be explained by the preflight layer.

Broadcast/training exception:

- Broadcast or broad-training notes can be classified as lower risk, but they still require explicit safe-sharing classification.
- If a file is not confidently classified as safe-for-broad-raw-sharing, it uses the strict owner-plus-Crewbert rule.

## Owner-Preserving ACL Rules

The policy must never transfer ownership and never remove the owner.

For each file:

1. Identify the effective owner from Drive metadata and permission records.
2. Identify the source account that can read and, if approved, repair the file.
3. Confirm `crewbert@bensoncrew.ca` has the approved role.
4. Classify every non-owner permission as allowed, unsafe, inherited-blocked, or unknown.
5. Produce a dry-run diff before any mutation.
6. Apply only exact approved changes against exact file IDs and permission IDs.

Crewbert role:

- Required minimum: `reader`.
- `writer` is allowed only when the approval artifact explicitly says the repair requires write access for vault/copy/move behavior.
- V1 should prefer least privilege and not grant writer when reader satisfies archive/proof needs.

Owner ambiguity:

- If owner cannot be identified, fail closed.
- If the file is on a Shared Drive, inherited, or permission details prevent safe per-file repair, fail closed and classify the next safe action instead of attempting mutation.
- If the only account that can repair is not the owner or an approved delegated actor, fail closed.

## Delegated Drive Access Preflight

Create a central Drive preflight layer before meeting-specific enforcement.

Expected module:

- `lib/drive-access-preflight.js`

Expected exports:

- `DRIVE_ACCESS_REQUEST_CARD_ID = 'DRIVE-ACCESS-REQUEST-001'`
- `DRIVE_ACCESS_REQUEST_CLOSEOUT_KEY = 'drive-access-request-v1'`
- `DRIVE_ACCESS_PREFLIGHT_STATES`
- `normalizeDriveActor(input)`
- `buildDriveFilePreflight({ fileId, intendedActor, sourceAccount, purpose })`
- `classifyDrivePermission(permission, policy)`
- `classifyDriveRepairAuthority(preflight)`
- `buildDriveAccessRequestPlan(preflight)`
- `redactDriveProof(value)`
- `buildSyntheticDriveAccessPreflightProof()`

Preflight states:

- `readable_safe`
- `readable_repairable`
- `readable_repair_blocked`
- `missing_access`
- `owner_ambiguous`
- `permission_inherited_blocked`
- `shared_drive_blocked`
- `request_access_required`
- `unsupported_file`
- `failed_closed`

Preflight behavior:

- prove the impersonated user and intended actor;
- call Drive metadata and permission reads through `lib/google-delegated.js`;
- classify whether the current actor can read, list permissions, add Crewbert, and remove unsafe permissions;
- generate the next safe action when access is missing;
- never spam request-access flows in V1;
- never send email in V1;
- never mutate permissions in V1 preflight mode;
- store or print only metadata-safe proof.

If the Google API cannot list a permission because the actor lacks authority, the result is `request_access_required` or `missing_access`, not a guessed success.

## Meeting ACL Policy Layer

Expected module:

- `lib/meeting-vault-acl.js`

Expected exports:

- `MEETING_VAULT_ACL_CARD_ID = 'MEETING-VAULT-ACL-001'`
- `MEETING_VAULT_ACL_CLOSEOUT_KEY = 'meeting-vault-acl-v1'`
- `MEETING_VAULT_POLICY_VERSION`
- `buildMeetingRawFileInventory({ limit, since, includeArchived })`
- `buildMeetingAclPolicy(file, artifact)`
- `classifyMeetingRawFileAcl(file, preflight, policy)`
- `buildMeetingAclDryRunPlan(files)`
- `assertMeetingAclMutationApproved({ approvalRef, dryRunHash, fileId, operation })`
- `buildMeetingAclRollbackPlan(appliedOperation)`
- `buildMeetingVaultAclStatus(snapshot)`
- `buildSyntheticMeetingVaultAclProof()`

The meeting layer consumes Drive preflight output. It must not implement raw Google permission rules independently.

## Schema And Ledger Needs

Use additive schema only.

Likely DB additions in `lib/foundation-db.js`:

### `drive_access_preflight_runs`

- `run_id TEXT PRIMARY KEY`
- `card_id TEXT NOT NULL`
- `status TEXT NOT NULL`
- `actor_email_hash TEXT`
- `source_account_hash TEXT`
- `file_count INTEGER NOT NULL DEFAULT 0`
- `readable_count INTEGER NOT NULL DEFAULT 0`
- `missing_access_count INTEGER NOT NULL DEFAULT 0`
- `repairable_count INTEGER NOT NULL DEFAULT 0`
- `blocked_count INTEGER NOT NULL DEFAULT 0`
- `dry_run_hash TEXT`
- `metadata JSONB NOT NULL DEFAULT '{}'::jsonb`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `created_by TEXT`

### `drive_access_preflight_items`

- `run_id TEXT REFERENCES drive_access_preflight_runs(run_id) ON DELETE CASCADE`
- `file_ref_hash TEXT NOT NULL`
- `source_id TEXT`
- `artifact_id TEXT`
- `state TEXT NOT NULL`
- `owner_hash TEXT`
- `permission_summary JSONB NOT NULL DEFAULT '{}'::jsonb`
- `proposed_operations JSONB NOT NULL DEFAULT '[]'::jsonb`
- `blocker_card TEXT`
- `next_safe_action TEXT`
- `metadata JSONB NOT NULL DEFAULT '{}'::jsonb`
- primary key on `(run_id, file_ref_hash)`

### `meeting_vault_acl_audits`

- `audit_id TEXT PRIMARY KEY`
- `drive_preflight_run_id TEXT`
- `status TEXT NOT NULL`
- `policy_version TEXT NOT NULL`
- `meeting_file_count INTEGER NOT NULL DEFAULT 0`
- `safe_count INTEGER NOT NULL DEFAULT 0`
- `unsafe_count INTEGER NOT NULL DEFAULT 0`
- `missing_crewbert_count INTEGER NOT NULL DEFAULT 0`
- `blocked_count INTEGER NOT NULL DEFAULT 0`
- `approved_mutation_count INTEGER NOT NULL DEFAULT 0`
- `applied_mutation_count INTEGER NOT NULL DEFAULT 0`
- `rollback_available BOOLEAN NOT NULL DEFAULT false`
- `dry_run_hash TEXT`
- `approval_ref TEXT`
- `metadata JSONB NOT NULL DEFAULT '{}'::jsonb`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `created_by TEXT`

### Optional metadata on existing artifacts

Add only if needed:

- `shared_communication_artifacts.metadata.rawDriveAclState`
- `shared_communication_artifacts.metadata.rawOwnerHash`
- `shared_communication_artifacts.metadata.rawPermissionSummary`
- `shared_communication_artifacts.metadata.meetingVaultPolicyVersion`

Do not add raw owner emails, raw file IDs, permission IDs, Drive links, titles, or transcript content to tracked proof.

## Files And Modules To Inspect

Inspect before implementation:

- `lib/google-delegated.js`
- `lib/foundation-db.js`
- `lib/foundation-readiness-gates.js`
- `lib/foundation-build-log.js`
- `lib/security-access.js`
- `lib/source-contracts.js`
- `lib/source-lifecycle-completion.js`
- `lib/meeting-classification.js`
- `lib/meeting-transcripts.js`
- `scripts/meeting-notes-verify.mjs`
- `scripts/sync-meeting-notes-archive.mjs`
- `scripts/verify-recent-meeting-transcript-gaps.mjs`
- `scripts/report-meeting-transcript-gaps.mjs`
- `scripts/mirror-meeting-archive-to-drive.mjs`
- `scripts/process-foundation-done-test.mjs`
- `scripts/foundation-verify.mjs`
- `server.js`
- `public/foundation.js`
- `package.json`
- `docs/specs/2026-04-23-auth-tiers-vault.md`
- `docs/source-notes/shared-communications.md`
- `docs/process/foundation-done-test.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`

## Likely Files To Touch

DRIVE-ACCESS-REQUEST-001 dry-run/preflight:

- Add `lib/drive-access-preflight.js`.
- Update `lib/google-delegated.js` only if needed for richer metadata fields, permission details, or safer helper wrappers.
- Update `lib/foundation-db.js` with additive preflight ledger tables and helpers.
- Add `scripts/process-drive-access-request-check.mjs`.
- Update `package.json` with `process:drive-access-request-check`.
- Update `scripts/foundation-verify.mjs`.
- Update `lib/foundation-readiness-gates.js` with `drive-access-request-v1` closeout key and package-script expectations.
- Add `docs/process/drive-access-request.md` after implementation.
- Add `docs/process/approvals/DRIVE-ACCESS-REQUEST-001.json` only after approval.
- Update `lib/foundation-build-log.js`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md` only after implementation closeout.

MEETING-VAULT-ACL-001 Phase A dry-run safety proof:

- Add `lib/meeting-vault-acl.js`.
- Update `lib/foundation-db.js` with meeting ACL audit tables/helpers.
- Add `scripts/process-meeting-vault-acl-check.mjs`.
- Update `package.json` with `process:meeting-vault-acl-check`.
- Update `scripts/foundation-verify.mjs`.
- Update `lib/foundation-readiness-gates.js` with `meeting-vault-acl-v1` closeout key and package-script expectations.
- Update `scripts/process-foundation-done-test.mjs` only if the current registry cannot express the paired card status.
- Add `docs/process/meeting-vault-acl.md` after implementation.
- Add `docs/process/approvals/MEETING-VAULT-ACL-001.json` only after approval.
- Update `lib/foundation-build-log.js`, `docs/process/foundation-done-test.md`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md` after closeout.

MEETING-VAULT-ACL-001 Phase B separately approved mutation:

- Add an apply path only after exact mutation approval exists:
  - preferred: `scripts/process-meeting-vault-acl-check.mjs --apply --approvalRef=... --dryRunHash=...`
  - acceptable if cleaner: `scripts/apply-meeting-vault-acl-repairs.mjs`
- Add a separate ACL mutation approval artifact tied to the Phase A dry-run hash.
- Add rollback helper behavior only if Phase B is approved.

Avoid UI changes unless the proof surface needs a small metadata-only count in Runtime Health. If UI is touched, keep it to counts/state/next action only; no broad UI polish.

## Routes And Surfaces Covered

Existing read/API surfaces that must remain safe:

- `GET /api/foundation-hub`
- `GET /api/shared-communications/archive`
- `GET /api/shared-communications/coverage`
- `GET /api/shared-communications/candidates`
- `GET /api/shared-communications/synthesis`
- `POST /api/intelligence/evidence`
- Foundation readiness command: `npm run process:foundation-done-test -- --report-only`
- Foundation verifier: `npm run foundation:verify`

Likely new or changed route:

- Prefer no new route for V1.
- If dashboard visibility is required, add only `GET /api/foundation/meeting-vault-acl` behind `requireAdminToken`, returning metadata-only counts, policy version, last dry-run hash, status, blockers, and next safe action. Do not return file names, Drive links, raw emails, raw file IDs, permission IDs, or permission lists.

No public route is allowed.

## Dry-Run Output Contract

Every dry-run must produce:

- run ID;
- policy version;
- card ID;
- scan timestamp;
- counts by state;
- actor class and hashed actor account;
- source account count;
- file count;
- safe count;
- missing Crewbert count;
- unsafe share count;
- blocked count;
- proposed operation counts by type;
- blocker cards;
- next safe commands;
- stable dry-run hash.

The dry-run must not produce:

- raw meeting text;
- transcript excerpts;
- meeting titles;
- Drive links;
- raw file IDs in tracked proof;
- raw owner emails in tracked proof;
- raw permission IDs in tracked proof;
- raw permission lists in tracked proof.

Detailed apply manifests that need exact file IDs and permission IDs may exist only in local ignored storage, for example `store/meeting-vault-acl/`, and must be represented in repo proof by hash/counts only.

## Approval And Mutation Rules

Default behavior is dry-run.

Approval boundary:

- `DRIVE-ACCESS-REQUEST-001` approval authorizes dry-run/preflight only.
- `MEETING-VAULT-ACL-001` Phase A approval authorizes dry-run meeting ACL safety proof only.
- `MEETING-VAULT-ACL-001` Phase B requires a separate explicit permission-mutation approval artifact tied to the Phase A dry-run hash.

Phase A must prove the apply path fails closed when the Phase B approval artifact is missing, stale, mismatched, or incomplete.

If Phase A finds unsafe files and no Phase B approval exists, the implementation must stop after dry-run and keep `MEETING-VAULT-ACL-001` scoped/blocking. The closeout report must include the dry-run hash, counts, proposed operation types, blocker reason, and exact approval needed. It must not apply partial repairs.

Any real permission mutation in Phase B must require all of:

- `--apply`;
- separate explicit Phase B approval artifact;
- approval card matches `MEETING-VAULT-ACL-001`;
- approval names the Phase A dry-run hash;
- approval names the policy version;
- approval names allowed operation classes;
- approval records whether Crewbert gets `reader` or `writer`;
- approval records whether any break-glass Tier 1 raw reader is allowed;
- approval is no older than the accepted freshness window;
- live preflight still matches the approved dry-run for every file and permission operation.

Mutation operations allowed only after approval:

- add `crewbert@bensoncrew.ca` with the approved role when missing;
- remove exact unsafe user/group/domain/anyone permission IDs from exact files;
- leave owner permission untouched;
- leave inherited/Shared Drive permissions untouched and blocked unless separately approved with a safe path.

Mutation operations never allowed in this card:

- ownership transfer;
- folder-wide permission rewrite;
- removing a permission by email without confirming the exact permission ID from the fresh preflight;
- changing unrelated Drive corpus files;
- broad request-access email sends;
- silent repair without a rollback record.

## Unsafe Share Detection

Classify as unsafe unless explicitly allowed by policy:

- `type = anyone`;
- broad `domain` permission;
- non-owner human participant on strict protected meeting files;
- `ai@bensoncrew.ca` on strict protected meeting files when it is not the owner;
- external emails;
- groups;
- writers/commenters other than owner or approved system identity;
- missing `crewbert@bensoncrew.ca`;
- file owner unknown;
- permission list unavailable;
- inherited permissions that cannot be removed at file level;
- Shared Drive permission shape that cannot be explained by per-file proof.

Classify as safe:

- owner remains owner;
- Crewbert has approved system access;
- no non-owner raw readers remain, unless the file is explicitly classified as safe-for-broad-raw-sharing and the allowlist is approved;
- proof freshness is inside the approved window.

## Repair And Request-Access Behavior

Phase A dry-run repair path:

1. Run preflight.
2. Produce dry-run.
3. Review dry-run counts and local detailed manifest.
4. Produce stable dry-run hash.
5. Prove apply fails closed without Phase B approval.
6. If all files are already safe, proceed to closeout proof.
7. If unsafe files remain, stop and keep `MEETING-VAULT-ACL-001` scoped/blocking with the exact Phase B approval needed.

Phase B approved mutation path:

1. Create separate explicit Phase B approval artifact tied to the Phase A dry-run hash.
2. Re-run preflight immediately before apply.
3. Confirm live preflight still matches the approved dry-run.
4. Apply exact approved operations only.
5. Record before/after metadata snapshots and rollback plan.
6. Re-run check in verify mode.

Access-request path:

- If a file cannot be read, do not guess.
- Output `request_access_required` with owner hash when known, source account hash, reason, and next safe action.
- Do not send request-access email under `DRIVE-ACCESS-REQUEST-001` or `MEETING-VAULT-ACL-001` Phase A.
- Phase B permission mutation approval is not approval to send request-access emails. Email side effects require their own explicit approval if ever needed.
- If an owner is unknown, output `owner_ambiguous` and keep the blocker visible.

## Rollback And Fail-Closed Behavior

Rollback data:

- before permission snapshot stored locally with raw IDs;
- tracked proof stores only hash/count metadata;
- each applied mutation records inverse operation if possible;
- rollback script/path can recreate removed user permissions and remove newly added Crewbert permission when the approval says to revert.

Fail closed when:

- Phase B approval is missing for any apply attempt;
- dry-run hash mismatch;
- actor identity mismatch;
- file ID not in approved manifest;
- permission ID not in approved manifest;
- owner is missing or ambiguous;
- permission is inherited or Shared Drive blocked;
- Google API returns 401/403/429/5xx beyond bounded retry;
- raw content would be printed;
- local detailed manifest path is missing for apply;
- rollback cannot be recorded.

If fail-closed leaves unsafe shares unresolved, `process:foundation-done-test -- --report-only` must continue to name `MEETING-VAULT-ACL-001` and/or `DRIVE-ACCESS-REQUEST-001`. A successful Phase A dry-run with unresolved unsafe shares is evidence, not closeout.

## Readiness Integration

`lib/foundation-readiness-gates.js` should treat:

- `DRIVE-ACCESS-REQUEST-001` as done only when `drive-access-request-v1` closeout exists and `process:drive-access-request-check` passes.
- `MEETING-VAULT-ACL-001` as done only when `meeting-vault-acl-v1` closeout exists and `process:meeting-vault-acl-check` passes.

The meeting raw Drive ACL/vault leg passes only when:

- both cards are done with closeout proof;
- the preflight layer is present;
- the meeting ACL policy layer is present;
- latest meeting ACL check reports no unresolved unsafe raw access for in-scope meeting note/transcript files because every file was already safe in Phase A, or Phase B was separately approved, applied, rechecked, and rollback proof exists;
- any repaired permission mutations have separate Phase B approval, before/after proof, recheck proof, and rollback proof;
- proof output is metadata-only.

The leg fails when:

- either card is not done;
- any in-scope file is unsafe and unrepaired;
- any in-scope file is blocked by missing access or ambiguous owner;
- Phase A found unsafe files and no Phase B mutation approval exists;
- the proof command is missing from `package.json`;
- the check cannot safely evaluate Drive permissions.

## Verifier Coverage

`scripts/foundation-verify.mjs` should verify:

- plan artifact exists;
- approval artifact exists after approval;
- package scripts exist;
- central modules exist;
- no raw content/Drive link patterns appear in tracked proof docs;
- process scripts default to dry-run/no mutation;
- apply path requires approval and dry-run hash;
- `lib/google-delegated.js` permission helpers are used through the central policy layer;
- readiness no longer names `DRIVE-ACCESS-REQUEST-001` only after the preflight closeout;
- readiness no longer names `MEETING-VAULT-ACL-001` only after actual meeting ACL safety proof;
- build-log closeouts link exact card IDs;
- Foundation ship gate can run separately for each card if they close in separate commits.

## Acceptance Criteria

`DRIVE-ACCESS-REQUEST-001` is done when:

- central Drive preflight module exists;
- active actor/source account proof is metadata-only;
- Drive permission inventory works for readable test files;
- missing-access and owner-ambiguous paths fail closed;
- request-access behavior is classified but does not send requests;
- no emails are sent;
- no Drive permissions are added, removed, or changed;
- dry-run proof contains no raw titles, links, file IDs, permission IDs, or raw content;
- `npm run process:drive-access-request-check` passes;
- `foundation:verify` covers the module, script, command, and closeout.

`MEETING-VAULT-ACL-001` Phase A is complete when:

- meeting raw file inventory covers in-scope meeting notes/transcripts from archived artifacts and meeting crawl metadata;
- owner-preserving ACL policy is central and consumes the Drive preflight layer;
- unsafe shares are detected;
- missing Crewbert access is detected;
- dry-run repair plan is generated with a stable hash;
- real permission apply is impossible without explicit approval and matching dry-run hash;
- no emails are sent;
- no Drive permissions are added, removed, or changed;
- if every file is already safe, the card can proceed to closeout proof;
- if unsafe files exist, the script stops after dry-run and reports dry-run hash, counts, proposed operation types, blocker reason, and exact Phase B approval needed;
- if no mutation approval exists, the card does not pretend unsafe files are safe and remains scoped/blocking.

`MEETING-VAULT-ACL-001` Phase B is complete only when:

- a separate explicit permission-mutation approval artifact exists and names the Phase A dry-run hash;
- live preflight still matches the approved dry-run;
- exact approved operations are applied;
- applied mutations are rechecked;
- rollback metadata is recorded and verified;
- no unapproved permission mutation occurs.

`MEETING-VAULT-ACL-001` is done only when:

- every in-scope file is already safe from Phase A; or
- Phase B is separately approved, applied, rechecked, and rollback proof exists;
- `npm run process:meeting-vault-acl-check` passes because raw meeting Drive ACL state is actually safe;
- `npm run process:foundation-done-test -- --report-only` no longer names `MEETING-VAULT-ACL-001` or `DRIVE-ACCESS-REQUEST-001`;
- no raw/private meeting content leaks into proof output.

## Proof Commands

DRIVE-ACCESS-REQUEST-001 dry-run/preflight proof:

```bash
node --check lib/drive-access-preflight.js
node --check scripts/process-drive-access-request-check.mjs
npm run process:drive-access-request-check
```

MEETING-VAULT-ACL-001 Phase A dry-run safety proof:

```bash
node --check lib/meeting-vault-acl.js
node --check scripts/process-meeting-vault-acl-check.mjs
npm run process:meeting-vault-acl-check
```

If Phase A finds unsafe files and no Phase B approval exists, stop here. Do not run an apply command. Keep `MEETING-VAULT-ACL-001` scoped/blocking and report the dry-run hash, counts, proposed operation types, blocker reason, and exact Phase B approval needed.

MEETING-VAULT-ACL-001 Phase B approved mutation proof:

```bash
npm run process:meeting-vault-acl-check -- --apply --approvalRef=<phase-b-approval.json> --dryRunHash=<phase-a-dry-run-hash>
npm run process:meeting-vault-acl-check
```

Only run Phase B after a separate explicit permission-mutation approval artifact exists.

Full closeout proof:

```bash
npm run meeting-notes:verify
npm run process:drive-access-request-check
npm run process:meeting-vault-acl-check
npm run process:foundation-done-test -- --report-only
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=DRIVE-ACCESS-REQUEST-001 --planApprovalRef=docs/process/approvals/DRIVE-ACCESS-REQUEST-001.json --closeoutKey=drive-access-request-v1 --commitRef=HEAD
npm run process:foundation-ship -- --card=MEETING-VAULT-ACL-001 --planApprovalRef=docs/process/approvals/MEETING-VAULT-ACL-001.json --closeoutKey=meeting-vault-acl-v1 --commitRef=HEAD
```

If real ACL mutation is approved, add the Phase B approved apply command before the final check and ship gates. The apply command must include the separate permission-mutation approval ref and matching Phase A dry-run hash.

## Not Next

Do not build:

- Strategy Hub expansion;
- Sales expansion;
- Agent Feedback expansion;
- Scoper;
- Agent Factory;
- broad corpus or video mining;
- researcher/self-improvement agent;
- extraction retry/backoff work;
- rich meeting video/recording understanding;
- public access or edge exposure;
- filtered shared-comms access for non-Tier-1 users;
- sprint view;
- broad UI polish;
- new connectors;
- broad Drive folder restructuring;
- Gmail/Missive/Slack raw vault work.

This plan is only for proving and enforcing raw Google Drive meeting note/transcript ACL safety through a governed, owner-preserving, metadata-only, dry-run-first process.
