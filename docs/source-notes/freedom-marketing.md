# Freedom Marketing + Old Performance System

Purpose: lock the current reality of the two remaining visible Freedom marketing tabs, compare them to the old system that was already trying to replace them, and define the future foundation source map for Benson Crew, Zahnd Team Ag, Steve Zahnd, and MarketMasters.

## Current Rule

- this is a current-reality capture
- it is not the rebuild itself
- the goal is to lock:
  - what the old system already proved
  - what the current Freedom tabs are actually tracking
  - which source systems each pillar will need later

## The Core Model

The old system and the Freedom tabs are both aiming at the same four-pillar performance model:

1. awareness
2. engagement
3. leads
4. remarketing

That part is not fuzzy anymore. It is real and already proved in the old system.

## What The Old System Already Proved

The old system already had a real normalized performance layer, not just a spreadsheet.

Old-system evidence:

- `src/db.ts`
  - `content_performance`
  - `marketing_kpis`
  - `search_query_kpis`
  - `marketing_campaigns`
  - `remarketing_audiences`
- `scripts/performance-collector.cjs`
  - collected by brand:
    - `bensoncrew`
    - `stevezahnd`
    - `marketmasters`
  - collected by pillar:
    - `awareness`
    - `engagement`
    - `leads`
    - `remarketing`
- `dashboard/public/performance.js`
  - rendered the same four-pillar view in the old dashboard
- `dashboard/server.cjs`
  - exposed remarketing audience APIs and tracked audience totals

What that old system was already trying to do:

- pull Meta organic metrics
- pull Google Ads performance
- pull GA4 website metrics
- pull Search Console search metrics
- pull FUB marketing lead counts
- pull Google Ads remarketing lists
- use website visitors, social audience, and CRM/email audiences as retargetable pools

## Brand Boundary

This is the clean boundary the system should keep:

| Brand / pillar owner | What it is |
| --- | --- |
| `Benson Crew` | Team marketing and client lead-generation engine |
| `Zahnd Team Ag` | Agricultural / farm division demand generation and reputation engine |
| `Steve Zahnd` | Personal brand, recruiting attention, and top-of-funnel trust |
| `MarketMasters` | Education and trust platform inside the Steve attraction system |

Important truth:

- the old system gave `MarketMasters` its own brand lane
- the old system did **not** yet separate `Zahnd Team Ag` as its own lane, but future state should
- the current Freedom tabs mostly nest `MarketMasters` inside the Steve lane
- that difference needs to stay visible during future rebuild design

## Current Freedom Tabs

### `BenCrew Marketing`

What it is now:

- a populated KPI dashboard for the team/business side
- monthly rollups across the same four pillars
- a mix of:
  - social metrics
  - web traffic
  - Google Business Profile activity
  - manual offline activity
  - Google Ads
  - lead counts
  - remarketing asset sizes

What is strong:

- the pillar framing is right
- the monthly spine is usable
- the remarketing section is not an afterthought
- it already tries to capture the retargetable audience layer, not just top-of-funnel vanity numbers

What is messy:

- it mixes multiple domains and sub-brands in one team dashboard
- it blends direct metrics with manual placeholder rows
- it uses spreadsheet-driven totals instead of a normalized source layer

### `SZ Marketing`

What it is now:

- a blueprint-style dashboard for Steve's personal attraction system
- lighter on live values
- much stronger on explicit audience design and source intent

What it is trying to track:

- awareness
  - Instagram reach
  - Facebook reach
  - YouTube reach
- engagement
  - Instagram engagements
  - Facebook engagements
  - YouTube watch time
  - `MarketMasters Users`
  - `Careers Users`
- leads
  - GHL subscribers
  - conversations started
- remarketing
  - Meta and Google audience inventory
  - careers visitors
  - MarketMasters visitors
  - email lists
  - FB / IG engagers
  - future lookalikes and conversion audiences

What is important:

- this tab is closer to a future system blueprint than the Benson Crew tab
- it makes the recruiting / education / audience-building logic much more explicit

## The Old-System To Freedom Match

| Area | Old system | Current Freedom reality | Straight read |
| --- | --- | --- | --- |
| Benson Crew performance | normalized KPI collector + dashboard | populated mixed spreadsheet KPI tab | same business intent, weaker source discipline now |
| Zahnd Team Ag | mostly blended into Steve/Zahnd-era assets | not separated cleanly in Freedom | future rebuild should split it into its own lane because it has its own site/content/SEO/AEO and farm-agent strategy |
| Steve Zahnd performance | distinct brand lane in old dashboard | blueprint-style tab in Freedom | same intent, not rebuilt yet |
| MarketMasters | own brand in old system | mostly nested inside Steve tab | future rebuild must decide whether to keep separate or nested |
| Remarketing | explicit audience table + toggleable tracked lists | explicit audience-inventory blocks in both tabs | old system was ahead here |

## Future Foundation Source Map

This is the clean source map the rebuild should eventually satisfy.

### Awareness

| Lane | Sources that should own it later |
| --- | --- |
| Benson Crew | `Meta API`, `Google Ads`, `Search Console`, `Google Business Profile`, manual offline campaign ledger |
| Zahnd Team Ag | `Meta API`, `GA4`, `Search Console`, `YouTube`, farm-industry media / lead sources, future agricultural campaign ledger |
| Steve Zahnd | `Meta API`, `YouTube`, `GA4`, `Search Console` |
| MarketMasters | `GA4`, `Search Console`, `YouTube`, future event-registration source |

### Engagement

| Lane | Sources that should own it later |
| --- | --- |
| Benson Crew | `Meta API`, `GA4`, `Google Ads`, `Search Console`, email platform |
| Zahnd Team Ag | `Meta API`, `GA4`, `YouTube`, `Search Console`, ag-community email / funnel layer |
| Steve Zahnd | `Meta API`, `YouTube`, `GA4`, `GHL` or email layer |
| MarketMasters | `GA4`, `YouTube`, event/content engagement sources |

### Leads

| Lane | Sources that should own it later |
| --- | --- |
| Benson Crew | `Follow Up Boss`, Owners / Home Value Hub form paths, phone-call capture, email capture |
| Zahnd Team Ag | division-specific forms, phone-call capture, agricultural lead paths, plus any FUB / CRM routing that should stay separate from residential funnels |
| Steve Zahnd | `GoHighLevel`, conversation / DM capture, recruiting forms |
| MarketMasters | event registrations, opt-ins, education funnels, then handoff into Steve / Benson Crew pipelines |

### Remarketing

| Lane | Sources that should own it later |
| --- | --- |
| Benson Crew | `Google Ads audiences`, `Meta audiences`, GA4 audience logic, FUB / CRM lists, past-client tags |
| Zahnd Team Ag | `Google Ads audiences`, `Meta audiences`, ag-site visitors, ag-content engagers, farm-list / CRM audiences |
| Steve Zahnd | `Google Ads audiences`, `Meta audiences`, `GHL` email lists, social engagers, YouTube viewers |
| MarketMasters | site visitors, event users, video viewers, future conversion audiences |

## The Missing Foundation Source Contracts Right Now

The rebuild source layer still does not clearly track all of the sources this future system needs.

The most obvious missing or weak source-contract layer right now is:

- `GA4`
- `Search Console`
- `Google Business Profile`
- `YouTube`
- explicit remarketing audience sources

Current source contracts cover parts of the picture:

- `SRC-FUB-001`
- `SRC-GHL-001`
- `SRC-GADS-001`
- `SRC-META-001`
- `SRC-PUBLISH-001`
- `SRC-REVIEWS-001`
- `SRC-CONTENT-001`

That is not enough to fully own the future performance system yet.

## Publishing / Distribution Reality

The old system treated publishing as a separate operational layer from performance truth:

- publishing calendar
- post status
- scheduled distribution
- account / group routing

That belongs in `SRC-PUBLISH-001`, not mixed into `SRC-CONTENT-001`.

Current straight read:

- SocialPilot is now the first real candidate for `SRC-PUBLISH-001`
- Steve has a current enterprise API key
- the public enterprise docs are live at `https://enterprise-apidocs.socialpilot.co`
- the API is not simple bearer auth
- the OpenAPI contract shows:
  - `x-api-key`
  - `x-owner-id`
  - `x-user-id`
  - plus a short-lived token flow via `/generate-token`

That means the publishing-platform gap is no longer "no platform selected."

It is now:

- platform candidate identified
- key acquired
- auth context still incomplete

Foundation rule:

- SocialPilot can own publishing calendar, post status, and distribution truth if validation succeeds
- it should not become the whole marketing truth layer by itself
- performance truth still needs the pillar sources above: `Meta`, `GA4`, `Search Console`, `Google Ads`, `YouTube`, and explicit remarketing audiences

## Straight Call

The old system already proved the right architecture direction:

- separate brands
- same four pillars
- normalized monthly KPI storage
- first-class remarketing audience tracking

The current Freedom tabs still matter because they show the business intent clearly, but they are not the foundation source-of-truth layer.

They are:

- useful current dashboards
- useful planning blueprints
- useful rebuild reference material

They are not:

- the final source model
- the final automation model
- the final trust layer

## What This Means For The Rebuild Later

When the rebuild reaches this area, the right order is:

1. define the brand boundary
2. define the four pillars per brand
3. define the real source contract for each pillar
4. define which parts stay manual
5. only then build the dashboard layer

Do not rebuild the marketing dashboards by copying spreadsheet cells.

Rebuild them from the pillar/source map.
