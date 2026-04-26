# Follow Up Boss

This is the operator note behind `SRC-FUB-001`.

Use the live taxonomy manager at `/foundation#source-apis:fub-lead-source-taxonomy` for the current snapshot and rule edits.

## What `SRC-FUB-001` Owns

Follow Up Boss is the CRM source for:

- person records
- user roster
- lead-source taxonomy
- person-level linkage used for parity work
- CRM-side attribution context

It is **not** yet the final operating truth for:

- deal lifecycle
- split credit
- company-paid amounts
- final finance meaning

Those stay upstream in `SRC-OWNERS-001` until the cross-system audits close.

## Current State

Already true:

- read access is proven
- owner/support and Steve API contexts are working
- registered `X-System` headers are configured
- admin-gated taxonomy writes are wired
- the source list can be refreshed from a saved snapshot

Still needed for `Level 2`:

- lock the canonical lead-source taxonomy
- lock Owners ↔ FUB parity rules
- lock FUB person-link expectations
- explicitly name every unresolved source classification

## Foundation Scope Now

This is what belongs in Foundation right now.

- prove FUB is readable in the rebuild
- lock lead-source taxonomy meaning
- lock the critical non-lead vs true-opportunity doctrine
- lock person-link expectations for Owners parity work
- capture the assigned collections that matter as business context
- separate what is trusted now from what is only rough UI grouping

Critical foundation reads:

- lead source
- source grouping / company vs agent ownership
- FUB person identity and linkage
- pipeline stage meaning
- appointment / lead-flow hygiene context where it affects KPI and Admin parity
- assigned collections only at the level needed to understand the business system

## Owners/Admin Parity Read Contract

This is the signed-off v1 boundary for `SOURCE-008`.

Join path:

- Owners Admin column `BZ` (`Client Follow UP Boss ID`) stores a full FUB person URL or ID.
- The trailing numeric person ID is the governed join key into FUB.
- A joined FUB person can be used for identity, source, stage, assigned agent, tags, address, phone, and email parity.

Truth boundary:

- Owners Admin remains the deal ledger for trade number, firm/executed date, agent on the deal, split math, cash, and final source-row fixes.
- FUB is trusted for CRM person context: current CRM source, lifecycle stage, assigned agent, address/contact enrichment, and tag evidence such as `ISA Set - Alyssa`.
- If Owners and FUB disagree, the system should flag the mismatch. It should not silently overwrite either source.
- If both sources map to the same governed ownership type, treat the mismatch as lineage cleanup, not an automatic company/agent credit flip.

Foundation-safe FUB checks:

- FUB person resolves from `BZ`.
- FUB source exists in the governed source rules.
- FUB source is classified and canonical.
- FUB source/ownership agrees with Owners source lineage or is surfaced as lineage cleanup.
- FUB stage is not stale for mature closed/firm deals.
- FUB ISA tags agree with the Owners `ISA Set Deal` marker.
- FUB assigned agent mismatch is reviewable when the Owners deal agent differs from the CRM owner.

Not signed off here:

- automated FUB mutations
- agent coaching from notes/calls
- broad Sales Hub workflows
- using FUB as the final deal ledger

## Not Foundation Yet

These belong to later Sales Hub / coaching / assistant work:

- exact operating playbook for every assigned collection
- every saved-list rule in perfect detail
- every daily agent workflow
- full supporter-coaching choreography
- full shopping-list coaching against FUB behavior
- automated cleanup agents acting on the CRM

Safe rule:

- Foundation locks meaning, linkage, and boundary rules.
- Sales Hub later uses those rules to coach, clean up, and enforce behavior.

## Locked vs Flexible

Locked:

- taxonomy field meanings
- invalid-source rule for placeholders like `Import`, `Sphere`, `SOI`, and legacy lowercase `unspecified`
- `<unspecified>` is allowed only as the governed quarantine value, not as signed-off final truth
- company views should focus on company-owned sources
- new or unclear sources should stay visible for review

Flexible:

- any individual source group
- any individual source marketing classification
- any individual source ownership classification
- whether a source stays grouped or intentionally ungrouped

## Canonical Rule Model

Each live FUB lead source should eventually have:

- `source`
- `sourceGroup`
- `marketingType`
- `ownershipType`
- `flagState`
- `notes`

Current reporting groups:

- `Web Leads`
- `Ads Leads`
- `Offline Leads`
- `Phone Leads`
- `Social Media`
- `Referral / Sphere`
- `Other`

## Reporting Rule

Do not mix up:

- taxonomy truth
- reporting visibility

Company reporting should usually filter on `ownershipType = company`.

That keeps the company view clean without destroying real source truth.

## Lead-Flow Hygiene Rules

FUB will happily create bad pipeline truth if agents are sloppy.

Current Benson Crew rule model:

- adding a person is not the same as creating a true lead
- not every contact belongs in the active lead flow
- accidental lead creation should be cleaned up fast

Important workflow:

- `Delete Lead` is a temporary cleanup stage
- use it when FUB auto-created a lead that is not really a lead
- do not leave people parked there forever
- after cleanup, move the person into the correct long-term stage

Common non-lead destinations include:

- support-network style records
- past clients
- non-contact non-leads
- realtor / vendor style records
- other kept contacts that do not belong in the supporter path
- temporary trash / soft-delete records

Founder-confirmed support-network model:

- `Possible Supporter`
  - someone the agent knows or meets
  - not yet a confirmed supporter
  - the job is to work them and ask the support-network / chosen-one questions
  - goal: turn them into a real confirmed supporter or move them out of that path
- `Supporter/SOI`
  - a confirmed supporter
  - someone the agent should keep in relationship care and referral conversation
  - this is where send / call / see style support-network work matters
- `Past Client`
  - a transaction history category, not automatically a supporter
  - past clients may still need to be upgraded into real supporter status

Important rule:

- past clients are not assumed to be supporters just because they closed with us
- support-network building is its own discipline, not an automatic outcome of doing a deal

Support-network operating intent:

- the system should help agents stop over-organizing and actually call people
- importing contacts into FUB should feed `Possible Supporter` work when they are not true leads
- future coaching can use this, but the source meaning comes first

Current smart-list logic Steve described:

- `0️⃣ Poss Support` = people still being worked into true supporter status
- `1️⃣ All Supporters` = confirmed supporters
- `2️⃣ SN Send` / `3️⃣ SN Call` / `4️⃣ SN See` = relationship-care operating lists
- `5️⃣ PastClients` = past-client relationship pool
- `LV 1` to `LV 5` = supporter-data maturity / depth, not just one flat stage

Supporter maturity idea currently in use:

- `LV 1` = base supporter details and referral lineage are dialed in
- `LV 2` = core contact details and touchpoint details are dialed in
- `LV 3` = chosen-one confirmation is known
- `LV 4` = spouse / anniversary style touchpoints are dialed in
- `LV 5` = kids / deeper family touchpoints are dialed in

Founder-confirmed non-lead stage meanings:

- `Realtors/Vendors`
  - real estate agents, stagers, inspectors, and similar vendor-style records
  - keep their info, but do not treat them as supporter-path contacts or active leads
- `Other Contacts`
  - people worth keeping in the system
  - not `Possible Supporter`
  - not `Supporter/SOI`
  - not something the founder wants deleted
- `Trash`
  - soft-delete protection stage for the team
  - agents can send people there when they hit delete
  - founder / admin can still truly delete if needed
  - this exists to stop agents from hard-deleting records out of the system

Founder-confirmed cleanup change:

- `Unresponsive` was removed as a stage
- `zz - Contact – Lost (Listing Signed)` was removed
- `zz - Contact – Lost (BRA Signed)` was removed
- if the team gives up on someone and they do not belong in a cleaner long-term category, they now go to:
  - `Contact - Non Lead/Non Supporter`

That stage is now the catch-all recycle / gave-up bucket.

It also powers the older-call-back pool:

- `New` = fresh inbound / new leads
- `Pond Leads` = newer non-brand-new leads
- `Other Unclaimed` = people not called in `6+` months, largely fed by the non-contact / non-lead catch-all

Important business rule:

- a person can later re-enter the lead flow and become a true new opportunity
- that is not the same thing as a brand-new human appearing for the first time
- future AI coaching must preserve that distinction

Lee middleware proof:

- `SOURCE-021` now has the `Lee-InvIT/FUBZahnd` repo as direct implementation evidence.
- The old database model confirms the distinction between raw FUB `PersonID` and the internal active opportunity row (`PID` / `PersonUid`).
- If an active record exists in a non-lead stage and the current FUB stage comes in as a lead stage, the middleware deactivates the old row and creates a new active opportunity row for the same FUB person.
- This is the exact rule that lets a supporter, past client, or old non-lead become a new opportunity later without pretending they are a brand-new human.
- See [FUBZahnd middleware logic](fub-zahnd-middleware.md).

Founder-confirmed active opportunity stages right now:

- `Lead`
- `Hot Lead/Nurture (0-3)`
- `Warm Nurture (3-6)`
- `Cold Nurture (6-12)`
- `Appointment`
- `Appointment - No Show`

That means a new opportunity may come from:

- a brand-new person entering the system
- or an existing record moving back in from:
  - `Contact - Non Lead/Non Supporter`
  - `Possible Supporter`
  - `Supporter/SOI`
  - `Past Client`

Still open:

- whether `Active Client` should be treated as part of the same opportunity-counting path
- live `Stage.LeadStage` rows must be checked before that edge case is closed; the FUBZahnd repo includes the stage schema but not the seed rows

That means FUB should support three separate reads:

- person hygiene
- true lead / opportunity hygiene
- re-entry into the active pipeline

## Assigned Collections

Not every assigned collection means the same kind of thing.

Some are founder-approved operating doctrine.
Some are only rough UI grouping.
Some are mixed-system views that still need one clean proof pass before AI OS should treat them as canon.

### Locked now

These are the assigned collections whose business meaning is now clear enough to treat as operating truth:

- `1️⃣ New`
  - fresh inbound / true new-opportunity work
- `☎️ Pond Leads`
  - newer non-brand-new leads sitting outside the fresh-inbound moment
- `🤙 Other Unclaimed`
  - older recycle / callback pool, largely fed by the non-contact catch-all
  - founder rule of thumb: this is the `6+` month uncalled bucket
- `0️⃣ Poss Support`
  - people still being worked into true supporter status
- `1️⃣ All Supporters`
  - confirmed supporters
- `2️⃣ SN Send`
  - supporter care list for send / touch workflows
- `3️⃣ SN Call`
  - supporter care list for call workflows
- `4️⃣ SN See`
  - supporter care list for in-person / meeting workflows
- `5️⃣ PastClients`
  - past-client care list
- `♥️ LV 1` to `♥️ LV 5`
  - supporter maturity / data-depth ladders
  - these are not stage names; they are relationship-depth operating lists
- `*️⃣ Other Contacts`
  - kept contacts outside the supporter path and outside delete / trash logic

### Rough grouping only

These collections should **not** be treated as founder-clean doctrine yet.
They are currently closer to UI convenience buckets than a signed rule model:

- `➁ HOT`
- `➂ WARM`
- `➃ COLD`
- `➄ Apps`
- `➅ No Show`

Current KPI code proves these are still rough grouping logic:

- `Lead` plus any stage containing `appointment` is treated as `hot`
- `Warm` stages plus `Active Client` plus `Possible Supporter` are treated as `warm`
- everything else falls to `cold`

That implementation is useful for browsing, but it is **not** precise enough to become coaching truth or source doctrine.

### Still needs one proof pass

These collections clearly matter operationally, but AI OS should not pretend their final rule model is locked yet:

- `➀ Your Leads`
- `Maverick RE - Past Due!`
- `✅ ToDo`
- `✐Shop`
- `✍️Cond`
- `Home Value Hub User List`
- `Active HomeValue Users`

Why they stay open for now:

- some likely mix FUB stage logic with assignee ownership
- some clearly rely on KPI Shopping List logic, not just FUB
- some look task / past-due driven
- some likely depend on Home Value Hub / Home Optima activity

### Newly clarified operating lists

These three now have clear enough operating meaning to keep in the note as business truth:

- `✍️Cond`
  - conditional-deal follow-up list
  - Ops uses the `Seller Deal` or `Buyer Deal` pipeline
  - if the deal sits in `Conditional`, that should power the `Cond` people list
  - purpose:
    - keep conditional deals visible to the agent
    - help the agent track deals that are not firm yet

- `✍️Pend`
  - pending closed-deal follow-up list
  - when a deal becomes firm, Ops should place it into the `Upcoming Closings` deal pipeline
  - that makes the contact visible in the `Pend` people list
  - purpose:
    - keep the pending deal visible to the agent
    - power follow-up while the deal is firm but not yet closed
- `⭐ Close120`
  - recently closed follow-up list
  - when Ops moves the deal from pending to closed, the contact should leave `Pend` and enter `Close120`
  - purpose:
    - keep the closed deal visible for roughly `120` days / `4` months
    - support post-close follow-up by the agent

Founder intent:

- this is not just list organization
- it is a follow-up system for the agent
- later AI assistant behavior can use this to prompt follow-up at `30 / 60 / 90 / 120` day moments after close

Review rule:

- if a deal should be visible in `Cond`, `Pend`, or `Close120` and the FUB deal-pipeline state does not support that, flag it
- when a deal closes, run a second review pass to confirm it moved out of the pending-close path and into `Close120`
- current Owners-side proof for `Cond` is the `Listings and Conditional Deals` tab
  - if a row lives there, the CRM should support the conditional follow-up state too

Current caution:

- raw `Cond` counts are not fully trustworthy yet
- the live FUB conditional set still includes stale old conditional deals from prior years
- so future AI checks should use:
  - direct identity when available
  - current stage
  - recency / current-deal context
- and should **not** rely on:
  - agent-only matching
  - raw conditional totals by themselves

Future FUB manager note:

- stage cleanup is future-hub work, not a blocker for foundation closeout
- but it is real work:
  - clear stale old `Cond` deals
  - keep `Pend` and `Close120` moving correctly
  - prevent closed / abandoned deals from living forever in the wrong deal stage

Safe current rule:

- treat the locked collections above as business truth
- treat `HOT/WARM/COLD` style buckets as rough UI grouping only
- treat the mixed-system collections above as useful operating views that still need explicit traced logic before future AI coaching depends on them

### Live UI proof completed

Date: `2026-04-20`

The first direct FUB browser proof pass is now done.

What is now proven from the live UI:

- all major assigned collection URLs / list IDs are captured
- `1️⃣ New` has one clean extracted saved-rule model from the live filter drawer
- the support-network collections are clearly custom-field driven, not just stage-name driven
- the person-profile surface and custom-field groups are now documented from the live UI

What is still partial:

- exact filter-builder extraction for every mixed-system collection
- cleaner saved-rule extraction for `Pond Leads`, `Other Unclaimed`, `Your Leads`, `Shop`, `Cond`, `Pend`, `Close120`, and the Home Value Hub lists

Reference:

- [FUB live collections audit](../handoffs/2026-04-20-fub-live-collections-audit.md)

### What this means for the Admin-tab closeout

This assigned-collection review does **not** reopen `SRC-OWNERS-001`.

The Admin-only deal tab is already closed for source meaning.
The remaining FUB-dependent follow-on work is still the same downstream set:

- `DATA-005` lead-source lineage and taxonomy
- `DATA-006` Admin-tab compliance rules
- `DATA-007` FUB person linkage backfill
- `DATA-008` address parity
- `DATA-009` suspicious duplicate review

So the collection review helps future sales / coaching doctrine, but it is not the blocker holding the Admin-tab sign-off open.

## Parity Rules

### Lead Source

- Owners `Lead Source` must map to a valid governed FUB-compatible lead source
- `Import`, `Sphere`, `SOI`, and legacy lowercase `unspecified` are not valid final truth
- `<unspecified>` is the approved quarantine value while a row is still unresolved

### Extra Lead Source Data

- supports the main source
- does not replace the main source

### Ground Zero

- should preserve the original origin of the deal
- should not be faked just to make the row look clean

### Company vs Agent Credit

- should become rule-driven from approved taxonomy, lineage, and `ISA Set Deal`

### FUB Person Linkage

- each Owners row should eventually link to the correct FUB person
- missing or mismatched linkage is a visible issue, not silent debt
- future KPI reads also need to respect when the same human later becomes a new opportunity again

### Open House Default

- if provenance cannot prove it was an agent's own listing and resources, default to company

## Invalid Final Sources

Treat these as invalid final lead sources unless a future signed-off rule changes that:

- `Import`
- `Sphere`
- `SOI`
- legacy lowercase `unspecified`

Treat this as the only approved unresolved placeholder:

- `<unspecified>`

## Implementation Caution

Do not confuse:

- founder-approved stage doctrine
- live stage-table presence
- rough UI grouping logic

The live KPI / Supabase stack still contains transitional or legacy values, including:

- `Unresponsive`
- `Appointment - No Show Follow Up`

That does **not** mean those stages are still founder-approved operating truth.

Current founder doctrine is stricter than the raw stage table:

- `Unresponsive` is considered removed
- `Delete Lead` is temporary cleanup only
- `Contact - Non Lead/Non Supporter` is the main catch-all recycle bucket

Practical rule for future agents:

- prefer signed-off doctrine in this note
- use live stage-table presence as implementation evidence
- do not let a raw stage row override approved business meaning

Related implementation nuance:

- the KPI `How To` page already reflects the cleanup / re-entry model better than some live UI grouping code
- future cleanup or coaching agents must read doctrine first, then use the database to detect violations

## Audit Snapshot: Live Implementation Drift

Date: `2026-04-20`

This is not founder doctrine. It is what is still physically present in the live KPI / Supabase implementation today.

Live `persons.currentstage` snapshot still contains:

- `Unresponsive`
- `zz - Contact – Lost (Listing Signed)`
- `zz - Contact – Lost (BRA Signed)`

That matters because:

- those rows still exist in the implementation
- the founder already said they should not be treated as current operating truth
- future FUB / KPI hygiene agents must treat them as drift to be cleaned up, not as canon to preserve

Important technical gap still open:

- exact FUB smart-list / tag reconstruction is not yet technically proven from the currently exposed KPI Supabase schema
- a direct REST read for `fub_person_tags` did not resolve from the current exposed project
- that means the stage doctrine and founder explanation are strong, but the tag-table / smart-list plumbing still needs one more technical proof pass when the missing layer is available

Safe current rule:

- use stage doctrine and founder-approved meanings for business truth
- use current implementation only to detect where live data has drifted from that doctrine

## `Level 2` Exit For `SRC-FUB-001`

`SRC-FUB-001` reaches `Level 2` when:

1. the live source list is refreshed and visible
2. every active source is classified, intentionally open, or explicitly flagged
3. invalid source values are named as invalid
4. Owners ↔ FUB parity rules are written clearly
5. the review workflow for new or unclear sources is visible
6. Steve signs off the remaining open calls

## Current Workflow

1. refresh the live snapshot
2. classify or flag each source
3. use the review packet for unresolved calls
4. once those calls are resolved, update the rules and close the approved scope

Review packet:

- [SRC-FUB-001 validation packet](../handoffs/2026-04-17-src-fub-001-validation-packet.md)

## Drift Layer Now Live

The first governed drift slice is now live in the Foundation FUB panel.

It currently shows:

- new raw source names with no saved rule
- current rows still open on marketing or ownership
- flagged legacy / invalid names still appearing in the snapshot
- governed names not seen in the current snapshot
- stale snapshot age

It also writes drift changes into the Foundation change feed as:

- `source_drift_detected`
- `source_drift_cleared`

What this does **not** do yet:

- route drift directly into the Owners review inbox
- auto-fix source rules
- notify people outside the Foundation surface
