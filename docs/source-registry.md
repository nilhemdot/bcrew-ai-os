# Source Registry

Every business data input the system reads. If it's not on this list, the system doesn't know about it. If the source is wrong, the intelligence is wrong.

---

## Connected

| Source | What | Owner | Access Method | Status |
|--------|------|-------|--------------|--------|
| Freedom KPI Sheet | Agent Engine scoreboard, BHAG model, goals | Steve | Google Sheets API | Connected |
| Owners Dashboard | Deal data, source of truth for production | Steve + Carson | Google Sheets API | Connected |
| ClickUp | Task management, onboarding checklists | Carson | MCP (50+ tools) | Connected |
| Gmail | Team email (ai@bensoncrew.ca) | System | Google Workspace MCP | Partial (ai@ only) |
| Google Calendar | Meetings, scheduling | All | Google Workspace MCP | Connected |
| Google Drive | Docs, meeting notes, brand guidelines | All | Google Workspace MCP | Connected |
| Slack | Team communication | All | MCP | Connected |
| Missive | Shared inbox, client routing | Ops | REST API | Connected |
| DataForSEO | SEO rankings, keyword research | System | MCP | Connected |
| Business Strategy Docs | Vision, priorities, mandates | Steve | Git (this repo) | Connected |

## Partial / Needs Validation

| Source | What | Owner | Issue |
|--------|------|-------|-------|
| Follow Up Boss (FUB) | CRM, leads, deals | Steve | API keys exist, connection needs revalidation on Mac Mini |
| GoHighLevel (GHL) | 91K contacts, 4 pipelines | Steve | v1 Location API was live, needs revalidation |
| Supabase | KPI dashboard (kpi.bensoncrew.ca) | System | Connected in old system, needs revalidation |
| Google Ads | MCC + 3 sub-accounts | Steve | Connected in old system, needs revalidation |

## Not Connected (Gaps)

| Source | What | Owner | Blocker |
|--------|------|-------|---------|
| Meta API | Social media metrics (IG, FB) | Steve | Steve needs to create Meta developer account |
| Social publishing | Buffer / SocialPilot / Zernio | Tanner | No platform selected yet |
| Real Broker (reZEN/Bolt) | Agent roster, cap status, commissions | Steve | API key obtained, docs were down |
| Team-wide email | All @bensoncrew.ca inboxes | Steve | Currently only ai@ connected, needs delegation |
| Client reviews | Google reviews, client surveys | Carson | No connection exists |
| Training completion | Skool / internal tracker | Tanner | Unknown location |
| Content performance | Published content metrics | Tanner | No publishing platform connected |
| Financial data | Revenue, expenses, payouts | Ahsan | Accounting system not connected |
