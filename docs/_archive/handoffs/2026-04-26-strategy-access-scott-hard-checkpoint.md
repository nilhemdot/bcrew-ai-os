# 2026-04-26 Strategy Access / Scott / Hard Checkpoint

Created: 2026-04-26

## Fresh Chat Start

We are in `/Users/bensoncrew/bcrew-ai-os`.

Read `AGENTS.md`, `SOUL.md`, `USER.md`, `MEMORY.md`, `memory/2026-04-26.md`, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, `docs/source-notes/google-drive-corpus.md`, `docs/source-notes/myicro-training.md`, and this handoff.

Then check:

- `git status`
- `npm run foundation:verify`
- live backlog cards `STRATEGY-004`, `STRATEGY-007`, `DRIVE-CONTENT-001`, `MULTIMODAL-EXTRACTOR-001`, `WEB-GODMODE-001`, `MYICRO-TRAINING-001`, `LLM-HUB-CAPACITY-001`
- latest Strategy Evidence Packet / Strategy Advisor health

Do not overwrite uncommitted work.

## What Steve Asked For

Steve asked for three things after the Strategy Advisor / Drive work:

1. Use browser/Playwright-style automation as `ai@bensoncrew.ca` to request access for inaccessible strategy docs.
2. Read Scott's handwritten pre-strat doc better than rough OCR, with multiple passes if needed.
3. Run a hard checkpoint so today's business logic, access gaps, backlog decisions, and next steps are not lost in chat.

Steve later confirmed he manually requested access for the strategy docs AIOS could not access.

## Access Request Finding

The local browser automation path is not yet a real `ai@` request-access lane.

Observed:

- Local Playwright package was not installed in this repo/runtime.
- The available Chrome profile was logged in as `steve.zahnd@bensoncrew.ca`, not `ai@bensoncrew.ca`.
- Opening inaccessible John-linked doc `12sBn6NloE5dKEw0siWTlnFmECUpLdB8PEAmC7rnoVI8` in that browser showed Steve's normal document access, not an `ai@` "Request access" page.
- Native Google request-access has to be done from the requesting account's browser session. AIOS cannot claim this is automated until it can prove the browser identity/profile and record the outcome.

Captured in:

- `docs/source-notes/google-drive-corpus.md`
- `docs/source-notes/myicro-training.md`
- live/seed backlog `WEB-GODMODE-001`

Practical state:

- Steve manually requested access for the remaining inaccessible strategy docs.
- AIOS should monitor/retry after approvals.
- Future browser/GOD-mode worker needs a browser-session preflight: intended account, visible logged-in account proof, source/app URL, request/access state, screenshot/page text proof, and manual-action record.

## Scott Pre-Strat Visual Review

Earlier rough OCR archived Scott's handwritten PDF, but rough OCR was not good enough for participant/theme strategy questions.

New durable note:

- `docs/audits/2026-04-26-scott-pre-strat-visual-review.md`

High-signal Scott themes captured:

- Make everything simpler.
- Lean harder into advertising AI programs, social proof, and visible wins.
- Stop over-focusing on the bad-market story.
- Keep culture, town halls, AI phone work, pod/office win-sharing, and leadership cohesion.
- Fix phones, lead conversion, and onboarding overwhelm.
- Get houses priced correctly and sold.
- Use company/social media to warm and hand off leads.
- Build an AI lead machine that responds fast and passes already-warm leads to agents.
- Reduce the number of systems agents need to learn.

Backlog impact:

- `MULTIMODAL-EXTRACTOR-001` still owns automated vision-grade handwriting/screenshot extraction.
- `DRIVE-CONTENT-001` remains live for Docs/PDF/text/markdown and rough OCR, but high-confidence handwriting is still a follow-on.
- `STRATEGY-004` should support who-said-what / top-theme questions from pre-strat inputs.

## Strategy Advisor UX / Speed

Current Strategy Advisor v1 is real but not yet ideal for tomorrow's strategy session.

What exists:

- Strategic Execution has routed LLM advisor endpoint.
- Floating chat launcher exists.
- Review Board maps packet items into Attract / Grow / Retain / Finance / Foundation.
- Advisor uses source-backed context, latest Strategy Evidence Packet, backlog/decision/runtime facts, and docs.

Why it can feel slow:

- It builds a large strategy context.
- It calls the routed subscription model for real synthesis.
- This is the right behavior for deep answers, but not for every quick live-room question.

New backlog:

- `STRATEGY-007`: build a full-screen Strategy Advisor workspace and fast/deep modes.

Required next UX:

- full-screen chat surface for tomorrow's working session
- keep floating launcher as quick access
- fast mode for normal questions
- deep mode for heavier synthesis
- saved strategy conversation context
- visible model/route/latency
- source/evidence links and missing-proof callouts

## Model Capacity

Steve is near the weekly account window and is willing to buy more accounts/seats under BCrew emails.

Captured in:

- `LLM-HUB-CAPACITY-001`

Rule:

- Do not treat this as random account rotation.
- Treat each seat/account as a named capacity lane with owner email, allowed workloads, budget/window, fallback, pacing, and stop controls.
- Builder chat, Strategy Advisor, system workers, Claude Code/coding, video/vision, and direct API fallback should have separate explicit lanes.

## Backlog / Docs Touched In This Checkpoint

Created:

- `STRATEGY-007`
- `docs/audits/2026-04-26-scott-pre-strat-visual-review.md`
- this handoff

Enriched:

- `STRATEGY-004`
- `DRIVE-CONTENT-001`
- `MULTIMODAL-EXTRACTOR-001`
- `WEB-GODMODE-001`
- `LLM-HUB-CAPACITY-001`
- `docs/source-notes/google-drive-corpus.md`
- `docs/source-notes/myicro-training.md`
- `docs/audits/2026-04-26-conversation-knowledge-capture-audit.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`

## Recommended Next Build Order

1. Make Strategy Advisor usable for the live strategy session:
   - full-screen chat
   - fast/deep modes
   - visible evidence/latency/model route
   - saved thread context

2. Add strategy review/promote controls:
   - accept
   - reject
   - needs evidence
   - promote to quarterly priority
   - promote to decision/backlog/action-router item

3. Refresh or rerun the Strategy Evidence Packet after access approvals land:
   - John-linked docs
   - any new Carson/Scott/Blake/Steve Q2 inputs
   - Scott visual review evidence

4. Build the first GOD-mode proof:
   - public Mycro YouTube visual understanding first
   - then logged-in Mycro course proof after browser-session/account preflight

5. Continue extraction hardening:
   - Drive Sheets/Slides/shortcuts/Office
   - vision-grade handwriting/screenshots
   - Drive/meeting videos, Loom, Skool, Zoom recordings

## Do Not Lose

- Scott's core strategy concern is simplicity plus direct pricing/sold-listing execution.
- Steve's core UX concern is that the advisor must be usable as a real strategy working partner, not a tiny slow bubble.
- Browser automation has to prove the acting account. A browser logged in as Steve is not equivalent to an `ai@` worker.
- Access gaps are normal; they must be recorded and retried after approval, not treated as evidence the system failed.
