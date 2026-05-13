# EXTRACT-RUN-HARDENING-EXECUTION-001 Plan

## What

Turn extraction retry/backoff policy into actual bounded execution for failed source crawl items, with proof for retry eligibility, retry success, next retry scheduling, and exhausted hard-max attempts.

## Why

Extraction retry rules exist as policy and schema, but a failed item should not stay failed forever because no execution lane picks it up. This card closes the behavior gap between retry doctrine and a working retry path.

## Acceptance Criteria

- A retry execution function selects only eligible failed `source_crawl_items` using the existing retry policy.
- Retry attempts are recorded through `source_crawl_item_attempts` or existing item metadata without rerunning unrelated target windows.
- Synthetic proof covers an item that succeeds on retry.
- Synthetic proof covers an item that reaches hard maximum attempts and remains exhausted.
- Scheduler/job registration is present or explicitly manual-only with visible next action if the existing scheduler boundary is not safe to modify.
- The proof calls the actual retry classification/execution path, not substring markers.
- `EXTRACT-RUN-HARDENING-EXECUTION-001` has a Plan Critic pass row with score at least 9.8 before build and a revise row if this plan weakens.

## Definition Of Done

- Failed extraction items have a governed retry execution path.
- The process check proves success and exhausted outcomes.
- The backlog card and sprint item close only after focused proof, backlog hygiene, and verifier coverage pass.

## Details

Existing code to reuse: `lib/extraction-run-hardening.js`, Foundation job definitions, extraction target runners, and the current Foundation verifier. Existing database truth to reuse: `source_crawl_items`, `source_crawl_item_attempts`, extraction target metadata, live backlog, and Current Sprint stage gates. Existing docs to reuse: this plan, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, and the source truth guardrails sprint handoff. Existing scripts to reuse: a focused `process:extract-run-hardening-execution-check`, `backlog:hygiene`, and `foundation:verify`.

V1 is bounded to failed-item retry execution; it must not start broad Drive, video, Skool, Loom, Zoom, or external source ingestion. The root invariant is: a failed crawl item with eligible retry policy should move through actual function behavior into retry success, next-window scheduling, or exhausted state. The check should prove behavior through a black-box function path, an API-style round-trip fixture over item/attempt data, and a synthetic failing case that would revise if unrelated items are touched. No substring-only proof is acceptable.

Gate decision: focused gate for the retry execution proof, then full gate if scheduler/job registry or shared extraction code changes. Blast radius is failed-item retry state only; no new external connector or broad ingestion is allowed. The focused proof should be fast enough to use by default, targeting under 2 minutes, while `process:foundation-ship` remains the full protected-path gate.

## Risks

- Retry execution can accidentally become a broad backfill. Mitigation: eligible failed items only, caps, and proof that unrelated items are untouched.
- Permanent failures can loop forever. Mitigation: hard-max attempts and exhausted status.
- Scheduler changes can create runtime risk. Mitigation: keep the lane narrow and visible; prove either scheduled registration or manual-only status honestly.
- Repair path: if proof fails or retry selection touches unrelated items, leave the card in revise/scoping or reopen it, disable scheduler registration for the lane, and keep failed items failed rather than silently retrying unsafe work.
- Operator value: Steve gets extraction failures that either retry safely or show exhausted state, improving quality and speed because failed source items stop vanishing into a manual terminal chore.

## Tests

- `npm run process:extract-run-hardening-execution-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=EXTRACT-RUN-HARDENING-EXECUTION-001 --planApprovalRef=docs/process/approvals/EXTRACT-RUN-HARDENING-EXECUTION-001.json --closeoutKey=extract-run-hardening-execution-v1 --commitRef=HEAD`

## Not Next

- Do not run broad corpus ingestion.
- Do not build new connectors or credential repair.
- Do not implement Skool, Loom, Zoom, Mycro, Real, SocialPilot, Telegram, or web crawling.
- Do not mutate Drive permissions or send request-access emails.
- Do not build Reply/Watching Loop or product UI.
