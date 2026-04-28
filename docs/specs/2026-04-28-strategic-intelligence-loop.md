# Strategic Intelligence Loop Spec

Status: design-reference
Promoted to: `STRATEGIC-INTEL-001`, `INTEL-SCOPER-001`, `docs/rebuild/current-plan.md`

This spec captures the Apr 28, 2026 Steve / builder / reviewer conversation so the direction does not live only in chat memory.

It is not implementation approval by itself. It is the design input for `STRATEGIC-INTEL-001`.

## Call

Strategic Intelligence is a continuous operating loop, not a quarterly dashboard.

The goal is to mine company signals, surface real strategic issues, prove where they came from, decide whether they are already answered, and move only the real remaining gaps toward resolution.

Strategy Quarter is context. The Scoper is the depth layer. Foundation remains the control plane.

## New Chain

Use this as the explicit replacement for the old BCrew-Buddy pattern:

`sources -> artifacts -> atoms/facts -> synthesized themes -> strategic issue ledger -> Scoper -> scoped card -> action route -> resolution feedback`

Old-system mapping:

- scout / researcher -> source ingestion, artifacts, candidates, reports
- atoms / Gold Library -> `intelligence_atoms`, synthesis facts, retrieval chunks
- Director / Marketing Director -> synthesized themes and source-backed facts
- Scoper -> on-demand gap-resolving Scoper that queries atoms/retrieval/facts directly
- Sprint Master / planner -> routed action, decision, question, backlog item, or hub work item

Do not rebuild one private Director memory per department. Use shared Foundation evidence and multi-tagged hub/department overlays.

## Strategic Issue Ledger

Recommendation: create a real `intelligence_strategic_issues` table rather than only a view over synthesized items.

Reason:

- issues need lifecycle state, owner review, suppression/resurface rules, and resolution history
- synthesized items are evidence clusters, not durable operating issues
- Strategy Hub needs a stable issue identity even when underlying facts, routes, or scoped cards change

Minimum fields:

- `issue_id`
- `title`
- `plain_english_question`
- `status`: `surfaced`, `triage`, `scoped`, `discussed`, `decided`, `applied`, `resolved`, `snoozed`, `ignored`, `rejected`, `stale`
- `urgency`: `low`, `medium`, `high`, `critical`
- `impact`: `low`, `medium`, `high`, `needle_mover`
- `confidence`: `low`, `medium`, `high`
- `staleness`: `fresh`, `watch`, `stale`, `unknown`
- `owner`
- `owner_confidence`
- `primary_department`
- `department_refs[]`
- `hub_refs[]`
- `value_routes[]`
- `source_ids[]`
- `fact_refs[]`
- `atom_refs[]`
- `chunk_refs[]`
- `synthesized_item_refs[]`
- `route_refs[]`
- `scoped_card_refs[]`
- `resolution_status`
- `resolution_ref`
- `next_review_at`
- `snoozed_until`
- `suppression_reason`
- `resurface_rule`
- `metadata`
- `created_at`
- `updated_at`

## Scoring Rules

Do not use opaque model vibes for the first version.

Initial assignment should combine rules plus human review:

- urgency from deadlines, repeated evidence, owner escalation, financial impact timing, and meeting relevance
- impact from goal/KPI/finance/strategy-pillar connection, number of departments affected, and owner judgment
- confidence from source count, source trust, reply/thread completeness, cross-source confirmation, and recency
- staleness from source age, route status, snooze/resolution state, thread status, and newer contradictory evidence

The first pilot targets are:

- at least 5 strategic issues surfaced per week
- at least 3 scoped per week
- at least 2 resolved-to-applied per week
- median manual investigation time at or below 30 minutes per issue

## Continuous Cadence

Continuous does not mean an unbounded crawler.

V1 cadence:

- daily current-source mining for already-governed sources
- event-triggered mining after major meetings, transcripts, strategy sessions, and high-value source updates
- weekly strategic issue review
- bounded historical bites only when they serve an approved context or hub need

Do not run a blind six-month sweep as the default answer.

## Gap-Resolving Scoper

The Scoper is not a research brief writer.

Its first gate is: is this actually unanswered?

It must classify each issue as one of:

- `already_answered`
- `partially_answered`
- `real_gap`
- `stale_or_test`
- `needs_human_context`

Required tools / query surfaces:

- atoms
- retrieval chunks
- synthesis facts
- source contracts
- decisions
- open questions
- backlog
- docs
- operating facts
- existing routes
- prior scoped cards

Every verified claim must cite at least one file, source ID, fact, atom, chunk, decision, route, backlog item, or scoped-card ID.

## Scoped Card Output Contract

A scoped card must include:

- issue summary
- classification
- confidence and why
- already answered / verified
- partial evidence
- actual remaining gaps
- stale, test, or false-positive risk
- owner options
- smallest useful next steps
- proposed route / destination
- evidence pointers for every claim
- cost / latency metadata for the Scoper run

The Hub view must render this as meeting-readable sections:

- Verified
- Partial
- Remaining gaps
- Owner / next steps
- Evidence

## Resolution Feedback

Approval or closure must write back into the strategic issue loop.

When a route is approved, rejected, snoozed, ignored, resolved, or proven stale, the system should update:

- the strategic issue
- the scoped card
- the action route
- the synthesized item
- related fact/atom hit metadata where needed

The purpose is to stop stale issues from resurfacing as fresh work while preserving the evidence history.

## Department And Hub Tagging

Do not force one department per atom or issue.

Use:

- `primary_department`
- `department_refs[]`
- `hub_refs[]`
- `value_routes[]`

Example: the lead/source map issue is both Marketing and Strategy. It should not be flattened into only one queue.

## Source-Proof Confidence

The system must downgrade or flag weak proof when evidence has:

- no reply captured
- system-drafted origin
- one-message thread
- low hit count
- no cross-source confirmation
- stale date
- no owner response

The route can still be useful, but the UI and Scoper must not imply certainty that the underlying issue is active.

Thread-Context Requirement:

- show reply count where available
- show latest activity
- show direction, sender, recipients, and participants
- identify system-drafted or one-way artifacts when detectable
- show hit/use count if the atom or candidate has been reused
- show cross-source corroboration or explicitly say it is missing
- feed weak-proof flags into confidence and staleness

## Agent Boundary

The Scoper is the first narrow agent-shaped build, but not the Agent Factory.

Minimum Agent Spec fields:

- purpose
- input
- allowed tools
- output schema
- evidence requirement
- kill switch
- max cost per scope
- max latency per scope
- human approval boundary

Build the Scoper first, learn from it, then revisit Agent Factory after the existing deferral gate.

## Not Next

Do not build these before the Foundation checkpoint, freshness sweep, and build visibility work:

- Strategy UI polish
- Scoper implementation
- Agent Factory
- System Health Auditor agent
- cleanup agent
- department Director agents
