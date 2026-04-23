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

### Partially Signed Off / Current Reality Captured

- `SRC-FINANCE-001`
  - high-level finance hierarchy is understood
  - not signed off line by line
- `SRC-FREEDOM-TEAM-001`
- `SRC-FREEDOM-COMMUNITY-001`
- `SRC-FREEDOM-COMMUNITY-REV-001`
- `SRC-FREEDOM-ENGINE-001`
- `SRC-FREEDOM-BHAG-001`
  - current spreadsheet reality is now deeply captured for meaning
  - these are no longer just readable
  - they are also not yet clean rebuilt source-of-truth layers

### Readable Only

- `SRC-FUB-001`
- `SRC-SUPABASE-001`
- `SRC-GMAIL-001`
- `SRC-GCAL-001`
- `SRC-MISSIVE-001`

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
| `SRC-FREEDOM-TEAM-001` | Benson Crew - Freedom Sheet | `Data Entry - BCrew Team/Community` · Team records | `A:E` | Team/member records | Google Drive / Google Sheets | Partially Signed Off | 2026-04-18 |
| `SRC-FREEDOM-COMMUNITY-001` | Benson Crew - Freedom Sheet | `Data Entry - BCrew Team/Community` · Community tracker | `G:O` | Community tracker | Google Drive / Google Sheets | Partially Signed Off | 2026-04-18 |
| `SRC-FREEDOM-COMMUNITY-REV-001` | Benson Crew - Freedom Sheet | `Data Entry - BCrew Team/Community` · Community revenue | `P:U` | Community revenue | Google Drive / Google Sheets | Partially Signed Off | 2026-04-18 |
| `SRC-FREEDOM-ENGINE-001` | Benson Crew - Freedom Sheet | `Agent Engine` tab | Current assumptions block | Agent Engine live planning inputs | Google Drive / Google Sheets | Partially Signed Off | 2026-04-18 |
| `SRC-FREEDOM-BHAG-001` | Benson Crew - Freedom Sheet | `Benson Crew Bhag Builder` tab | Planning blocks plus calculator ranges | BHAG live planning inputs | Google Drive / Google Sheets | Partially Signed Off | 2026-04-18 |
| `SRC-OWNERS-001` | Benson Crew - Owners Dashboard | `ADMIN ONLY - Deal Data Entry` | Primary deal-ledger validation unit | Deal lifecycle, attribution, split credit, FUB linkage | Google Drive / Google Sheets | Signed Off | 2026-04-16 |
| `SRC-FUB-001` | Follow Up Boss | owner + Steve API contexts | CRM access in rebuild | CRM contacts, user roster, lead-source context, person linkage | Follow Up Boss API | Verified Readable | 2026-04-16 |
| `SRC-SUPABASE-001` | KPI Dashboard / Supabase | `kpi.bensoncrew.ca` + Supabase project | Existing KPI foundation system | KPI pipeline, shopping-list, executed-deal, goal, competition, and usage surfaces | Supabase + React app | Verified Readable | 2026-04-20 |
| `SRC-GMAIL-001` | Gmail | Delegated Google Workspace (`ai@bensoncrew.ca`) | Mailbox read layer | Decision capture inputs and communication context | Delegated Google Workspace | Verified Readable | 2026-04-23 |
| `SRC-GCAL-001` | Google Calendar | Delegated Google Workspace (`ai@bensoncrew.ca` primary calendar) | Calendar read layer | Meetings, scheduling, and governance cadence | Delegated Google Workspace | Verified Readable | 2026-04-23 |
| `SRC-MISSIVE-001` | Missive | Live shared inbox layer | Shared inbox and internal thread collaboration | Shared inbox comments, routing, and team-thread context | Missive API | Verified Readable | 2026-04-23 |
| `SRC-MEETINGS-001` | Google Meeting Notes / Transcripts | Delegated Google Workspace scans across enabled BCrew users + PostgreSQL shared archive | Meeting evidence read layer | Meeting transcripts, notes, action items, and raw decision evidence | Delegated Google Workspace | Verified Readable | 2026-04-23 |
| `SRC-FINANCE-001` | Benson Crew - Owners Dashboard | `(Input) Weekly Actuals` + `Cashflow Dash` | Finance validation unit | Internal finance truth and dashboard interpretation layer | Google Drive / Google Sheets | Partially Signed Off | 2026-04-20 |

## Pending Revalidation

| Source ID | Source | What It Owns | Owner | Current Status |
|-----------|--------|--------------|-------|----------------|
| `SRC-CLICKUP-001` | ClickUp | Task management, onboarding checklists, agent roster supplements | Carson | Pending Revalidation |
| `SRC-GDRIVE-001` | Google Drive | Docs, notes, brand guidelines, meeting artifacts | All | Pending Revalidation under the delegated Google Workspace path, which is the canonical Google standard in this rebuild. |
| `SRC-SLACK-001` | Slack | Team communication | All | Pending Revalidation |
| `SRC-DATAFORSEO-001` | DataForSEO | SEO rankings, keyword research | System | Pending Revalidation |
| `SRC-GHL-001` | GoHighLevel | Contacts, pipelines, automation | Steve | Pending Revalidation |
| `SRC-GADS-001` | Google Ads | MCC + sub-account performance | Steve | Pending Revalidation |

## Gaps

| Source ID | Source | What It Owns | Owner | Blocker |
|-----------|--------|--------------|-------|---------|
| `SRC-META-001` | Meta API | Social media metrics (IG, FB) | Steve | Meta developer account not set up |
| `SRC-PUBLISH-001` | Social publishing platform | Publishing calendar, post status, distribution | Tanner | No platform selected yet |
| `SRC-REAL-001` | Real Broker (reZEN/Bolt) | Agent roster, cap status, commissions, closed transactions, network size | Steve | Rebuild integration not complete |
| `SRC-EMAIL-TEAM-001` | Team-wide email | All `@bensoncrew.ca` inboxes beyond `ai@` | Steve | Delegation and connection scope not in place |
| `SRC-REVIEWS-001` | Client reviews | Google reviews, client surveys, qualitative feedback | Carson | No connection exists |
| `SRC-TRAINING-001` | Training completion tracker | Training completion, certification, progress | Tanner | Unknown live source |
| `SRC-CONTENT-001` | Content performance source | Published content metrics | Tanner | No publishing platform connected |
