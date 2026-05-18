# Harlan Project Registry

Status: Contract v1
Last reviewed: 2026-05-18
Primary backlog: `HARLAN-PROJECT-REGISTRY-001`
Related system card: `SYSTEM-011`

This page defines the first explicit project registry for Harlan as a cross-project personal assistant.

It is not a runtime launch. It does not grant Harlan new live access, writes, sends, extraction authority, or provider/model authority.

## Contract V1

Closeout: `harlan-project-registry-v1`

Every registered system must declare:

- system key
- owner
- local path, repo URL, or API base
- auth mode
- allowed reads
- allowed writes
- approval boundaries
- escalation owner
- source contracts or closeout refs
- current capability status

Unknown systems are blocked until registered.

## Initial Registry

| System | Status | Allowed Reads | Allowed Writes | Escalation |
| --- | --- | --- | --- | --- |
| `bcrew-ai-os` | read-only now; repo writes require a builder card | Foundation docs, Current Sprint context | proposal only, approval required | Foundation builder |
| `foundation-dashboard-api` | read-only local | `/api/foundation-hub`, `/api/foundation/current-sprint`, `/api/foundation/build-log` | none | Foundation operator |
| `old-bcrew-buddy-reference` | evidence only, not active truth | old-system evidence metadata | none | Foundation builder |
| `google-workspace-delegated` | blocked pending source/user approval | approved source-contract reads only | Drive mutation request only, approval required | Steve / Foundation source owner |
| `future-harlan-home` | planned, no runtime | none until created | create/move request only, approval required | Steve |

## Rules

- The registry does not grant new authority.
- Reads must be declared before Harlan can claim reach.
- Writes are disabled by default and require explicit approval.
- Google Workspace and Drive paths stay blocked unless a source/user approval exists.
- Old BCrew-Buddy files are evidence only, not active truth.
- Future Harlan home is planned only; this card does not create or move it.
- Secrets, tokens, raw private profile values, and private transcripts stay out of repo truth.
- Hidden subagents are forbidden by default.

## Not Done

This does not implement Harlan.

This does not launch live agent runtime, move Harlan to `~/.agents/harlan`, run live extraction, call providers/models, mutate external systems, mutate Drive, send messages, or create hidden workers.

## Update Trigger

Update this page when `HARLAN-PROJECT-REGISTRY-001`, `SYSTEM-011`, `HARLAN-OPERATOR-LOOP-V1-001`, Harlan runtime work, connector auth posture, or project reach changes.
