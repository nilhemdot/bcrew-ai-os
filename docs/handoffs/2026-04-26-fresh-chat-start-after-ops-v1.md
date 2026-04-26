# 2026-04-26 Fresh Chat Start After Ops Hub v1

Created: 2026-04-26 00:45 EDT

Purpose: close the heavy chat with enough durable context that a fresh chat can restart cleanly tomorrow without losing decisions, backlog changes, or the next build sequence.

This is a high-fidelity checkpoint, not a raw transcript export.

## Startup For Next Chat

Use this prompt in the new chat:

```text
We are in /Users/bensoncrew/bcrew-ai-os. Read AGENTS.md, SOUL.md, USER.md, MEMORY.md, memory/2026-04-26.md, memory/2026-04-25.md, and docs/handoffs/2026-04-26-fresh-chat-start-after-ops-v1.md.

Continue from latest main. Do not overwrite uncommitted work. Do not mutate ClickUp fields unless Steve explicitly asks. First check repo status, Ops Hub health, queue counts, and whether Carson/Clare/Georgia replied to the Ops Hub v1 email. Then help Steve decide whether to handle Ops feedback or resume Current State after the Owners Admin package.
```

## Where Memory Lives Right Now

- Local session memory: `memory/YYYY-MM-DD.md`
- Local long-term assistant memory: `MEMORY.md`
- Durable repo handoffs: `docs/handoffs/`
- Durable backlog truth: Postgres `backlog_items`
- Bootstrap/default backlog seed: `lib/foundation-db.js`

Important distinction: `memory/`, `MEMORY.md`, `USER.md`, and other personal workspace files are local-only by policy. Durable system decisions that future repo agents need should be promoted into tracked docs, source contracts, or the DB-backed backlog.

## Current System State

- Repo: `main`
- Latest committed handoff before this one: `3e96b17 Add Ops Hub v1 closeout handoff`
- Public AIOS URL: `https://bcrewaios.ngrok.app`
- Ops Hub: `https://bcrewaios.ngrok.app/ops`
- Login: Google login for verified `@bensoncrew.ca` users.
- Access v1:
  - Steve / owner: all hubs.
  - Carson, Clare, Georgia / Ops: Ops Hub only.
- Local dashboard is serving `/ops` with `ops.js?v=20260425z`.

Current Ops queue snapshot:

- Total open Ops items: `19`
- Admin deal review: `3`
- Conditional forecast: `7`
- FUB drift: `0`
- Owners list drift: `0`
- Agent onboarding / roster: `9`

Running Ops systems:

- `admin-deal-review-readonly` — Admin Deal Review Inspection
- `admin-deal-backlog-review` — Admin Deal Backlog Inspection
- `conditional-deal-review-readonly` — Conditional Deal Forecast Sync
- `agent-roster-review` — Agent Onboarding / Roster Inspection

## Email Sent

Sent on 2026-04-26 through Gmail:

- To: Carson Campbell, Clare Manalo, Georgia Huntley
- CC: Steve Zahnd
- Subject: `AIOS Ops Hub v1 is live`
- Gmail message ID: `19dc8106a80dd671`

The email told the team:

- Ops Hub v1 is live at `https://bcrewaios.ngrok.app/ops`.
- They should log in with their Benson Crew Google account.
- It is v1 and Steve wants feedback/questions.
- They can work on inspected deal review cards and then trigger re-review.
- They should not delete, hide, or reorganize ClickUp fields yet.
- The AIOS Help button can tell them the exact fields to update.
- The helper is for explanation only; it does not change source data.

## What Shipped In This Chat

### Ops Hub v1

- Ops Hub became a real operator surface, not a Foundation-internal page.
- Overview copy was simplified for normal Ops users.
- Running Systems moved the technical detail out of the overview.
- Inbox cards were made readable with sectioned findings and score chips.
- Filters were rebuilt around actual work lanes:
  - Deal Data
  - Conditional
  - Deal Workflow
  - Internal Review
  - Client NPS
  - Google Review
  - Agent Onboarding
  - CRM/FUB
  - FUB source rules
  - Owners lists
- Filtered cards now hide non-matching findings inside the card.
- Source row links open the exact Google Sheet row in a new tab.

### Admin Deal Review v1

Admin review is one full review, not multiple separate review systems.

It checks:

- Owners deal row data.
- Split-deal structure.
- Gross/cash anchor rules.
- Required split-row fields through column `T`.
- Required credited-row reporting/calculation fields from `AG+`.
- Governed source lineage and company/agent expectation.
- FUB join/source/stage/ISA/tag evidence.
- ClickUp Deal Data Entry follow-through.
- Internal Agent Onboarding.
- Internal Agent Deal.
- Client NPS.
- Google Review.

Rules locked:

- `Pending` in Owners means firm.
- FUB `Firm Deal` is valid until expected closing has passed.
- Do not flag a firm/pending deal for closed/past-client cleanup before expected close.
- After expected close, post-close cleanup can be flagged.
- Past-client tag can be a future finding/apply target, but v1 does not auto-write FUB tags.
- Manual re-review is triggered by `Review This Deal`.
- Because Steve saw CC dropdown confusion, `Needs Re-review` / `Need Re Review` in CC is also accepted.
- Backlog inspection runs 5 mature Admin deals/day, newest to older.
- Backlog cutoff: `2025-06-01`.
- Maturity gate: 10 days after `Date Firm (Executed)`.
- Writeback only updates AI status/action/findings. It does not auto-fix source fields.

The old Freedom follow-through path is not live truth after the Apr 1 bonus/process shift. Post-2026-04-01 follow-through checks ClickUp Deal Data Entry.

### Conditional Forecast v1

- The legacy manual conditional sheet is no longer the v1 source of truth.
- `Listings and Conditional Deals` is rebuilt from ClickUp Deal Data Entry conditional tasks.
- Buyer/seller conditional tags determine the lane.
- Mutual-release tags are excluded as dead deals.
- The generated sheet is a lean forecast/missing-data view.
- Column `N` is preserved as `THIS ROW ONLY: CONDITIONAL REVIEW ACTION`.
- `Review This Conditional` triggers a re-check.
- Column `O` holds generated conditional findings.

### Agent Onboarding / Roster v1

- ClickUp Operations Agent Roster is the v1 people/accountability source.
- Exact list Steve cares about: `https://app.clickup.com/9011334502/v/l/6-901113292355-1`
- Recruiting/onboarding pipeline list remains useful for pipeline visibility, but not the primary roster source.
- `Real Start Date` is the trigger for day 30/60/90 onboarding feedback.
- Historical starts older than the catch-up window should be skipped unless Steve asks for catch-up.
- Test path worked:
  - Steve received a day-30 onboarding feedback email.
  - Steve submitted the form.
  - AIOS stored the response.
  - ClickUp roster fields were written back.
- Email template was corrected to use real MIME HTML through the delegated Gmail sender.

### AIOS Help v1

- Added a floating Help widget in Ops Hub.
- It is read-only and rule-based/source-backed, not LLM-powered.
- It can answer:
  - how to clear a deal card
  - when to use skipped
  - exact fields for NPS
  - exact fields for Google Review
  - exact fields for Internal Review
  - exact fields for Conditional
  - exact fields for FUB/CRM
  - exact fields for split deals
  - exact fields for deal data
  - which current cards need a given lane cleaned up
- It should be improved from real Ops questions before upgrading to LLM.

### Public Login / URL

- AIOS is available at Steve's paid ngrok reserved domain: `https://bcrewaios.ngrok.app`.
- Google Identity Services web login is active.
- The old password login is hidden fallback only.
- Google OAuth origin for the web client was configured by Steve.
- The pasted client secret is not needed for the frontend ID-token login flow and should not be reused casually. Rotate/delete later if needed.

## Current State / Owners Admin Package Decision

Owners Admin package is closed for v1.

Reason: Foundation's job is not to manually clean every historical row before closing the source package. The v1 standard is:

- source connected
- source understood
- source extractable
- source synthesized into actionable checks
- findings routed into Ops
- writeback boundaries clear

That standard is met for Owners Admin v1.

Historical cleanup remains operational work surfaced by Ops, not a blocker to closing the Foundation package.

## Backlog Changes Made During Closeout

De-escalated from active Foundation blockers:

- `DATA-007` — Backfill invalid lead-source rows in Owners Dashboard deal ledger
  - Now `parked`, `P2`, rank `80`
  - Treat as Ops findings unless Steve approves bulk cleanup/apply automation.

- `DATA-008` — Backfill missing FUB links in Column BZ
  - Now `parked`, `P2`, rank `81`
  - Missing FUB links are caught by Admin inspection.

- `DATA-009` — Resolve suspicious duplicate full-credit deal rows
  - Now `parked`, `P2`, rank `82`
  - V1 split/gross-anchor/credit checks cover enough for source-package closeout.

Enriched:

- `OPS-004` — Collapse duplicated ops bonus rules into one governed model and retire dead legacy paths
  - Now explicitly covers Q2 2026 Ops bonus / client-experience model:
    - eligible-client denominator
    - NPS requested/completed/captured rules
    - Google Review target/captured counts
    - internal onboarding/deal review handling
    - sub-9 feedback handling
    - FUB evidence requirements
    - finance/payout evidence connection later

Created:

- `OPS-005` — Capture and improve Ops helper questions from v1 users
- `OPS-006` — Build approval-gated Ops apply lane for source-field fixes
- `OPS-007` — Run ClickUp field cleanup walkthrough after Ops Hub v1 launch
- `PEOPLE-006` — Harden Agent Roster 30/60/90 onboarding feedback automation
- `SOURCE-022` — Revalidate Google Business Profile reviews as a client-experience source

Backlog drift note:

- Live Postgres backlog is operational truth.
- `backlogSeed` is bootstrap/default doctrine.
- After the DB updates, `npm run backlog:seed-drift -- --limit=20` reported expected drift against seed rows.
- Do not treat that as a product break. It means the live DB has been updated beyond the seed fixture.
- Future cleanup: decide whether to regenerate seed from live DB again or move these changes through explicit migrations.

## Durable Decisions Not To Lose

- Do not rebuild the old system one-for-one. Salvage the best ideas, patterns, and data, but avoid recreating the old franken-system.
- ClickUp is a source to validate, not a place to blindly duplicate every spreadsheet field.
- ClickUp Deal Data Entry is workflow/task truth.
- Owners Dashboard remains deal ledger truth for now.
- FUB remains CRM/person/source/stage/contact truth.
- Trade Number / Deal Number is the main join between Owners and ClickUp.
- AIOS can eventually backfill links/derived values, but the Ops team must maintain required workflow fields for v1.
- Field cleanup should happen with Carson/Clare in a walkthrough. Do not blindly delete shared ClickUp custom fields.
- Source-field fixes stay human-owned until the approval-gated apply lane exists.
- The team should use Ops Hub and AIOS Help, then their questions should become improvements.
- Agent Engine attrition rule: non-producing agents who leave should not count against production-roster attrition.
- Memory/retrieval/creator-intelligence remains a Foundation spine, but do not spin into YouTube/Skool extraction until the current Foundation closeout lane is sequenced.

## Things Discussed But Not Built Tonight

- Full LLM-powered Ops assistant.
- Approval-gated source-field apply lane.
- Google Business Profile review ingestion.
- Recurring governed day-30/60/90 agent feedback sender.
- Full bonus calculation engine.
- Full ClickUp field cleanup.
- Full memory/retrieval rebuild.
- YouTube/Skool/Zoom multimodal extraction team.
- Full old-system line-by-line audit.

These are captured or already exist in backlog/source-contract work. They should not interrupt tomorrow unless Steve chooses one deliberately.

## What Not To Do Tomorrow

- Do not reopen the Owners Admin package just because historical row cleanup remains.
- Do not auto-fix Owners/FUB/ClickUp fields.
- Do not delete or hide ClickUp fields without Steve's explicit direction.
- Do not create new ClickUp lists/views unless Steve explicitly asks.
- Do not treat Freedom Sheet follow-through as current post-April-1 truth.
- Do not claim the helper is an LLM or that it changes data.
- Do not run a huge old-system audit unless Steve explicitly chooses that over continuing Current State.

## Suggested Tomorrow Plan

1. Check Gmail for replies from Carson, Clare, or Georgia.
2. Check Ops Hub health:
   - `https://bcrewaios.ngrok.app/ops`
   - queue counts
   - Google login
   - Help widget answers
3. If there are team questions, capture them under `OPS-005` and tighten helper/email copy.
4. If no urgent Ops feedback, resume Steve's Current State review at the next package after Owners Admin.
5. Keep closing Current State packages with the closeout discipline:
   - what belongs here
   - what moves elsewhere
   - what doctrine/schema/policy was exposed
   - what backlog cards need creation/enrichment
   - what handoff should be saved
6. Leave bulk memory/retrieval/YouTube/Skool extraction work in backlog unless Steve explicitly switches tracks.

## Quick Health Commands

```bash
git status --short
npm run foundation:verify
curl -s http://localhost:3000/api/owners/review-queue | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const q=JSON.parse(s).reviewQueue; console.log(JSON.stringify({total:q.stats.openItems, sections:Object.fromEntries(Object.entries(q.sections).map(([k,v])=>[k,{open:v.openItems, needs:v.needsFixing, queued:v.queuedReview||0}]))}, null, 2));})"
npm run backlog:seed-drift -- --limit=20
```

## Final Read

The system is not "done forever." But Ops Hub v1 is real enough for Carson, Clare, and Georgia to start using. Owners Admin is closed for v1 because the source package is connected, understood, inspected, and routed. The next risk is not missing one more UI tweak; it is letting new questions, ClickUp clutter, and helper confusion drift without being captured. Tomorrow should either process real Ops feedback or continue Current State package closeout from the next section.
