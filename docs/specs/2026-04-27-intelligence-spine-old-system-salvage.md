# Intelligence Spine Old-System Salvage Spec

Status: Accepted build gate
Date: 2026-04-27
Backlog gate: `REPORT-MINING-001`
Blocks: `INTEL-ATOM-001`, retrieval, synthesis, Action Router, Strategy Hub v2

## Call

Do not build atom tables from a raw extraction model.

The old BCrew-Buddy system had architectural problems, but it also proved useful intelligence shapes:

- scouts produced specific evidence and report sections
- Directors deduplicated, scored, and turned reports into owner-facing briefs
- the Gold Library stored reusable atoms with lifecycle, quality, avatar, freshness, and performance feedback
- scoping docs carried source context, open questions, audience, priority, and actionability
- the Session 217 failure proved that Scopers must query atoms directly, not only read Director summaries

The rebuild keeps those shapes and rejects the old sprawl.

## Old References Read For This Gate

- `/Users/bensoncrew/bcrew-buddy-reference/scripts/atom-extractor.cjs`
- `/Users/bensoncrew/bcrew-buddy-reference/scripts/atom-cli.cjs`
- `/Users/bensoncrew/bcrew-buddy-reference/docs/archive/director-intelligence-SKILL.md`
- `/Users/bensoncrew/bcrew-buddy-reference/skills/bcrew-mktg-director-intel/SKILL.md`
- `/Users/bensoncrew/bcrew-buddy-reference/data/doctrine-memories/feedback/feedback_session_217_scoper_atom_disconnect.md`
- `/Users/bensoncrew/bcrew-buddy-reference/docs/build-logs/session-217-retrospective.md`
- `/Users/bensoncrew/bcrew-buddy-reference/docs/rebuild-handoff.md`
- `/Users/bensoncrew/bcrew-buddy-reference/docs/archive/session-briefing-184E-scoper.md`
- `/Users/bensoncrew/bcrew-buddy-reference/docs/archive/intelligence/briefs/marketing/2026-03-22.md`
- `/Users/bensoncrew/bcrew-buddy-reference/docs/archive/intelligence/scoping-queue/marketing/CB-039-7m-farm-sale-bcrews-biggest-deal-story.md`
- `/Users/bensoncrew/bcrew-buddy-reference/docs/archive/intelligence/scoping-queue/dev/INT-036-safety-alert-audit.md`

## Report Shapes To Preserve

### Scout / Source Report

Preserve these fields as generated report artifact structure, not loose markdown only:

- source identity and source path
- inspected window or report date
- freshness and missing-source warnings
- source failure warnings
- raw evidence excerpts or links
- scored findings
- `ACTION REQUIRED` threshold
- carryover items
- dedup notes
- source performance or source quality notes
- explicit "noise filtered" / rejected findings

### Director Brief

Preserve the Director role as a governed report artifact, not a private agent memory:

- input coverage summary
- stale/missing source warnings at top
- top actions ranked by urgency and score
- sectioned findings by department, pillar, audience, or source lane
- contradiction/tension callouts where inputs disagree
- scored recommendations
- owner/action/date language where known
- high-scoring items filed to the next review/scoping queue
- overflow handling when too many findings exceed the threshold

Director briefs may guide the human and the Scoper, but they are not the source of truth by themselves.

### Scoping Finding / Card

Preserve the scoping document shape because it fixed the "thin backlog card" problem:

- stable ID
- title
- score, priority, status, audience or department
- filed date and filed by
- source report path or source artifact IDs
- what was found
- why it matters
- strategic alignment
- source URLs / raw source context
- open questions
- dependencies
- required actions or implementation notes
- estimated effort where relevant

Scoping cards are rich work contracts. They are not raw recommendations.

### Gold Library / Atom Library

Preserve the old content atom model where it was strong:

- direct query by downstream consumer (`for-avatar`, `top`, `search`)
- quality and relevance scoring
- audience/avatar/pillar tagging
- freshness and expiry
- dedup by normalized content hash
- winner/used feedback
- performance score and notes
- superseded/parent relationships
- source scout, source file, and source date

The new atom model must generalize this beyond marketing without flattening away the useful fields.

## Old Atom Fields To Preserve

`INTEL-ATOM-001` must account for these old fields, either directly or through compatible overlay fields:

- `id`
- `title`
- `content`
- `source_type`
- `source_scout`
- `source_file`
- `source_date`
- `audience`
- `avatar_ids`
- `avatar_names`
- `pillar`
- `platform_fit`
- `format_rec`
- `emotion`
- `content_type`
- `quality_score`
- `relevance_score`
- `freshness`
- `status`
- `used_count`
- `used_in`
- `last_used_at`
- `perf_score`
- `perf_notes`
- `dedup_hash`
- `superseded_by`
- `parent_atom_id`
- `tags`
- `notes`
- `filed_by`
- `expires_at`

## New Fields Required By The Rebuild

The new atom schema must add Foundation fields the old system did not enforce:

- `source_id`
- `artifact_id`
- `source_crawl_run_id`
- `intelligence_job_run_id`
- `candidate_key` when promoted from extracted candidates
- `report_artifact_id` when derived from a governed report
- `modality`
- `anchor_type` and `anchor_value` for thread, row, page, timestamp, slide, frame, or DOM location
- `evidence_excerpt` or `visual_observation`
- `derived_claim`
- `entity_refs`
- `person_refs`
- `metric_refs`
- `topic_refs`
- `department`
- `pillar`
- `value_route`
- `content_use_class`
- `sensitivity`
- `min_tier`
- `subject_people`
- `source_confidence`
- `extraction_confidence`
- `stale_after`
- `accepted_at`, `accepted_by`, `rejected_at`, `rejected_by`, `review_note`
- `suggested_owner`
- `suggested_action`
- `action_router_record_id`
- `supersedes_atom_id`
- `superseded_by_atom_id`

## Governed Report Artifact Contract

Before or alongside `INTEL-ATOM-001`, the spine needs a governed report/brief artifact contract.

Minimum fields:

- `report_artifact_id`
- `report_type`
- `scope_key`
- `department`
- `source_ids`
- `generated_by_job_run_id`
- `intelligence_job_run_id`
- `input_artifact_ids`
- `input_candidate_keys`
- `input_atom_ids`
- `input_fact_refs`
- `source_coverage`
- `freshness_warnings`
- `missing_source_warnings`
- `stale_source_warnings`
- `dedup_summary`
- `rejected_noise_summary`
- `top_findings`
- `action_required_items`
- `open_questions`
- `contradictions`
- `output_artifact_id` or `output_path`
- `structured_output_json`
- `status`
- `reviewed_by`
- `reviewed_at`
- `promoted_decision_ids`
- `promoted_backlog_ids`
- `promoted_action_ids`

Report artifacts can summarize. They cannot replace direct atom/retrieval access.

## Scoper Rules

The Session 217 root bug becomes a permanent build rule:

- A Scoper may read Director briefs for narrative context.
- A Scoper must query atoms/retrieval directly before producing scoped work.
- A Scoper must cite atom IDs or evidence IDs it uses.
- Case-study, proof, coaching, recruiting, sales, and retention work must pull source-backed atoms, not vague Director prose.
- Writers/builders should receive rich scoped work with evidence already attached. Their job is execution, not source discovery.

Anti-pattern:

`Director summarizes research -> Scoper reads only the summary -> Writer/builder trusts the Scoper`

Required pattern:

`Sources -> candidates/atoms -> governed report artifact -> Scoper direct atom/retrieval query -> scoped work -> Action Router`

## Old Mistakes To Prevent

- Do not create one private memory per scout/Director/Scoper as the operating source of truth.
- Do not let Directors write straight into execution backlog without a scoping/review gate.
- Do not call a `SKILL.md` edit an operational fix until the runtime actually loads that file.
- Do not let report markdown be the only durable record.
- Do not create thin one-line backlog cards from scored findings.
- Do not use local chat memory as coverage proof.
- Do not let source freshness warnings disappear after the report is generated.
- Do not ship Strategy Hub, Sales Hub, Marketing Hub, or assistant views that read sensitive atoms before tier/subject-person filtering exists.

## Required Changes To INTEL-ATOM-001

`INTEL-ATOM-001` must be updated from "define atom table" to "define atom plus report artifact plus direct Scoper query contract."

Required implementation scope:

1. Create atom storage with old Gold Library lifecycle fields plus new Foundation provenance, sensitivity, and action fields.
2. Create atom hit/occurrence storage so repeated evidence strengthens an atom instead of duplicating clutter.
3. Create governed report artifact storage for Director briefs, department reports, master synthesis, and future hub packets.
4. Link atoms to source artifacts, candidates, job runs, reports, and source facts.
5. Add dedup and supersession rules before broad extraction creates volume.
6. Add direct query functions for Scopers:
   - by source ID
   - by entity/person
   - by avatar/audience where present
   - by pillar/department/value route
   - by metric
   - by report artifact
   - by freshness/status
   - by sensitivity/min tier
7. Add review state: accepted, rejected, superseded, archived.
8. Add feedback state: used, winner, performance note, action routed, resolved.
9. Add verifier coverage that fails if Scoper-facing retrieval is absent after atom storage exists.

## Acceptance For REPORT-MINING-001

This gate is accepted when:

- this spec exists
- the Strategy Hub manifest names `REPORT-MINING-001` before `INTEL-ATOM-001`
- live/seed backlog says `INTEL-JOBS-001` is done/hardened
- live/seed backlog says `REPORT-MINING-001` is the accepted gate before atoms
- `foundation:verify` fails if this spec disappears

## Next Build After This Gate

Next allowed build: `INTEL-ATOM-001`.

Still blocked:

- Strategy Hub UI/advisor/recommendation work
- retrieval
- synthesis
- Action Router
- Sales/Marketing/Strategy hub buildout

Those resume only when their preceding spine layer exists and is verifier-guarded.
