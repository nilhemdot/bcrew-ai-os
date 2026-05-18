# Role Assistant Contracts

Status: Contract v1
Last reviewed: 2026-05-18
Primary backlog: `ROLE-ASSISTANT-CONTRACTS-001`

This page defines the role-specific assistant contract catalog for the first visible personal, leadership, ops, marketing, coaching, and extraction-worker shapes.

It is not the live implementation yet. `role-assistant-contracts-v1` gives future Harlan, Crewbert, team-assistant, and specialist-worker runtime work a governed role contract to satisfy.

## Contract V1

Closeout: `role-assistant-contracts-v1`

Every role assistant contract must declare:

- who owns the role
- what the assistant sees
- what the assistant does
- which sources it trusts
- who it escalates to
- which actions require approval
- what status report fields are required
- what failure modes must be visible
- what a first useful output looks like

Every role contract inherits:

- `foundation-agent-usefulness-runtime-gates-v1`
- `agent-live-answer-preflight-gate-v1`
- `agent-capability-registry-v1`
- `agent-template-runtime-contract-v1`
- `personal-agent-onboarding-contract-v1`

The catalog does not grant new authority. It only defines what later runtime cards must prove before a role can act.

## Role Examples

| Role | Owner | Sees | Does | Escalates |
| --- | --- | --- | --- | --- |
| Steve / Harlan | Steve | private profile after explicit share, current sprint, system health, approved project registry entries | answers current Foundation/project status, drafts next actions, surfaces blockers | Steve, Crewbert, Foundation builder |
| Sales Leadership Assistant | Sales leadership | approved CRM/source summaries, sales KPI source contracts, leader-specific profile after approval | summarizes sales risk, drafts coaching prompts, flags stale evidence | Sales leader, Ops, Steve |
| Ops Assistant | Operations | Foundation backlog/current sprint, ops source contracts, runtime health | triages blockers, drafts owner assignments, surfaces stale lanes | Ops owner, Crewbert, Steve |
| Marketing Assistant | Marketing | marketing source contracts, approved intelligence atoms, campaign/creator evidence | drafts source-backed angles, flags uncited claims, routes approvals | Marketing owner, Steve, source owner |
| Agent KPI Coach | Sales leadership / Agent Success | approved KPI summaries, Agent Feedback state, leader-approved coaching context | explains KPI gaps, drafts coaching questions, flags stale data | Sales leader, Agent Success owner, Steve |
| Extraction Worker | Foundation Extraction Control | approved extraction target, source contract boundary, job lease/cursor state | dry-run preflight, report approval blockers, write artifacts only after approved gates | Extraction owner, Crewbert, Steve |

## Required Boundaries

Default posture is fail closed.

These require explicit approval before any role assistant can perform them:

- external send
- external write
- Drive mutation
- live extraction
- paid run
- provider call
- model call
- private profile write

Current-status answers require live-answer preflight and source-backed evidence. Memory-only current claims are not allowed.

Private profile values stay in the private profile layer. Repo truth may contain schemas, examples, and policy only.

Hidden subagents are forbidden by default and require explicit approval for the exact bounded use.

## First Useful Output Standard

Each assistant should prove value before setup or feature explanation:

- Harlan tells Steve what Foundation is building now and what is blocked, with source refs.
- Sales Leadership sees one source-backed stuck pipeline or follow-up risk.
- Ops sees the highest-risk operational blocker and owner-bound next action.
- Marketing gets one source-backed content angle with approval gaps labeled.
- Agent KPI Coach shows one KPI coaching risk with source freshness and missing-data labels.
- Extraction Worker returns a dry-run preflight report without leasing or crawling live data.

## Not Done

This does not launch live assistants.

This does not implement Harlan or Crewbert.

This does not run live extraction, call providers/models, send messages, write external systems, mutate Drive, grant project reach, build private profile storage, or launch hidden subagents.

## Update Trigger

Update this page when `ROLE-ASSISTANT-CONTRACTS-001`, `HARLAN-PROJECT-REGISTRY-001`, `SYSTEM-011`, Harlan runtime work, Crewbert runtime work, or extraction-worker runtime work changes the role contract shape.
