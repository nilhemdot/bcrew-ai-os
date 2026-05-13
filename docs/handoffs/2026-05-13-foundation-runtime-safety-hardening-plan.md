# Foundation Runtime Safety Hardening Plan - 2026-05-13

## Why This Plan Exists

Steve asked why the Foundation got messy during a rebuild that was supposed to be done right.

The answer is not that the whole rebuild failed. The answer is narrower and more useful:

- The system improved fast, but process proof and live state were not separated hard enough.
- Scripts named `check` were allowed to mutate backlog, sprint, and source truth.
- `initFoundationDb()` mixed schema setup, seed data, live repairs, and status updates.
- `foundation:verify` could repair/reset state and then report green.
- Current Sprint mutation helpers had broad defaults that could close active sprints and replace sprint items.
- The Foundation hub became an aggregate route that loaded too much, too slowly.
- Frontend work stayed in one large client file without enough route, cache, or payload boundaries.

This is exactly the kind of drift Steve wanted to avoid. The fix is not a rebuild. The fix is to make write boundaries, verifier trust, and runtime budgets impossible to hand-wave.

## Decision

Next sprint should be a hardening sprint, not another audit and not feature work.

Sprint name:

`foundation-runtime-safety-hardening-2026-05-13`

Goal:

Make Foundation safe to verify and safe to operate before any product expansion: read-only verifier, no accidental check-script writes, guarded sprint/backlog mutations, separated DB init/seed/repair, and bounded hub performance.

## Operating Posture For Codex

Steve is the founder/operator and ideas owner. Codex is responsible for senior engineering judgment during Foundation work.

Do not assume Steve will catch architecture rot, slow endpoints, giant files, unsafe write boundaries, self-repairing verifier behavior, or false-green proof. Flag those proactively. The job is not only to implement cards; it is to prevent the rebuild from becoming another system where process looks clean while the codebase rots.

Velocity is not proof of quality. Every hardening card needs engineering proof that the old failure mode is blocked.

## Source Report

Primary audit report:

- `docs/handoffs/2026-05-13-deep-foundation-code-audit.md`

Supporting audit artifacts:

- `docs/handoffs/2026-05-13-code-quality-nightly-audit-report.md`
- `docs/handoffs/2026-05-13-code-quality-nightly-audit-sprint-closeout.md`

## Pull Order

### 1. `VERIFY-READONLY-GATE-001`

Make `foundation:verify` read-only against live state.

Acceptance:

- `npm run foundation:verify` must not call `resetFoundationDb()`, repair live tables, seed backlog, or advance sprint state.
- Any repair/reset proof runs only against fixture DB/state or an explicit repair command.
- If live state is broken, verifier fails closed and reports the broken state.
- Dogfood proof: create or simulate broken live state, run `foundation:verify`, and prove it fails closed instead of repairing and passing.

Why first:

If the verifier can repair what it verifies, every other green check is weaker than it looks.

### 2. `PROCESS-CHECK-APPLY-BOUNDARY-001`

Make `process-*-check` scripts no-write by default.

Acceptance:

- Scripts named `check` run read-only unless called with an explicit mutating flag such as `--apply`, `--close-card`, `--write-report`, or `--mutate-sprint`.
- Mutating mode must print/write an explicit mutation posture.
- Add a detector/proof that catches a synthetic check script attempting to write without an apply flag.
- Dogfood proof: run a synthetic check path that attempts a write without an apply flag and prove it is blocked.

Why second:

Operators and nightly jobs need to trust that "check" means check.

### 3. `PROCESS-CHECK-SCHEDULED-MUTATION-GUARD-001`

Block scheduled health jobs from running mutating check scripts.

Acceptance:

- Foundation job registry must classify jobs as `read_only`, `report_only`, or `mutating`.
- Scheduled/default health jobs cannot target commands with backlog/sprint/source mutators unless explicitly marked mutating and disabled from unattended schedules.
- Existing `verification-runs` scheduled path is made safe, disabled, or moved to explicit apply mode.
- Dogfood proof: attempt to register or run a scheduled job that targets a mutating check and prove the registry blocks it.

Why third:

The scheduled layer should not be able to close cards or move sprint state while Steve is not watching.

### 4. `FOUNDATION-DB-INIT-SEED-SPLIT-001`

Separate DB schema init from seed, repair, and live truth writes.

Acceptance:

- Schema migration/init has a clearly named read/write posture and only performs schema setup.
- Seed/bootstrap is separate.
- Live-data repair is separate and explicit.
- Reporting commands do not call a function that can rewrite live backlog/source/sprint truth as a side effect.
- Dogfood proof: call the schema/init path and prove it does not seed, repair, close cards, or rewrite backlog/source/sprint rows.

Why fourth:

`initFoundationDb()` currently means too many things. That makes every caller hard to reason about.

### 5. `CURRENT-SPRINT-MUTATION-GUARDS-001`

Protect active sprint overlay writes.

Acceptance:

- Active sprint writes require explicit apply posture.
- Active sprint replacement requires expected previous active sprint id.
- Item replacement produces a diff preview or change event record.
- Helper defaults cannot close other active sprints by accident.
- Dogfood proof: replay the broad helper path that could previously close active sprints or replace items, and prove it now requires expected previous active sprint id plus explicit apply posture.

Why fifth:

One broad helper should not be able to rewrite sprint truth from a casual proof/check path.

### 6. `BACKLOG-STORE-CONCURRENCY-001`

Prevent lost updates in backlog mutation paths.

Acceptance:

- Backlog updates use row locking, optimistic concurrency, or field-level patch SQL.
- A focused proof demonstrates two writers cannot silently overwrite each other's changes.
- Change events record the correct before/after state.
- Dogfood proof: simulate two concurrent backlog writers updating different fields and prove neither silently overwrites the other.

Why sixth:

Backlog is task truth. Losing writes silently breaks Foundation trust.

## Optional Stretch, Only If First Six Close Cleanly

### 7. `BACKLOG-DONE-PROOF-FK-001` / `VERIFIER-COVERAGE-REGISTRY-001`

Replace prose/regex done proof with typed proof references.

### 8. `FOUNDATION-HUB-REQUEST-BUDGET-001`

Add timings, timeouts, payload budgets, and summary/detail separation for `/api/foundation-hub`.

### 9. `KPI-HEALTH-HOT-ROUTE-CACHE-001`

Cache and timeout KPI health so hot source/hub routes stay responsive.

### 10. `FOUNDATION-ROUTE-RENDER-GUARD-001`

Prevent frontend async route races.

## Non-Negotiable Rules

- Do not build features.
- Do not open Build Intel extraction work.
- Do not build agents, Telegram assistants, Base44 clones, or hub workflows.
- Do not start a broad monolith refactor.
- Do not make `foundation:verify` greener by repairing state inside the verifier.
- Do not let `check` scripts write by default.
- Every write-capable path needs an explicit posture and proof.
- Every card must dogfood the exact audit failure it claims to fix. A card is not done because code compiles; it is done when the old failure mode is recreated and proven blocked or corrected.

## Follow-Up Guardrail To Scope At Closeout

When closing this sprint, confirm this already-scoped follow-up card remains staged and do not build it inside the hardening sprint:

`PLAN-CRITIC-ARCHITECTURAL-RULES-001`

Live backlog status as of this lock-in: `lane=scoped`, `priority=P1`, owner `Foundation Process`.

Plan Critic should automatically reject durable build plans that:

- add to a file already over 5,000 lines without an explicit split/extraction plan,
- introduce a write path in a script named `check` without explicit apply posture,
- touch live state from verifier/check paths,
- omit a focused proof command,
- claim to fix an audit finding without a dogfood proof that would catch the original failure.

This is the forward-looking guardrail. The hardening sprint cleans current rot; this Plan Critic upgrade prevents the same rot pattern from recurring.

## Why This Makes Future Work Tighter

After this sprint, the system should have a different posture:

- Read-only checks are actually read-only.
- Mutating scripts have explicit apply mode.
- Verifier green means the live system was healthy, not repaired mid-check.
- Sprint state cannot be accidentally replaced.
- Backlog truth has concurrency protection.
- Performance work can proceed against trustworthy gates.

That is how Foundation stops drifting while future sprints continue.

## Fresh Chat Execution Note

This plan should be executed in a fresh sprint chat. The current chat should remain strategic/review-oriented.

The fresh chat should first commit/pull latest truth, read the deep audit report and this plan, open the sprint in DB visibly, write doctrine per card, run Plan Critic, build one card at a time, and stop at sprint review.
