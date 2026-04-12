# Source Registry

Every business data input the system reads. If it's not on this list, the system doesn't know about it. If the source is wrong, the intelligence is wrong.

This registry distinguishes between sources verified in the current rebuild and sources inherited from the old system that still need revalidation on the Mac Mini.

---

## Verified in Current Rebuild

| Source | What | Owner | Access Method | Status |
|--------|------|-------|--------------|--------|
| Business Strategy Docs | Vision, priorities, mandates | Steve | Git (this repo) | Verified |

## Known Sources from Old System, Pending Revalidation

| Source | What | Owner | Issue |
|--------|------|-------|-------|
| Freedom KPI Sheet | Agent Engine scoreboard, BHAG model, goals | Steve | Used in old system and referenced by strategy docs. Needs current Mac Mini validation. |
| Owners Dashboard | Deal data, source of truth for production | Steve + Carson | Used in old system. Needs current Mac Mini validation. |
| ClickUp | Task management, onboarding checklists | Carson | Connected in old system. Needs current Mac Mini validation. |
| Gmail | Team email (ai@bensoncrew.ca) | System | ai@ connection existed. Needs rebuild-specific validation and broader mailbox scope decisions. |
| Google Calendar | Meetings, scheduling | All | Connected in old system. Needs current Mac Mini validation. |
| Google Drive | Docs, meeting notes, brand guidelines | All | Connected in old system. Needs current Mac Mini validation. |
| Slack | Team communication | All | Connected in old system. Needs current Mac Mini validation. |
| Missive | Shared inbox, client routing | Ops | Connected in old system. Needs current Mac Mini validation. |
| DataForSEO | SEO rankings, keyword research | System | Connected in old system. Needs current Mac Mini validation. |
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
