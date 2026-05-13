# Source Truth Guardrails Sprint Plan

## What

Run a backend-only Foundation sprint that adds guardrails around three places source truth can drift: atom-flow health, failed extraction retry execution, and stale research-lane backlog.

## Why

The control-plane sprint closed the process and connector-readiness drift. The next safest work is not product behavior; it is making source truth harder to fake. The system should notice when sources claim maturity without fresh atoms, should retry failed crawl items through governed execution instead of policy-only notes, and should produce a human-reviewable map of parked research cards before more work piles up.

## Acceptance Criteria

- The sprint is visible in live DB before scoping starts.
- All three cards start in Scoping and move through Sprint Ready, Building Now, and Done This Sprint with real stage state.
- Every card has complete `existing_work_check` doctrine and one `plan_critic_runs` pass row before build starts.
- Atom-flow stale-state proof uses live or synthetic source/atom state and rejects substring-only proof.
- Extraction retry proof uses actual function/scheduler paths over source crawl item state and covers success plus exhausted retry states.
- Research purge proof produces a proposed-only report and proves it does not auto-delete or auto-move backlog cards.

## Definition Of Done

- All three cards close with focused proof and Foundation verifier coverage where needed.
- Current Sprint ends with 3/3 Done This Sprint, no active blocker, and sprint-review next action.
- No product work, external extraction, credential repair, Drive permission mutation, request-access email, or UI polish ships.

## Details

Reuse the live backlog cards queued by `SOURCE-EXTRACTION-GAP-FOLLOWUP-001`: `ATOM-FLOW-AUTO-DEMOTION-001`, `EXTRACT-RUN-HARDENING-EXECUTION-001`, and `RESEARCH-LANE-PURGE-001`.

Use existing Foundation tables and code paths: `foundation_sprints`, `foundation_sprint_items`, `plan_critic_runs`, `source_crawl_items`, `source_crawl_item_attempts`, source maturity data, `intelligence_atoms`, backlog items, and the existing Foundation ship/fanout/verifier gates. Build only tight V1 behavior proofs.

## Risks

- Risk: atom-flow guardrails over-demote legitimate low-volume sources. Mitigation: record stale/flagged state with reason and restoration proof; do not permanently rewrite source contracts.
- Risk: retry execution broadens into corpus crawling. Mitigation: process only eligible failed items through bounded retry rules and synthetic fixtures; do not start broad ingestion.
- Risk: research purge becomes destructive cleanup. Mitigation: report only, no automatic lane changes, deletes, or future-concepts edits.

## Tests

- `npm run process:atom-flow-auto-demotion-check -- --json`
- `npm run process:extract-run-hardening-execution-check -- --json`
- `npm run process:research-lane-purge-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=<card> --planApprovalRef=<approval> --closeoutKey=<closeout> --commitRef=HEAD` for protected code/doc changes.

## Not Next

- Do not build Reply/Watching Loop.
- Do not expand Strategy Hub UI or product workflows.
- Do not implement Mycro, Skool, Loom, Zoom, Real, SocialPilot, or new external extraction.
- Do not run `MEETING-VAULT-ACL-001` Phase B.
- Do not mutate Drive permissions or send request-access emails.
- Do not build Telegram bots, Marketing production, Brand Guardian enforcement, Directors, or broad UI polish.
- Do not silently roll into the next sprint after closeout.
