## DATA-020 - First freshness guardrails

Date: 2026-04-22

Purpose: close the first scoped stale-state layer without pretending every source now has full freshness automation.

### What is live now

- raw FUB lead-source snapshots already had age tracking
- governed review freshness now also exists for:
  - FUB lead-source drift
  - Owners governed dropdown drift
  - Owners Admin review lane
  - Owners conditional review lane
  - combined Owners governed inbox

### How it works

- `change_events` now also accepts:
  - `review_queue_changed`
  - `review_queue_cleared`
- queue lanes write change events keyed by governed entity:
  - `owners_review_queue / SRC-OWNERS-001:admin`
  - `owners_review_queue / SRC-OWNERS-001:conditional`
  - `owners_review_queue / SRC-OWNERS-001:combined`
- drift lanes keep using:
  - `source_drift_detected`
  - `source_drift_cleared`
- freshness is computed from the age of the current unchanged fingerprint, not from vague sheet-modified guesses

### First thresholds

- raw FUB snapshot stale:
  - `24h`
- governed review warning:
  - `72h`
- governed review stale:
  - `168h`

### Visible surfaces

- `/api/fub/lead-sources`
- `/api/owners/lead-source-governance`
- `/api/owners/review-queue`
- Current State queue panel

### What this does not claim

- this is **not** global cross-source freshness
- this is **not** finance freshness
- this is **not** KPI freshness
- this is the first reusable freshness pattern for governed source-review layers

### Next reuse targets later

- finance review / sign-off surfaces
- KPI truth-layer reads
- broader strategy source-watch surfaces
