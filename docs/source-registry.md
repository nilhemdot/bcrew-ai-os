# Data Sources Operator Note

This note backs the `Data Sources` page.

The live page is the front door. This note is the short operator map behind it.

## How To Read The Source Layer

Every source needs three things:

1. source contract
   - what business truth it owns
2. validation unit
   - the exact tab, ledger, or endpoint slice being reviewed
3. trust state
   - signed off, partial, readable only, pending, or gap

Connectors matter too, but connector access does **not** mean trusted business meaning.

## Current Trust State

### Signed Off Docs

- `SRC-STRATEGY-001`
  - canonical strategy docs

### Signed Off Validation Units

- `SRC-OWNERS-001`
  - `ADMIN ONLY - Deal Data Entry`
  - signed off for deal-ledger meaning and row structure

### Signed Off For Current Reality

- `SRC-FREEDOM-TEAM-001`
- `SRC-FREEDOM-COMMUNITY-001`
- `SRC-FREEDOM-COMMUNITY-REV-001`
- `SRC-FREEDOM-ENGINE-001`
- `SRC-FREEDOM-BHAG-001`
  - current spreadsheet reality is signed off for meaning and strategy use
  - these are not yet freshness-managed or clean rebuilt source-of-truth layers
- `SRC-FINANCE-001`
  - Weekly Actuals and Cashflow Dash are signed off for current-reality meaning
  - QuickBooks remains optional compliance verification, not a current rebuild dependency
- `SRC-OWNERS-LISTS-001`
  - upstream Lists source, mirror boundary, and write guard are signed off for current-reality meaning
  - FUB taxonomy and deal-row cleanup remain separate source-trust work

### Partially Signed Off / Current Reality Captured

No current source-contract units belong in this bucket after the current-reality closeout correction. Future partial units should land here only when the source meaning is actually still under review.

### Readable Only

- `SRC-FUB-001`
- `SRC-SUPABASE-001`
- `SRC-GMAIL-001`
- `SRC-GCAL-001`
- `SRC-MISSIVE-001`
- `SRC-SLACK-001`
- `SRC-MEETINGS-001`
- `SRC-DATAFORSEO-001`
- `SRC-GHL-001`
- `SRC-META-001`

Readable means the rebuild can connect and read. It does not mean the business meaning, trust boundaries, freshness cadence, or write policy are signed off.

### Not Signed Off

- every source currently marked `Pending Revalidation`
- every source currently marked `Gap`

## Key Boundaries

- `SRC-STRATEGY-001` vs `SRC-FREEDOM-BHAG-001` / `SRC-FREEDOM-ENGINE-001`
  - strategy docs own narrative meaning
  - Freedom tabs own live planning inputs
- `SRC-OWNERS-001` vs `SRC-FINANCE-001`
  - Owners Admin tab is the upstream deal ledger
  - finance is the downstream finance layer
- `SRC-OWNERS-001` vs `SRC-FUB-001`
  - Owners is the trusted deal ledger
  - FUB is the CRM layer used for attribution and parity checks
- `SRC-OWNERS-001` vs `SRC-OWNERS-LISTS-001`
  - Owners Admin is the deal ledger
  - Owners Lists source owns governed dropdown/list data that flows into Admin through the Owners Dashboard mirror
  - service-account writes must target `SRC-OWNERS-LISTS-001`, not the imported mirror
- `SRC-SUPABASE-001`
  - KPI is a live foundation system
  - AI OS must read its pipeline, shopping-list, executed-deal, goal, competition, and usage layers separately

## Source ID Rule

- every source gets a stable `Source ID`
- code and docs should reference the `Source ID`, not a raw tab or path
- if a source moves, the `Source ID` stays the same

## Verified In Current Rebuild

| Source ID | Source | Current Location | Scope | What It Owns | Access Method | Status | Last Verified |
|-----------|--------|------------------|-------|--------------|---------------|--------|---------------|
| `SRC-STRATEGY-001` | Business Strategy Docs | `docs/*.md` in this repo | Canonical strategy packet | Vision, north star, engine, priorities, mandates, assumptions | Git + local filesystem | Verified | 2026-04-12 |
| `SRC-FREEDOM-TEAM-001` | Benson Crew - Freedom Sheet | `Data Entry - BCrew Team/Community` · Team records | `A:E` | Team/member records | Google Drive / Google Sheets | Signed Off For Current Reality | 2026-04-18 |
| `SRC-FREEDOM-COMMUNITY-001` | Benson Crew - Freedom Sheet | `Data Entry - BCrew Team/Community` · Community tracker | `G:O` | Community tracker | Google Drive / Google Sheets | Signed Off For Current Reality | 2026-04-18 |
| `SRC-FREEDOM-COMMUNITY-REV-001` | Benson Crew - Freedom Sheet | `Data Entry - BCrew Team/Community` · Community revenue | `P:U` | Community revenue | Google Drive / Google Sheets | Signed Off For Current Reality | 2026-04-18 |
| `SRC-FREEDOM-ENGINE-001` | Benson Crew - Freedom Sheet | `Agent Engine` tab | Current assumptions block | Agent Engine live planning inputs | Google Drive / Google Sheets | Signed Off For Current Reality | 2026-04-18 |
| `SRC-FREEDOM-BHAG-001` | Benson Crew - Freedom Sheet | `Benson Crew Bhag Builder` tab | Planning blocks plus calculator ranges | BHAG live planning inputs | Google Drive / Google Sheets | Signed Off For Current Reality | 2026-04-18 |
| `SRC-OWNERS-001` | Benson Crew - Owners Dashboard | `ADMIN ONLY - Deal Data Entry` | Primary deal-ledger validation unit | Deal lifecycle, attribution, split credit, FUB linkage | Google Drive / Google Sheets | Signed Off | 2026-04-16 |
| `SRC-OWNERS-LISTS-001` | BHAG Builder / Old BIS KPI Lists Source | `Lists` tab | `Lists!A:AI`, especially lead sources and agent roster | Governed Owners/FUB lead-source dropdown list, active-agent roster, cap fields, and imported list dependencies | Google Drive / Google Sheets | Signed Off For Current Reality | 2026-04-24 |
| `SRC-FUB-001` | Follow Up Boss | owner + Steve API contexts | CRM access in rebuild | CRM contacts, user roster, lead-source context, person linkage | Follow Up Boss API | Verified Readable | 2026-04-16 |
| `SRC-SUPABASE-001` | KPI Dashboard / Supabase | `kpi.bensoncrew.ca` + Supabase project | Existing KPI foundation system | KPI pipeline, shopping-list, executed-deal, goal, competition, and usage surfaces | Supabase + React app | Verified Readable | 2026-04-20 |
| `SRC-GMAIL-001` | Gmail | Delegated Google Workspace (`ai@bensoncrew.ca`) | Mailbox read layer | Decision capture inputs and communication context | Delegated Google Workspace | Verified Readable | 2026-04-23 |
| `SRC-GCAL-001` | Google Calendar | Delegated Google Workspace (`ai@bensoncrew.ca` primary calendar) | Calendar read layer | Meetings, scheduling, and governance cadence | Delegated Google Workspace | Verified Readable | 2026-04-23 |
| `SRC-MISSIVE-001` | Missive | Live shared inbox layer | Shared inbox and internal thread collaboration | Shared inbox comments, routing, and team-thread context | Missive API | Verified Readable | 2026-04-23 |
| `SRC-SLACK-001` | Slack | Existing Benson Crew Slack bot on the Mac Mini + PostgreSQL shared archive | Team channel read layer | Team channel threads, team-signal context, and culture / coordination evidence | Slack API | Verified Readable | 2026-04-23 |
| `SRC-MEETINGS-001` | Google Meeting Notes / Transcripts | Delegated Google Workspace scans across enabled BCrew users + PostgreSQL shared archive | Meeting evidence read layer | Meeting transcripts, notes, action items, and raw decision evidence | Delegated Google Workspace | Verified Readable | 2026-04-23 |
| `SRC-DATAFORSEO-001` | DataForSEO | Rebuild credential in env | SEO and keyword data | SEO rankings and keyword research | DataForSEO API | Verified Readable | 2026-04-23 |
| `SRC-GHL-001` | GoHighLevel | Rebuild credential in env | Contacts, pipelines, automation | Contacts, pipelines, automation | GoHighLevel API | Verified Readable | 2026-04-23 |
| `SRC-META-001` | Meta API | Rebuild tokens proven for Steve + BCrew marketing contexts | Social metrics and account inventory | Instagram and Facebook metrics across current and legacy pages | Meta API | Verified Readable | 2026-04-23 |
| `SRC-FINANCE-001` | Benson Crew - Owners Dashboard | `(Input) Weekly Actuals` + `Cashflow Dash` | Finance validation unit | Internal finance truth and dashboard interpretation layer | Google Drive / Google Sheets | Signed Off For Current Reality | 2026-04-20 |

### Freedom Sheet Signed-Off Range Coverage

`SRC-FREEDOM-TEAM-001` covers:

- `Data Entry - BCrew Team/Community · A:E Team records`

`SRC-FREEDOM-COMMUNITY-001` covers:

- `Data Entry - BCrew Team/Community · G:O Community tracker`

`SRC-FREEDOM-COMMUNITY-REV-001` covers:

- `Data Entry - BCrew Team/Community · P:U Community revenue`

`SRC-FREEDOM-ENGINE-001` covers:

- `Agent Engine`

`SRC-FREEDOM-BHAG-001` covers:

- `Benson Crew Bhag Builder`

### Owners Dashboard Signed-Off Tab Coverage

`SRC-OWNERS-001` covers these signed-off current-reality tabs:

- `ADMIN ONLY - Deal Data Entry`
- `Split Cal`
- `Agent Splits`
- `Listings and Conditional Deals`
- `Sales & Deposit`
- `Goal & KPI Calculator`
- `CI Report`

`SRC-FINANCE-001` covers these signed-off current-reality finance tabs:

- `(Input) Weekly Actuals`
- `Cashflow Dash`
- `Monthly Budget`
- `Budget Original`
- `Monthly Actuals (Roll Up)`
- `Annual Actuals (Roll Up)`
- `Annual Budget (Roll Up)`

## Pending Revalidation

| Source ID | Source | What It Owns | Owner | Current Status |
|-----------|--------|--------------|-------|----------------|
| `SRC-CLICKUP-001` | ClickUp | Task management, onboarding checklists, agent roster supplements | Carson | Pending Revalidation |
| `SRC-GDRIVE-001` | Google Drive | Docs, notes, brand guidelines, meeting artifacts, shared-drive corpora, training assets, videos, presentations, and links | All | Pending Revalidation under the delegated Google Workspace path. Shared-drive roots are captured in `docs/source-notes/google-drive-corpus.md`; first crawler must be read-only inventory. |
| `SRC-VIDEO-001` | Video Link Inventory | Loom, Drive, YouTube, Vimeo, Wistia, Zoom, and Skool media links discovered across existing archives and future authorized crawlers | Steve | Pending Revalidation. This is the system-owned URL manifest lane; it inventories links and provenance before any platform-specific transcript/download extractor runs. |
| `SRC-GADS-001` | Google Ads | MCC + sub-account performance | Steve | Pending Revalidation because the configured OAuth refresh currently returns `invalid_grant` in the rebuild. |

## Gaps

| Source ID | Source | What It Owns | Owner | Blocker |
|-----------|--------|--------------|-------|---------|
| `SRC-PUBLISH-001` | Social publishing platform | Publishing calendar, post status, distribution | Tanner | SocialPilot enterprise API is now the lead candidate and Steve has a key, but the auth context still needs `x-owner-id` / `x-user-id` or equivalent token-flow validation before this can be treated as connected. |
| `SRC-REAL-001` | Real Broker (reZEN/Bolt) | Agent roster, cap status, commissions, closed transactions, network size | Steve | Rebuild integration not complete |
| `SRC-EMAIL-TEAM-001` | Team-wide email | All `@bensoncrew.ca` inboxes beyond `ai@` | Steve | Delegation and connection scope not in place |
| `SRC-REVIEWS-001` | Client reviews | Google reviews, client surveys, qualitative feedback | Carson | No connection exists |
| `SRC-TRAINING-001` | Training completion tracker | Training completion, certification, progress | Tanner | Unknown live source |
| `SRC-CONTENT-001` | Content performance source | Published content metrics | Tanner | No publishing platform connected |
| `SRC-LOOM-001` | Loom | Historical Loom videos, transcripts, metadata, and reusable training/content IP | Steve | Atlassian admin access exists, but Loom has no first-party open extraction API. Needs an approved extractor proof such as Apify, manual export, or authorized session workflow before trusted ingestion. |
| `SRC-SKOOL-001` | Skool | Courses, trainings, posts, comments, links, docs, and video lessons | Steve | Not connected in rebuild. Needs approved access/export path and content-use boundary before it can become a trusted corpus source; blind scraping is blocked by policy risk. |

## Corpus Crawl Boundary

The source layer now needs two operating modes:

- current-day sync
- historical corpus crawl

Current-day sync keeps live communications and operating sources fresh.

Historical corpus crawl takes bounded bites through old Google Drive folders, Skool courses, inbox windows, media archives, and other corpora. Every crawl must record cursor/checkpoint state, inspected artifacts, archive/mirror location, extraction status, errors, cost, and evidence links.

Google Drive corpus crawl starts with the root list in `docs/source-notes/google-drive-corpus.md` and must be read-only inventory first. Skool corpus work starts with the access-path audit in `docs/source-notes/skool-corpus.md`; do not build a browser scraper until the route is explicitly approved.
