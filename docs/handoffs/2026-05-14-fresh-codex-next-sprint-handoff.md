# Fresh Codex Handoff — Foundation Speed + Cleanup

Date: 2026-05-14

Repo state at handoff:

- Branch: `main`
- HEAD / origin: `7d287210d640e91d2fbd2e405e90ff039da5dee7`
- Latest commit: `7d28721 Bound foundation full diagnostics`
- Working tree before this handoff doc: clean
- Latest sprint closed: `foundation-full-diagnostics-perf-2026-05-14`
- Full ship gate passed: `process:ship-check 31/31`, `process:fanout-check 22/22`, `process:post-ship-fanout 8/8`, `foundation:verify 300/300`
- Latest focused proof: `/api/foundation-hub?view=full` measured `7.704965s / 4,767,720B`, under the `15s / 5.5MB` sprint budget.

## Why Steve Is Frustrated

Steve is right that the last closeout felt slow. The last card looked done on the board before the repo was actually pushed because the full verification loop still took too long and hit unrelated freshness friction:

- The full ship gate includes a large verifier pass.
- One run failed late on stale `LLM-AUTH-AUDIT-001` freshness, then the approved `llm-auth-audit` job had to be refreshed.
- The final full gate passed cleanly, but the cycle from "card looks done" to "pushed and trusted" was too slow.

Do not hand-wave this as normal. The system is safer now, but the feedback loop is not tight enough.

## Operating Frame

Steve is about 73 days into AI-assisted coding. Treat him as the founder/operator and idea layer, not the senior engineer responsible for catching architectural rot. Codex must proactively flag:

- slow gates and slow endpoints
- oversized files and monolith drift
- verifier/check paths that mutate or self-repair
- stale external dependencies that fail late
- green checks that do not prove behavior
- velocity that hides quality debt

Dogfood proof remains mandatory. A card is not done unless it recreates or simulates the failure it claims to fix and proves the new behavior blocks it, fails closed, or fixes it.

## What Actually Shipped Last Sprint

The last sprint was not empty work:

- Added `lib/foundation-hub-full-diagnostics.js`.
- Bounded slow full-diagnostics Agent Feedback / ClickUp work with deadline source-health behavior.
- Added ClickUp request timeout and page-cap options.
- Added injected roster snapshot getters for Agent Feedback readiness builders.
- Added bounded concurrency to Agent Feedback auto-send checks.
- Reused the same bounded diagnostics in `/api/ops-hub`.
- Added focused proof script `process:foundation-full-diagnostics-perf-check`.
- Added verifier coverage for the sprint and closeout.

Remaining limit: the full route is now bounded but still large at ~4.7MB. The verifier is still large and slow. Monoliths are still real.

## Recommended Next Sprint

Sprint name: `Foundation Ship-Gate Speed + Payload Cleanup Sprint`

Goal: make the Foundation build loop faster and more predictable without weakening trust. A developer should be able to find stale job/source blockers before the expensive ship gate, and full diagnostics should keep shrinking.

Cards:

1. `SHIP-GATE-FAST-PREFLIGHT-001`
   - Add a fast preflight before `process:foundation-ship` enters the expensive verifier.
   - It should catch stale freshness blockers like `LLM-AUTH-AUDIT-001 latestJob=missing` in seconds, not after a full verifier run.
   - It should report exact fix commands when the blocker is an approved manual refresh job.
   - Dogfood: simulate stale/missing LLM auth audit freshness and prove the preflight fails early with the exact command `npm run foundation:job -- --job=llm-auth-audit --actor=codex-llm-auth-audit-proof`.

2. `FOUNDATION-VERIFY-TIMING-001`
   - Add section/check timing to `foundation:verify` output or a companion profile command.
   - Record top slow sections and total runtime.
   - Dogfood: run verifier/profile and prove it identifies the slowest sections instead of only printing pass/fail.
   - Acceptance target: future closeouts can say where verifier time is going.

3. `FOUNDATION-VERIFY-MODULE-SPLIT-002`
   - Continue modularizing `scripts/foundation-verify.mjs`.
   - Split one high-risk/high-churn verifier area into a named module with its own focused proof.
   - Do not broad-refactor the whole verifier in one pass.
   - Dogfood: focused module proof catches a synthetic failure that the module owns.

4. `FOUNDATION-HUB-FULL-PAYLOAD-REDUCE-001`
   - Reduce `/api/foundation-hub?view=full` payload from ~4.77MB toward a tighter budget by moving heavy panels to detail endpoints or summary/detail shape.
   - Keep default `/api/foundation-hub` fast.
   - Dogfood: measure before/after with byte count and prove full route stays under the new agreed budget.

5. `SHIP-GATE-FRESHNESS-OWNERSHIP-001`
   - Document and expose which freshness checks are expected to be manual, scheduled, or source-health degraded.
   - Prevent surprise late failures by listing freshness owners in Runtime Health or the ship preflight output.
   - Dogfood: stale manual job shows as an actionable preflight item, not a mystery verifier failure.

Stretch only if the first five close cleanly:

6. `SERVER-MONOLITH-SPLIT-001`
   - Split one Foundation route cluster out of `server.js`.
   - Do not mix this with hub UI/product work.

## Hard Rules For The Fresh Chat

- Read `AGENTS.md`, `SOUL.md`, `USER.md`, today/yesterday memory, and `MEMORY.md` if this is the main session.
- Start from live repo state. Do not trust this handoff blindly; verify `git status`, `git log -1`, and current runtime health.
- Open the sprint visibly in the live sprint system.
- All cards start in Scoping.
- Doctrine and Plan Critic approval per card before Building Now.
- One card Building Now at a time.
- Dogfood proof per card.
- No Build Intel, no Sales/Ops hub feature work, no paid-source auth work, no broad refactor.
- Do not weaken verifier checks just to make green faster.
- If a dependency is stale but the verifier is correct, refresh the approved source/job and keep the verifier strict.

## Exact Prompt Steve Can Paste

Use this as the opening message in a fresh Codex chat:

> We are continuing the Foundation rebuild from repo `/Users/bensoncrew/bcrew-ai-os`.
>
> Read `AGENTS.md`, `SOUL.md`, `USER.md`, `memory/2026-05-14.md`, `memory/2026-05-13.md`, `MEMORY.md`, and `docs/handoffs/2026-05-14-fresh-codex-next-sprint-handoff.md`.
>
> Current pushed HEAD should be `7d28721 Bound foundation full diagnostics`. Verify repo/runtime state first.
>
> Steve is frustrated because the last card looked done on the board at 6:40 but verification/push took about 30 more minutes. We need to attack Foundation feedback-loop speed without weakening trust.
>
> Open the next sprint: `Foundation Ship-Gate Speed + Payload Cleanup Sprint`.
>
> Cards:
> - `SHIP-GATE-FAST-PREFLIGHT-001`
> - `FOUNDATION-VERIFY-TIMING-001`
> - `FOUNDATION-VERIFY-MODULE-SPLIT-002`
> - `FOUNDATION-HUB-FULL-PAYLOAD-REDUCE-001`
> - `SHIP-GATE-FRESHNESS-OWNERSHIP-001`
> - Stretch only if clean: `SERVER-MONOLITH-SPLIT-001`
>
> Full process: live sprint open, all cards Scoping first, doctrine per card, Plan Critic >=9.8, one card Building Now at a time, dogfood proof per card, full focused proof and Foundation ship gate before push.
>
> Do not do hub feature work, Build Intel, paid auth, broad refactor, or verifier weakening. Goal is to make ship blockers show up early, profile verifier time, split one verifier module, and shrink the full Foundation Hub payload.

