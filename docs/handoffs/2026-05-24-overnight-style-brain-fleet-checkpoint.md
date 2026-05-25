# 2026-05-24 Overnight Style + Brain Fleet Checkpoint

## Current State

Steve asked for a checkpoint before overnight work because the chat covered design, extraction, model routing, Brain Fleet control, and the next sprint path.

Active sprint card:

- `MARK-KASHEF-LAST-50-BASELINE-001`
- Lane: executing
- Current Sprint stage: building now

Live extraction running at checkpoint:

- Command: `npm run process:mark-kashef-god-mode-small-batch-check -- --apply --live-gemini-api --batch-size=5 --model=gemini-3.5-flash --json`
- Scope: guarded Mark Kashef public YouTube batch only
- Route: Gemini API full video/audio/visual understanding
- Boundaries: no Skool, MyICOR, private/paid/auth/community crawl, downloads, purchases, forms, credential mutation, or auto backlog promotion

## What Changed Since Last Checkpoint

### Dev Data Pool / Design

- `/dev` Data Pool became the first clean live implementation proof for the new hub-page pattern.
- Locked patterns now include:
  - shared launcher topbar classes across launcher and hub pages;
  - blue hero pill without glow bleed;
  - first content band white, then grey/white/grey section bands;
  - left-accent cards;
  - big-number evidence cards;
  - compact source mini-cards;
  - Director accordion with preview;
  - plain-English copy.
- Steve and Claude caught that the hub launcher station cards still used the older top-accent/status-pill pattern.
- `docs/specs/bcrew-ui-design-contract.md` was updated to v3 so launcher station cards must use the same repeated-card philosophy as `/dev`.
- The hub launcher station cards were then updated in `public/index.html` and `public/hub-launcher.css`:
  - left accent rails;
  - plain status text;
  - no chunky station status pills;
  - no tinted station win-box;
  - aligned footers;
  - equal card heights on desktop and mobile.
- Focused launcher proof passed:
  - `npm run process:hub-launcher-source-backed-values-check -- --json`
  - desktop screenshot `/tmp/bcrew-hub-launcher-style-lock-desktop-v2.png`
  - mobile screenshot `/tmp/bcrew-hub-launcher-style-lock-mobile-v2.png`

### New Backlog Cards

- `SYSTEM-014` - Build Brain Fleet / System Control surface
  - Purpose: show every LLM-powered tool/package, what brain powers it, what model/effort it uses, and allow approved route changes from a UI.
  - Plan doc: `docs/process/system-014-brain-fleet-control-surface-plan.md`

- `SYSTEM-015` - Align hub launcher station cards to locked UI card system
  - Purpose: update the eight launcher hub cards to match the locked card system without rebuilding the launcher.
  - Plan doc: `docs/process/system-015-hub-launcher-card-system-plan.md`
  - V1 implementation applied and proof captured; still needs normal commit/closeout bookkeeping after the active extraction finishes.

### LLM Route Control

Added a governed CLI:

- `npm run llm:route -- --show --json`
- `npm run llm:route -- --profile=overnight --apply --json`
- `npm run llm:route -- --route=foundation-video-gemini-api --model=gemini-3.5-flash --effort=quality --reasoning=vision_multimodal --apply --json`

Current runtime posture after applying:

- synthesis: `openai / gpt-5.5 / quality / extra_high_required`
- deep audit: `openai / gpt-5.5 / quality / extra_high_required`
- text extraction: `openai / gpt-5.5 / quality / extra_high_required`
- video eyes: `gemini / gemini-3.5-flash / quality / vision_multimodal`
- OpenClaw routes: blocked
- OpenClaw credential row: blocked

The intelligence spine proof now accepts approved high-intelligence speed modes `fast`, `quality`, and `max` instead of hard-failing if runtime is not `fast`.

## Important Doctrine Captured

- The system must let operators change model/effort from one governed place, not by reading every line of code.
- Any LLM-powered package should be visible like an agent from Steve's point of view, even if it is deterministic code plus a brain rather than an "agent" object.
- Subscription lanes such as Claude/Codex can be shown as capacity lanes, but scheduled backend use still needs route proof before promotion.
- OpenClaw remains blocked for system intelligence.
- Overnight work should optimize for quality over fast mode unless Steve is waiting live.
- `gemini-3.5-flash` is the current preferred video-eyes route for guarded YouTube extraction based on the quality-per-token comparison.

## Overnight Plan

1. Let the current Mark 5-video guarded batch finish.
2. If the batch passes, run:
   - `npm run process:dev-team-intelligence-director-check -- --json`
   - `npm run process:dev-team-hub-v0-check -- --json`
   - `npm run intelligence:spine-god-mode-check -- --json`
3. Save a morning handoff summarizing:
   - videos processed;
   - total candidates;
   - visual evidence count;
   - token usage;
   - top Director recommendations;
   - blockers or failures.
4. Do not broaden extraction beyond the guarded Mark batch unless a separate approved card says so.
5. If the batch fails, stop scale-up and record the failure mode rather than starting a different broad run.

## Next Plan Of Attack

Morning review order:

1. Review the Mark batch output and Director recommendations.
2. Decide whether the next build is:
   - promote one candidate to Scoper;
   - run another guarded Mark batch;
   - build `SYSTEM-014` Brain Fleet/System Control page;
   - close out or polish `SYSTEM-015` if Steve sees an issue in the updated launcher cards.
3. If doing UI next, only polish `SYSTEM-015` based on screenshot/live review; do not reopen a broad design debate.
4. If doing intelligence next, start with Director/Scoper quality review before more broad extraction.
