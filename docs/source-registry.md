# Source Registry

Every business data input the system reads. If it's not on this list, the system doesn't know about it. If the source is wrong, the intelligence is wrong.

This registry distinguishes between sources verified in the current rebuild and sources inherited from the old system that still need revalidation on the Mac Mini.

## Source Contract

1. Every source gets a stable `Source ID`.
2. Strategy docs, agents, and code should reference the `Source ID`, not hardcode a sheet tab, range, or file path.
3. If a source moves or is brought into the system later, the `Source ID` stays the same and only the registry entry changes.
4. A source can be `Verified`, `Verified Readable`, `Pending Revalidation`, or `Gap`.
5. `Verified Readable` means we confirmed we can read the source in the rebuild, but we have not yet wired it into app logic or automation.
6. Source-backed views should expose the `Source ID` and a clear path back to the real source so users and agents are never lost.

---

## Verified in Current Rebuild

| Source ID | Source | Current Location | Scope | What It Owns | Access Method | Status | Last Verified |
|-----------|--------|------------------|-------|--------------|---------------|--------|---------------|
| `SRC-STRATEGY-001` | Business Strategy Docs | `docs/*.md` in this repo | Canonical strategy packet | Vision, north star, engine, priorities, mandates, assumptions | Git + local filesystem | Verified | 2026-04-12 |
| `SRC-FREEDOM-TEAM-001` | Freedom KPI Sheet | `Data Entry - BCrew Team/Community` | `A:E` | Team/member records: agent name, team origin/recruited by, status, start date, end date | Google Drive / Google Sheets | Verified Readable | 2026-04-12 |
| `SRC-FREEDOM-COMMUNITY-001` | Freedom KPI Sheet | `Data Entry - BCrew Team/Community` | `G:O` | Community tracker: month, year, total income, total community, downline counts by leader | Google Drive / Google Sheets | Verified Readable | 2026-04-12 |
| `SRC-FREEDOM-COMMUNITY-REV-001` | Freedom KPI Sheet | `Data Entry - BCrew Team/Community` | `P:U` | Community revenue by leader plus `Bcrew In Before HST` | Google Drive / Google Sheets | Verified Readable | 2026-04-12 |
| `SRC-FREEDOM-ENGINE-001` | Freedom KPI Sheet | `Agent Engine` tab | Current assumptions block | Required monthly attraction, active agents, current 6-month production average, target production, average split, target split | Google Drive / Google Sheets | Verified Readable | 2026-04-12 |
| `SRC-FREEDOM-BHAG-001` | Freedom KPI Sheet | `Benson Crew Bhag Builder` tab | Long-range planning blocks plus calculator ranges | Sales targets, growth curve, community targets, deal math, high-level goal model in `A1:C31`, and agent productivity calculator plus planning attrition assumption in `A22:B31` | Google Drive / Google Sheets | Verified Readable | 2026-04-13 |
| `SRC-OWNERS-001` | Owners Dashboard | `ADMIN ONLY - Deal Data Entry` plus roll-up sheets | Executed-date volume truth | `Date Firm (Executed)`, `Volume Credit`, and deal production truth used for YTD pace and closed-volume validation | Google Drive / Google Sheets | Verified Readable | 2026-04-13 |
| `SRC-FINANCE-001` | Owners Dashboard Finance Layer | `(Input) Weekly Actuals` with `Cashflow Dash` interpretation | Weekly cash truth plus management P&L adjustments | Internal finance truth: weekly revenue, expenses, bank balances, LOC balances, credit-card movement, HST, and the partner-commission adjustment needed to show real company revenue and owners expense cleanly | Google Drive / Google Sheets | Verified Readable | 2026-04-14 |

## Known Sources from Old System, Pending Revalidation

| Source ID | Source | What It Owns | Owner | Current Status |
|-----------|--------|--------------|-------|----------------|
| `SRC-CLICKUP-001` | ClickUp | Task management, onboarding checklists, agent roster supplements | Carson | Pending Revalidation. Connected in old system; needs Mac Mini verification. |
| `SRC-GMAIL-001` | Gmail | Team email, decision capture inputs, communication context | System | Pending Revalidation. `ai@` connection existed in old system; rebuild-specific validation still needed. |
| `SRC-GCAL-001` | Google Calendar | Meetings, scheduling, cadence events | All | Pending Revalidation. Connected in old system; needs Mac Mini verification. |
| `SRC-GDRIVE-001` | Google Drive | Docs, notes, brand guidelines, meeting artifacts | All | Pending Revalidation. Connector works in this session, but full rebuild wiring is not yet validated. |
| `SRC-SLACK-001` | Slack | Team communication | All | Pending Revalidation. Connected in old system; needs Mac Mini verification. |
| `SRC-MISSIVE-001` | Missive | Shared inbox, client routing | Ops | Pending Revalidation. Connected in old system; needs Mac Mini verification. |
| `SRC-DATAFORSEO-001` | DataForSEO | SEO rankings, keyword research | System | Pending Revalidation. Connected in old system; not yet revalidated here. |
| `SRC-FUB-001` | Follow Up Boss | CRM, leads, deals | Steve | Pending Revalidation. API keys existed in old system. |
| `SRC-GHL-001` | GoHighLevel | Contacts, pipelines, automation | Steve | Pending Revalidation. v1 Location API was live in old system. |
| `SRC-SUPABASE-001` | Supabase | KPI dashboard (`kpi.bensoncrew.ca`) | System | Pending Revalidation. Connected in old system. |
| `SRC-GADS-001` | Google Ads | MCC + sub-account performance | Steve | Pending Revalidation. Connected in old system. |

## Not Connected (Gaps)

| Source ID | Source | What It Owns | Owner | Blocker |
|-----------|--------|--------------|-------|---------|
| `SRC-META-001` | Meta API | Social media metrics (IG, FB) | Steve | Meta developer account not set up |
| `SRC-PUBLISH-001` | Social publishing platform | Publishing calendar, post status, distribution | Tanner | No platform selected yet |
| `SRC-REAL-001` | Real Broker (reZEN/Bolt) | Agent roster, cap status, commissions, closed transactions, network size | Steve | API key exists but rebuild integration is not complete |
| `SRC-EMAIL-TEAM-001` | Team-wide email | All `@bensoncrew.ca` inboxes beyond `ai@` | Steve | Delegation and connection scope not in place |
| `SRC-REVIEWS-001` | Client reviews | Google reviews, client surveys, qualitative feedback | Carson | No connection exists |
| `SRC-TRAINING-001` | Training completion tracker | Training completion, certification, progress | Tanner | Unknown live source |
| `SRC-CONTENT-001` | Content performance source | Published content metrics | Tanner | No publishing platform connected |
## Current Freedom Sheet Notes

- Sheet title: `📊 Benson Crew - Freedom Sheet`
- Sheet ID: `1fyPB-g_B08okE01G3L0tzUTaJiuivrSBo1RqMYHt2Dw`
- Community tracker tab: `Data Entry - BCrew Team/Community`
- Team/member data lives in `A:E`
- Community/downline data lives in `G:O`
- Community revenue data lives in `P:U`
- Long-range planning lives in `Benson Crew Bhag Builder`
- Current engine assumptions block lives in `Agent Engine`

## Current Owners Dashboard Finance Notes

- `(Input) Weekly Actuals` is the internal finance source of truth. It holds the week-by-week business view, including revenue, expenses, bank balances, LOC balances, credit-card movement, and HST.
- `Cashflow Dash` is the management interpretation layer, not the origin. It uses roll-up sheets to show the internal P&L in a form leadership can actually read.
- Partner commissions are intentionally backed out of top-line revenue and owners expense in `Cashflow Dash` because those commissions are cash moving through the business, but not real company operating revenue or company operating expense.
- In the current workbook, that partner-commission adjustment is handled at the dashboard layer. Monthly and annual roll-ups should be treated carefully until the normalization path is reviewed end to end.
- QuickBooks is the compliance and tax ledger. The Owners Dashboard is the internal operating truth.
- Detailed workbook notes live in [source-notes/owners-dashboard.md](source-notes/owners-dashboard.md).
