# Connector Completion Prep Matrix

Date: 2026-05-16
Card: `CONNECTOR-COMPLETION-SPRINT`
Closeout key: `connector-completion-prep-v1`

This is no-auth prep. It does not mutate credentials, OAuth scopes, source systems, provider accounts, paid communities, or extraction jobs. There is no credential or provider mutation in this sprint.

## Summary

- Source contracts currently loaded: 36
- Source connectors currently loaded: 13
- Foundation job definitions currently loaded: 38
- Credential registry rows currently loaded: 27
- Current connector uptime rollup: healthy, 6/6 tracked connector groups healthy
- Current system health rollup: healthy, 0 risk rows, 0 watch rows

## Classifications

| Lane | Meaning |
| --- | --- |
| `ready_no_auth` | Can be planned or built without Steve logging in, reauthorizing, or changing external source state. |
| `auth_required` | Needs Steve auth, provider credentials, paid-community permission, or owner decision before any live access. |
| `manual_decision` | Needs a business/source boundary decision before build. |
| `already_scheduled` | Already has a scheduled Foundation job or current extraction lane. |
| `deferred` | Explicitly not next. |
| `duplicate/stale` | Do not create new card; merge into the named existing card. |

## Ready No-Auth Work

| Gap | Source IDs | Current evidence | Route |
| --- | --- | --- | --- |
| Google Workspace sub-source contract IDs are referenced by the credential registry but not represented as source contracts. | `SRC-GDOCS-001`, `SRC-GSLIDES-001`, `SRC-GSHEETS-001` | Delegated Google Workspace credential rows are available; missing source IDs are metadata/schema gaps, not auth outages. | `SOURCE-CONTRACT-ID-RECONCILE-001` |
| Google Calendar is readable but not scheduled as an atom-producing source. | `SRC-GCAL-001` | `google-delegated-calendar` is available and carries a non-blocking readiness note. | `GCAL-ATOM-SCHEDULE-001` |

## Auth Required Or Explicitly Parked

| Gap | Source IDs | Current blocker | Route |
| --- | --- | --- | --- |
| Build Intel paid/community/video extraction. | `SRC-SKOOL-001`, `SRC-MYICRO-001`, `SRC-LOOM-001`, `SRC-ZOOM-001`, `SRC-YOUTUBE-INTEL-001` | Skool/myICOR paid access and browser sessions need Steve approval; Apify token/allowed operation still needs proof. | `BUILD-INTEL-EXTRACTION-IMPLEMENTATION` |
| Marketing measurement source contracts and credentials. | `SRC-GA4-001`, `SRC-GSC-001`, `SRC-GBP-001`, `SRC-GADS-001`, `SRC-META-001`, `SRC-PUBLISH-001` | GA4/GSC/GBP source contracts are missing; Google Ads re-auth is required; Meta/SocialPilot need owner/source-boundary proof. | `SOURCE-016`, `SOURCE-011`, `SOURCE-022` |
| External public/community intelligence. | `SRC-WEB-001`, `SRC-REDDIT-001`, `SRC-GITHUB-001`, `SRC-TWITTER-001` | Generic web/source contracts are triage-only until compliant access and content-use boundaries are approved. | `WEB-CRAWLER-001`, `BUILD-INTEL-EXTRACTION-IMPLEMENTATION` |
| Team messaging inbound. | `SRC-TELEGRAM-IN-001`, `SRC-WHATSAPP-001` | Inbound messaging is not approved in this sprint; Telegram bots are explicitly not next. | `TELEGRAM-BOTS-001` |
| Real Broker / reZEN. | `SRC-REAL-001` | Never connected in the new system; needs auth/session/API decision. | source-auth decision required before build |
| GoHighLevel. | `SRC-GHL-001` | Readable connector path exists but source role and broad extraction boundary are not signed off. | `SOURCE-009` |

## Already Scheduled Or Active

These source groups already have current-day/archive/extraction/routing jobs or health checks. Do not create duplicate connector-completion cards for them in this sprint.

- `SRC-GMAIL-001`
- `SRC-MISSIVE-001`
- `SRC-MEETINGS-001`
- `SRC-SLACK-001`
- `SRC-GDRIVE-001`
- `SRC-CLICKUP-001`
- `SRC-FUB-001`
- `SRC-SUPABASE-001`
- `SRC-FINANCE-001`
- `SRC-OWNERS-001`

## Manual Decision / Source Boundary

These source contracts exist but are not scheduled as extraction jobs because the correct product boundary is not "start extracting now."

- Freedom Sheet slices: `SRC-FREEDOM-TEAM-001`, `SRC-FREEDOM-COMMUNITY-001`, `SRC-FREEDOM-COMMUNITY-REV-001`, `SRC-FREEDOM-ENGINE-001`, `SRC-FREEDOM-BHAG-001`
- Owners Lists mirror: `SRC-OWNERS-LISTS-001`
- Strategy Quarter context: `SRC-STRATEGY-QUARTER-001`
- Creator watchlist: `SRC-CREATOR-WATCHLIST-001`
- Gap sources: `SRC-EMAIL-TEAM-001`, `SRC-REVIEWS-001`, `SRC-TRAINING-001`, `SRC-CONTENT-001`

## Backlog Routing

- Created/enriched `SOURCE-CONTRACT-ID-RECONCILE-001` for the immediate no-auth source-contract ID reconcile work.
- Created/enriched `GCAL-ATOM-SCHEDULE-001` for the Google Calendar atom-producing schedule decision/build.
- Enriched `BUILD-INTEL-EXTRACTION-IMPLEMENTATION` with the auth-required Build Intel source list so paid/community/video extraction does not drift into this sprint.
- Enriched `SOURCE-016` and `SOURCE-011` with the marketing measurement source/auth blockers.

## Not Next

- No Skool, MyICOR, paid community, Telegram, WhatsApp, Real Broker, Google Ads re-auth, provider spend, broad web scraping, or external writes in this sprint.
- No credential or provider mutation.
- No auto-starting broad extraction.
