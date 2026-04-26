# Personal Agent Onboarding

Status: Scoped system doctrine
Last reviewed: 2026-04-26
Primary backlog: `AGENT-010`

This page defines the onboarding standard for any real human who gets a personal agent.

It is not the live implementation yet.

## Why This Exists

A personal agent is only useful if it knows the person it serves.

That means the agent needs a governed onboarding loop that learns:

- role
- responsibilities
- goals
- preferred communication style
- working preferences
- recurring workflows
- trusted systems
- private-context boundaries
- feedback on what is useful or annoying

The old BCrew-Buddy system had a serious bot-onboarding and coaching plan at:

- `~/bcrew-buddy-reference/docs/plans/bot-onboarding-coaching-plan.md`

That plan is evidence, not active doctrine by itself. `AGENT-010` owns recovering the useful parts and rebuilding them in the new Foundation-first model.

## Personal Profile Direction

Each personal agent should help build and maintain a private personal profile for its human.

`ME.md` is only a working label for that profile, similar in spirit to local `USER.md`. The final name can change. The important part is the governed profile contract.

The shared system can define the schema and update rules, but the actual private details should not be committed into this repo.

The profile should eventually include:

- what the person is responsible for
- current business goals
- personal goals the person has chosen to share
- family or life context the person has chosen to share
- preferences for tone, timing, reminders, and escalation
- systems the agent may read
- systems the agent may write to only after approval
- subjects the agent should avoid or treat as sensitive
- examples of useful help
- examples of bad or annoying help

## Onboarding Loop

The first version should not start with a feature dump.

The agent should:

1. prove value with one useful source-backed read
2. run a short calibration interview
3. save the answers into the private profile/memory layer
4. ask for feedback after the first useful interactions
5. adjust cadence, content, and channel behavior based on that feedback
6. keep improving the profile over time

The old system lesson is clear: users do not adopt assistants because they read a long feature list. They adopt when the assistant adapts to them and makes the next useful thing obvious.

## Daily Nugget Loop

Every personal agent should eventually be able to send one small useful nugget per day.

For Harlan and Steve, that means a short, source-backed suggestion about how Harlan can help Steve better in his role, business goals, personal goals, or operating habits.

For future team assistants, the nugget should be tied to that person's role, permission level, and systems.

Rules:

- one nugget per day maximum unless the human asks for more
- source-backed when it references business data
- personal-context aware only when the human has explicitly shared that context
- easy to mute, change cadence, or redirect
- feedback should update the profile and future suggestions

## Harlan Pilot

Harlan is the first real personal-agent onboarding pilot.

Before broad assistant rollout, Harlan needs:

- an external personal-agent home or registry entry
- a private Steve profile / `ME.md` contract
- a calibration interview flow
- a daily nugget rule
- explicit project reach through the project registry
- clear privacy and approval boundaries
- evidence that his suggestions improve Steve's work instead of adding noise

## Future Team Agents

When other people receive personal agents, onboarding should include:

- role contract
- permission tier
- data sources the assistant can see
- first useful workflow
- preferred channel
- notification limits
- feedback check-ins
- escalation path to Steve, a department owner, or Ops when needed

This is separate from the ClickUp Agent Roster 30/60/90 onboarding-feedback system. That system measures new-agent onboarding experience. This page is about onboarding a human into their AI assistant.

## Update Trigger

Update this page when `AGENT-010`, `SLICE-001`, `UX-002`, `SYSTEM-011`, or the Harlan runtime/profile model changes.
