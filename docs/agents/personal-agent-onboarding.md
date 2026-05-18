# Personal Agent Onboarding

Status: Contract v1
Last reviewed: 2026-05-18
Primary backlog: `AGENT-010`

This page defines the onboarding standard for any real human who gets a personal agent.

It is not the live implementation yet. `AGENT-010` defines the governed contract that later Harlan/team-agent runtime work must satisfy.

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

That plan is evidence, not active doctrine by itself. The promoted harvest is `OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001` under `old-system-agent-onboarding-harvest-v1`.

## Contract V1

Closeout: `personal-agent-onboarding-contract-v1`

The onboarding contract requires:

- private profile schema with no raw private values in repo truth
- one useful source-backed read before setup or feature explanation
- short calibration interview
- feedback loop after first useful interactions
- one daily nugget maximum
- mute, cadence, and redirect controls
- source-backed business claims
- visible pause/adoption-risk state when the human does not engage
- approval before sends, writes, live extraction, provider/model calls, or Drive mutation

This contract depends on:

- `foundation-agent-usefulness-runtime-gates-v1`
- `agent-live-answer-preflight-gate-v1`
- `agent-capability-registry-v1`
- `agent-template-runtime-contract-v1`
- `old-system-agent-onboarding-harvest-v1`

## Personal Profile Direction

Each personal agent should help build and maintain a private personal profile for its human.

`ME.md` is only a working label for that profile, similar in spirit to local `USER.md`. The final name can change. The important part is the governed profile contract.

The shared system can define the schema and update rules, but the actual private details should not be committed into this repo.

The profile should eventually include:

- core responsibilities
- Attract/Grow/Retain connection
- trusted systems checked
- information friction
- preferred morning value
- role-specific challenge
- communication preference
- privacy and memory scope
- cadence preference
- examples of useful help
- examples of bad or annoying help

Repo truth may contain field names, policy, examples, and proof. Actual profile values belong in a private profile store, not this repo.

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

Minimum calibration questions:

1. What are your top 3-5 core responsibilities?
2. How does your work connect to Attract, Grow, and Retain?
3. What tools and systems do you check most, and what info do you burn time finding?
4. What would be most useful to get every morning without asking?
5. What is your role-specific coaching or visibility challenge right now?
6. How do you prefer updates: short message, email summary, or voice note?
7. What should this agent remember, avoid, or ask before using?

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
- external sends are disabled by default and require explicit approval

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

`AGENT-010` does not launch Harlan. It gives later Harlan runtime work the contract and proof it must obey.

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
