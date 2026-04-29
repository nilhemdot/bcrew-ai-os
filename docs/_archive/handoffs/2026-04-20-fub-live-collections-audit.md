# FUB Live Collections Audit

Date: 2026-04-20

Purpose: record what was proven from the live Follow Up Boss UI, not just from founder explanation or KPI code inference.

## Straight answer

- A live browser pass was completed against the real FUB account.
- The assigned collection URLs were captured from the live UI.
- The `New` collection rule was read cleanly from the FUB filter drawer.
- The rest of the collections were proven as real live saved lists, but many of their exact filter-builder rules still need one cleaner extraction pass because FUB mixes filter-drawer text with visible row data.
- Person-profile structure and custom-field groups were also proven from the live UI.

## Method used

- Live browser pass in `AI Google Chrome`
- Playwright against the signed-in AI browser profile
- Read from:
  - left-nav assigned collections
  - list pages
  - filter drawer
  - columns drawer
  - person profile views

## Assigned Collections: live list IDs

These were read directly from the live FUB UI.

| Collection | List ID | URL |
| --- | --- | --- |
| `1️⃣ New` | `136` | `/2/people/list/136` |
| `☎️ Pond Leads` | `94` | `/2/people/list/94` |
| `🤙 Other Unclaimed` | `170` | `/2/people/list/170` |
| `➀ Your Leads` | `155` | `/2/people/list/155` |
| `➁ HOT` | `156` | `/2/people/list/156` |
| `➂ WARM` | `157` | `/2/people/list/157` |
| `➃ COLD` | `158` | `/2/people/list/158` |
| `➄ Apps` | `159` | `/2/people/list/159` |
| `➅ No Show` | `160` | `/2/people/list/160` |
| `Maverick RE - Past Due!` | `205` | `/2/people/list/205` |
| `✅ ToDo` | `62` | `/2/people/list/62` |
| `✐Shop` | `161` | `/2/people/list/161` |
| `✍️ Cond` | `162` | `/2/people/list/162` |
| `✍️ Pend` | `85` | `/2/people/list/85` |
| `⭐ Close120` | `86` | `/2/people/list/86` |
| `0️⃣ Poss Support` | `153` | `/2/people/list/153` |
| `1️⃣ All Supporters` | `122` | `/2/people/list/122` |
| `2️⃣ SN Send` | `101` | `/2/people/list/101` |
| `3️⃣ SN Call` | `100` | `/2/people/list/100` |
| `4️⃣ SN See` | `102` | `/2/people/list/102` |
| `5️⃣ PastClients` | `73` | `/2/people/list/73` |
| `♥️ LV 1` | `123` | `/2/people/list/123` |
| `♥️ LV 2` | `124` | `/2/people/list/124` |
| `♥️ LV 3` | `117` | `/2/people/list/117` |
| `♥️ LV 4` | `118` | `/2/people/list/118` |
| `♥️ LV 5` | `119` | `/2/people/list/119` |
| `*️⃣ Other Contacts` | `121` | `/2/people/list/121` |
| `Home Value Hub User List` | `174` | `/2/people/list/174` |
| `Active HomeValue Users` | `176` | `/2/people/list/176` |

## Clean live filter proof

### `1️⃣ New`

This one was read cleanly from the live FUB filter drawer.

Saved meaning in live UI:

- description: `Brand new leads, no recent call made or text sent`

Observed filter rules:

- `Last Text more than 1 day ago`
- `Last Call more than 1 day ago`
- `Pond includes any of`:
  - `Catch All Lead - Not In Designated Area - Summit`
  - `Burlington - Summit`
  - `Brant & Surrounding - Summit`
  - `Guelph & Surrounding - Summit`
  - `Catch All Lead - Not In Designated Area - Lift`
  - `Burlington - Lift`
  - `Brant & Surrounding - Lift`
  - `Guelph & Surrounding - Lift`
  - `Hamilton`
  - `Niagara Region`
  - `Milton`
  - `Mississauga`
  - `Oakville`
  - `Company Home Value Hub`
- `Stage includes any of: Lead`
- `Created less than 10 days ago`

This is the strongest direct UI proof gathered in this pass.

## Collection groups that are now clearly real

Even when the exact filter-builder rules were noisy, the live UI proved these are real saved operating lists and not imaginary doctrine:

- `New / Pond / Other Unclaimed`
- `Your Leads / HOT / WARM / COLD / Apps / No Show`
- `Maverick RE - Past Due! / ToDo / Shop / Cond / Pend / Close120`
- `Poss Support / All Supporters / SN Send / SN Call / SN See / PastClients`
- `LV 1` through `LV 5`
- `Other Contacts`
- `Home Value Hub User List / Active HomeValue Users`

## Columns model proven from live UI

The live lists expose a repeatable column-group model. Depending on list type, these groups are present:

- `Details`
- `Assigned`
- `Emails`
- `Calls`
- `Texts`
- `Website activity`
- `Deals`
- `Inbox Apps`
- `Custom Fields`

Typical visible row columns include:

- `First Name`
- `Last Name`
- `Phone`
- `Email`
- `Address`
- `Price`
- `Tags`
- `Stage`
- `Source`
- `Created`
- `Updated`
- `Inactive`
- `My Next Task`
- `Last Activity`
- `Last Communication`
- `Timeframe`
- `My Agent Status`

## Support-network field model proven from live UI

The support-network collections clearly depend on custom fields, not just stage names.

Observed in list columns / filters:

- `Supporter Level`
- `Deals Done`
- `Referrals/Introductions`
- `Confirmed Chosen One`
- spouse-detail fields
- child-detail fields
- touchpoint / birthday / hug fields

That confirms the support-network collections are a real field-driven system, not just one stage with pretty names.

## Person profile structure proven from live UI

Person pages expose a consistent structure:

- core identity and contact block
- relationships block
- details block
  - `Stage`
  - `Assigned to`
  - `Source`
  - `Price`
  - `Timeframe`
  - `Tags`
  - `Financing`
  - `Lender`
- background
- social profile
- custom fields
- notes / email / text / call activity
- appointments
- deals
- collaborators
- action plans
- website activity
- automations

## Custom field groups proven from live UI

The live person view shows these custom-field sections:

- `Pipeline`
- `--PRIORITY DETAILS--`
- `--MAIN CONTACT DETAILS--`
- `--PARTNER DETAILS--`
- `--CHILDREN DETAILS--`
- `--OTHER DETAILS--`

Observed field names include:

- `HomeOptima Link`
- `Name of Person Who Gave Referral/Introduction`
- `Lead Source Secondary Information`
- `Supporter Level`
- `Referrals/Introductions`
- `Deals Done`
- `Confirmed Chosen One`
- `5 Star Review Google`
- `Main - Hugs`
- `Main - Birthday`
- `Wedding Anniversary`
- `Became A Client Anniversary`
- `Main - Gender`
- `Main - Father/Mother`
- `Company`
- `Job`
- `Spouse - Name`
- `Spouse - Hug`
- `Spouse - Bday`
- `Spouse - Gender`
- `Spouse - Father/Mother`
- `Spouse - Company`
- `Child 1 Name`
- `Child 1 Bday`
- `Child 1 Hug`
- `Child 2 Name`
- `Child 2 Bday`
- `Child 2 Hug`
- `Child 3 Name`
- `Child 3 Bday`
- `Child 3 Hug`
- `Child 4 Name`
- `Child 4 Bday`
- `Child 4 Hug`
- `Agent Id In Google Contact`
- `Colab id in google contact`
- `syncing With Google`
- `Inquiry Date`

## What is now safely proven

- the assigned collections are real live saved lists
- the list IDs are now captured
- `New` has one clean extracted filter model
- supporter / support-network lists are custom-field driven
- the person profile surface is now documented
- the FUB side does contain the field vocabulary needed for future supporter-path coaching

## What is still not fully clean

- exact saved filter-builder logic for every single list
- exact list-rule extraction for:
  - `Pond Leads`
  - `Other Unclaimed`
  - `Your Leads`
  - `HOT/WARM/COLD`
  - `Shop/Cond/Pend/Close120`
  - `Home Value Hub` lists
- full field-value population audit across representative profiles

Reason:

- FUB’s live filter drawer mixes filter text with visible row data in the browser DOM
- that makes raw browser text extraction noisy
- a second pass should either:
  - read the underlying saved-list request payloads, or
  - use the edit-list builder in a cleaner selector-driven way

## Technical extraction note

The browser pass also exposed FUB internal endpoints such as:

- `/api/v1/smartLists`
- `/api/v1/smartLists/{id}`
- `/api/v1/smartListGroups`
- `/api/v1/defaultSmartLists`
- `/api/v1/people/filter`

But from the automation context they returned:

- `403`
- `Access to the Follow Up Boss API has been restricted`

That means:

- the underlying list / smart-list API surface does exist
- but it is not currently a reliable extraction path for AI OS
- the safe current proof path is still live browser inspection plus governed notes

## Why this still matters now

Even before the second proof pass, this audit already closed several important unknowns:

- the assigned collections are not hypothetical
- their URL identities are now stable and captured
- the support-network model is visibly built into FUB custom fields
- future AI agents can be designed around:
  - list membership
  - profile custom fields
  - stage / source / assignee / last-communication reads

## Recommended next pass

1. capture exact saved-list rule-builder logic for the remaining high-value collections
2. sample representative profiles from:
   - `Poss Support`
   - `All Supporters`
   - `Your Leads`
   - `Shop`
   - `Cond`
   - `Home Value Hub User List`
3. map the exact custom fields that matter for:
   - support-network coaching
   - shopping-list coaching
   - Home Value Hub coaching
