# 2026-05-24 Context + UI Consistency Checkpoint

## Why This Checkpoint Exists

Steve and Codex paused after the David Ondrej / Micky Shimeles God Mode extraction discussion to clarify harnesses, context, and UI consistency.

Core operator pain:

- Steve should not have to keep the system plan, sprint mission, UI rules, and prior decisions in his head.
- Builders are still able to create pages that are functionally wired but visually inconsistent with approved mockups.
- The current memory/docs/backlog pieces exist, but they do not yet reliably assemble the right builder context automatically.

## Harness Decision

Current stance:

- Codex remains the main Orchestrator / Foundation builder for now.
- Claude Code remains useful as a side builder or second opinion.
- Cursor may be tested later as a UI/context-engineering builder, but do not switch blindly or buy multiple accounts yet.

Plain model:

- Brain: GPT / Claude / Gemini.
- Harness: Codex / Claude Code / Cursor / OpenClaw.
- BCrew AIOS: repo, Foundation, backlog, source truth, extractor, proofs, health checks, and operating doctrine.

Important clarification:

- BCrew AIOS owns the health checks, verifiers, source contracts, backlog, and scripts.
- Codex currently operates those systems.
- Cursor or Claude Code could also operate them if given the right context capsule and proof gates.

## Context Engine Gap

Current failure mode:

- "Read everything" is not a good prompt. It creates stale-context noise and old-doc contradictions.
- But "Steve explains the whole system again" is also unacceptable.

Needed product/system layer:

- A context engine that assembles the right task packet automatically:
  - current mission
  - live Foundation/API/DB truth
  - current sprint and active card
  - relevant source contracts
  - relevant recent handoffs/decisions
  - relevant files
  - forbidden work
  - proof commands

Likely future card:

- `AIOS-CONTEXT-ENGINE-001`
- Purpose: stop making Steve carry system memory in his head and make Codex/Cursor/Claude/OpenClaw start from the same clean truth.

## God Mode Extractor Direction

The immediate build direction remains God Mode Extractor, not broad weak extraction.

The current active Mark plan is captured in:

- `docs/process/mark-kashef-last-50-baseline-001-plan.md`

The plan says the next meaningful slice is one exact public Mark video end-to-end, not a 50-video blast:

- Gemini API full video/audio/visual understanding.
- Transcript/subtitle artifact when present.
- Public YouTube page evidence.
- Description/resource links.
- Screenshot metadata.
- Safe public link metadata follow where clearly allowed.
- Approval queue for Skool/Gumroad/Calendly/private/auth/download/opt-in/course/community links.
- Ranked build/business/marketing opportunities with evidence.
- Model quality/value comparison between `gemini-2.5-flash` and `gemini-3.5-flash`.

David Ondrej extraction result:

- Video: `https://www.youtube.com/watch?v=PzVV4X37ihg`
- Local report: `/tmp/bcrew-david-ondrej-god-mode/david-ondrej-PzVV4X37ihg-god-mode.json`
- Local comments report: `/tmp/bcrew-david-ondrej-god-mode/david-ondrej-comments-aleksdeveloper698.json`
- The extraction validated that video/audio/visual EYES can surface important details transcript-only misses.

## UI Consistency Failure

Steve's current UI pain:

- Login and hub launcher mockups were good.
- The Dev page implementation drifted from the approved look.
- Builders are not consistently following fonts, spacing, top bars, mockup language, image treatment, and page organization.

Root cause:

- There are mockups and scattered UI docs, but not one enforceable UI design contract that every builder must load and prove.
- `docs/superpowers/specs/foundation-ui-patterns.md` exists but is too small and Foundation-specific.
- The restored mockups live in:
  - `public/mockups-restored-2026-05-15/login.html`
  - `public/mockups-restored-2026-05-15/hub-launcher-v9.html`
  - `public/mockups-restored-2026-05-15/foundation-home.html`
  - `public/mockups-2026-05-21/dev-page.html`
- Those mockups are design evidence, but not yet a strict source-of-truth UI kit.

Needed UI system work:

- Create a single BCrew UI design contract.
- Treat Foundation as the source of truth for final approved brand/style decisions.
- Treat mockups as design evidence and inspiration, not final truth until promoted into the Foundation style guide.
- Version the style guide so a new approved visual direction becomes a new Foundation-owned version instead of a loose chat/mockup.
- Promote tokens, typography, shell, top bar, page layout, buttons, cards, nav, mascot/image handling, and density rules into one builder-facing doc.
- Back it with page-scoped CSS rules and visual proof checks.
- Make future UI builders prove:
  - correct font files load
  - top bar matches approved shell
  - page uses the approved token set
  - no fake/hardcoded stats unless explicitly placeholder-marked
  - desktop/mobile screenshots are compared to approved references

Likely future card:

- `BCREW-UI-DESIGN-SYSTEM-CONTRACT-001`
- Purpose: make Foundation the durable source of truth for brand/style decisions and make UI consistency enforceable instead of relying on Steve re-explaining style in every chat.

## Practical Next Steps

1. Continue current sprint with `MARK-KASHEF-LAST-50-BASELINE-001` one-video end-to-end proof.
2. Add `AIOS-CONTEXT-ENGINE-001` as a high-priority architecture card so builders stop waking up half-blind.
3. Add `BCREW-UI-DESIGN-SYSTEM-CONTRACT-001` before further serious hub/page rebuilds.
4. Do not scale Mark last-50 or all creators until one-video God Mode proof is complete.
5. Do not treat Cursor as a magic fix. Test it later against the same context capsule/design contract.
