# Deep Foundation Code Audit - 2026-05-13

Generated at: `2026-05-13T18:28:49Z`

Scope:

- `lib/foundation-db.js`
- `server.js`
- `public/foundation.js`
- `public/styles.css`
- `public/foundation.html`
- `scripts/foundation-verify.mjs`
- `scripts/process-*.mjs` paths that touch sprint, backlog, source, or report state
- API routes for `/api/foundation-hub`, `/api/source-of-truth`, `/api/foundation/source-lifecycle`, and `/api/foundation/build-log`
- Frontend render/data-loading paths

Rules followed:

- No feature work.
- No auto-fixes.
- No DB mutation scripts.
- No backlog mutation.
- Only read-only shell inspection, read-only local GET measurements, and read-only reviewer lanes.
- Stop after this report.

## Verdict

Foundation is **messy-but-fixable**, but several parts are **structurally dangerous until hardened**.

The dangerous parts are not "big files" by themselves. The dangerous parts are:

- Commands named `check` can write backlog and sprint truth.
- `foundation:verify` is not cleanly read-only and can reset/repair DB state before passing.
- The active sprint mutation helper can close other active sprints and replace sprint items from one call.
- The main Foundation hub route can take tens of seconds and returns multi-megabyte payloads.
- The frontend trusts large cached aggregate payloads, has route race risks, and embeds live-looking truth in JS.

This codebase is not ready for autonomous dev. It can support human-led Foundation work if the next sprint is hardening, not features.

## Read-Only Measurements

Fresh local GET checks on `2026-05-13`:

- `/api/foundation-hub`: `200`, `70.244s`, `4,633,072` bytes.
- `/api/source-of-truth`: `200`, `2.563s`, `133,857` bytes.
- `/api/foundation/source-lifecycle`: `200`, `0.372s`, `664,794` bytes.
- `/api/foundation/build-log?limit=60`: `200`, `0.095s`, `514,564` bytes.
- `foundation.js`: `612,773` bytes raw, `115,646` bytes gzip if compressed, served with `Cache-Control: no-store` and no `Content-Encoding`.
- `styles.css`: `191,210` bytes raw, `26,608` bytes gzip if compressed, served with `Cache-Control: no-store`.

These measurements are read-only. They prove the scanner's earlier "slow hub / big payload" warning was not hypothetical.

## P0 Findings - Fix First

### 1. `/api/foundation-hub` is too slow and too large for a command surface

Severity: P0
Type: performance risk / architecture risk
Evidence: `server.js:5112`, `server.js:5114`, `server.js:5115`, `server.js:5299`, `server.js:5311`, `server.js:5324`, `lib/foundation-db.js:14017`

What is happening:

- The hub starts with full `getFoundationSnapshot()` at `server.js:5114`.
- It immediately adds KPI health at `server.js:5115`.
- It builds many more large domains serially through `server.js:5311`.
- It returns the full snapshot plus many derived objects at `server.js:5324`.
- A fresh local read took `70.244s` and returned `4.63 MB`.

Why it matters:

This is the page Steve uses to understand Foundation. It should be fast and boring. Right now, one slow DB query, filesystem scan, source probe, or context search can stall the whole operator surface.

Fix now or backlog:

Fix now. This is an operator reliability issue, not polish.

Hardening card:

`FOUNDATION-HUB-REQUEST-BUDGET-001` - add per-builder timings, route timeout budgets, payload byte budgets, and split hub summary from detail endpoints.

### 2. KPI health probes run inline on hot routes with no timeout

Severity: P0
Type: performance risk / availability risk
Evidence: `server.js:3793`, `server.js:5115`, `lib/kpi-health.js:289`, `lib/kpi-health.js:538`

What is happening:

- `/api/source-of-truth` calls `getSafeKpiHealthSnapshot()` at `server.js:3793`.
- `/api/foundation-hub` calls the same probe at `server.js:5115`.
- `fetchSupabaseJson()` calls `fetch()` with no `AbortController` or deadline at `lib/kpi-health.js:289`.
- `getKpiHealthSnapshot()` loops over table/RPC probes at `lib/kpi-health.js:538`.

Why it matters:

An external Supabase slowdown can hold the Foundation command page hostage. This is especially bad because the source/hub routes are supposed to explain system health, not become unavailable because a health probe is slow.

Fix now or backlog:

Fix now.

Hardening card:

`KPI-HEALTH-HOT-ROUTE-CACHE-001` - cache last-good KPI health, add hard timeouts, show stale/degraded status, and keep hot routes responsive.

### 3. `initFoundationDb()` mutates live operating truth

Severity: P0
Type: architecture risk / state mutation bug
Evidence: `lib/foundation-db.js:7467`, `lib/foundation-db.js:8777`, `lib/foundation-db.js:8794`, `lib/foundation-db.js:8822`, `lib/foundation-db.js:8847`, `lib/foundation-db.js:9863`, `scripts/report-backlog-seed-drift.mjs:37`

What is happening:

- `initFoundationDb()` starts at `lib/foundation-db.js:7467`.
- It does schema work, then also rewrites backlog team values at `lib/foundation-db.js:8783`.
- It seeds users at `lib/foundation-db.js:8794`.
- It seeds backlog rows at `lib/foundation-db.js:8822`.
- It hard-updates backlog closeout/status rows starting at `lib/foundation-db.js:8847`.
- Even `report-backlog-seed-drift` calls `initFoundationDb()` before reporting at `scripts/report-backlog-seed-drift.mjs:37`.

Why it matters:

The phrase "initialize DB" currently means "create schema and possibly change live backlog truth." That makes read-only checks, report commands, server startup, and verifier setup hard to trust.

Fix now or backlog:

Fix now.

Hardening card:

`FOUNDATION-DB-INIT-SEED-SPLIT-001` - split schema migration, immutable bootstrap seed, live-data repair scripts, and doc snapshot refresh into separately named commands with explicit write gates.

### 4. A scheduled health job mutates backlog and sprint state

Severity: P0
Type: true process bug / state mutation risk
Evidence: `lib/foundation-jobs.js:97`, `lib/foundation-jobs.js:109`, `scripts/process-verification-runs-check.mjs:147`, `scripts/process-verification-runs-check.mjs:166`, `scripts/process-verification-runs-check.mjs:172`

What is happening:

- `verification-runs` is registered as a scheduled health job at `lib/foundation-jobs.js:97`.
- It runs `process:verification-runs-check -- --json=true` at `lib/foundation-jobs.js:109`.
- That script calls `initFoundationDb()` at `scripts/process-verification-runs-check.mjs:147`.
- It marks a backlog card done at `scripts/process-verification-runs-check.mjs:166`.
- It mutates the Current Sprint overlay at `scripts/process-verification-runs-check.mjs:172`.

Why it matters:

This violates the operator rule: scheduled health/report jobs must not close cards or advance sprint state. The job description says proposed-only, but the command mutates.

Fix now or backlog:

Fix now. Disable or convert this scheduled command before trusting scheduled Foundation health.

Hardening card:

`PROCESS-CHECK-SCHEDULED-MUTATION-GUARD-001` - scheduled jobs must fail registration if their command imports or calls sprint/backlog/source mutators without an explicit mutating job posture.

### 5. `upsertFoundationCurrentSprintOverlay()` can close active sprints and replace all sprint items

Severity: P0
Type: true bug / broad mutation blast radius
Evidence: `lib/foundation-db.js:6146`, `lib/foundation-db.js:6150`, `lib/foundation-db.js:6162`, `lib/foundation-db.js:6191`, `lib/foundation-db.js:6197`

What is happening:

- The helper defaults `status` to `active` at `lib/foundation-db.js:6150`.
- If status is active, it closes every other active sprint at `lib/foundation-db.js:6162`.
- It deletes every item for the target sprint at `lib/foundation-db.js:6191`.
- It reinserts items at `lib/foundation-db.js:6197`.

Why it matters:

One malformed proof/check script can close the active sprint or erase item state. The helper is needed, but the default is unsafe.

Fix now or backlog:

Fix now.

Hardening card:

`CURRENT-SPRINT-MUTATION-GUARDS-001` - require explicit `--apply`, expected previous active sprint id, item diff preview, and change-event records for replaced/removed items.

### 6. `foundation:verify` can reset/repair DB state and then pass

Severity: P0
Type: false confidence / verifier integrity bug
Evidence: `scripts/foundation-verify.mjs:7499`, `scripts/foundation-verify.mjs:7506`, `scripts/foundation-verify.mjs:7540`, `scripts/foundation-verify.mjs:13487`, `scripts/foundation-verify.mjs:13493`

What is happening:

- Gate reliability proof invokes `resetFoundationDb()` as cleanup around `scripts/foundation-verify.mjs:7499`.
- The final verifier path retries after reset/repair around `scripts/foundation-verify.mjs:13487` and `scripts/foundation-verify.mjs:13493`.

Why it matters:

A verifier that mutates or repairs the thing it is verifying can hide the original broken live state. Passing after repair is not the same as proving the system was healthy.

Fix now or backlog:

Fix now.

Hardening card:

`VERIFY-READONLY-GATE-001` - make `foundation:verify` strictly read-only against live state and move DB-reset reliability proof to an isolated fixture DB or explicit repair command.

### 7. Backlog updates are vulnerable to lost concurrent writes

Severity: P0
Type: true bug / data integrity risk
Evidence: `lib/foundation-db.js:17432`, `lib/foundation-db.js:17434`, `lib/foundation-db.js:17438`, `lib/foundation-db.js:17453`

What is happening:

`updateBacklogItem()` reads an existing row, builds a merged update, then writes without `FOR UPDATE`, optimistic versioning, `updated_at` compare, or patch-only SQL.

Why it matters:

Two writers can read the same row, each update a different field, and the later write can silently overwrite the earlier change. The change event can then record a stale `before` state.

Fix now or backlog:

Fix now for backlog truth.

Hardening card:

`BACKLOG-STORE-CONCURRENCY-001` - add row locking or optimistic concurrency and focused lost-update tests.

### 8. Done-card proof is still prose/regex driven in core paths

Severity: P0
Type: false confidence / process integrity risk
Evidence: `lib/foundation-db.js:17364`, `lib/foundation-db.js:17372`, `lib/foundation-db.js:17373`, `scripts/foundation-verify.mjs:1169`, `scripts/foundation-verify.mjs:4184`

What is happening:

- `assertBacklogDoneCloseout()` accepts done-lane movement based on regex terms in mutable prose fields.
- Verifier coverage can pass if `foundationVerifySource.includes(card.id)` at `scripts/foundation-verify.mjs:1169`.

Why it matters:

The system can treat a card as covered because text says "proof" or because an ID appears in the verifier file. That is not a machine-checkable proof contract.

Fix now or backlog:

Fix now.

Hardening card:

`BACKLOG-DONE-PROOF-FK-001` plus `VERIFIER-COVERAGE-REGISTRY-001` - require typed proof entries, closeout keys, verifier run ids, or build closeout rows before lane=`done`.

### 9. Process scripts named `check` commonly write state

Severity: P0
Type: process bug / state mutation risk
Evidence examples: `scripts/process-source-maturity-grid-check.mjs:164`, `scripts/process-source-maturity-grid-check.mjs:184`, `scripts/process-source-maturity-grid-check.mjs:188`, `scripts/process-connector-credential-check.mjs:122`, `scripts/process-llm-auth-audit-check.mjs:76`, `scripts/process-source-extraction-gap-followup-check.mjs:136`

What is happening:

Several `process-*-check` scripts update backlog rows, directly update sprint tables, or call sprint overlay mutation helpers. `--json` is not a read-only contract.

Why it matters:

Operators and future audit runners will reasonably assume `check` is safe. In this repo, that assumption is false.

Fix now or backlog:

Fix now.

Hardening card:

`PROCESS-CHECK-APPLY-BOUNDARY-001` - make all `process-*-check` scripts default to no-write; require explicit `--apply`, `--close-card`, `--write-report`, or `--mutate-sprint`.

### 10. Frontend route rendering can race and overwrite the wrong page

Severity: P0
Type: frontend bug / browser QA risk
Evidence: `public/foundation.js:15941`, `public/foundation.js:9108`, `public/foundation.js:14549`, `public/foundation.js:14772`, `public/foundation.js:15775`

What is happening:

The router dispatches async render functions at `public/foundation.js:15941`, but render completions do not verify that the route is still current before replacing `#found-content`.

Why it matters:

A slow previous route can finish after the user navigates and replace the current page with stale content. This is exactly the kind of bug that makes browser QA feel random.

Fix now or backlog:

Fix now.

Hardening card:

`FOUNDATION-ROUTE-RENDER-GUARD-001` - add route generation tokens or abort controllers; every async renderer must no-op if the active route changed.

### 11. Frontend cache invalidation is incomplete after mutations

Severity: P0
Type: stale truth bug
Evidence: `public/foundation.js:4510`, `public/foundation.js:4522`, `public/foundation.js:4540`, `public/foundation.js:4566`, `public/foundation.js:4626`, `public/foundation.js:4666`

What is happening:

`clearFoundationCaches()` at `public/foundation.js:4666` clears only selected caches. Cached readers for build log, changelog, daily summary, sheet status, and docs remain cached.

Why it matters:

After a mutation, the same session can keep showing stale Recent Work, daily summary, source docs, or sheet status.

Fix now or backlog:

Fix now.

Hardening card:

`FOUNDATION-FRONTEND-CACHE-INVALIDATION-001` - centralize cache keys by route/data source and clear all affected caches after each mutation.

## P1 Findings - Next After Safety

### 12. `/api/source-of-truth` does synchronous duplicate doc work and lacks a local error boundary

Severity: P1
Type: performance risk / error-handling gap
Evidence: `server.js:1003`, `server.js:1011`, `server.js:2778`, `server.js:3782`, `server.js:3806`, `server.js:3825`

What is happening:

- `readFileSafe()` uses sync file reads at `server.js:1003`.
- `getDocMeta()` sync reads file content to count lines at `server.js:1011`.
- `getSupportingStrategyDocs()` sync reads/parses supporting docs at `server.js:2778`.
- `/api/source-of-truth` calls `getSupportingStrategyDocs()` twice at `server.js:3806` and `server.js:3825`.
- The route at `server.js:3782` has no local `try/catch`, unlike many other Foundation routes.

Observed result:

`/api/source-of-truth` took `2.563s` locally.

Fix now or backlog:

Backlog after P0 hot-route work, unless this route remains above 2s after KPI caching.

Hardening card:

`SOURCE-OF-TRUTH-DOC-READ-CACHE-001` plus `SOURCE-OF-TRUTH-ERROR-BOUNDARY-001`.

### 13. `/api/foundation/source-lifecycle` builds from a full Foundation snapshot

Severity: P1
Type: overfetch / architecture risk
Evidence: `server.js:3858`, `server.js:3860`, `lib/foundation-db.js:14017`

What is happening:

The lifecycle route calls `getFoundationSnapshot()` at `server.js:3860`, then uses only a slice of it.

Observed result:

The route returned `664,794` bytes. It was fast on this run, but the shape is wrong: a detail route should not depend on the general hub snapshot.

Fix now or backlog:

Backlog, after hub safety.

Hardening card:

`SOURCE-LIFECYCLE-SLIM-SNAPSHOT-001` - build a lifecycle-specific read model and measure loaded keys vs used keys.

### 14. `getFoundationSnapshot()` is a serial fanout plus unbounded data fetch

Severity: P1
Type: performance risk / architecture risk
Evidence: `lib/foundation-db.js:14017`, `lib/foundation-db.js:14018`, `lib/foundation-db.js:14029`, `lib/foundation-db.js:14044`, `lib/foundation-db.js:14078`, `lib/foundation-db.js:14113`

What is happening:

The snapshot starts with many sequential awaits, then fetches all backlog rows at `lib/foundation-db.js:14044` and all pending doc updates at `lib/foundation-db.js:14078`.

Why it matters:

Every consumer pays for the whole world. The hub, source lifecycle, and system health pages cannot have predictable budgets while this is the shared primitive.

Fix now or backlog:

Backlog, but high priority.

Hardening card:

`FOUNDATION-SNAPSHOT-QUERY-BUDGET-001` - split critical vs secondary payloads, add limits, and cache slow read-only slices.

### 15. Build Intel context search does unindexed text scan work inside the hub

Severity: P1
Type: performance risk
Evidence: `server.js:5299`, `lib/foundation-db.js:14469`, `lib/foundation-db.js:14481`

What is happening:

Hub calls `searchSharedCommunicationArtifactsForContext()` at `server.js:5299`. That search builds `ILIKE '%term%'` filters over `title` and `content_text` at `lib/foundation-db.js:14469`, selects full `content_text` at `lib/foundation-db.js:14481`, then scores/excerpts in JS.

Why it matters:

As artifacts grow, this becomes a table scan in the main hub request.

Fix now or backlog:

Backlog after hub budget work.

Hardening card:

`BUILD-INTEL-CONTEXT-SEARCH-INDEX-001` - move this to indexed/precomputed search or a detail endpoint.

### 16. GStack Build Intel can scan a repo on request path

Severity: P1
Type: performance risk
Evidence: `server.js:5311`, `lib/gstack-build-intel.js:245`

What is happening:

The hub calls GStack Build Intel at `server.js:5311`. The builder scans the mirror repo from `lib/gstack-build-intel.js:245` with no visible file/depth/time cap before slicing results.

Why it matters:

Request-time recursive filesystem work is not acceptable inside the command hub.

Fix now or backlog:

Backlog, but should be part of the hub slimming sprint.

Hardening card:

`GSTACK-BUILD-INTEL-SNAPSHOT-CACHE-001` - cache by commit/mtime and cap scan size.

### 17. Static assets are large, uncompressed, and deliberately uncached

Severity: P1
Type: frontend performance risk
Evidence: `server.js:792`, `server.js:795`, `public/foundation.html:7`, `public/foundation.html:99`

What is happening:

- Static JS/CSS/HTML get `Cache-Control: no-store` at `server.js:795`.
- `foundation.js` is `612,773` raw bytes and is served without compression.
- `styles.css` is `191,210` raw bytes and is served without compression.

Why it matters:

Every refresh redownloads and reparses the full Foundation client and stylesheet. This is painful on local and worse over remote connections.

Fix now or backlog:

Backlog after state safety and hub performance, unless the page is unusable.

Hardening card:

`FOUNDATION-ASSET-BUDGET-001` - add compression, hashed static asset cache policy, and route asset budgets.

### 18. Backlog search rebuilds the full board on every keystroke

Severity: P1
Type: frontend performance risk
Evidence: `public/foundation.js:9083`, `public/foundation.js:9265`, `public/foundation.js:9277`, `public/foundation.js:9279`, `public/foundation.js:9283`, `public/foundation.js:9287`

What is happening:

Backlog input fires on every `input`, filters all cards, clears `boardWrap.innerHTML`, and rebuilds every workflow stack.

Why it matters:

With 400+ backlog cards, typing can create visible jank and make the main work queue feel broken.

Fix now or backlog:

Backlog, but high priority for daily operator UX.

Hardening card:

`FOUNDATION-BACKLOG-RENDER-PERF-001` - debounce search, preserve DOM where possible, and measure node churn/long tasks.

### 19. `renderCurrentState()` embeds live-looking truth in JS

Severity: P1
Type: source-truth drift risk
Evidence: `public/foundation.js:8268`, `public/foundation.js:8358`, `public/foundation.js:8411`, `public/foundation.js:8441`, `public/foundation.js:8526`, `public/foundation.js:8548`

What is happening:

The current-state renderer builds `surfaceRows` in JS. It includes status claims, source IDs, backlog IDs, `14/14` and `5/5` KPI counts, and a meeting checkpoint with `866` notes, `649` transcripts, and `2026-04-26`.

Why it matters:

The UI can look authoritative while showing old operational truth.

Fix now or backlog:

Fix the live counts/status claims now; move the whole model to source-backed data in backlog.

Hardening card:

`CURRENT-STATE-DYNAMIC-TRUTH-001` - source current-state rows from DB/API contracts and ban live-looking counts/dates inside render functions.

### 20. `foundationRead()` has no timeout, abort, or structured error handling

Severity: P1
Type: frontend reliability risk
Evidence: `public/foundation.js:4470`, `public/foundation.js:4682`, `public/foundation.js:4688`

What is happening:

`foundationRead()` wraps fetch with token headers, but has no timeout, abort signal, request id, cache mode, or structured JSON error parsing. Callers throw generic errors.

Why it matters:

A hung or slow API can leave loading states unresolved, and browser QA cannot distinguish auth failure, endpoint failure, timeout, or stale cache.

Fix now or backlog:

Fix now with route guard if possible.

Hardening card:

`FOUNDATION-FRONTEND-READ-ERRORS-001` - add request timeout, abort support, structured error parsing, and route-aware cancellation.

### 21. `getDocSourceSnapshot()` can hide stale fallback source truth

Severity: P1
Type: source-truth drift / false confidence
Evidence: `lib/foundation-db.js:5125`, `lib/foundation-db.js:5132`, `lib/foundation-db.js:14799`, `lib/foundation-db.js:14854`, `lib/foundation-db.js:18055`, `lib/foundation-db.js:18060`

What is happening:

The doc source snapshot path can fall back from live reads to stored `doc_source_snapshots` with only a warning. Callers do not receive a clear degraded/stale status.

Why it matters:

A payload can be generated "now" while carrying older source-backed values.

Fix now or backlog:

Fix now for strategy/source-truth surfaces.

Hardening card:

`DOC-SOURCE-SNAPSHOT-DEGRADED-STATUS-001` - return `sourceStatus`, `fallbackReason`, and `asOf`, then force UI/API callers to show degraded state.

### 22. Read-only DB gate does not cover all tables read by snapshot paths

Severity: P1
Type: verifier/test gap
Evidence: `lib/foundation-db.js:44`, `lib/foundation-db.js:7620`, `lib/foundation-db.js:9924`, `lib/foundation-db.js:9927`, `lib/foundation-db.js:9943`

What is happening:

The read-only gate has a hardcoded allowlist and omits tables later created/queried in the same module, including `doc_source_snapshots`.

Why it matters:

The gate can say DB is ready while later read-only paths fail on missing tables.

Fix now or backlog:

Fix now for audit trust.

Hardening card:

`READ-ONLY-GATE-SCHEMA-COVERAGE-001` - derive required tables from registered store/snapshot dependencies or fail when query-referenced tables are missing from the read-only gate.

### 23. `withFoundationAdvisoryLock()` does not bind work to the locked client

Severity: P1
Type: concurrency bug / false safety
Evidence: `lib/foundation-db.js:7419`, `lib/foundation-db.js:7426`, `lib/foundation-db.js:7428`

What is happening:

The helper takes a session advisory lock on one client, then calls `work()` without passing that client. DB work inside `work()` can use other pool clients. It also uses blocking `pg_advisory_lock`.

Why it matters:

The code looks locked but does not necessarily lock the work. Under concurrent writers, this can create false confidence.

Fix now or backlog:

Fix now if used for seed/write coordination.

Hardening card:

`FOUNDATION-ADVISORY-LOCK-CLIENT-SCOPE-001` - pass the locked client into protected work, add try-lock/timeout behavior, and test concurrent writers.

### 24. Verifier subprocesses do not have a read-only contract

Severity: P1
Type: verifier integrity / mutation risk
Evidence: `scripts/foundation-verify.mjs:984`, `scripts/foundation-verify.mjs:993`, `scripts/foundation-verify.mjs:13373`, `scripts/foundation-verify.mjs:13446`

What is happening:

The verifier shells out to `npm run` with inherited environment. It does not require invoked scripts to declare `readOnly: true`, `mutatesDb: false`, or `externalWrites: false`.

Why it matters:

If a child script's defaults change, `foundation:verify` can start executing writes.

Fix now or backlog:

Fix now.

Hardening card:

`VERIFIER-SUBPROCESS-CONTRACT-001` - require structured read-only/no-write contracts for verifier-invoked scripts.

### 25. Verifier uses brittle stdout checks for external health

Severity: P1
Type: false confidence / brittle gate
Evidence: `scripts/foundation-verify.mjs:13449`, `scripts/foundation-verify.mjs:13453`, `scripts/foundation-verify.mjs:13464`

What is happening:

Success is inferred from exact strings such as `Summary: 12/12 checks passed`.

Why it matters:

A script can print the string while behavior regresses, or add a legitimate check and break verifier string matching.

Fix now or backlog:

Backlog unless these checks are release-blocking.

Hardening card:

`STRUCTURED-HEALTH-RESULTS-001` - replace stdout scraping with JSON contracts.

### 26. Artifact/API claims are mostly static string checks

Severity: P1
Type: false confidence / test gap
Evidence: `scripts/foundation-verify.mjs:1051`, `scripts/foundation-verify.mjs:1065`, `scripts/foundation-verify.mjs:1081`, `scripts/foundation-verify.mjs:1186`

What is happening:

The verifier checks whether files/scripts/API strings appear. API existence can mean a route string is in `server.js`; it does not prove method, auth, handler wiring, runtime response, or schema.

Why it matters:

The product route can be broken while artifact-claim proof passes.

Fix now or backlog:

Backlog, high leverage.

Hardening card:

`ARTIFACT-CLAIM-PROBE-001` - turn claimed routes/scripts into deterministic runtime probes.

## P2 Findings - Real But Not First

### 27. Private API responses should explicitly use no-store

Severity: P2
Type: privacy/cache boundary
Evidence: `server.js:562`, `server.js:3795`, `server.js:5324`

What is happening:

`cacheHeadersNoStore()` exists at `server.js:562`, but key authenticated JSON routes return directly through `res.json()` without explicitly setting it.

Why it matters:

Owner/admin payloads should not rely on default client/proxy behavior.

Fix now or backlog:

Backlog, unless Foundation is accessed over shared/proxied networks.

Hardening card:

`FOUNDATION-PRIVATE-API-NO-STORE-001`.

### 28. Build-log endpoint shells out to git and returns duplicate grouped/full payloads

Severity: P2
Type: performance risk
Evidence: `server.js:3735`, `server.js:3737`, `server.js:3745`, `server.js:6858`, `server.js:6865`, `server.js:6866`

What is happening:

`getRecentBuildLog()` shells out to `git log` at request time, parses commit file lists, enriches closeouts, then `/api/foundation/build-log` returns both `groups` and full `builds`.

Observed result:

`/api/foundation/build-log?limit=60` returned `514,564` bytes.

Fix now or backlog:

Backlog.

Hardening card:

`BUILD-LOG-API-CACHE-AND-SLIM-001`.

### 29. Source filters and source lifecycle render heavy DOM synchronously

Severity: P2
Type: frontend performance risk
Evidence: `public/foundation.js:12193`, `public/foundation.js:12219`, `public/foundation.js:12233`, `public/foundation.js:14550`, `public/foundation.js:14582`

What is happening:

Source search clears and rebuilds the full source board on input. Source lifecycle appends many large panels synchronously after one payload.

Why it matters:

As source contracts and lifecycle sections grow, these routes will jank.

Fix now or backlog:

Backlog, but measure through browser QA.

Hardening card:

`FOUNDATION-SOURCE-ROUTE-RENDER-PERF-001`.

### 30. Global state makes route behavior order-dependent

Severity: P2
Type: frontend maintainability / QA risk
Evidence: `public/foundation.js:188`, `public/foundation.js:205`, `public/foundation.js:208`, `public/foundation.js:9098`, `public/foundation.js:12234`

What is happening:

Backlog, source, and FUB view states are global and persist across route visits.

Why it matters:

Browser QA can become order-dependent. A user can see a filtered or stale view because a previous route mutated shared state.

Fix now or backlog:

Backlog after route guard and cache invalidation.

Hardening card:

`FOUNDATION-FRONTEND-STATE-BOUNDARIES-001`.

### 31. CSS hides overflow instead of proving layout safety

Severity: P2
Type: layout risk / frontend QA risk
Evidence: `public/styles.css:49`, `public/styles.css:6797`, `public/styles.css:6936`, `public/styles.css:1494`

What is happening:

Global/body/shell/main use `overflow-x: hidden`, and some fixed grid layouts need wide content. Hidden overflow can clip controls rather than expose a scroll failure.

Why it matters:

The UI can look "not horizontally scrolling" while content is inaccessible.

Fix now or backlog:

Backlog, but add browser overflow checks immediately to QA doctrine.

Hardening card:

`FOUNDATION-OVERFLOW-SENTINEL-001`.

### 32. Mobile nav and focus states need accessibility hardening

Severity: P2
Type: accessibility / UX risk
Evidence: `public/foundation.html:82`, `public/styles.css:6900`, `public/styles.css:6918`, `public/styles.css:7342`

What is happening:

The mobile nav toggle lacks static `aria-controls` / `aria-expanded` handling, and key nav/summary controls have hover styling without a consistent `:focus-visible` standard.

Why it matters:

Keyboard and screen-reader users can lose position in dense Foundation views.

Fix now or backlog:

Backlog unless this dashboard is used by non-owner users soon.

Hardening card:

`FOUNDATION-MOBILE-NAV-A11Y-001` plus `FOUNDATION-FOCUS-VISIBLE-STANDARD-001`.

### 33. CSS has undefined tokens and expensive visual effects

Severity: P2
Type: style maintainability / paint performance
Evidence: `public/styles.css:4839`, `public/styles.css:4865`, `public/styles.css:6801`, `public/styles.css:6940`

What is happening:

Some rules reference tokens not defined in `:root`, and frosted glass/backdrop blur is used on the shell/panels.

Why it matters:

Undefined tokens create inconsistent fallback behavior. Blur/backdrop effects can become costly during frequent dashboard re-renders.

Fix now or backlog:

Backlog.

Hardening card:

`CSS-TOKEN-REGISTRY-CHECK-001` plus `FOUNDATION-GLASS-PERFORMANCE-BUDGET-001`.

### 34. Admin token has owner-level blast radius

Severity: P2
Type: security tradeoff
Evidence: `server.js:901`, `server.js:917`, `lib/security-access.js:410`, `lib/security-access.js:471`

What is happening:

A valid admin token is treated as system/owner-grade access. Owner routes intentionally allow this.

Why it matters:

This is acceptable for local/internal operator use, but a leaked token is effectively owner API access.

Fix now or backlog:

Backlog unless the token is used outside localhost or shared with non-owner contexts.

Hardening card:

`ADMIN-TOKEN-SCOPING-AND-AUDIT-001`.

## Acceptable Tradeoffs

- The Foundation app being plain JS is acceptable during fast internal iteration. The issue is not "no framework"; the issue is missing route guards, cache boundaries, and payload budgets.
- Wide source tables are acceptable for dense operator data if scroll wrappers are explicit and parent containers do not hide failures.
- The localhost owner bypass is acceptable for local development because it checks socket locality and host header. The larger security concern is owner-token blast radius and write-capable process scripts.
- Some historical closeout checks can contain dated sprint IDs if they are clearly historical and never run as active/current truth checks.
- The build-log history living in code was a pragmatic start, but it is now too large and should move to structured data or DB-backed source after higher-risk write-boundary work.

## Recommended Next Hardening Sprint

Do **not** open this automatically. This is the exact sprint I recommend Steve reviews and then opens if accepted.

Sprint name:

`foundation-runtime-safety-hardening-2026-05-13`

Goal:

Make Foundation safe to verify and safe to operate before any product expansion: read-only verifier, no accidental check-script writes, guarded sprint/backlog mutations, and bounded hub performance.

Pull order:

1. `VERIFY-READONLY-GATE-001` - make `foundation:verify` read-only and fail-closed against live state.
2. `PROCESS-CHECK-APPLY-BOUNDARY-001` - make `process-*-check` no-write by default and require explicit apply/close/write flags.
3. `PROCESS-CHECK-SCHEDULED-MUTATION-GUARD-001` - block scheduled health jobs from running mutating check scripts.
4. `FOUNDATION-DB-INIT-SEED-SPLIT-001` - split schema init from seed/live repair/doc snapshot writes.
5. `CURRENT-SPRINT-MUTATION-GUARDS-001` - protect active sprint overlay writes with expected sprint, apply mode, diff preview, and change events.
6. `BACKLOG-STORE-CONCURRENCY-001` - prevent lost updates in backlog mutation paths.
7. `BACKLOG-DONE-PROOF-FK-001` / `VERIFIER-COVERAGE-REGISTRY-001` - replace prose/ID-only done proof with typed proof references.
8. `FOUNDATION-HUB-REQUEST-BUDGET-001` - add timings, timeouts, and payload budgets for `/api/foundation-hub`.
9. `KPI-HEALTH-HOT-ROUTE-CACHE-001` - cache and timeout KPI health so source/hub routes stay responsive.
10. `FOUNDATION-ROUTE-RENDER-GUARD-001` - prevent frontend async route races.

If that is too much for one sprint, cut after card 6 and leave hub/frontend performance for the next sprint. Do not skip cards 1-6.

## Bottom Line

The Foundation system has real useful structure: source contracts, backlog truth, build closeouts, route posture, and process gates are all present. But the current implementation has too many places where proof, health checks, and "check" scripts can write the thing they are proving.

That is the core risk.

The next sprint should harden write boundaries and verifier truth before building anything new.
