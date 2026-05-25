# 2026-05-25 Full Conversation Checkpoint And Overnight Plan

## Why This Exists

Steve asked for a real checkpoint before more overnight work. The chat covered
UI design, Dev Data Pool, God Mode extraction, model routing, Brain Fleet,
Director/Scoper flow, YouTube scale-up, Skool/MyICOR next sources, and the
question of how to avoid another messy system.

This file is the single recovery point for the next session.

## Plain-English Current State

The system is not starting from chaos.

Foundation owns the shared source/data pool. The Dev page reads the Dev slice
from Foundation. The YouTube God Mode extractor is now using the Gemini API
video/audio/visual route for public YouTube videos. The Dev Intelligence
Director reads those Foundation reports and ranks build ideas against the AIOS
mission.

The remaining work is to finish the current YouTube baseline cleanly, review the
Director output, then move to the next source lanes through approved source
packets, not by broad crawling paid/private systems.

## What Was Done

### UI / Design

- `/dev` became the first live hub-page proof of the new style.
- `docs/specs/bcrew-ui-design-contract.md` was updated to v3.
- Hub pages must use the shared launcher topbar classes.
- `/dev` and hub launcher now share the same visible topbar behavior.
- Launcher station cards were converted to the locked card philosophy:
  - left status rails;
  - plain status text;
  - no chunky station status pills;
  - no tinted station win-box;
  - aligned dashed footers;
  - equal card heights on desktop and mobile.
- Logout exists in the launcher user menu for demo flow.
- Mascot rule captured: do not over-trim transparent mascot art; avoid blurry
  blue background haze and heavy halo shadows.

Commits:

- `3bf66dc3 Align launcher station card style`

Proof:

- `npm run process:hub-launcher-source-backed-values-check -- --json`
- desktop screenshot: `/tmp/bcrew-hub-launcher-style-lock-desktop-v2.png`
- mobile screenshot: `/tmp/bcrew-hub-launcher-style-lock-mobile-v2.png`

### LLM Routing / Brain Fleet

- Added governed route control CLI:
  - `npm run llm:route -- --show --json`
  - `npm run llm:route -- --profile=overnight --apply --json`
  - route-specific model/effort changes through `npm run llm:route`
- Runtime posture now shows:
  - synthesis: `openai / gpt-5.5 / quality / extra_high_required`
  - deep audit: `openai / gpt-5.5 / quality / extra_high_required`
  - text extraction: `openai / gpt-5.5 / quality / extra_high_required`
  - video eyes: `gemini / gemini-3.5-flash / quality / vision_multimodal`
  - OpenClaw routes: blocked
- `SYSTEM-014` is scoped for the Brain Fleet/System Control UI so Steve can
  see and eventually change model/provider/effort in one governed place.

Commits:

- `e7c40f2f Add LLM route control command`
- `237424b6 Upgrade intelligence spine routing`

Proof:

- `npm run llm:route -- --show --json`
- `npm run intelligence:spine-god-mode-check -- --json`

### God Mode / YouTube Extraction

- The accepted full-watch route for public YouTube is Gemini API video/audio/
  visual understanding.
- The Gemini Workspace/browser subscription route proved possible for bounded
  prompts but is not accepted as the reliable full-watch YouTube path.
- The current Mark batch command is guarded:

```bash
npm run process:mark-kashef-god-mode-small-batch-check -- --apply --live-gemini-api --batch-size=5 --model=gemini-3.5-flash --json
```

- The latest completed batch processed exactly five Mark videos:
  - `s-BHmRewyNI`
  - `TzJecWCbex0`
  - `mGfQV4s1MgE`
  - `1jlKUxqRQAw`
  - `eT_6uaHNlk8`
- Output from that batch:
  - 10 build candidates;
  - 15 timestamped visual evidence items;
  - 41 approval-required links;
  - 478,997 tokens;
  - status `ready_for_director_resynthesis`.

Commit:

- `d947669b Capture Mark batch director readiness`

Proof:

- Mark batch proof returned `healthy`.
- `npm run process:dev-team-intelligence-director-check -- --json`
- `npm run process:dev-team-hub-v0-check -- --json`
- `npm run intelligence:spine-god-mode-check -- --json`
- `npm run process:current-sprint-active-card-gate-check -- --json`

### Dev Intelligence Director

- Director report: `director:dev-team-intelligence-director-001:aios-mission-v0`
- Director status: `ready_for_steve_review`
- Current ranked candidate count: 108
- Top 5 after the latest refresh:
  1. Video-to-SOP Agentic Pipeline
  2. Claude Code State Parser & Visualizer
  3. Context-Forking Orchestrator Skill
  4. Shared-Directory State Passing
  5. Context-Optimized Skill Registry

Important: these are proposal-only. They did not become backlog cards
automatically.

## What Was Missed Before This Checkpoint

The earlier overnight checkpoint was too narrow. It captured style and the
running Mark batch, but did not clearly tie the full conversation to:

- all existing source-expansion cards;
- the end-to-end YouTube completion plan;
- the order of Director -> Scoper -> Promotion Gate;
- the fact that Skool/MyICOR are already carded but approval-bound;
- the difference between finishing Mark public YouTube and broad creator/source
  expansion.

This handoff closes that gap.

## Existing Cards That Cover The Conversation

### Active / Current Sprint

- `MARK-KASHEF-LAST-50-BASELINE-001`
  - Lane: executing
  - Job: finish the guarded Mark public YouTube full-watch baseline.

### UI / Design

- `SYSTEM-015`
  - Lane: scoped
  - V1 implementation applied.
  - Job: launcher station card alignment and style lock.

### Brain Fleet / LLM Control

- `SYSTEM-014`
  - Lane: scoped
  - Job: Foundation Brain Fleet/System Control page showing every LLM-powered
    package/tool, model, provider, effort, status, and approved switch path.

### Dev Intel Review / Promotion

- `BUILD-OPPORTUNITY-PROMOTION-GATE-001`
  - Lane: scoped
  - Job: approve/reject Director candidates before any become backlog work.

- `INTEL-SCOPER-001`
  - Lane: done
  - Job already shipped the backend Scoper pattern.
  - Next useful work is not to rebuild Scoper from scratch; it is to use or
    surface it correctly for selected Director candidates.

### Next Sources

- `SKOOL-LIVE-NAVIGATION-PROOF-002`
  - Lane: scoped P0
  - Job: run one approved Skool community/lesson navigation proof after source
    approval.

- `SKOOL-APPROVED-LESSON-EXTRACT-PROOF-001`
  - Lane: scoped P0
  - Job: run one approved Skool lesson extraction proof.

- `MYICOR-LIVE-NAVIGATION-PROOF-002`
  - Lane: scoped P0
  - Job: run one approved MyICOR course navigation proof.

- `MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001`
  - Lane: scoped P0
  - Job: run one approved MyICOR lesson extraction proof.

- `BUILD-INTEL-SOURCE-VALUE-LEADERBOARD-001-001`
  - Lane: scoped P1
  - Job: rank source families/creators by actual value after enough extracted
    evidence exists.

## Decisions Captured

- Foundation is the data pool. Hubs consume slices of Foundation truth.
- YouTube extraction is Foundation-owned, not Dev-owned.
- Dev Intelligence Director is the first hub-specific reader/interpreter.
- Broad source extraction must not create backlog cards automatically.
- The system should finish public YouTube Mark baseline before jumping into
  private/paid Skool/MyICOR extraction.
- Skool/MyICOR should start with approved one-source/one-lesson navigation or
  extraction proofs, not broad community/course crawling.
- LLM-powered components should be visible to Steve like system workers, even
  when implemented as deterministic code plus a model route instead of "agents."
- OpenClaw is blocked for core Foundation intelligence.
- Overnight extraction should optimize for quality over speed unless Steve is
  waiting live.

## Overnight Plan

### Goal

Finish as much of the Mark public YouTube baseline as the guardrails allow,
refresh the Director after each successful batch, and leave a morning report
that makes clear what to review and what to build next.

### Run Order

1. Confirm the current route posture:

```bash
npm run llm:route -- --show --json
npm run intelligence:spine-god-mode-check -- --json
```

2. Run the next guarded Mark batch:

```bash
npm run process:mark-kashef-god-mode-small-batch-check -- --apply --live-gemini-api --batch-size=5 --model=gemini-3.5-flash --json
```

3. After each successful batch, run:

```bash
npm run process:dev-team-intelligence-director-check -- --json
npm run process:dev-team-hub-v0-check -- --json
npm run process:current-sprint-active-card-gate-check -- --json
```

4. Repeat the Mark batch sequentially only while:

- the prior batch is healthy;
- the Gemini route is not quota/rate-limit blocked;
- there are at least three unwatched Mark videos remaining;
- no source/auth/private boundary is crossed.

5. If the Mark batch reaches the final 1-2 remaining videos and the current
guard refuses to run because of the 3-video minimum, stop and card/patch a
specific final-remainder proof. Do not bypass the guard silently.

6. When Mark is complete or guard-limited, write a morning handoff with:

- videos processed overnight;
- total full-watch videos now in the Foundation bundle;
- total candidates;
- top Director recommendations;
- approval-required links;
- token usage;
- blockers;
- exact next card recommendation.

### What Not To Do Overnight

- Do not crawl Skool, MyICOR, Gumroad, Calendly, community chats, paid course
  content, comments/member data, private/auth pages, or external resources.
- Do not auto-create backlog cards from Director candidates.
- Do not run broad creator latest-20 extraction until Mark output quality and
  Director usefulness are accepted.
- Do not change model routes outside `npm run llm:route`.
- Do not bypass the protected Foundation push/ship gate.

## Morning Plan

1. Review the Director Lens on `/dev`.
2. Decide whether the top candidate should go to Scoper.
3. Decide whether to:
   - finish final Mark remainder if any;
   - start another public creator batch;
   - build `SYSTEM-014` Brain Fleet/System Control;
   - prepare Skool/MyICOR approval packet for one bounded proof.
4. Only after Steve accepts the Director output quality should the system scale
   beyond Mark to the broader YouTube creator list.

## Push / Repo Status

Branch is local and ahead of origin. A normal `git push` is blocked by the
protected Foundation full ship gate. Do not bypass silently. Use the proper
`process:foundation-ship` closeout under the right card or get Steve's explicit
approval to bypass.

