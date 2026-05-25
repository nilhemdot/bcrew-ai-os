# Matt Pocock De-Slop Codebase Source Note

Date: 2026-05-25

Source: Matt Pocock / Total TypeScript

Video: How To De-Slop A Codebase Ruined By AI (with one skill)

URL: https://www.youtube.com/watch?v=3MP8D-mdheA

Report artifact: `batch:youtube-latest-20:api-full-watch-v1:20260525162420`

## What The Extractor Found

The God Mode YouTube route watched the video through Gemini API video/audio/visual analysis, captured public YouTube page evidence, classified resource links, and kept the output proposal-only.

The batch extracted two build candidates from this video:

- Architectural Refactoring Agent
- Interactive Design Grilling Loop

## Why It Matters

This is directly relevant to BCrew AIOS because Steve is using AI builders heavily, and the system needs stronger protection against AI-generated code drift:

- files absorbing unrelated responsibilities
- builders changing code before understanding the architecture
- weak plans that skip the right questions
- proof that only checks strings instead of real behavior
- UI or backend work that passes locally but makes the product messier

## AIOS Interpretation

This should not become another free-floating agent. The useful AIOS move is to upgrade the existing pre-build quality layer:

- Plan Critic asks hard architecture questions before coding starts.
- Code Quality Nightly Audit catches drift that already entered the repo.
- File Size Engineering Standard blocks oversized roots from absorbing more work.
- Review Gate upgrades keep review checklists deterministic before adding LLM judgment.
- Dev Intelligence Director can rank these recommendations, but Scoper should turn them into a real build card before Steve approves execution.

## Candidate To Scope

Candidate card: `CODEBASE-DE-SLOP-GATE-001`

Plain-English goal:

Before an AI builder starts a meaningful code change, the system should force a short architecture/design check: what files will change, what existing pattern will be reused, what could get messy, what proof proves behavior, and what should be split instead of patched.

## Boundaries

- Do not auto-refactor the repo from this source note.
- Do not create a new autonomous reviewer agent.
- Do not replace existing Foundation ship gates.
- Do not treat one video as enough to rewrite the build process.
- Do not install or copy external skills without a separate source/legal/adapter review.

## Next Step

Scope `CODEBASE-DE-SLOP-GATE-001` against the existing Plan Critic, file-size standard, code-quality audit, and review-gate modules.
