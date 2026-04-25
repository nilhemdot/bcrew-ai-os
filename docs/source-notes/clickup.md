# ClickUp

This is the working source note behind `SRC-CLICKUP-001`.

Use it to lock what ClickUp actually owns right now and what it does **not** own yet.

## What ClickUp Owns Best Right Now

Current best read:

- roster workflow truth
- onboarding workflow truth
- culture workflow truth
- contract-link monitoring for active agents
- deal workflow task state for Ops follow-through

Known live surfaces Steve flagged:

- Agent Roster list `901113292355`
- Agent Onboarding list `901113487352`
- Culture space / folder `90117028331`
- Operations / Deals / Deal Data Entry list `901112153939`

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

Deal workflow proof captured on 2026-04-25:

- Operations space `90113898592` has folder `Deals` and list `Deal Data Entry` (`901112153939`)
- the list is readable through the ClickUp API
- parent tasks are deal/property workflows, for example `25 Bradbury Cres`, `877 Cook Crescent`, and `320 Netherby Road`
- recurring subtasks include:
  - `Email the agent for deal survey`
  - `Email the operational Survey to Agent`
  - `Add Entry in Owner Dashboard and Freedom Sheet + tag Georgia for NPS Follow Up`
  - `Change FIRM status to Closed in ClickUp`

AIOS cleanup applied on 2026-04-25:

- Deal Data Entry source role is now explicit:
  - Owners Dashboard remains the deal math / commission / split / finance source
  - FUB remains CRM profile, source/stage, and call/transcript evidence
  - ClickUp Deal Data Entry is the workflow/accountability layer
  - AIOS links and audits them
- new Deal Data Entry fields were added for the review workflow:
  - `AIOS Admin Deal Row Link`
  - `FUB Call / Review Evidence Link`
  - `NPS Requested`
  - `NPS Completed`
  - `NPS Score`
  - `NPS Comments`
  - `Google Review Requested`
  - `Google Review Captured`
  - `Google Review Link`
  - `Google Review Target Count`
  - `Google Review Captured Count`
  - `Google Review Link(s) / Evidence`
  - `NPS Status`
  - `Review Status`
  - `Internal Onboarding Survey Requested`
  - `Internal Onboarding Survey Completed`
  - `Internal Onboarding Survey Score`
  - `Internal Onboarding Survey Comments`
  - `Internal Deal Management Survey Requested`
  - `Internal Deal Management Survey Completed`
  - `Internal Deal Management Survey Score`
  - `Internal Deal Management Survey Comments`
- Deal Data Entry fields were appended to the existing `Full Deal List` view `8chw3b6-33791` instead of creating a separate working list
- new Agent Roster fields were added:
  - `Recruited By`
  - `Real Start Date`
  - `End Date`
  - `Membership Status`
  - `Production Roster Status`
  - `Onboarding Stage`
  - `Contract Status`
  - `Team / Legacy Origin`
- Agent Roster fields were appended to the existing `Active Roster` view `8chw3b6-46591`
- no old ClickUp fields were deleted; finance/math clutter should be hidden from active views first and deleted only after backup/approval

Current read:

- ClickUp is usable as workflow evidence for whether Ops had survey / closeout tasks
- `Deal #` / Trade Number is the required join key for actual transaction tasks
- once `Deal #` is present, AIOS can produce the exact Owners Admin row link and backfill FUB link / review evidence / calculated date buckets where useful
- client NPS / Google-review workflow should trigger when the deal firms, not at closing
- do not treat one Google-review URL as the full outcome: couples can produce more than one review, so use target/captured counts plus evidence links/notes
- track NPS and Google reviews as separate statuses because a Google review can be captured without a completed NPS:
  - `NPS Status`: `Not Started`, `Requested`, `Completed`, `Not Eligible`, `Blocked`
  - `Review Status`: `Not Started`, `Requested`, `Captured`, `Not Eligible`, `Blocked`
- ClickUp is still not the final bonus payout truth; AIOS must validate required fields and source parity before bonus credit counts

## What ClickUp Does Not Own Yet

Do not treat ClickUp as the full final source of truth for:

- recruiter / origin truth
- engine math
- final deal economics
- final finance meaning
- final client-experience capture rate
- final Google-review capture count
- final ops bonus payout truth

Current split:

- Freedom = recruiter/date context + strategy math
- Owners = deal / finance truth
- FUB = CRM stage, source, tags, call/transcript evidence
- ClickUp = workflow, status, onboarding, contract-link operations, and deal follow-through tasks

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
