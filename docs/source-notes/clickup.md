# ClickUp

This is the working source note behind `SRC-CLICKUP-001`.

Use it to lock what ClickUp actually owns right now and what it does **not** own yet.

## What ClickUp Owns Best Right Now

Current best read:

- roster workflow truth
- onboarding workflow truth
- culture workflow truth
- contract-link monitoring for active agents

Known live surfaces Steve flagged:

- Agent Roster list `901113292355`
- Agent Onboarding list `901113487352`
- Culture space / folder `90117028331`

Live proof now captured:

- Agent Roster list `901113292355` is readable in the rebuild
- Matt Allman roster task:
  - task id: `868hre80z`
  - status: `active agent`
- proven roster contract fields:
  - `Contract Link`
  - `Contract Sent`
  - `Contract Signed`
  - `Document Status`
  - `Contract`
  - `Special Contract Terms`

Matt proof:

- `Contract Link` is populated
- current value points to a Drive folder:
  - `https://drive.google.com/drive/folders/1qAExqL2iJc6ct0RPmVjNI0vC1bdpJQV4?usp=drive_link`

First governed proof already captured:

- Matt roster task connects to a signed contract package
- that package proves the normal `50 / 50` split
- and the ISA `45 / 55` override used on `T#26100`

## What ClickUp Does Not Own Yet

Do not treat ClickUp as the full final source of truth for:

- recruiter / origin truth
- engine math
- final deal economics
- final finance meaning

Current split:

- Freedom = recruiter/date context + strategy math
- Owners = deal / finance truth
- ClickUp = workflow, status, onboarding, and contract-link operations

## Contract-Link Rule

The Agent Roster layer should become the monitored contract-link source.

Operating rule:

- if an active agent has no contract link, flag it
- if the contract link changes, flag it
- that flag should queue one review pass for the governed contract registry
- Steve should not have to catch this manually

Future ops alert target:

- Clare
- Carson

## Why This Matters

This is how the system stops contract knowledge from living only in Steve's head.

ClickUp does not need to own the final payout logic.
It only needs to reliably tell the system:

- who is active
- where the linked contract is
- whether that contract reference changed
- whether contract workflow fields are still blank / incomplete

That is enough to keep the governed split-contract layer fresh.

## Foundation Scope Now

Foundation should do this now:

- prove ClickUp is readable
- lock the roster / onboarding / culture boundary
- lock the contract-link monitoring rule
- preserve the list IDs and boundary notes

Later hub work:

- ops reminders
- automatic follow-up to missing contract links
- contract-change notifications
- onboarding enforcement loops
