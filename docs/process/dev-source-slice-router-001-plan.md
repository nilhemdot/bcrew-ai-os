# DEV-SOURCE-SLICE-ROUTER-001 Plan

## What

Build the first Dev source-slice router between the shared Foundation data pond and the Dev Intelligence Director.

Plain English: meetings, Gmail, Missive, and Slack already feed Foundation. Dev should not read every raw task from those sources. It should pull the system/build/tooling signals, park normal operational follow-up, and send only useful Dev signals to the Director.

## Why

Steve corrected the order: before approving build work, connect the sources, extract the evidence, and let synthesis, Director, Scoper, and Portfolio rank it.

The risk is noise. A commission reminder, file update, or normal deal task should not become a Dev build recommendation. A dashboard failure, workflow-tracking gap, stale-listing assignment need, onboarding/coaching system signal, or AI-generated task confusion can be Dev build intel.

## Acceptance Criteria

- Reads existing Foundation report artifacts from shared internal sources:
  - meetings
  - Gmail
  - Missive
  - Slack
- Filters candidates into:
  - Dev Director candidate
  - parked operational follow-up
  - not Dev-relevant
- Uses source IDs, report artifact IDs, and atom IDs as lineage.
- Produces a Director-input bundle from filtered Dev candidates only.
- Parks ops-only work instead of polluting the Dev Director.
- Does not run extraction, call models, create backlog cards, mutate source systems, or write externally.

## Definition Of Done

- Add a source-slice router module and focused check script.
- Dogfood proves a KPI/dashboard/system item routes to Dev.
- Dogfood proves a workflow-tracking item routes to Dev.
- Dogfood proves a commission follow-up parks outside Dev.
- Live proof reads recent Foundation shared-source reports and finds at least one Dev-relevant signal plus at least one parked ops-only signal.

## Not Next

- Do not run Gmail, Missive, Slack, or meeting extraction jobs from this card.
- Do not add Skool/MyICOR/private-source extraction.
- Do not approve or create build backlog cards.
- Do not feed every internal task into Dev.
- Do not replace Strategy Hub or Ops routing.

## Tests

- `node --check lib/dev-source-slice-router.js`
- `node --check scripts/process-dev-source-slice-router-check.mjs`
- `npm run process:dev-source-slice-router-check -- --json`
