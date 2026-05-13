# CREATOR-WATCHLIST-001 Plan

## What

Create normalized Build Intel creator/source watchlist truth for the people and communities Steve approved, with a separate later marketing-content source category.

## Why

The builder list currently lives in chat, old-system memory, and partial source notes. If that list is not a durable source-owned registry, the next YouTube/Skool/myICOR extraction sprint will either miss sources or rebuild the list by hand. This card makes the "who should AIOS learn from" layer deterministic before extraction.

## Acceptance Criteria

- A reusable watchlist module exposes normalized entries for Steve's Build Intel creator list.
- Entries include stable ID, display name, source category, priority, access boundary, platforms, cadence, consumer lane, why Steve cares, and active flag.
- Build Intel sources stay separate from later marketing-content sources.
- Paid/auth sources are labeled with access/content-use requirements and are not extracted in this card.
- `SRC-CREATOR-WATCHLIST-001` source-registry/current-state context points to the normalized watchlist instead of old chat memory.
- Plan Critic has a pass row with score at least 9.8 before build.

## Definition Of Done

- The watchlist can be read through an exported function and an admin-gated API-style snapshot.
- Focused proof validates entry counts, required fields, category separation, no extraction side effects, and named priority sources.
- The backlog card closes only after the focused proof, backlog hygiene, and Foundation verifier pass.

## Details

Existing code to reuse: source contracts, Foundation snapshot/read helpers, server admin API patterns, Current Sprint helpers, and source lifecycle/source registry structures. Existing docs to reuse: `docs/handoffs/2026-05-13-build-intel-direction-capture.md`, `docs/source-registry.md`, `docs/rebuild/current-state.md`, and `docs/rebuild/current-plan.md`. Existing data to reuse: live backlog cards `CREATOR-WATCHLIST-001`, `YOUTUBE-SCOUT-001`, `MULTIMODAL-EXTRACTOR-001`, `MYICRO-TRAINING-001`, and the source ID `SRC-CREATOR-WATCHLIST-001`.

The root invariant is: creator watchlist readiness means a structured registry with source categories and access boundaries, not a markdown list. The black-box behavior proof should call the actual watchlist function path, inspect returned rows through an API-style snapshot, verify Steve's priority Build Intel names are present, verify marketing-content-later entries are not mixed into Build Intel extraction scope, verify a synthetic weak entry is rejected, and verify no crawl/extraction job starts. No substring-only proof is acceptable and substring-only proof is rejected.

Gate decision: focused proof for the watchlist contract plus full Foundation verify because this card updates source/backlog truth. Blast radius is registry metadata; no external systems are called.

Repair path: if proof fails, keep the card in Scoping/Returned, leave `SRC-CREATOR-WATCHLIST-001` at pending revalidation, and do not allow `YOUTUBE-SCOUT-001` to consume the registry. If a source is misclassified, repair the registry row and rerun the focused proof before closing.

Operator value: Steve gets one durable "who should AIOS learn from" registry instead of repeating the creator list in chat. The next extraction sprint can pull from known Build Intel rows with explicit access boundaries.

Speed bound: the focused proof targets under 2 minutes and uses local function/API-style snapshots only.

## Risks

- Channel URLs/IDs may be unknown for some creators. Mitigation: v1 records platform names and known URLs where available, with `lookup_required` status rather than fake IDs.
- Marketing sources may get mixed with Build Intel. Mitigation: separate `sourceCategory` and `consumerLane` fields and proof for the split.
- Registry can become stale. Mitigation: cadence and active flag are required fields; extraction implementation sprint owns refresh/discovery later.

## Tests

- `npm run process:build-intel-intake-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Not Next

- Do not pull transcripts, screenshots, comments, or social posts.
- Do not log into Skool, myICOR, Loom, or browser sessions.
- Do not create Build Scoper outputs or backlog proposals.
- Do not use this card for marketing content production.
