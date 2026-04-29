# Approval Integrity

Plain English: a 9.8 approval file must point at the exact approved plan, not just say a score.

## V2 Approval Fields

New approval files use `approvalSchemaVersion: 2` and must include:

- `approvedPlanRef`
- `approvedPlanSha256`
- `approvedRepoHead`
- `approvalDigest`
- `approvedBy`
- `approvedAt`
- `score`

The plan hash proves the approved plan snapshot has not changed. The approval digest proves the approval JSON has not been casually edited after approval.

## Bootstrap

`APPROVAL-FILE-INTEGRITY-001` introduces this v2 schema, so the Phase 1 enforcement bundle uses a one-time bootstrap:

- `docs/process/approved-plans/phase-1-enforcement-v1.md` stores the approved plan snapshot.
- The four Phase 1 approval files point at that snapshot and include its SHA-256 hash.
- `bootstrapFromLegacy: true` is allowed only for the Phase 1 enforcement cards.

## Legacy approvals

Approval files created before this card are not silently trusted. They are accepted only when listed in:

- `docs/process/approval-legacy-exceptions.json`

New Foundation cards should use v2 approval files.

## Proof

Run:

```sh
npm run process:approval-integrity-check -- --synthetic=true
```

That proof validates a clean v2 approval, tampers with the plan snapshot, and confirms the tampered plan is rejected.
