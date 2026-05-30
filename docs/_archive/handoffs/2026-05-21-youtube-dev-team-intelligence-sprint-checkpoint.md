# YouTube To Dev Team Intelligence Sprint Checkpoint - 2026-05-21

## Context

Steve and Orchestrator clarified the next operating model after the GOD-mode extractor proof work.

Foundation owns source contracts, source access boundaries, extraction control, atoms/facts, synthesis, report artifacts, routing, and proof. The Dev Team / Build Intel lane is a consumer of Foundation source intelligence, not a separate source silo.

The goal is no longer broad continuous card running. The goal is one source, one hub/consumer, one director/report loop, and one promotion path at a time.

## Locked Architecture

Canonical flow:

`source contract -> connector/access boundary -> raw artifact -> extraction candidates -> atoms/facts/report artifacts -> synthesis -> review/action route -> hub/consumer`

For the first source:

`SRC-YOUTUBE-INTEL-001 -> transcript/description/screenshots/resource links -> observations -> atoms/candidates/scout report -> Dev Team build opportunities -> reviewed backlog/cards`

Foundation remains the truth/control layer. Dev Team Hub reads from Foundation and exposes only Build Intel/dev-team intelligence.

## First Long Sprint

Working name: `YouTube To Dev Team Intelligence V1`

Start:

- Source: Mark Kashef public YouTube only.
- Existing proof: `WEB-GODMODE-LIVE-OPERATOR-002` opened one exact Mark video, captured page/description/link/screenshot metadata, and persisted transcript/proof report artifacts.
- Existing gap: that proof was sensor/provenance work, not a full intelligence product.

End:

- A simple Dev Team Hub/read surface exists.
- YouTube source is connected end to end for Mark Kashef public YouTube.
- The hub shows source status, extraction runs, reports, atoms/candidates, ranked build opportunities, and approval-required links.
- A Dev Team Intelligence Director report/view exists as generated report output, not as a free-roaming agent.
- At least one source-backed build opportunity can be promoted into backlog/review with evidence attached.

## Sprint Slices

1. Define Dev Team Hub V0
   - Read-only surface for Build Intel sources, reports, opportunities, and review queue.
   - No writes except explicit proposal/review actions.

2. Connect YouTube Source V1
   - Mark Kashef public channel.
   - Latest/last-20 bounded queue.
   - Transcript, description, resource links, screenshot/visual notes where allowed.
   - Do not follow Skool, Gumroad, Calendly, paid/private, booking, opt-in, or download links without approval.

3. Convert Raw Capture To Intel
   - Build observations.
   - Build atoms/candidates.
   - Build scout report.
   - Rank build opportunities.
   - Answer: what should AIOS build/change because of this source?

4. Add Dev Team Intelligence Director Output
   - Report answers what was learned, why it matters, evidence/source links, build opportunity score, suggested card, approval blockers, duplicate/stale checks, and next action.

5. Add Promotion Gate
   - Human review before backlog/card creation.
   - Approved item becomes a backlog card or attaches to an existing card.
   - Rejected/duplicate/stale items are logged instead of lost.

## Not This Sprint

- No Skool/MyICOR/private auth.
- No marketing production.
- No broad source connection.
- No full hub redesign.
- No auto-created backlog cards without review.
- No separate Dev Team data silo.

## Definition Of Done

Steve can open the Dev Team Hub, see Mark YouTube intelligence, review ranked build opportunities, and approve one source-backed build opportunity into the dev backlog.

## Tomorrow Restart

Resume around 10:00 AM on May 22, 2026.

First action on restart:

1. Verify repo/system green state.
2. Check Current Sprint/backlog truth.
3. Decide whether to promote this checkpoint into a formal backlog card/sprint plan.
4. Start the first implementation slice only after the card/scope is explicit.
