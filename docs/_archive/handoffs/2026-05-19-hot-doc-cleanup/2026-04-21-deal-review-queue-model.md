## Deal review queue model

Date: 2026-04-21

Purpose: define how AI deal-review findings should be tracked without creating a fourth business-data source.

## Where it should live

Best home:

- `Ops Hub`
- `Deal Review Inbox`

This should be the place Ops goes to review and clear flags.

Current temporary in-sheet surfaces before that exists:

- firm / exception rows:
  - `ADMIN ONLY - Deal Data Entry!CC:CE`
- conditional rows:
  - `Listings and Conditional Deals!Q:U`

## Rule

Do not duplicate the full deal record into another operating system.

Keep source data in:
- Owners
- FUB
- Freedom
- ClickUp

AI OS should store only:
- review findings
- review status
- re-review status
- timestamps
- links back to the source systems

## Recommended model

One review item per flagged deal.

Example fields:

- trade number
- linked agent
- FUB person URL / ID
- contract package ID if known
- issue type
- severity
- source system to fix
- suggested fix
- suggested action type
- current status
- opened at
- last reviewed at
- resolved at

## Status flow

- `open`
- `waiting_on_ops`
- `fixed_in_source`
- `re_review_needed`
- `closed`

## How fixes should work

1. AI reviews a deal.
2. AI stores flags in the review queue.
3. Ops fixes the real source system:
   - Owners
   - FUB
   - Freedom
   - ClickUp
4. AI runs re-review.
5. If clean, close the review item.

## Suggested-fix model

Each flagged deal can have multiple suggested fixes.

Example:
- one deal
- seven flags
- seven suggested fixes

Each fix should support:
- `accept`
- `deny`
- `skip for now`

Examples:
- change `Company or Agent` from `Agent` to `Company`
- move `ISA Appointment Set` out of extra-origin logic and rely on `ISA Set Deal`
- add missing referral chain field
- add birthday
- update buy address
- add missing NPS / Google-review follow-through item

Longer term:
- AI should not just flag
- AI should also propose the exact fix
- then Ops accepts or denies one suggestion at a time

## Re-review trigger

Need a simple re-review action.

Options later:
- button in AI OS
- button in the Ops Hub inbox
- button on the Owners package page
- queue item action
- future ClickUp task action

Best current direction:
- keep the review queue in AI OS
- do not force ClickUp to own the review state
- let ClickUp stay the workflow / contract-link source

## Why this is the right shape

Deals already live in too many places.

The fix is not to create another deal ledger.
The fix is to create one governed review layer that points back to the real systems.
