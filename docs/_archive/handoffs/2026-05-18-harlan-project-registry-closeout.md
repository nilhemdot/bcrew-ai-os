# HARLAN-PROJECT-REGISTRY-001 Closeout

Card: `HARLAN-PROJECT-REGISTRY-001`

Related card: `SYSTEM-011`

Closeout key: `harlan-project-registry-v1`

## What Shipped

Added the Foundation Harlan project registry contract for the first registered reach examples:

- `bcrew-ai-os`
- `foundation-dashboard-api`
- `old-bcrew-buddy-reference`
- `google-workspace-delegated`
- `future-harlan-home`

The registry defines local path/repo/API, auth mode, allowed reads, allowed writes, approval boundaries, escalation owner, source contracts, and capability status.

## Where It Lives

- `lib/harlan-project-registry.js`
- `scripts/process-harlan-project-registry-check.mjs`
- `docs/agents/harlan-project-registry.md`
- `docs/agents/harlan.md`
- `docs/rebuild/agent-architecture.md`
- `lib/foundation-runtime-reliability-verifier.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `lib/foundation-build-closeout-agent-runtime-records.js`
- `scripts/foundation-verify.mjs`
- `docs/process/harlan-project-registry-001-plan.md`
- `docs/process/approvals/HARLAN-PROJECT-REGISTRY-001.json`

## Proof

Focused dogfood proves the healthy registry passes and unsafe shapes fail closed:

- missing required system
- missing auth mode
- missing source contracts
- missing escalation owner
- unknown systems allowed by default
- unapproved writes/default-enabled mutating actions
- runtime launch
- live extraction
- provider/model calls
- external writes
- new authority grants
- hidden subagents

## Boundaries

This does not implement Harlan.

This does not launch live agent runtime, create or move `~/.agents/harlan`, run live extraction, call providers/models, grant Google Workspace access, send messages, mutate external systems, mutate Drive, build private profile storage, run Agent Feedback auto-send, launch hidden subagents, or launch parallel builders.

## Next

Continue with `HARLAN-OPERATOR-LOOP-V1-001` unless repo truth surfaces a higher P0 repair.
