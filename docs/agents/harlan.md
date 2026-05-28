# Harlan

Status: Live
Type: Personal agent
Owner: Steve
Last reviewed: 2026-04-26

## Role

Harlan is Steve's personal assistant.

He is not the whole BCrew AI OS and he is not the system orchestrator.

## Current State

- live on Telegram through OpenClaw
- currently still mounted to the `bcrew-ai-os` workspace
- not yet moved into a clean external personal-agent home

## Runtime Boundary

Harlan is the personal-agent role and identity. OpenClaw is only the current runtime adapter.

Foundation-owned truth must stay portable: Harlan's permissions, memory boundaries, project registry, auth-needed loop, audit trail, and approval rules should not depend on OpenClaw-specific behavior. Future runtimes can include OpenClaw, Hermes, Claude SDK, Codex, Browser Use, or Benson Crew-owned infrastructure if they satisfy the same contracts.

Runtime adapters are replaceable. Harlan's source-backed behavior and safety boundaries are not.

## Current Direction

- keep Harlan as the personal assistant layer
- move his long-term identity and memory spine outside this repo when the first trusted assistant loop is ready
- use Harlan as the first personal-agent onboarding / `ME.md` pilot
- do not confuse Harlan with Crewbert or with repo-local coding tools

## Important Rule

Harlan should be able to reach the system.

That does not mean Harlan should permanently live inside the system repo.

Harlan's cross-project reach must come from an explicit project registry, not hidden human memory. See [Harlan Project Registry](harlan-project-registry.md).

Harlan's first useful operator loop must answer current Foundation truth from declared sources before any runtime expansion. See [Harlan Operator Loop](harlan-operator-loop.md).

Harlan's auth escalation path for Brain Fleet and extractors must record `auth_needed`, block as `blocked-auth`, wait for Steve `DONE`, re-verify, and fail closed without credential mutation or proof-time external sends. See [Harlan Auth Escalation Loop](harlan-auth-escalation-loop.md).

Harlan's first trusted assistant loop must also prove source prerequisites, read-only inputs, evidence output, write boundaries, and blocker handling before broader connectors or agents expand. See [Trusted Assistant Loop](trusted-assistant-loop.md).

## Personal Onboarding Direction

Harlan should eventually help Steve build and maintain a private personal profile that captures role, business goals, personal goals Steve chooses to share, family/life context Steve chooses to share, communication preferences, operating preferences, and approval boundaries.

The first useful loop should include a short calibration interview, saved profile updates, feedback capture, and one small daily nugget about how Harlan can help Steve better. `ME.md` is only a working label for the private profile. The old BCrew-Buddy bot-onboarding plan is evidence to recover through `AGENT-010`, not something to copy blindly.

## Outbound Identity Direction

- future outbound email should be able to come from Harlan instead of only from Steve when appropriate
- preferred sender framing:
  - `Harlan`
  - `Steve Zahnd's Personal AI Assistant`
- avatar direction:
  - not a real human photo
  - use a clean illustrated / cartoon assistant style instead
- pending setup later:
  - final sender name
  - signature HTML
  - avatar asset

## Update Trigger

Update this page when Harlan's runtime home, channel binding, permissions, outbound identity, or relationship to BCrew AI OS changes.
