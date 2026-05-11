# Meeting Vault Auto-Enforcement

Status: implemented for report-only forward-flow proof under `meeting-vault-auto-enforcement-v1`.

Card: `MEETING-VAULT-AUTO-ENFORCEMENT-001`

## What Changed

Manual historical Drive batching is no longer the readiness model.

V1 adds an automatic Meeting Vault control layer that:

- treats original Gemini meeting notes as source truth;
- keeps archive/search in PostgreSQL instead of duplicate Google Docs;
- separates legacy Crewbert duplicate copies from original ACL decisions;
- classifies notes as protected, standard, broad, or unknown;
- evaluates Crewbert vault access, public/domain exposure, unsafe users, missing access, and owner ambiguity;
- records a metadata-only daily audit run;
- stores legacy messy files in a visible exception queue;
- gives `MEETING-VAULT-ACL-001` a forward-flow close rule instead of endless historical cleanup batches.

## Operating Rule

Default mode is `report_only`.

The process script may read Drive permission metadata through delegated preflight. It does not add readers, remove permissions, send request-access emails, delete files, move files, or transfer ownership.

Any future live enforcement mode requires a separate explicit approval artifact. Without that artifact, apply/live mode fails closed.

## Source Truth

The source-of-truth raw file is the human/organizer-owned original Gemini note.

Crewbert-owned Google Docs discovered from the old process are legacy duplicate copies. They are inventoried as exceptions and excluded from ACL decisions. If only a Crewbert-owned copy exists and no original is proven, the file is classified as `original_missing`.

Meeting archive/search proof stays DB-backed:

- `shared_communication_artifacts` stores the note/transcript artifact metadata and content hash;
- meeting sync proves original preference and DB archive writes;
- the Drive mirror job remains disabled for write/copy paths;
- the verifier fails if a current meeting job can create duplicate Google Docs.

## Daily Audit

`npm run process:meeting-vault-auto-enforcement-check` records:

- enforcement baseline;
- processed count;
- forward-item count;
- classification split;
- source-file-role split;
- queued Crewbert access count;
- protected review queue count;
- public/domain high-risk count;
- legacy exception count;
- report hash;
- next safe action.

Tracked proof is metadata-only: file refs, owners, and permission rows are represented by hashes/counts, not raw titles, Drive links, transcript text, or email addresses.

## Close Rule

`MEETING-VAULT-ACL-001` can stop blocking Foundation when:

- automatic forward-flow proof is green;
- no duplicate Google Docs rule is green;
- ACL/enforcement decisions target originals only;
- forward original Gemini notes are classified and preflighted;
- Crewbert access is present or queued for forward originals;
- protected forward originals are safe, locked, or review-queued;
- public/domain exposure on forward protected originals is zero;
- broad/training meetings preserve legitimate guest access instead of blanket scrubbing;
- unknown forward notes fail closed;
- historical messy files are bounded in the legacy exception queue;
- `foundation:verify` and the readiness exit test agree.

Legacy exceptions remain visible work. They do not become safe; they stop being the active Foundation blocker only because the forward system prevents new silent drift.

## Proof

```bash
npm run meeting-notes:verify
npm run process:meeting-vault-auto-enforcement-check
npm run process:meeting-vault-acl-check -- --json
npm run process:foundation-done-test -- --report-only
npm run backlog:hygiene -- --json
npm run foundation:verify
```

Ship gate:

```bash
npm run process:foundation-ship -- --card=MEETING-VAULT-AUTO-ENFORCEMENT-001 --planApprovalRef=docs/process/approvals/MEETING-VAULT-AUTO-ENFORCEMENT-001.json --closeoutKey=meeting-vault-auto-enforcement-v1 --commitRef=HEAD
```

## Not Included

- Historical Drive cleanup batches.
- Gmail or other guest-domain removals.
- Real Drive permission mutations.
- Request-access emails.
- Deletes, moves, or ownership transfers.
- Strategy, Sales, Agent Feedback, Scoper, Agent Factory, broad corpus/video mining, researcher, public access, or broad UI polish.
