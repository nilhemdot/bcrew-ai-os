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
- Proof command `npm run process:gemini-workspace-eyes-route-proof-check -- --live-browser --use-keychain-login --submit-live-prompt --close-card --json` returns pass/healthy with Plan Critic score at least 9.8.
- `GEMINI-WORKSPACE-EYES-ROUTE-PROOF-001` persists report `proof:gemini-workspace-eyes-route-proof-001`, proposal-only atoms, and evidence hits before being marked done.

## Definition Of Done

Done means `GEMINI-WORKSPACE-EYES-ROUTE-PROOF-001` is closed with a clear go/no-go on the logged-in Gemini Workspace/App browser eyes route, exact proof artifacts, comparison against the API Eyes baseline, unchanged credential/profile posture, and Current Sprint advanced either to Mark last-50 with the chosen eyes route or to a repair/fallback card if the route is blocked.

## Details

Existing proof to reuse:

- `docs/process/god-mode-extractor-eyes-quality-loop-001-plan.md`
- `docs/source-notes/god-mode-extractor-eyes-quality-loop-2026-05-23.md`
- `lib/gemini-video-brain-route.js`
- `lib/god-mode-extractor-eyes-quality-loop.js`
- `state/browser-profiles/README.md`

Existing work reused:

- Existing code: `lib/credential-vault.js`, `lib/gemini-workspace-eyes-route-proof.js`, `lib/god-mode-extractor-eyes-quality-loop.js`, `lib/gemini-video-brain-route.js`, and Foundation intelligence report/atom/hit stores.
- Existing docs: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, `docs/source-notes/god-mode-extractor-eyes-quality-loop-2026-05-23.md`, and the overnight guard/subscription adapter closeouts.
- Existing scripts: `scripts/process-credential-vault-session-broker-check.mjs`, `scripts/process-gemini-workspace-eyes-route-proof-check.mjs`, `scripts/process-god-mode-extractor-eyes-quality-loop-check.mjs`, and the standard Current Sprint/backlog/foundation gates.
- Live backlog and Current Sprint remain the task truth for `GEMINI-WORKSPACE-EYES-ROUTE-PROOF-001` and `MARK-KASHEF-LAST-50-BASELINE-001`.

Implementation boundary:

- Browser preflight checks the isolated AI profile path and active Gemini/App session state.
- The proof may open Gemini in a controlled browser session, but it must not store passwords, rotate tokens, scrape credentials, or bypass login.
- If the browser route is unreliable, policy-unsafe, or cannot produce structured output, the decision is to keep Gemini/API Eyes with quota/ledger controls for extractor eyes.

Behavior proof:

- The focused proof opens Gemini through the isolated persistent browser profile.
- The live proof must submit exactly one bounded public-video extractor prompt through the Gemini web app.
- The proof must verify `usedGeminiApi=false`, prompt submission, structured JSON output, visual evidence, build candidates, screenshot proof metadata, and no raw credential leakage.
- Closeout persists the route decision as Foundation report/atom/hit truth.
- The proof calls actual function path `runGeminiWorkspaceEyesBrowserProof()` and the real browser/API/DB round trip through `process:gemini-workspace-eyes-route-proof-check`; no substring-only proof or marker-only check is accepted.

Route decision:

- If the browser route works, classify it as Level 1 experimental extractor eyes.
- Keep Gemini API eyes as the fallback for auth, quota, browser, parse, or quality failure.
- The next card starts with a guarded 3-video subscription-eyes pilot before any Mark last-50 scale-up.

Gate decision tree: this is a full ship gate because the blast radius touches credential metadata, browser session proof, model-route policy, Foundation intelligence report/atoms/hits, and Current Sprint order before Mark scale-up. The focused process proof is required, and full `foundation:verify` plus `process:foundation-ship` are required before shipping.

Operator value: Steve gets a real answer to the subscription-brain question: can the system use his paid Gemini account for extractor eyes before spending API tokens? The output is useful only if it becomes route policy and sprint order, not just a loose browser test.

Speed boundary: one exact public video only for this card. The focused proof is proportional and should stay under 3 minutes in normal conditions; it is not another heavy overnight extraction. The 3-video pilot and Mark last-50 baseline are separate follow-on work.

Repair path: if login, prompt entry, browser state, JSON parsing, quota, safety, or output quality fails, keep the API route as fallback, leave Mark scale-up blocked, and open a repair/fallback card instead of pretending the browser route is reliable.

## Risks

- Google/Gemini web UI changes can break selectors. Repair by fixing the browser adapter and rerunning this exact proof.
- Subscription quota or Workspace edition limits can throttle the route. Repair by falling back to Gemini API or reducing pilot volume.
- Browser state can go stale. Repair by reauthenticating the isolated profile; do not use Steve's normal Chrome profile.
- The route can appear free but still consumes subscription quota. Keep it labeled experimental, not unlimited production capacity.
- Long prompts can return unstructured output. Repair by keeping extractor prompts concise and requiring JSON readback.

## Not Next

- No Mark last-50 extraction.
- No other creator latest-20 extraction.
- No Skool, MyICOR, Gumroad, Calendly, Loom, paid/private/auth/member/community/comment/course extraction.
- No purchase, download, opt-in, booking, form submit, external message, credential mutation, browser profile mutation, provider config mutation, or external write.
- No automatic backlog card creation from extractor findings.
- No `MEETING-VAULT-ACL-001` Phase B work or Drive permission mutation.

## Tests

- `npm run process:gemini-workspace-eyes-route-proof-check -- --json`
- `npm run process:credential-vault-session-broker-check -- --verify-db --require-gemini-keychain --json`
- `npm run process:gemini-workspace-eyes-route-proof-check -- --live-browser --use-keychain-login --submit-live-prompt --close-card --json`
- `npm run process:current-sprint-active-card-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run process:foundation-plan-reconcile-check -- --json`
- `npm run foundation:verify -- --json-summary`
