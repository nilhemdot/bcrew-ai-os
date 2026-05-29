# Source Browser Cost And Virtual Desktop Checkpoint

Date: 2026-05-28

## Current Truth

Steve bought the Browserbase Startup plan for one month. Treat that paid month as a proof/bakeoff window, not the default architecture. After the paid month, downgrade/cancel unless the bakeoff proves Browserbase is worth renewing.

The preferred architecture is:

1. Headless/local deterministic workers for normal public extraction.
2. Local virtual browser/desktop workers for logged-in browser work that needs real eyes/hands without stealing Steve's remote desktop.
3. Browserbase only as a measured fallback or production-hosted option if it clearly beats the local route.

The immediate risk is cost confusion. Stagehand/Browserbase does not automatically use Codex or Claude subscription credits. The successful Browserbase smoke proof used an API-style model route (`openai/gpt-4.1-mini`). The default `codex` route failed because Stagehand expects a provider/model it supports. So broad Browserbase automation must not run until model routing and spend caps are explicit.

## Backlog Cards Stabbed

- `SOURCE-BROWSER-RUNTIME-COST-GUARDRAILS-001`
  - Add fail-closed cost/model/runtime caps before any Browserbase/Stagehand/source-browser autopilot loop.
- `SOURCE-BROWSER-BRAIN-ROUTE-POLICY-001`
  - Decide and prove which brains can drive source-browser work: local subscription tooling, API routes, Browserbase model gateway, or deterministic workers.
- `LOCAL-VIRTUAL-BROWSER-HANDS-RUNTIME-001`
  - Build the local virtual browser/desktop worker so AIOS can run source-browser hands without taking over Steve's main Mac mini remote session.
- `BROWSERBASE-ONE-MONTH-BAKEOFF-001`
  - Compare Browserbase against local virtual browser hands before keeping or cancelling it.

Existing related cards remain active:

- `SOURCE-BROWSER-AGENTIC-RUNTIME-001`
- `SOURCE-SESSION-BROKER-001`
- `FREE-SKOOL-COMMUNITY-GOD-MODE-RUNNER-001`
- `HARLAN-AUTH-LIVE-DELIVERY-002`

## Overnight Plan

### 1. Finish The Checkpoint And Green Proof

Do not start broad browser automation first. Verify the new backlog cards and current source-session changes, then keep the worktree clean.

Proof targets:

- `node --check` on changed source/session/browser files.
- `npm run process:source-session-broker-check -- --json`
- `npm run process:source-session-readiness-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`

### 2. Build Cost Guardrails Before More Browserbase

Build `SOURCE-BROWSER-RUNTIME-COST-GUARDRAILS-001` first.

Required behavior:

- Browserbase cannot become default just because env keys exist.
- Stagehand cannot default to unsupported `codex` and then fail late.
- Any API/browser run must show provider, model, env, browser mode, estimated cap, and run cap.
- Broad overnight Browserbase loops fail closed unless an explicit approved cap exists.
- Browserbase Startup stays proof-only during the paid month until the bakeoff card says otherwise.

### 3. Build Local Virtual Browser Hands Proof

Build the first slice of `LOCAL-VIRTUAL-BROWSER-HANDS-RUNTIME-001`.

Goal:

- Create an isolated browser/desktop lane that can run separately from Steve's main remote desktop.
- Keep one profile per source/account.
- Observe DOM, screenshots, browser prompts, account chooser, auth walls, and page state.
- Click/type/scroll only inside source policy.
- Stop for MFA/human verification and route to Harlan.
- Never use normal Chrome profile or interrupt Steve's working screen.

Dogfood targets:

- MyICOR Google SSO/account chooser.
- Free Skool/community page.
- Newsletter page.
- Browser restore/session prompt style failure.

### 4. Keep Browserbase As Bakeoff Only

Do not use Browserbase for broad extraction overnight.

Only after guardrails exist, run tiny comparison tasks:

- One public page.
- One repo.
- One newsletter page.
- One free-community page.
- One MyICOR auth-needed flow.

Measure:

- Success/failure.
- Manual intervention needed.
- Browser hours.
- API/model spend route.
- Evidence quality.
- Recovery quality.

### 5. If Blocked, Move To Safe Source Work

If virtual desktop proof blocks, do not thrash.

Move to safe bounded work:

- Harlan live auth delivery proof, if no external send is required without approval.
- Source-session readiness UI/readback polish.
- Dev source-stack cleanup/readback.
- Repo/public source readback improvements.
- Audit/system health repairs.

## What Not To Do Overnight

- Do not run mass Browserbase extraction.
- Do not run uncapped API model loops.
- Do not attempt Instagram/LinkedIn outreach automation.
- Do not claim MyICOR/Skool paid extraction is done.
- Do not use Steve's normal Chrome profile as the worker.
- Do not store or print raw secrets.
- Do not buy, subscribe, post, comment, message, download, or mutate accounts.

## Morning Success State

Best case by morning:

- Worktree clean and pushed.
- System health green.
- Browser cost guardrails built and proven.
- Local virtual browser hands first proof built or clearly parked with exact blocker.
- Browserbase remains a measured fallback, not an uncontrolled cost center.
- Steve can decide whether to keep Browserbase after a real bakeoff instead of guessing.
