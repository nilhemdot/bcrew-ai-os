# SECURITY-PROVIDER-ROTATION-PROOF-001 No-Secret Preflight Plan

Card: `SECURITY-PROVIDER-ROTATION-PROOF-001`
Closeout key: `security-provider-rotation-proof-preflight-v1`

## What
Build a narrow V1 no-secret preflight for provider-side credential closure. This card creates a provider/account checklist from the known FUBZahnd `App.config` exposure classes, proves the ledger contains no raw values or hashes, and returns the card blocked pending real provider-side rotation, revocation, retirement, or dead-key proof.

This does not close exposed credentials.

## Why
`SECURITY-006` and `SECURITY-PROVIDER-ROTATION-PROOF-001` are still P0 because repo-side cleanup is not provider-side proof. Foundation needs a durable checklist Steve can use with account owners without copying secrets into docs, logs, verifier output, or chat.

The root invariant is: exposed credential incidents stay blocked until proof references exist, and no Foundation proof artifact stores the credential values it is trying to protect.

Useful operator behavior: Steve can open one safe ledger, see which provider/account owner proof is still missing, and move the real cleanup workflow forward quickly without asking a builder to handle raw secrets.

## Acceptance Criteria
- Read only the local FUBZahnd `App.config` as metadata and never print values.
- Create `docs/process/security-provider-rotation-proof-ledger.json` with provider, credential class, exposure source, owner, status, date, and remaining blocker.
- Ledger rows cover Ambition/KPI webhooks, Follow Up Boss, SMTP mail server, SQL Server, and Supabase exposure classes.
- Ledger status stays `blocked_pending_provider_side_proof`.
- Dogfood rejects raw-value leakage, missing exposure groups, and false closure without proof.
- `SECURITY-PROVIDER-ROTATION-PROOF-001` and `SECURITY-006` remain scoped after the preflight.
- Plan Critic score must pass at 9.8+; if it revises the plan, do not ship.
- `process:foundation-ship` passes before push.

## Definition Of Done
- Existing backlog truth, source notes, Plan Critic, approval integrity, current sprint overlay, closeout registry, and process write guard are reused.
- Existing code is reused for approval integrity, live Backlog reads/writes, Current Sprint overlay updates, closeout lookup, and Plan Critic scoring.
- Existing docs reused: `docs/source-notes/fub-zahnd-middleware.md`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`.
- Existing scripts reused as the gate pattern: `process:ship-check`, `process:fanout-check`, `process:post-ship-fanout`, `backlog:hygiene`, and `foundation:verify`.
- `lib/security-provider-rotation-proof-preflight.js` owns the function-path parser, ledger builder, no-secret validator, ledger evaluator, and dogfood proof.
- `scripts/process-security-provider-rotation-proof-preflight-check.mjs` is read-only by default; live backlog/sprint update requires `--apply`.
- `docs/process/approvals/SECURITY-PROVIDER-ROTATION-PROOF-001.json` approves only this no-secret preflight/return scope.
- `docs/_archive/handoffs/2026-05-18-security-provider-rotation-proof-preflight.md` records that no provider calls, rotations, revocations, secret hashes, auth repair, or external writes occurred.

## Details
Scope is tight and V1 only:

- Inspect only config key names and whether configured metadata exists.
- Store no `value`, `secret`, `password`, `connectionString`, `hash`, `fingerprint`, or equivalent raw-sensitive fields in the ledger.
- Mark each exposure row `provider_side_proof_missing` until an account owner supplies proof references.
- Keep `SECURITY-006` scoped and point it at the ledger as the checklist.

Not next:

- No provider-side credential rotation, revocation, retirement, or live validation.
- No raw credential values, secret hashes, token lengths, connection strings, usernames, passwords, or emails in repo truth.
- No GitHub/provider API calls, no public-repo mutation, no auth repair, and no connector/runtime changes.
- No live FUB, Ambition, SMTP, SQL Server, Supabase, Drive, Gmail, ClickUp, Slack, or Agent Feedback mutation.
- No Google Drive permission mutation; do not mutate Drive permissions.
- Do not work MEETING-VAULT-ACL-001 Phase B.
- No live extraction, source crawl, model/provider call, paid run, hidden subagent, or parallel builder launch.

Split/no-new-responsibility plan:

- New behavior lives in the small dedicated module and focused script.
- Existing current-plan/current-state docs get short status notes only.
- The closeout registry gets one blocked-preflight row only.
- No existing credential/runtime/provider code is modified.

Gate decision tree:

- Static gate: `node --check` for the new module and proof script.
- Focused gate: `npm run process:security-provider-rotation-proof-preflight-check -- --json`, then `--apply --json` for the explicit live-state return.
- Full gate: because this touches package scripts, live Backlog/Current Sprint state, security proof docs, closeout registry, and Foundation verification, run `backlog:hygiene`, `foundation:verify`, fanout, post-ship fanout, and `process:foundation-ship`.
- Blast radius is limited to repo-truth proof artifacts and live backlog/sprint metadata; no provider/runtime/connector paths are changed.

## Risks
Risk: accidentally marking provider-side work done from metadata. Repair path: fail closed unless every row remains blocked or carries a proof reference.

Risk: leaking secrets into the ledger. Repair path: reject forbidden field names, raw sentinel values, secret assignment strings, and real raw values collected from the source file.

Risk: scope creep into provider work. Repair path: approval explicitly forbids provider calls, rotations, auth repair, and external writes.

Speed budget: the focused gate is proportional and fast by default. It reads one local config file as metadata, validates one JSON ledger, runs dogfood fixtures, and should stay under 1 minute before the full ship gate.

## Tests
Run:

```sh
node --check lib/security-provider-rotation-proof-preflight.js scripts/process-security-provider-rotation-proof-preflight-check.mjs
npm run process:security-provider-rotation-proof-preflight-check -- --json
npm run process:security-provider-rotation-proof-preflight-check -- --apply --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=SECURITY-PROVIDER-ROTATION-PROOF-001 --planApprovalRef=docs/process/approvals/SECURITY-PROVIDER-ROTATION-PROOF-001.json --closeoutKey=security-provider-rotation-proof-preflight-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=SECURITY-PROVIDER-ROTATION-PROOF-001 --closeoutKey=security-provider-rotation-proof-preflight-v1
npm run process:post-ship-fanout -- --card=SECURITY-PROVIDER-ROTATION-PROOF-001 --closeoutKey=security-provider-rotation-proof-preflight-v1 --commitRef=HEAD
npm run process:foundation-ship -- --card=SECURITY-PROVIDER-ROTATION-PROOF-001 --planApprovalRef=docs/process/approvals/SECURITY-PROVIDER-ROTATION-PROOF-001.json --closeoutKey=security-provider-rotation-proof-preflight-v1 --commitRef=HEAD
```
