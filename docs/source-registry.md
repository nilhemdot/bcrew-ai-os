# Data Sources Operator Note

Status: Active
Last updated: 2026-05-13

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

## Source Contract Validation Layer

`SOURCE-CONTRACT-VALIDATION-LAYER-001` is the current fail-closed contract guard for source work.

Before connector or extractor work can rely on a source contract, the validation layer checks source ID shape, owner, lane/brand where applicable, auth posture, extraction posture, freshness expectation, connector status, atom-flow expectation, and blocked-state handling. Rule: blocked source contracts must carry blocker, reason, and next action. Auth-required sources stay blocked from extraction until an approved source/access card changes that posture.

This layer does not run OAuth, start auth-required extraction, call live connectors, or mark a readable connector as trusted business meaning.

## Grouped Source Systems

Some business questions span multiple source contracts. Those grouped systems are maps over the source layer, not replacement source IDs.

| Grouped system | Connected sources | Purpose | Operator note |
| --- | --- | --- | --- |
| Sales Data / KPI-FUB-Deal System | `SRC-FUB-001`, `SRC-SUPABASE-001`, `SRC-OWNERS-001`, `SRC-OWNERS-LISTS-001`, `SRC-CLICKUP-001`, `SRC-MEETINGS-001`, plus Lee `FUBZahnd` code evidence | Person -> opportunity -> appointment -> Shopping List -> executed deal -> Ops follow-through | [FUB / KPI / Deal Data connection map](source-notes/fub-kpi-deal-connection-map.md) |
| GLS System / Get Listings Sold | Source truth: `SRC-CLICKUP-001`; supporting evidence only: `SRC-SUPABASE-001` KPI Shopping List | Active listings crossing the stale threshold -> GLS case -> owner lane -> movement/sold/failure visibility | Live under `SYS-SALES-GLS-001`; proof is `SALES-GLS-SCOREBOARD-V1` closeout; routes are `/sales#gls-dashboard` and `/sales#gls-system` |
| Strategy Corpus / Shared Intelligence System | `SRC-GMAIL-001`, `SRC-MISSIVE-001`, `SRC-MEETINGS-001`, `SRC-SLACK-001`, `SRC-GDRIVE-001`, `SRC-VIDEO-001`, `SRC-LOOM-001`, `SRC-SKOOL-001`, `SRC-YOUTUBE-INTEL-001` | Meetings, email, Slack, Drive, and media into decisions, contradictions, tasks, atoms, and strategy evidence. Drive Docs/Sheets/PDF/text/markdown v1, Drive agenda link inventory, rough scanned-PDF OCR, Gmail PDF/text attachment v1, and YouTube subtitle transcript v1 are live; Missive attachments, rich video vision, Slides, Office files, vision-grade handwriting/OCR, media, and shortcut resolution are still separate lanes. | [Shared communications](source-notes/shared-communications.md), [Google Drive corpus](source-notes/google-drive-corpus.md), [Video link inventory](source-notes/video-link-inventory.md) |
| Build Intel / AIOS Improvement Sources | `SRC-CREATOR-WATCHLIST-001`, `SRC-YOUTUBE-INTEL-001`, `SRC-GITHUB-BUILD-INTEL-001` | Public builders, creator content, public codebases, and implementation-pattern sources into proposal-only AIOS improvements | [GitHub build intel](source-notes/github-build-intel.md) and Build Intel direction handoffs |

Rule:

- use source contracts for individual business truth
- use grouped maps only when a job crosses systems
- promote repeatable cross-system checks into scripts, backlog cards, and verifier coverage

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
  - v1 Owners/Admin parity reads use Admin column `BZ` to join to FUB person records for source, stage, assigned-agent, tag, address, phone, and email checks
  - FUB evidence can flag source-lineage, ISA, and stale-stage issues, but final source-row fixes stay in Owners until an approval-gated apply lane exists
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
| `SRC-STRATEGY-001` | Business Strategy Docs | `docs/business-strategy.md`, `docs/strategy/`, and active rebuild doctrine docs in `docs/rebuild/` | Canonical strategy packet and rebuild doctrine | Vision, north star, engine, priorities, mandates, assumptions, and current rebuild operating doctrine | Git + local filesystem | Verified | 2026-04-25 |
| `SRC-FREEDOM-TEAM-001` | Benson Crew - Freedom Sheet | `Data Entry - BCrew Team/Community` · Team records | `A:E` | Team/member records | Google Drive / Google Sheets | Signed Off For Current Reality | 2026-04-18 |
| `SRC-FREEDOM-COMMUNITY-001` | Benson Crew - Freedom Sheet | `Data Entry - BCrew Team/Community` · Community tracker | `G:O` | Community tracker | Google Drive / Google Sheets | Signed Off For Current Reality | 2026-04-18 |
| `SRC-FREEDOM-COMMUNITY-REV-001` | Benson Crew - Freedom Sheet | `Data Entry - BCrew Team/Community` · Community revenue | `P:U` | Community revenue | Google Drive / Google Sheets | Signed Off For Current Reality | 2026-04-18 |
| `SRC-FREEDOM-ENGINE-001` | Benson Crew - Freedom Sheet | `Agent Engine` tab | Current assumptions block | Agent Engine live planning inputs | Google Drive / Google Sheets | Signed Off For Current Reality | 2026-04-18 |
| `SRC-FREEDOM-BHAG-001` | Benson Crew - Freedom Sheet | `Benson Crew Bhag Builder` tab | Planning blocks plus calculator ranges | BHAG live planning inputs | Google Drive / Google Sheets | Signed Off For Current Reality | 2026-04-18 |
| `SRC-OWNERS-001` | Benson Crew - Owners Dashboard | `ADMIN ONLY - Deal Data Entry` | Primary deal-ledger validation unit | Deal lifecycle, attribution, split credit, FUB linkage | Google Drive / Google Sheets | Signed Off | 2026-04-16 |
| `SRC-OWNERS-LISTS-001` | BHAG Builder / Old BIS KPI Lists Source | `Lists` tab | `Lists!A:AI`, especially lead sources and agent roster | Governed Owners/FUB lead-source dropdown list, active-agent roster, cap fields, and imported list dependencies | Google Drive / Google Sheets | Signed Off For Current Reality | 2026-04-24 |
| `SRC-FUB-001` | Follow Up Boss | owner + Steve API contexts | CRM access plus Owners/Admin parity reads | CRM contacts, user roster, lead-source context, person linkage, source/stage/tag/address parity checks | Follow Up Boss API | Verified Readable | 2026-04-16 |
| `SRC-SUPABASE-001` | KPI Dashboard / Supabase | `kpi.bensoncrew.ca` + Supabase project | Existing KPI foundation system | KPI pipeline, shopping-list, executed-deal, goal, competition, and usage surfaces | Supabase + React app | Verified Readable, Read Rules Locked | 2026-04-26 |
| `SRC-GMAIL-001` | Gmail | Delegated Google Workspace (`ai@bensoncrew.ca`) | Mailbox read layer plus PDF/text attachment v1 | Decision capture inputs, communication context, and first attachment text artifacts | Delegated Google Workspace | Verified Readable | 2026-04-26 |
| `SRC-GCAL-001` | Google Calendar | Delegated Google Workspace (`ai@bensoncrew.ca` primary calendar) + `calendar-current-day` target | Calendar read layer and bounded event archive | Meetings, scheduling, governance cadence, and source-backed event artifacts without Calendar writes | Delegated Google Workspace | Verified Readable, Scheduled Read-Only Archive | 2026-05-16 |
| `SRC-GDOCS-001` | Google Docs Source Type | Delegated Google Workspace Drive export path | Native Google Docs content type | Google Docs content artifacts, source typing, provenance, and text export boundaries | Delegated Google Workspace / Drive files.export | Verified Readable | 2026-05-16 |
| `SRC-GSHEETS-001` | Google Sheets Source Type | Delegated Google Workspace Sheets API path | Generic spreadsheet source type | Google Sheets source typing, generic spreadsheet artifacts, and credential/source registry mapping | Delegated Google Workspace / Google Sheets API | Verified Readable | 2026-05-16 |
| `SRC-MISSIVE-001` | Missive | Live shared inbox layer | Shared inbox and internal thread collaboration | Shared inbox comments, routing, and team-thread context | Missive API | Verified Readable | 2026-04-23 |
| `SRC-SLACK-001` | Slack | Existing Benson Crew Slack bot on the Mac Mini + PostgreSQL shared archive | Team channel read layer | Team channel threads, team-signal context, and culture / coordination evidence | Slack API | Verified Readable | 2026-04-23 |
| `SRC-MEETINGS-001` | Google Meeting Notes / Transcripts | Delegated Google Workspace scans across enabled BCrew users + PostgreSQL shared archive | Meeting evidence read layer | Meeting transcripts, notes, action items, and raw decision evidence | Delegated Google Workspace | Signed Off For Current Reality | 2026-05-19 |
| `SRC-DATAFORSEO-001` | DataForSEO | Rebuild credential in env | SEO and keyword data | SEO rankings and keyword research | DataForSEO API | Verified Readable | 2026-04-23 |
| `SRC-GHL-001` | GoHighLevel | Rebuild credential in env | Contacts, pipelines, automation | Contacts, pipelines, automation | GoHighLevel API | Verified Readable | 2026-04-23 |
| `SRC-META-001` | Meta API | Rebuild tokens proven for Steve + BCrew marketing contexts | Social metrics and account inventory | Instagram and Facebook metrics across current and legacy pages | Meta API | Verified Readable | 2026-04-23 |
| `SRC-FINANCE-001` | Benson Crew - Owners Dashboard | `(Input) Weekly Actuals` + `Cashflow Dash` | Finance validation unit | Internal finance truth and dashboard interpretation layer | Google Drive / Google Sheets | Signed Off For Current Reality | 2026-04-20 |

Monitoring boundary: `SRC-STRATEGY-001` is monitored by manual/on-demand review of repo strategy docs, active rebuild doctrine, and existing source-backed strategy facts. This is not a background Strategy Hub automation approval and does not permit live extraction, model/provider calls, or external writes from source-maturity repair cards.

Monitoring boundary: `SRC-FUB-001` is monitored by manual/on-demand review of existing source-backed facts, FUB source notes, and read-only connector health evidence. This is not background FUB automation approval and does not permit live FUB API calls, CRM mutation, live extraction, model/provider calls, or external writes from source-maturity repair cards.

Monitoring boundary: `SRC-CLICKUP-001`, `SRC-GDOCS-001`, `SRC-GSHEETS-001`, `SRC-DATAFORSEO-001`, `SRC-GHL-001`, `SRC-META-001`, and `SRC-SUPABASE-001` are monitored by manual/on-demand review of existing source contracts, source notes, shipped system proof, and separately approved health evidence where available. This is not background connector automation approval and does not permit live provider calls, extraction target creation, external writes, Drive permission mutation, paid runs, auth repair, or governed apply from source-maturity repair cards.

Monitoring boundary: `SRC-FREEDOM-TEAM-001` is monitored by manual/on-demand review of the signed-off Freedom source note, source registry, and separately approved read-only Sheet checks. This is not background Google Sheets automation approval and does not permit live Sheets read/write, Drive mutation, extraction target creation, model/provider calls, or external writes from source-maturity repair cards.

Monitoring boundary: `SRC-FREEDOM-COMMUNITY-REV-001` is monitored by manual/on-demand review of the signed-off Freedom source note, source registry, and separately approved read-only Sheet checks. This is not background Google Sheets automation approval and does not permit live Sheets read/write, Drive mutation, extraction target creation, model/provider calls, or external writes from source-maturity repair cards.

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

Verified but not counted as source-owned sign-off for this unit:

- `Lists`: verified in the Owners Dashboard as an `IMPORTRANGE` mirror, but governed writes and source-owned list truth belong to `SRC-OWNERS-LISTS-001` in the BHAG Builder / Old BIS KPI Lists Source workbook.

`SRC-FINANCE-001` covers these signed-off current-reality finance tabs:

- `(Input) Weekly Actuals`
- `Cashflow Dash`
- `Monthly Budget`
- `Budget Original`
- `Monthly Actuals (Roll Up)`
- `Annual Actuals (Roll Up)`
- `Annual Budget (Roll Up)`
- `Unspent -L3M + Actual Helper`

Monitoring boundary: manual/on-demand finance source review from the Owners Dashboard finance layer. This is not a background finance automation approval and does not permit Google Sheets read/write from source-maturity repair cards.

## V1 Source Boundary Locked

| Source ID | Source | What It Owns | Owner | Current Status |
|-----------|--------|--------------|-------|----------------|
| `SRC-CLICKUP-001` | ClickUp | Deal workflow/accountability, conditional forecast inputs, Agent Roster, contract-link monitoring, onboarding NPS trigger/result fields | Carson | V1 Source Boundary Locked |
| `SRC-VIDEO-001` | Video Link Inventory | System-owned video URL manifest, platform classification, source provenance, extraction status, and YouTube subtitle transcript V1 evidence | Steve | V1 Source Boundary Locked for manifest/subtitle V1. Loom, Drive video, Zoom, Skool, no-subtitle vision/transcription, and rich-vision extractors remain separate proof lanes. |

## Pending Revalidation

| Source ID | Source | What It Owns | Owner | Current Status |
|-----------|--------|--------------|-------|----------------|
| `SRC-GDRIVE-001` | Google Drive | Docs, notes, brand guidelines, meeting artifacts, shared-drive corpora, training assets, videos, presentations, and links | All | Pending Revalidation under the delegated Google Workspace path. Shared-drive roots are captured in `docs/source-notes/google-drive-corpus.md`; first crawler must be read-only inventory. |
| `SRC-CREATOR-WATCHLIST-001` | Creator / source watchlist | Steve-approved creators, channels, sites, communities, newsletters, and source priority rules | Steve | Pending Revalidation for extraction. V1 watchlist truth is now normalized in `lib/build-intel-watchlist.js` and exposed through `/api/foundation/build-intel-watchlist`; actual YouTube/Skool/myICOR/Loom extraction remains the next implementation sprint. |
| `SRC-YOUTUBE-INTEL-001` | YouTube creator intelligence | Public creator/channel/video metadata, transcripts where allowed, Gemini video observations, and derived source-backed atoms | Steve | Pending Revalidation. YouTube subtitle transcript v1 is live from the video-link manifest through DataForSEO; official discovery, channel watchlists, Gemini video understanding, and derived atoms remain next layers. |
| `SRC-GITHUB-BUILD-INTEL-001` | Public GitHub build intelligence | Public GitHub repositories, release/activity metadata, and codebase pattern evidence for AI coding/build-system projects, starting with `garrytan/gstack` | Steve | Active Read-Only V1 under `gstack-build-intel-extraction-v1`; Source Boundary Locked for public read-only, proposal-only Build Intel and exposed at `/api/foundation/gstack-build-intel`. Monitoring boundary is manual public GitHub Build Intel review from existing source notes and shipped GStack proof only. Allowed use is read-only pattern extraction and proposal-only Research Inbox items. No code import, install, auth scraping, live extraction, background GitHub crawler, or automatic backlog mutation until an approved scoped card says otherwise. |
| `SRC-GSLIDES-001` | Google Slides Source Type | Native Google Slides discovered through delegated Google Workspace Drive inventory | Google Slides source typing and future presentation-asset extraction boundary | All | Scoped, not extracted. This reconciles the source ID used by Google Workspace credential metadata; full Slides content extraction remains a follow-up lane. |
| `SRC-GADS-001` | Google Ads | MCC + sub-account performance | Steve | Pending Revalidation because the configured OAuth refresh currently returns `invalid_grant` in the rebuild. |
| `SRC-GA4-001` | Google Analytics 4 | Web traffic, conversions, funnel analytics, and content performance by approved brand lane | Steve / Tanner | Scoped, not connected under `marketing-measurement-source-contracts-v1`. Source identity and available-pending connector row exist; property/account IDs, auth posture, allowed reads, and extraction approval are still blocked. |
| `SRC-GSC-001` | Google Search Console | SEO queries, pages, impressions, clicks, index health, and search opportunity by approved brand lane | Steve / Tanner | Scoped, not connected under `marketing-measurement-source-contracts-v1`. Source identity and available-pending connector row exist; site-property IDs, auth posture, allowed reads, and extraction approval are still blocked. |
| `SRC-GBP-001` | Google Business Profile | Local search presence, profile performance, reviews, and local trust signals by approved brand/location lane | Steve / Carson | Scoped, not connected under `marketing-measurement-source-contracts-v1`. Source identity and available-pending connector row exist; account/location IDs, review-use boundary, auth posture, allowed reads, and extraction approval are still blocked. |

`SOURCE-016` closes the no-auth source-contract prep for `SRC-GA4-001`, `SRC-GSC-001`, and `SRC-GBP-001` under `marketing-measurement-source-contracts-v1`. These source contracts are fail-closed prep only; they do not approve provider calls, OAuth repair, paid/source auth, extraction targets, or live extraction.

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
