# Foundation Control + Backlog Compression Sprint Plan

## What

Ship a backend Foundation sprint that adds a governed feedback queue, deterministic feedback triage, backlog health monitoring, sprint proposal generation, live system-flow mapping, done velocity, acknowledged-state handling, and incremental verifier planning.

## Why

Steve pointed out the system still has nearly 200 active/review-needed Foundation cards. The next useful work is not another tiny setup sprint and not auth-sensitive extraction. It is the control layer that makes the large Foundation backlog easier to run without losing chat feedback, re-litigating acknowledged gaps, or opening autonomous dev.

## Acceptance Criteria

- The sprint is visible in live DB before implementation starts.
- All eight cards have complete doctrine and Plan Critic pass rows at 9.8+ before build.
- Feedback capture writes durable, reviewable records without routing or applying changes.
- Feedback triage produces deterministic proposed routing only.
- Backlog monitor reports stale, duplicate, proof-risk, research-survivor, and ghost-completion candidates without mutating backlog.
- Sprint advisor produces next-sprint options without opening sprints.
- System flow map is generated from live source/job/atom/synthesis/action/backlog state.
- Done velocity uses reliable done/closeout timestamps and marks inferred data honestly.
- Acknowledged states have owner, reason, review date/expiry, and related card/source refs.
- Incremental verifier coverage maps changed files/cards to focused checks and falls back to full verification for protected paths.

## Definition Of Done

- Code, API snapshots, focused proof script, build log closeout, current plan/state notes, and verifier coverage exist.
- All eight cards are closed in live backlog and Done This Sprint only after proof passes.
- The focused proof calls actual functions and DB/API-style round trips; substring-only proof is rejected.
- Full Foundation ship gate passes once for the sprint closeout.

## Details

Existing code to reuse: `foundation_sprints`, `foundation_sprint_items`, `plan_critic_runs`, `backlog_items`, `change_events`, current sprint helpers, backlog hygiene patterns, foundation build log, `server.js` Foundation APIs, and the current verifier. Existing docs to reuse: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, the Build Intel direction capture, and the research purge report. Existing scripts to reuse: `backlog:hygiene`, `foundation:verify`, `process:foundation-ship`, and a focused process check for this sprint.

V1 should add deterministic code first. The only "advisor" behavior in this sprint is proposal generation from rules and live data. No output opens a sprint, changes a card, mutates a decision, or starts a build without Steve+Codex approval.

## Risks

- This could become another abstract control sprint. Mitigation: each card must expose a real function/API snapshot and proof data.
- Advisor output could look like automatic dev. Mitigation: every proposal includes `proposalOnly: true` and write actions stay false.
- Incremental verification could weaken the gate. Mitigation: protected/server/security/database/runtime/verifier paths fall back to full verification.
- Acknowledged states could become permanent silence. Mitigation: owner, reason, review date, and expiry are required.

## Tests

- `npm run process:foundation-control-compression-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=FEEDBACK-CAPTURE-001 --planApprovalRef=docs/process/approvals/FEEDBACK-CAPTURE-001.json --closeoutKey=foundation-control-backlog-compression-v1 --commitRef=HEAD`

## Not Next

- Do not run external extraction or paid-source auth.
- Do not build Skool, myICOR, Loom, YouTube extraction implementation, or Build Scoper execution.
- Do not build hubs, Directors, Reply/Watching Loop, Telegram bots, marketing production, or autonomous dev.
- Do not mutate Drive permissions, run Meeting Vault Phase B, or send request-access emails.

