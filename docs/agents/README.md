# Agents

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
