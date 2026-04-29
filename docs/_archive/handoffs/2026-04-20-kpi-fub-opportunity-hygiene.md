# KPI / FUB Opportunity Hygiene

Date: 2026-04-20

## Purpose

Lock the Benson Crew rule model for:

- true new opportunities
- accidental FUB-created leads
- temporary `Delete Lead` cleanup
- support-network style staging outside the lead flow
- later re-entry into the active pipeline

This is a source-meaning checkpoint, not a rebuild spec.

## Why This Matters

If AI OS cannot tell the difference between:

- a brand-new human
- a bad auto-created lead
- a support-network contact
- a real re-entered opportunity

then every future coach will overstate lead creation and understate data-hygiene failure.

## Locked Now

- FUB can auto-create a lead when an agent adds a person.
- That does **not** mean a true new opportunity was created.
- `Delete Lead` is a temporary cleanup stage.
- `Delete Lead` is not the final destination.
- The person should later be moved into the correct long-term stage.
- Some records belong outside the active lead flow:
  - possible supporters
  - past clients
  - non-contact non-leads
  - realtor / vendor style records
- A person can later re-enter the lead flow and become a real new opportunity again.

Founder-confirmed true new-opportunity stages right now:

- `Lead`
- `Hot Lead/Nurture (0-3)`
- `Warm Nurture (3-6)`
- `Cold Nurture (6-12)`
- `Appointment`
- `Appointment - No Show`

Confirmed re-entry source stages:

- `Contact - Non Lead/Non Supporter`
- `Possible Supporter`
- `Supporter/SOI`
- `Past Client`

Open edge cases:

- `Active Client` likely belongs in the active opportunity path from the founder's operating intent, but this still needs confirmation against the deeper KPI / Lee database logic
- `Delete Lead` is cleanup only and currently appears under-used as a temporary stage because people are not moving records back out fast enough

Founder working date meaning:

- `leaddate` = the date the lead entered the system as a lead
- `leadclaimeddate` = the date an agent took ownership / claimed the lead
- this is especially relevant for older recycle / pond leads that get claimed later
- the exact write rules still live upstream in Lee's original middleware / database logic

Founder cleanup doctrine now locked:

- `Unresponsive` is gone
- `zz - Contact – Lost (Listing Signed)` is gone
- `zz - Contact – Lost (BRA Signed)` is gone
- `Contact - Non Lead/Non Supporter` is now the catch-all gave-up / recycle stage
- that stage also feeds the older unclaimed callback pool

Founder support-network doctrine now locked:

- `Possible Supporter` = someone known or met who should be worked into true supporter status
- `Supporter/SOI` = confirmed supporter
- `Past Client` = separate relationship category, not auto-supporter
- support-network work exists to grow and upgrade the support network, not just organize contacts

Founder non-lead doctrine now locked:

- `Realtors/Vendors` = real estate agents plus vendor-style contacts like stagers and inspectors
- `Other Contacts` = kept contacts that are not supporter-path records and not delete candidates
- `Trash` = agent-facing soft-delete stage; only founder / admin should truly delete

## Code / Database Reality Check

The live implementation is close, but not fully equal to the founder doctrine yet.

Verified from the live KPI repo and Supabase project:

- the KPI `How To` page already teaches the right cleanup model better than some live UI logic
- the live `Leads` page still groups:
  - `Possible Supporter` as `warm`
  - `Active Client` as `warm`
  - all `Appointment` stages as `hot`
- the live pipeline hook uses broad string-matching for supporter / past-client / possible-supporter counts
- the live `stages` table still contains rows including:
  - `Unresponsive`
  - `Appointment - No Show Follow Up`

Meaning:

- raw stage-table presence is not the same thing as current approved doctrine
- future AI agents must prefer the signed-off rule model in this handoff and the source notes
- code / DB should be used to detect drift, not to overrule business truth

Current appointment-audit priority:

- discovery and consult outcomes are the current KPI hygiene focus
- support-network appointment tracking is future-useful, but not the main audit lane right now

Support-network smart-list intent:

- `Poss Support` = conversion into supporter
- `All Supporters` = confirmed supporters
- `SN Send` / `SN Call` / `SN See` = relationship-care operating lists
- `PastClients` = past-client care list
- `LV 1` to `LV 5` = supporter maturity / data-depth progression

## AI OS Read Rule

Before reporting or coaching on new opportunities, AI OS should check:

1. current CRM stage
2. whether the record is really a lead
3. whether the record is a support-network style contact
4. whether the record is a cleanup case
5. whether the record is a real re-entry into the pipeline

Do not trust raw lead creation counts until that hygiene layer is checked.

## Coaching Implications

Future agent coaches should be able to do all of this:

- flag likely fake leads
- explain why the lead count is inflated
- suggest `Delete Lead` when temporary cleanup is appropriate
- suggest the correct destination stage after cleanup
- protect shopping-list truth and conversion math before praising KPI performance

## Connected Surfaces

- KPI `Leads Inbox`
- KPI `Shopping List`
- KPI `Appointments`
- KPI `How To`
- FUB stage model
- future FUB parity and coaching work in AI OS

## Open Work

- confirm the exact storage path for re-entered opportunities in KPI data
- confirm whether `Active Client` is part of opportunity counting or only a downstream client state
- lock the final non-lead stage list for coaching
- lock the explicit right/wrong appointment and stage combinations for automation
- decide which cleanup actions future agents may suggest only versus execute automatically

## Backlog Link

- `SOURCE-017` — lock KPI and FUB opportunity-hygiene rules before building sales coaches
