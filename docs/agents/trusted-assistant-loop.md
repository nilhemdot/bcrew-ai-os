# Trusted Assistant Loop

Status: Contract V1
Card: `SLICE-001`
Closeout key: `trusted-assistant-loop-v1`
Last reviewed: 2026-05-20

## Purpose

The first trusted assistant loop proves Harlan can answer one useful Steve-facing loop from declared, source-backed, read-only inputs before broader agents, connectors, extraction, or side effects expand.

This is a contract and proof layer. It is not a live runtime launch.

## Loop

- Human owner: Steve
- Assistant: Harlan
- Orchestrator: Crewbert, behind the curtain
- Owner layer: Foundation
- Default posture: read-only answer, draft-only next action, proposal-only routing
- Required status labels: ready, degraded, blocked pending approval

## Source Prerequisites

The v1 loop can use:

- `SRC-STRATEGY-001` for strategy and rebuild doctrine
- `SRC-GMAIL-001` for approved Gmail current/archive context
- `SRC-GCAL-001` for calendar and meeting context
- `SRC-GDRIVE-001` for approved Drive docs and files
- Foundation live APIs for Current Sprint, System Health, source contracts, and backlog truth
- private/local Foundation memory index only in the main-session/private boundary

Private memory can inform the interaction only inside the approved private context. Raw private memory values do not become repo truth.

## Allowed Actions

Allowed by default:

- answer with source refs
- draft a next action for Steve review
- propose an Action Router item for pending review

Approval-bound:

- sends or external writes
- Calendar writes
- Drive permission changes
- credential, provider, auth, or source-access changes
- broad historical/private extraction
- paid/provider/browser-auth work

## Output Contract

Every loop answer needs:

- answer
- evidence
- blocked actions
- next action

Every current claim needs source evidence. Memory-only current claims are not allowed.

Evidence needs:

- source ID
- lookup reference
- freshness
- confidence
- privacy boundary

## Failure Policy

- Missing source: answer degraded or blocked.
- Stale current claim: block until fresh read.
- Approval-bound action: park the unsafe action and continue safe work.
- Repeated failure: repair or route P0 before normal progression.
- Private memory unavailable: use last-known metadata only.

Blockers block actions, not the whole sprint.

## Not Next

- Do not launch a live Harlan runtime from this card.
- Do not build Harlan UI, voice, avatar, or outbound identity work.
- Do not run live extraction or broad private backfill.
- Do not call providers or models as proof for this card.
- Do not send Gmail, Slack, Telegram, ClickUp, Drive, Calendar, or Agent Feedback messages.
- Do not mutate Google Drive permissions.
- Do not mutate credentials, provider keys, auth scopes, or source access.
- Do not work MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.
- Do not store raw private profile or memory values in repo truth.
- Do not launch hidden subagents or parallel builders.

## Proof

`lib/trusted-assistant-loop.js` defines the contract, evaluator, and dogfood fixtures.

The focused proof must reject:

- missing source prerequisites
- missing loop inputs
- memory-only current claims
- raw private memory stored in repo truth
- unsafe default writes
- live runtime/model/extraction/external-write attempts
- broad Gmail/private backfill
- stopping the whole sprint for one approval-bound action
- outputs without required evidence sections

## Update Trigger

Update this page when Harlan runtime, Crewbert orchestration, source prerequisites, write boundaries, Action Router behavior, or trusted assistant expansion changes.
