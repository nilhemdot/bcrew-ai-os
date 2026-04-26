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

V1 governed ClickUp source boundary:

- `901112153939` — Operations / Deals / `Deal Data Entry`
- `901113292355` — Operations / Agent Management / `Agent Roster`
- `901113487352` — Operations / Agent Management / `Agent Onboarding/Offboarding`
- these are the only ClickUp lists treated as validated Foundation sources for the current Owners/Ops closeout phase
- other ClickUp boards/spaces can be reviewed later, but they should not affect v1 source truth right now

Repeatable validation:

- `npm run clickup:verify`
- this verifies the three v1 lists are reachable, have tasks, and expose the required source fields for the current system boundary
- `npm run foundation:verify` includes this ClickUp check

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
  - `Internal Onboarding Status`
  - `Internal Onboarding Skipped Reason`
  - `Internal Deal Management Survey Requested`
  - `Internal Deal Management Survey Completed`
  - `Internal Deal Management Survey Score`
  - `Internal Deal Management Survey Comments`
  - `Internal Deal Review Status`
  - `Internal Deal Review Skipped Reason`
- Deal Data Entry fields were appended to the existing `Full Deal List` view `8chw3b6-33791` instead of creating a separate working list
  - verified after cleanup: the added deal review fields are visible at the back of the view, not the front
- Agent Roster cleanup is now narrowed to the v1 source boundary:
  - Steve's visible Operations Agent Roster URL is the default list view `6-901113292355-1`: `https://app.clickup.com/9011334502/v/l/6-901113292355-1`
  - required roster/onboarding-NPS fields exist for source validation
  - recommended fields still missing from the visible roster source contract: `Contract Status`, `Membership Status`, `Production Roster Status`, and `Onboarding Stage`
  - ClickUp's public API path verifies field existence but does not safely delete custom-field definitions; field cleanup should be done through ClickUp's Custom Field Manager / hide-from-view controls unless a dedicated field-delete path is confirmed
- no old ClickUp fields were deleted; finance/math clutter should be hidden from active views first and deleted only after backup/approval

Roster cleanup recommendation:

- keep on Agent Roster:
  - name/status, company email, personal phone/email, birthday, board(s), tier, pod, ops usage, engagement/health notes
  - contract package fields: `Contract Link`, `Contract Sent`, `Contract Signed`, `Document Status`, `Contract`, `Special Contract Terms`
  - split-package summary fields that are actually populated
  - AIOS onboarding-NPS fields: 30/60/90 status, due date, last sent, owner, feedback link
- add or map before building the full Agent Onboarding inbox lane:
  - `Contract Status`
  - `Membership Status`
  - `Production Roster Status`
  - `Onboarding Stage`
- hide/delete from Agent Roster active views:
  - deal/transaction fields copied from Deal Data Entry, including deal number/status, lead source, closing/deposit dates, sale/list price, commissions, gross/net/team portions, referral fee, co-broke, LP/SP, and volume/commission/deal credit fields
  - generic project-management fields that are blank on roster: rock fields, template fields, task priority/effort/focus/health, week category, payment fields, required/signature/webforms fields
  - duplicate blank field variants; keep the populated version when a duplicate exists, especially `Tier`, `Birthday`, `Shirt Size`, and progress fields

Pipeline cleanup recommendation:

- keep on Agent Onboarding/Offboarding:
  - pipeline status, onboarding start date, recruiter/source, contact details, notes, checklist/progress, contract handoff fields, and any fields Carson/Clare actively use to move a person through recruiting/onboarding/offboarding
- hide/delete from Agent Onboarding/Offboarding active views:
  - deal/transaction economics and duplicated Deal Data Entry fields
  - old template/rock/task-management clutter that is blank and not part of the onboarding handoff
  - duplicated split/deal math fields that belong in Owners or the Agent Roster contract layer

Current read:

- ClickUp is usable as workflow evidence for whether Ops had survey / closeout tasks
- `Deal #` / Trade Number is the required join key for actual transaction tasks
- once `Deal #` is present, AIOS can produce the exact Owners Admin row link and backfill FUB link / review evidence / calculated date buckets where useful
- Admin deal review now uses `Deal #` as the hard join first, then property/address as a fallback so it can produce a better finding:
  - matching ClickUp task exists, but `Deal #` is blank / wrong
  - no matching ClickUp task exists by Trade Number or address
- client NPS / Google-review workflow should trigger when the deal firms, not at closing
- do not treat one Google-review URL as the full outcome: couples can produce more than one review, so use target/captured counts plus evidence links/notes
- track NPS and Google reviews as separate statuses because a Google review can be captured without a completed NPS:
  - `NPS Status`: `Not Started`, `Requested`, `Completed`, `Not Eligible`, `Blocked`
  - `Review Status`: `Not Started`, `Requested`, `Captured`, `Not Eligible`, `Blocked`
- internal agent/team feedback should also use status fields with skip reasons:
  - `Internal Onboarding Status`: `Not Started`, `Requested`, `Completed`, `Skipped`, `Blocked`
  - `Internal Deal Review Status`: `Not Started`, `Requested`, `Completed`, `Skipped`, `Blocked`
- agent roster source-truth and onboarding NPS design is still pending:
  - review the existing Operations Agent Roster fields first
  - only add the smallest field set needed after duplicate AIOS fields are removed
- ClickUp is still not the final bonus payout truth; AIOS must validate required fields and source parity before bonus credit counts

Agent Roster Ops lane v1:

- do not create/delete/hide fields automatically while Steve is cleaning the roster view with Carson and Clare
- `npm run agent-roster:review` reads the Agent Roster list and reports source-backed roster accountability items
- `/api/owners/review-queue` includes an `agentRoster` section so Ops can see roster findings beside deal, conditional, FUB, and Owners-list issues
- onboarding NPS schedule anchor is `Real Start Date`; Ops filling that field is what triggers AIOS to calculate and monitor day-30/day-60/day-90 feedback checkpoints
- v1 launch cutoff is `2026-04-01`; do not backfill 30/60/90 NPS obligations for older historical starts unless Steve explicitly asks for a catch-up pass
- if Real Start Date is more than 90 days old and the onboarding NPS statuses are still open, mark 30/60/90 as `Skipped` instead of sending retroactive feedback requests
- outbound email automation is not built yet; Gmail is currently an archive/extraction source, not a governed send engine
- preferred future capture path is an AIOS private feedback link stored on the roster task, because it can write structured score/comment/evidence back to the roster and source-backed feedback table. A ClickUp form is acceptable as a temporary manual capture tool, but it is weaker because it creates separate form/task artifacts instead of updating the existing agent record cleanly.
- v1 surfaces:
  - one card per accountable roster record missing `Contract Link`
  - one grouped card when baseline source fields need backfill (`Recruited By`, `Real Start Date`, `Team / Legacy Origin`)
  - one grouped card when recommended roster source-contract fields still need mapping (`Contract Status`, `Membership Status`, `Production Roster Status`, `Onboarding Stage`)
  - one grouped card when onboarding NPS 30/60/90 scheduling cannot run because start dates/statuses/due dates/owner are not initialized
  - per-agent day-30/day-60/day-90 cards once Real Start Date and due dates make a feedback checkpoint due
  - reminder cards when a checkpoint is Requested but not Completed after 3 days
  - one grouped card for missing personal email coverage because private onboarding feedback should not depend on the onboarding team
- this is validation only; Steve/Carson/Clare own the manual field hiding/deletion pass

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
