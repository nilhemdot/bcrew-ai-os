## AI deal review checklist

Date: 2026-04-21

Purpose: first governed review flow for a new or exception deal row.

## Trigger

Run this when:

- a new deal row is added
- an existing deal row changes materially
- `ISA Set Deal = Yes`
- the split looks exceptional
- the contract link is missing or changed

Age gate:

- for a **full** post-execution review, wait until the row is at least `10` days past `Date Firm (Executed)`
- before that, use lighter checks only
- reason:
  - give Ops time to move the CRM stage
  - give Freedom follow-through time to appear
  - avoid false failure noise immediately after execution

Current temporary review surfaces:

- firm / exception deals:
  - `ADMIN ONLY - Deal Data Entry!CC:CE`
- conditional deals:
  - `Listings and Conditional Deals!Q:U`

## Review Stack

### 1. Owners row truth

Check:

- deal number
- client name
- deal / lease
- lead source
- extra lead source
- ground zero
- company or agent
- FUB URL
- ISA Set Deal
- split math

Rule:

- `Company or Agent` should follow the validated source-lineage model first
- then apply ISA override logic where relevant
- if the source is already known company-owned, keep it company
- if the source is intentionally unresolved, leave it in review instead of guessing

### 2. Contract package truth

Check against the locked agent package:

- normal split
- company-deal split
- agent-deal split
- ISA override
- lease override
- apprentice / mentor rules
- cap rules

If the row does not match the package, flag it.

### 3. FUB proof

Check:

- linked person exists
- lead source is clean
- stage / owner make sense
- ISA tag exists if this is an ISA-set deal
- deal-pipeline state is coherent when applicable:
  - conditional deals should power `Cond`
  - firm / pending-close deals should power `Pend`
  - closed deals should leave `Pend` and power `Close120`
- referral / introduction chain fields are filled when needed:
  - `Name of Person Who Gave Referral/Introduction`
  - `Lead Source Secondary Information`

Mismatch rule:

- if FUB shows ISA evidence but the Owners row is not marked as an ISA deal, flag it
- if the Owners row says ISA but the CRM gives no supporting evidence, flag it
- if the deal should appear in `Cond`, `Pend`, or `Close120` and the FUB pipeline state does not support that, flag it

Post-close rule:

- when a deal closes, run a second review pass
- check that the contact left the pending-close path
- check that the contact now powers `Close120`

## Conditional-deal companion review

Use this when a row is sitting in `Listings and Conditional Deals`.

Check:

- the row still belongs in the conditional layer and has not already gone firm
- FUB supports the `Cond` state for that deal / contact
- the conditional due date and close date still make operating sense
- if the deal already went firm:
  - move it out of the conditional layer
  - review it in the Admin ledger instead

Current limitation:

- this tab does not yet carry a locked FUB URL / ID field
- so current review is still a governed parity check, not a clean row-to-person join

### 4. CRM enrichment

Use the deal as a cleanup opportunity.

Check:

- clean client name
- relationship links if multiple names
- birthdays
- address updated if this is a buy
- contact-health depth where relevant

### 5. Company economics

Check:

- company portion is correct
- ISA economics are explainable
- salary / bonus cost lanes exist for the ISA team member where relevant
- the row can support later profit / loss reporting

Known current finance hooks:

- `Team | Canadian Team | Alyssa Razon`
- `Team | Canadian Team | ISA Bonus`

## First test case

- `T#26100`

Why:

- real FUB link
- real ISA evidence
- real contract-exception case
- clean example for the first governed review pass
