# GEMINI-WORKSPACE-EYES-ROUTE-PROOF-001 Plan

## What

Prove or reject whether a logged-in Gemini Workspace/App browser route can serve as God Mode Extractor eyes for one exact approved public video without using the Gemini API key.

The first proof target is the already approved public Mark Kashef seed video `https://www.youtube.com/watch?v=5xrjO38WUYY`.

## Why

The existing Eyes quality loop uses Gemini/API video understanding. Steve specifically wants to know whether the extractor can use his paid Gemini Workspace/account route for eyes before scaling Mark last-50 or other creator latest-20 extraction.

This card answers that question directly. It does not run Mark last-50.

## Acceptance Criteria

- Uses only the isolated AI Chrome profile at `~/Library/Application Support/Chrome-Isolated/ai-bensoncrew-clean`.
- Does not automate Steve's normal Chrome profile.
- Does not mutate credentials, browser profiles, provider config, source systems, Drive permissions, or external systems.
- If Gemini login is needed, Steve performs the login manually in the isolated AI browser profile.
- Runs only one exact approved public video proof before any scale-up.
- Records whether the Gemini Workspace/App browser route can accept the approved video evidence and return structured extractor output.
- Compares the browser/account output against the persisted Gemini/API Eyes report for the same video.
- Classifies the outcome as `works`, `blocked`, `fragile`, or `not-policy-safe`.
- Preserves source URL, actor/profile class, route name, prompt class, output shape, proof timestamp, and failure reason when applicable.
- Keeps Mark last-50, other creator latest-20, Skool, MyICOR, private/auth/paid/community/course extraction, purchases, downloads, forms, messages, and backlog promotion out of scope.

## Definition Of Done

Done means `GEMINI-WORKSPACE-EYES-ROUTE-PROOF-001` is closed with a clear go/no-go on the logged-in Gemini Workspace/App browser eyes route, exact proof artifacts, comparison against the API Eyes baseline, unchanged credential/profile posture, and Current Sprint advanced either to Mark last-50 with the chosen eyes route or to a repair/fallback card if the route is blocked.

## Details

Existing proof to reuse:

- `docs/process/god-mode-extractor-eyes-quality-loop-001-plan.md`
- `docs/source-notes/god-mode-extractor-eyes-quality-loop-2026-05-23.md`
- `lib/gemini-video-brain-route.js`
- `lib/god-mode-extractor-eyes-quality-loop.js`
- `state/browser-profiles/README.md`

Implementation boundary:

- Browser preflight checks the isolated AI profile path and active Gemini/App session state.
- The proof may open Gemini in a controlled browser session, but it must not store passwords, rotate tokens, scrape credentials, or bypass login.
- If the browser route is unreliable, policy-unsafe, or cannot produce structured output, the decision is to keep Gemini/API Eyes with quota/ledger controls for extractor eyes.

## Not Next

- No Mark last-50 extraction.
- No other creator latest-20 extraction.
- No Skool, MyICOR, Gumroad, Calendly, Loom, paid/private/auth/member/community/comment/course extraction.
- No purchase, download, opt-in, booking, form submit, external message, credential mutation, browser profile mutation, provider config mutation, or external write.
- No automatic backlog card creation from extractor findings.
- No `MEETING-VAULT-ACL-001` Phase B work or Drive permission mutation.

## Tests

- `npm run process:gemini-workspace-eyes-route-proof-check -- --json`
- `npm run process:current-sprint-active-card-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run process:foundation-plan-reconcile-check -- --json`
- `npm run foundation:verify -- --json-summary`
