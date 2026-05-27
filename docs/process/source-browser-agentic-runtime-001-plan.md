# SOURCE-BROWSER-AGENTIC-RUNTIME-001 Plan

Card: `SOURCE-BROWSER-AGENTIC-RUNTIME-001`

## Intent

Wire the existing `source:god-mode` browser runtime into the real YouTube source-intelligence handoff path without pretending the whole God Mode extractor system is finished.

Plain English: watched YouTube videos already found public pages, repos, newsletters, free communities, products, and paid/auth gates. The system should not keep those discoveries trapped in YouTube or in a manual approval-only list. Public/free follow-ups need a runnable source-browser queue. Paid/auth/product rows stay parked.

## Problem

The May 27 source sprint exposed a bad split:

- YouTube full-watch reports were finding hundreds of follow-up links.
- The Dev page showed bucket counts, but the actionable worker queue still looked empty.
- The old approval queue mixed simple public/free reads with paid/auth/product decisions.
- Steve's God Mode expectation is a system that can read, click, navigate, classify, and hand off source work on autopilot where the boundary is public/free.

That makes the extractor feel stalled even after useful source evidence exists.

## Scope

- Add a YouTube source-browser handoff queue builder.
- Convert full-watch handoff evidence into explicit rows:
  - public pages/resources
  - public code repos/docs
  - creator newsletter pages
  - free communities
  - products/tools needing value review
  - paid/auth gates needing source-session packets
- Give runnable public/free rows concrete commands:
  - `source:god-mode`
  - `skool:free-god-mode`
- Keep parked rows non-runnable:
  - products/tools
  - paid/auth/private/login/member gates
- Add a batch runner that executes only runnable public/free rows.
- Add a focused local-browser dogfood proof with:
  - public resource read
  - repo/docs read
  - newsletter detection without submit
  - free community 20-day SOP run
  - product/paid/auth rows skipped
- Update the Dev Hub read model so YouTube Source Intelligence exposes:
  - full handoff bucket counts from watched-video evidence
  - source-browser handoff queue counts
  - runnable versus parked rows
  - UI preview rows
- Fix the source runtime classifier so a newsletter source type cannot make `/login`, account, checkout, password, or MFA paths readable.

## Acceptance Criteria

- Focused proof builds a queue from watched-video style handoff evidence.
- Queue rows distinguish runnable public/free work from parked approval/session/value work.
- Runnable rows include concrete runner commands.
- Batch runner runs only public/free rows and skips paid/auth/product rows.
- Newsletter pages are read and detected, but no signup form is submitted.
- Free community rows use the 20-day community/course/resource SOP.
- Login/auth/account/payment/download/post/comment/message/profile paths remain blocked.
- Dev Hub exposes the source-browser queue under YouTube Source Intelligence.
- Dev page renders the queue separately from high-level bucket counts.
- No provider call, broad crawler, Scoper promotion, backlog write, purchase, download, form submit, post, comment, message, credential mutation, normal Chrome profile use, or external write happens in this slice.

## Proof

Focused proof:

```bash
npm run process:source-god-mode-youtube-handoff-check -- --json
```

Supporting proof:

```bash
node --check lib/source-god-mode-youtube-handoff.js scripts/process-source-god-mode-youtube-handoff-check.mjs lib/dev-team-hub.js scripts/process-dev-team-hub-v0-check.mjs public/dev.js
npm run process:source-god-mode-extractor-runtime-check -- --json
npm run process:source-session-broker-check -- --json
npm run process:skool-free-community-god-mode-runner-check -- --json
npm run process:dev-team-hub-v0-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
```

## Not Next

- Do not mark the whole God Mode extractor system complete.
- Do not mark `SOURCE-BROWSER-AGENTIC-RUNTIME-001` done until production scheduling and source-stack persistence are handled or explicitly split.
- Do not auto-promote Director ideas to Scoper from this slice.
- Do not buy, download, submit forms, sign up, post, comment, message, mutate credentials, mutate profiles, or use a normal Chrome profile.
- Do not enter paid/private/auth/member content without a Source Session Broker packet.
- Do not call Gemini or watch more videos from this proof.

