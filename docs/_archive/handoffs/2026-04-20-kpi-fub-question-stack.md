# KPI / FUB Question Stack

Date: 2026-04-20

Purpose: hold the next founder questions after the first deep KPI + FUB semantic pass.

These are not vague research questions.

They are the exact places where business doctrine and implementation still need to be locked together.

## Confirm With Steve

These questions are split on purpose:

- Foundation questions = needed now to lock source meaning
- Future hub questions = useful later for coaches and assistants

### Foundation 1. What exactly counts as a true new opportunity?

Current KPI `How To` says:

- moving a person into `Lead`
- `Nurture`
- or `Appointment`

can count as a new opportunity.

Current code proof:

- the audited KPI YTD lead count reads:
  - `leadclaimeddate`
  - or `leaddate` when `leadclaimeddate` is null
- it is not directly counting `currentstage` labels at read time

Need to confirm:

- confirmed now:
  - every nurture stage counts
  - `Appointment - No Show` counts
  - support-network / past-client re-entry counts the same as brand-new lead creation
  - founder working read is:
    - `leaddate` = lead entered as a lead
    - `leadclaimeddate` = agent took ownership / claimed it
- still open:
  - `Active Client` is probably included in founder intent, but still needs confirmation from Lee's upstream logic
  - what exact upstream logic writes `leadclaimeddate` / `leaddate` on re-entry

## Foundation 2. What is the exact final-stage map after temporary `Delete Lead` cleanup?

Current docs say `Delete Lead` is temporary only.

Need the explicit destination rules for:

- Possible Supporter
- Past Client
- Non Contact Non Lead / Non Supporter
- Realtor / Vendor

Locked now:

- gave-up / recycled non-leads go to `Contact - Non Lead/Non Supporter`
- `Unresponsive` is no longer used
- the two `zz - Contact – Lost ...` stages are no longer used

Still open:

- whether there are any other founder-approved final non-lead homes beyond:
  - `Contact - Non Lead/Non Supporter`
  - `Possible Supporter`
  - `Supporter/SOI`
  - `Past Client`
  - `Realtors/Vendors`
  - `Other Contacts`
  - `Trash`

## Foundation 3. Are support-network appointments part of KPI appointment scoring or just hygiene?

Current `How To` page includes:

- Support Network Discovery outcomes
- SOI / Supporter meet outcomes

Live evidence:

- appointment rows already contain support-network style outcomes like:
  - `Show - Supporter Gained!`
  - `Show - SOI/Support Meet Success`

But the actual appointment color logic in code only covers:

- listing discovery
- buyer discovery
- listing consult
- buyer consult

Need to confirm whether support-network appointments should:

- count in KPI appointment performance
- or only exist as CRM hygiene / relationship tracking

Founder clarification now:

- support-network appointment types are not the current audit priority
- current audit focus is discovery + consult outcome hygiene
- support-network appointment tracking is valuable later, once that capability is built out properly

## Foundation 4. Should supporters really appear as `warm` in the current Shopping List logic?

Current code treats:

- `Possible Supporter`
- `Active Client`
- `Warm Nurture`

as one broad `warm` bucket.

Need to confirm whether this is intentional or if support-network records should stay visible but outside lead-priority urgency.

## Foundation 5. What is the real stage map for the pipeline cards?

Current pipeline card logic is simple string matching:

- `Lead`
- `Hot/Warm/Cold Nurture`
- `Appointment`
- `Appointment - No Show`
- `Active Client`
- `Conditional Deal`
- `Firm Deal`
- `Closed`
- support stages by string contains

Need to confirm whether this is the real canonical map or only a rough dashboard grouping.

## Foundation 6. What exactly is the dual-ID / re-entry model?

Founder doctrine says a human may effectively show up as:

- original FUB person
- later re-entered opportunity

Need to confirm:

- is this truly a second record in KPI data
- or the same `personid` with a new stage event
- or a separate concept tied to the shopping-list layer

## Foundation 7. Are the appointment outcome strings in the app final?

Current code assumes exact strings for:

- `Show - Discovery Call To Consultation!`
- `Show - Consult - Working With - Signed`
- etc.

Need to confirm whether those strings are now canonical and stable enough for future AI enforcement.

## Foundation 8. For non-leads with appointments, what should still count?

Current `How To` says:

- move non-lead appointments to `Non Contact Non Lead`

Need to confirm whether those appointments should still count toward:

- activity
- coaching
- performance score

or only be preserved for history while excluded from lead conversion reporting.

## Implementation Findings Behind These Questions

- KPI docs already know the business rules better than some of the live code.
- `appointmentUtils.ts` currently lacks support-network outcome buckets.
- `Leads.tsx` and `CompanyLeads.tsx` use broad hot / warm / cold grouping by stage name.
- `usePipelineData.tsx` counts pipeline buckets using broad string contains rules.
- `useLeadsData.tsx` currently fetches all active persons for the user, not a tighter opportunity-only slice.

## Future Hub Questions

Do not block Foundation on these.

- when should a future AI coach suggest cleanup versus act automatically
- which messages should stay recommendation-only for agents
- what support-network follow-up behavior belongs in Sales Hub versus Retention Hub
- what manager views should exist for dirty KPI / FUB hygiene

## Next Founder Walkthrough Order

When Steve is back, do this in order:

1. true new opportunity
2. temporary `Delete Lead` cleanup
3. final non-lead stage map
4. appointment type + outcome canon
5. support-network appointment treatment
6. dual-ID / re-entry model
