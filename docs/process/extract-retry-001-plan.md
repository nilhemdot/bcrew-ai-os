# EXTRACT-RETRY-001 Plan

## What

Close `EXTRACT-RETRY-001` by making failed-item retry support honest and bounded.

V1 keeps the existing manual retry executor, but stops Foundation from advertising retry commands for extraction targets that do not yet have a proven item-ID-only retry runner. `meetings-current-day` remains the only supported retry target. Drive, video, and email attachment corpus targets must block with clear operator text until their target-specific retry paths are built.

## Why

`EXTRACT-RUN-HARDENING-EXECUTION-001` created the central retry executor, but the next-safe-command helper still overclaimed support for Drive, video, and email attachment targets. That is dangerous because Runtime Health can tell an operator to run a command that the target runner cannot actually honor.

The operator value is concrete: a partial corpus run now gives Steve a truthful next step. Supported meeting retries point to a no-write reviewed dry-run first; unsupported corpus targets say that the retry path is not implemented yet instead of pretending the system can safely retry failed rows.

## Acceptance Criteria

- Retry target support is owned by one shared list.
- `buildExtractionNextSafeCommand()` returns a no-write `extraction:retry-failed --dryRun=true` command only for targets in the supported list.
- Unsupported Drive/video/email attachment targets with failed rows return a blocked message, not a fake `--retryFailed=true` command.
- The central retry executor imports the same supported-target truth.
- Meeting retry mode loads only eligible failed crawl items through `getRetryableSourceCrawlItems()`, not every failed row.
- Blocked, waiting, and exhausted crawl rows are excluded before a meeting retry run.
- The retry Foundation job remains manual; no scheduled retry loop is introduced.
- A focused dogfood proof proves the supported meeting target and the unsupported Drive/video/email targets.
- `lib/foundation-extraction-runtime-verifier.js` keeps thin coverage for this card.
- No live extraction, no new retry targets, no paid-source auth, no connector auth, no hub feature work, and no Canva/Marketing route wiring.
- Full Foundation ship gate passes.

## Definition Of Done

- `lib/extraction-run-hardening.js` exports the shared supported retry target list and uses it in `buildExtractionNextSafeCommand()`.
- `lib/extraction-run-hardening-execution.js` imports/re-exports that same list and keeps `targetSupportsRetryExecution()` aligned.
- `scripts/sync-meeting-notes-archive.mjs` uses `getRetryableSourceCrawlItems()` in retry mode.
- `lib/extract-retry.js` owns constants, source evaluation, support matrix, and dogfood fixtures.
- `scripts/process-extract-retry-check.mjs` proves backlog/sprint state, approval, Plan Critic, source shape, retry dogfood, no-write dry-run, read-only posture, and verifier coverage.
- `package.json` exposes `process:extract-retry-check`.
- `lib/foundation-extraction-runtime-verifier.js` covers `EXTRACT-RETRY-001` without adding broad inline root-verifier logic.
- `scripts/foundation-verify.mjs` and the extraction-runtime split check pass the needed source into the verifier module.
- `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md` record the closeout.
- `docs/handoffs/2026-05-16-extract-retry-closeout.md` exists.
- Recent Builds closeout registry includes `extract-retry-v1`.
- Backlog, Current Sprint, focused proof, `foundation:verify`, and `process:foundation-ship` agree.

## Details

Existing code, existing docs, existing scripts, and live backlog truth to reuse:

- `lib/extraction-run-hardening.js`
- `lib/extraction-run-hardening-execution.js`
- `scripts/retry-extraction-failed-items.mjs`
- `scripts/sync-meeting-notes-archive.mjs`
- `lib/foundation-source-crawl-store.js`
- `lib/foundation-extraction-runtime-verifier.js`
- `docs/process/extract-run-hardening-execution-001-plan.md`
- live backlog card `EXTRACT-RETRY-001`

Implementation shape:

- Keep V1 narrow: retry support honesty and meeting retry eligibility only.
- Do not add a new DB schema, source lane, extractor, scheduler, or retry target.
- Do not add code to `lib/foundation-db.js`.
- The supported-target list starts as `['meetings-current-day']`.
- Runtime Health next-safe commands must point to the central no-write dry-run command first: `npm run extraction:retry-failed -- --target=meetings-current-day --dryRun=true`.
- Unsupported targets must block with operator-readable text.
- Dogfood wording: unsupported targets block instead of advertising fake retry command support.
- The focused proof should call the real helper functions and the real retry dry-run CLI; source substring checks alone are not enough.

Split/extraction plan:

- New proof logic goes in `lib/extract-retry.js` and `scripts/process-extract-retry-check.mjs`.
- Existing behavior changes stay in the smallest modules that already own the behavior.
- Root verifier wiring only passes source text into the existing extraction-runtime verifier module.

Gate decision tree:

- Static gate: `node --check` for changed JS and the root verifier.
- Focused gate: `npm run process:extract-retry-check -- --json`.
- Regression gate: `npm run process:verifier-extraction-runtime-split-module-check -- --json`.
- Full gate: `npm run process:foundation-ship -- --card=EXTRACT-RETRY-001 --planApprovalRef=docs/process/approvals/EXTRACT-RETRY-001.json --closeoutKey=extract-retry-v1 --commitRef=HEAD`.

Check-script apply posture:

- `scripts/process-extract-retry-check.mjs` is read-only by default and has no `--apply` path.
- It must not call backlog/current-sprint write helpers, raw SQL mutation against live tables, live source connectors, paid APIs, source extraction, or `fs.writeFile`.

Speed budget:

- Focused proof should run under 15 seconds.
- Full ship gate stays under the existing 300 second budget.

## Risks

- **False capability risk:** Runtime Health could continue advertising retry support for unsupported corpus targets. Mitigation: the dogfood proof asserts unsupported Drive/video/email targets block and do not contain fake retry command text.
- **Over-retry risk:** Meeting retry mode could retry blocked/waiting/exhausted rows. Mitigation: retry mode loads rows through `getRetryableSourceCrawlItems()`.
- **False green risk:** A source marker could pass without behavior. Mitigation: focused proof calls the actual command builders and the no-write retry CLI.
- **Scope creep risk:** This can drift into adding Drive/video/email retry implementations. Mitigation: V1 explicitly blocks unsupported targets and queues those target-specific runners as later work.
- **Rollback path:** Restore the previous command builder and meeting retry query, then remove `lib/extract-retry.js`, the focused script, verifier coverage, and closeout record.

## Tests

```sh
node --check lib/extract-retry.js lib/extraction-run-hardening.js lib/extraction-run-hardening-execution.js scripts/sync-meeting-notes-archive.mjs scripts/process-extract-retry-check.mjs lib/foundation-extraction-runtime-verifier.js scripts/process-verifier-extraction-runtime-split-module-check.mjs scripts/foundation-verify.mjs
npm run process:extract-retry-check -- --json
npm run process:verifier-extraction-runtime-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=EXTRACT-RETRY-001 --planApprovalRef=docs/process/approvals/EXTRACT-RETRY-001.json --closeoutKey=extract-retry-v1 --commitRef=HEAD
```

Not next: no live extraction, no new target-specific retry implementations beyond the existing meeting path, no scheduled retry job, no connector auth, no Skool/myICOR/YouTube/Loom work, no Build Intel extraction, no hub feature work, no Marketing Video Lab route wiring, no Canva asset mutation, no Drive permission mutation, no request-access emails, and no `MEETING-VAULT-ACL-001 Phase B`.
