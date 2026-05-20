# 2026-05-20 Orchestrator Builder Run Checkpoint

## Current Truth

- Repo: `main == origin/main` at `d05295fa` before this checkpoint handoff.
- Current Sprint: `FOUNDATION-CONTROL-PLANE-AND-BRAIN-FLEET-READINESS-2026-05-20`.
- Active blocker: `FOUNDATION-GATE-CHECK-SERIALIZATION-001`.
- System Health: healthy, raw 0 risk / 0 watch.
- Deep-audit closure gate: healthy.
- Current Sprint active-card gate: healthy.
- Repeated-failure action gate: healthy.
- Backlog hygiene: healthy, 774 cards, 0 findings.
- Reliability wrinkle: a concurrent Orchestrator proof bundle caused a Postgres deadlock in System Health, but the same System Health check passed when rerun sequentially. This is a false-red risk, not current system-health debt.

The Foundation control plane is green enough to build. Do not rerun another full audit before starting unless a gate turns red/yellow or a build exposes new rot.

## Conversation Decisions Captured

- Steve wants Builder on one lane while he is away, not dual-lane yet.
- Strategy/People are parked until Brain Fleet and extractor proof make the system useful.
- Foundation must stay green; if health/gates turn red or yellow, stop value progression and repair.
- The old BCrew-Buddy auth escalation system must be harvested instead of redesigned.
- The extractor must not broad-crawl Skool/myICOR/Loom/YouTube before one approved proof path exists.
- Brain Fleet is not a subscription farm. It is a governed, owner-bound, workload-bound router with probes, ledger rows, quota/stop controls, and explicit provider limitations.
- Foundation, Brain Fleet, and service agents are separate layers:
  - Foundation owns contracts, routes, ledgers, source boundaries, and gates.
  - Brain Fleet owns model/provider selection.
  - Agents serve humans or jobs on top of Foundation and Brain Fleet.

## Cards Added Or Enriched

- `HARLAN-AUTH-ESCALATION-LOOP-001`: new P0 card harvested from old-system auth/2FA escalation.
- `FOUNDATION-GATE-CHECK-SERIALIZATION-001`: new P0 reliability card to serialize DB-heavy proof checks and avoid false deadlocks during long or future dual-lane runs.
- `EXTRACTOR-BRAIN-FLEET-PROOF-001`: enriched with auth-loop dependency for paid/private source proof.
- `SKOOL-APPROVED-LESSON-EXTRACT-PROOF-001`: enriched with auth-loop dependency.
- `MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001`: enriched with auth-loop dependency.
- `BUILD-INTEL-EXTRACTION-IMPLEMENTATION`: enriched with auth-loop dependency.
- `AGENT-BRAIN-FOUNDATION-SEPARATION-001`: kept as P1 doctrine after extractor proof, not a blocker.
- `CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001`: kept P1/experimental; do not block extractor v1 if Claude posture is ambiguous.

Old-system source files for auth-loop harvest:

- `/Users/bensoncrew/bcrew-buddy-reference/scripts/auth-escalate.cjs`
- `/Users/bensoncrew/bcrew-buddy-reference/skills/knowledge/auth-escalation-protocol.md`
- `/Users/bensoncrew/bcrew-buddy-reference/scripts/browser-auth.cjs`
- `/Users/bensoncrew/bcrew-buddy-reference/scripts/myicor-auth.cjs`
- `/Users/bensoncrew/bcrew-buddy-reference/src/web-extractor.ts`
- `/Users/bensoncrew/bcrew-buddy-reference/src/reply-context.ts`
- `/Users/bensoncrew/bcrew-buddy-reference/src/telegram-api.ts`

## Next Builder Run Order

Core run:

0. `FOUNDATION-GATE-CHECK-SERIALIZATION-001`
1. `BRAIN-FLEET-FOUNDATION-001`
2. `BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001`
3. `CODEX-DIRECT-SUBSCRIPTION-ROUTE-001`
4. `GEMINI-VIDEO-BRAIN-ROUTE-001`
5. `CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001`
6. `OPENCLAW-ADAPTER-BOUNDARY-001`
7. `BRAIN-FLEET-QUOTA-LEDGER-001`
8. `HARLAN-AUTH-ESCALATION-LOOP-001`
9. `EXTRACTOR-BRAIN-FLEET-PROOF-001`
10. `YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001`

Continue only if core proof stays green:

11. `SKOOL-APPROVED-LESSON-EXTRACT-PROOF-001`
12. `MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001`
13. `EXTRACTOR-OVERNIGHT-RUN-GUARD-001`
14. `BUILD-INTEL-EXTRACTION-IMPLEMENTATION`

Parked unless directly required:

- `AGENT-BRAIN-FOUNDATION-SEPARATION-001`
- `STRATEGY-003`
- People/Strategy Hub expansion

## Builder Copy/Paste

Fresh run. Do not use stale Strategy/People day-plan.

Current truth:

- Foundation control plane is green.
- Active blocker is `FOUNDATION-GATE-CHECK-SERIALIZATION-001`.
- Strategy/People are parked.
- Build one lane only.

Mission:

Build Brain Fleet and extractor readiness so we can run governed Build Intel extraction today without breaking Foundation health.

Run order:

0. `FOUNDATION-GATE-CHECK-SERIALIZATION-001`
   Fix the false-red risk before the long run. A concurrent Orchestrator proof bundle produced a Postgres deadlock, while the same System Health check passed sequentially. Add a small serialization guard for DB-heavy Foundation proof checks: classify heavy checks, use a shared advisory/local lock or standard proof wrapper, document sequential heavy-check behavior, and dogfood that concurrent proof attempts do not create misleading raw health failures. Do not weaken real DB failures.

1. `BRAIN-FLEET-FOUNDATION-001`
   Build the thin provider-agnostic Brain Fleet layer over existing `llm_credentials`/`llm_routes`. Reuse existing LLM router and credential registry. Do not rebuild them. Prove extractor/synthesis jobs can call the router contract instead of hardcoding OpenClaw/provider paths.

2. `BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001`
   Record route capability truth: provider, model, speed mode, reasoning posture, video/vision/long-context support, quota posture, auth posture, known limitations, and allowed workloads.

3. `CODEX-DIRECT-SUBSCRIPTION-ROUTE-001`
   Add/probe a bounded direct Codex subscription route separate from OpenClaw. Record account label, model availability, speed/Fast availability, quota/status, and call ledger entry. No external writes.

4. `GEMINI-VIDEO-BRAIN-ROUTE-001`
   Add/probe Gemini for video/long-context extraction workloads. Record auth method, quota tier, video/long-context capability, artifact contract, and fallback. No broad extraction yet.

5. `CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001`
   Probe Claude Code / Agent SDK only as a bounded local route. If subscription/SDK posture is ambiguous, mark experimental and continue. Do not block extractor v1 on Claude.

6. `OPENCLAW-ADAPTER-BOUNDARY-001`
   Demote OpenClaw to adapter status. Keep it useful, but do not let OpenClaw limitations define Foundation architecture.

7. `BRAIN-FLEET-QUOTA-LEDGER-001`
   Every Brain Fleet call must write ledger truth: workload, route, model, account label, status, artifact, quota/reset state if known, failure reason, and stop condition. Overnight work must stop on auth/rate/quota/provider failures.

8. `HARLAN-AUTH-ESCALATION-LOOP-001`
   Harvest the old BCrew-Buddy auth/2FA loop. Do not invent a new one. Reuse the proven pattern from `auth-escalate.cjs`, `browser-auth.cjs`, `web-extractor.ts`, `reply-context.ts`, and `auth-escalation-protocol.md`.

   Build v1 as: extractor/Harlan job emits `auth_needed` -> records blocked-auth event -> notifies Steve through Harlan/Telegram/email path -> waits for DONE/approval -> re-verifies -> resumes or fails closed.

   Proof must simulate 2FA/auth-needed, dedup/no spam, timeout/fail closed, DONE/retry/resume, and no credential mutation. Do not send external messages except one approved Steve-only test or dry-run proof.

9. `EXTRACTOR-BRAIN-FLEET-PROOF-001`
   Run first governed extractor proof through Brain Fleet. Done means approved source item recorded, transcript captured or generated, artifact stored, provenance/source links preserved, atoms created, training notes/summary created, Build Intel review route created, duplicate/staleness guard applied, and skipped/error reasons logged.

10. `YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001`
   Start with one approved public YouTube video from the Build Intel watchlist. Only after it passes, run a small bounded last-20 batch. Stop on quota, transcript failure spike, duplicate explosion, or route failure.

Then, only if the first ten stay green and Steve has approved exact source items:

11. `SKOOL-APPROVED-LESSON-EXTRACT-PROOF-001`
12. `MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001`
13. `EXTRACTOR-OVERNIGHT-RUN-GUARD-001`
14. `BUILD-INTEL-EXTRACTION-IMPLEMENTATION`

Hard guardrails:

- No broad Skool crawl.
- No broad myICOR crawl.
- No broad Loom crawl.
- No credential mutation.
- No external writes.
- No provider/account workaround that violates terms.
- No growing watched root files with new logic.
- Do not add meaningful logic directly to `server.js`, `foundation-db.js`, `foundation.js`, or `foundation-verify.mjs`; split modules first.
- Heavy Foundation DB checks should run sequentially until `FOUNDATION-GATE-CHECK-SERIALIZATION-001` ships. After it ships, use the new serialization wrapper/guard instead of ad hoc parallel proof bundles.

Stop and report if:

- System Health turns red/yellow.
- Deep-audit closure gate fails.
- Repeated-failure action gate fails.
- Backlog hygiene fails.
- A paid/private source needs Steve auth or exact source approval.
- Provider/subscription policy is ambiguous.
- Brain Fleet route cannot ledger calls.
- Extractor proof cannot preserve artifacts/provenance.

Proof after each shipped card:

- focused card proof
- System Health
- repeated-failure gate
- backlog hygiene
- `foundation:verify`
- `process:foundation-ship`
- clean pushed main

Pause when the run is done with a report. Do not continue into Strategy/People without Steve approval.

## Orchestrator Note

Do not mistake "green Foundation" for "all future products are built." Green means the control plane and gates are clean enough to build on. The next value proof is Brain Fleet plus one governed extractor path.
