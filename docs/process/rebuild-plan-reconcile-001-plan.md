# REBUILD-PLAN-RECONCILE-001 Plan

Status: done for v1 under `rebuild-plan-reconcile-v1`
Card: `REBUILD-PLAN-RECONCILE-001`
Date: 2026-05-12

## What

Reconcile the active rebuild command layer after the old-system, Codex, and Claude audits.

The new sprint order is:

1. `VERIFY-GATE-TIERING-001`
2. `REBUILD-PLAN-RECONCILE-001`
3. `PLAN-CRITIC-REPLACEMENT-001`
4. `SECURITY-BEHAVIOR-PROOF-001`
5. `VERIFIER-BEHAVIOR-SWEEP-001`
6. `STRATEGY-HUB-MEETING-READY-001`
7. `AVATAR-IMPORT-001`

## Why

Foundation reports READY, but the audits agreed the meaning is narrow: owner-only Strategy re-entry is allowed. The system is not old-system parity, not broad multi-user ready, and not public-access ready.

The main drift pattern is process proof over product behavior.

Steve also corrected the verification workflow: automatic proof should not mean running the full Foundation verifier after every small bounded change. Proportional verification goes first so the rest of this sprint can move without weakening the full gate for high-risk changes.

## Acceptance Criteria

- `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, Current Sprint, and live backlog agree on the sprint order.
- Foundation READY is described as owner-only Strategy re-entry.
- Meeting Vault historical cleanup is parked as legacy-exception work, not the active readiness blocker.
- Old-system carry-forward gaps are carded in backlog truth.
- The next build starts with Plan Critic and behavior-proof work before Strategy code.
- Current Sprint starts clean: prior done cards live in Backlog done / Recent Work, and prior returned cards live in the main backlog unless returned again during the active sprint.

## Definition Of Done

- Backlog cards exist for the sprint and old-system parity gaps, including Telegram/mobile bots and Directors/Master Director.
- Current Sprint shows `VERIFY-GATE-TIERING-001` and `REBUILD-PLAN-RECONCILE-001` as done this sprint and points the active blocker/next card at `PLAN-CRITIC-REPLACEMENT-001`.
- `CURRENT-SPRINT-DYNAMIC-TRUTH-001` is captured so active sprint command truth can move out of hardcoded JS seed strings.
- Old `Done This Sprint` and `Returned` rows are not carried into the new sprint overlay.
- Current plan/state describe the same order.
- Proof commands pass or any failure is explained with the next exact fix.

## Risks

- This can become another meta-only sprint. The exit criteria require one owner-only Strategy operator loop after proof hardening.
- This can drift into broad Strategy or Marketing. Strategy is narrow and owner-only; avatar import is data carry-forward only.
- This can reopen Meeting Vault historical cleanup. It stays a later separately approved legacy-exception sprint.

## Proof Commands

```bash
npm run backlog:hygiene -- --json
npm run process:rebuild-plan-reconcile-check
```
