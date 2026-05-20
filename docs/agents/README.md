# Agents

Status: Active model doc
Last reviewed: 2026-04-26

This is the visible Foundation agent layer.

Use this folder to answer:

- who the important agents are
- what role each one plays
- whether each one is live, planned, or only a pattern

Keep it tight. No swarm list. No junk.

## Current Agent Model

There are three agent types:

1. Personal agents
   - user-facing assistants for real humans
2. System agents
   - agents that belong to BCrew AI OS itself
3. Repo-local coding agents
   - coding workers tied to a repo, not a human identity

## Current Important Agents

- [Harlan](harlan.md)
- [Crewbert](crewbert.md)

## Agent Onboarding

- [Personal Agent Onboarding](personal-agent-onboarding.md)
- [Role Assistant Contracts](role-assistant-contracts.md)
- [Trusted Assistant Loop](trusted-assistant-loop.md)

Personal agents need an onboarding loop before broad rollout. The loop should help build a private personal profile, learn the person's role/goals/preferences, collect feedback, and eventually send one useful daily nugget tied to that person's work and permissions. `ME.md` is only a working label for that profile.

Role assistants need explicit contracts before runtime expansion. The contract catalog defines what each assistant sees, does, escalates, trusts, reports, blocks, and requires approval for.

The first trusted assistant loop defines the source prerequisites, evidence format, write boundaries, and blocked-action behavior that Harlan must prove before wider agent/source expansion.

## Current Rule

- Harlan is not the whole OS.
- Crewbert is not Steve's personal assistant.
- Repo-local coders are tools for implementation, not identity-bearing business agents.

## What Stays Flexible

- exact runtime setup
- exact external home path for personal agents
- which coding model a repo-local coder uses

## What Stays Visible

- the important agents only
- their role
- whether they are live
- whether they belong to a human, the system, or a repo

## Update Trigger

Update this section when an agent becomes live, moves runtime homes, gains a new permission boundary, or changes owner/purpose. Do not add speculative swarm members before they have a real system role.
