# GOD-MODE-EXTRACTOR-RESEARCH-SWARM-001 Plan

## What

Produce the source-backed research/design brief for the reusable God Mode extractor before AIOS scales Mark last-50 or broader creator latest-20 extraction.

The research target is the real EYES/HANDS/BRAIN extractor Steve has been describing:

- EYES: video, screen, page, OCR, and visual workflow understanding.
- HANDS: governed browser/app navigation, clicking, scrolling, progress tracking, link inspection, and stop conditions.
- BRAIN: Brain Fleet interpretation that turns evidence into source-backed recommendations, approval asks, and build opportunities.

## Why

The current YouTube daily watch records public metadata. It does not watch or analyze 132 videos. The existing one-video Web GODMODE proof captures a public page, transcript linkage, resource links, and static screenshot metadata. It does not continuously watch a full video or run provider vision over frames.

Scaling weak transcript-only extraction would create noise. The next useful move is to research and lock the best extraction architecture, then build a narrow Eyes quality loop on 3-5 exact approved public videos.

## Acceptance Criteria

- Research brief is written to `docs/source-notes/god-mode-extractor-research-swarm-2026-05-23.md`.
- Brief names at least eight source-backed inputs across public docs, repo truth, Steve-provided source notes, and the approved local ClaudeClaw package review summary.
- Brief compares at least four architecture options: Gemini video understanding, Browserbase/Browse/Hermes-style browser skills, Gemini Live/realtime co-watching, and bulk screenshot cadence.
- Brief recommends one exact Eyes V0 implementation path for `GOD-MODE-EXTRACTOR-EYES-QUALITY-LOOP-001`.
- Brief explicitly rejects broad transcript-only scale-up and bulk screenshot-every-two-seconds as the default strategy.
- Brief records safety boundaries for private/auth/paid/community sources, code package use, external writes, browser profiles, credentials, and auto backlog mutation.
- A Foundation report artifact persists the research summary for Dev Team / Build Intel consumption.
- The focused proof returns `healthy`, `0` failed checks, and a Plan Critic `pass` score at or above `9.8`; weak dogfood cases return `blocked` or `revise`.
- Current Sprint advances only after the focused proof and raw Foundation gates stay green.

## Definition Of Done

Done means `GOD-MODE-EXTRACTOR-RESEARCH-SWARM-001` is closed under `god-mode-extractor-research-swarm-v1`, the research brief and persisted Foundation report read back, the next active card is `GOD-MODE-EXTRACTOR-EYES-QUALITY-LOOP-001`, and no private/community crawling, code copying, extraction runtime, external writes, or backlog auto-promotion happened.

## Details

Existing docs and source notes reused:

- `docs/_archive/handoffs/2026-05-23-youtube-dev-hub-intel-proof-checkpoint.md`
- `docs/source-notes/mark-claudeclaw-build-intel.md`
- `docs/source-notes/kia-ai-automations-build-intel.md`
- `docs/source-notes/github-build-intel.md`
- `docs/process/multimodal-extractor-001-plan.md`
- Browserbase Browse.sh public docs and skills docs.
- Hermes Agent public skills docs.
- Google Gemini video understanding and Gemini Live public docs.

Existing code/policy reused:

- `lib/multimodal-extractor-contract.js`
- `lib/web-godmode-live-operator.js`
- `lib/youtube-build-intel-link-resource.js`
- Current Sprint live DB truth.
- Foundation intelligence report artifact store.

New focused code:

- `lib/god-mode-extractor-research-swarm.js`
- `scripts/process-god-mode-extractor-research-swarm-check.mjs`

Behavior proof must call actual local functions, validate the generated research snapshot, write/read the Foundation report artifact, and dogfood rejected strategies. It must reject transcript-only scale-up, bulk screenshot default, private source crawling, and auto backlog mutation. We reject substring-only proof and string-match verifier theatre; markers cannot replace the local function/report/DB round trip.

Gate decision tree: this is a full Foundation card because it advances Current Sprint truth and writes a Foundation intelligence report that controls the next extraction implementation path. It does not call external model/video/browser APIs. It does not crawl private sources. It does require full ship closeout because it changes sprint sequencing and shared Build Intel doctrine.

Operator value: Steve gets one clear decision: build Eyes V0 next with Gemini video understanding plus transcript/description/resource evidence over 3-5 exact public videos, compare output quality against current mode, and only scale if it is meaningfully better.

Speed boundary: the focused proof is local and should stay fast. It reads repo docs, validates source-backed research fields, writes a markdown brief and Foundation report, and updates sprint truth. It must not perform live browsing/model calls during proof.

Repair path: if the brief lacks sources, fails to reject weak scale-up, omits safety boundaries, or cannot persist/read the report, keep the card active and fix the research/proof. Do not downgrade the card into a loose chat note.

## Risks

- Research can become implementation creep. Repair path: keep this card to design/report/writeback only.
- Private/source package notes can leak too much. Repair path: summarize transferable patterns only; do not copy private package code or credentials.
- Browser skills can be mistaken as approval to crawl. Repair path: explicitly keep HANDS behind exact source packets and approval gates.
- Gemini video understanding can miss fast details. Repair path: Eyes V0 uses targeted clipping/FPS and targeted OCR/keyframes only when needed.
- The next card could still scale too early. Repair path: Current Sprint keeps Mark last-50 and broader latest-20 blocked until Eyes quality proof passes.

## Tests

- `node --check lib/god-mode-extractor-research-swarm.js`
- `node --check scripts/process-god-mode-extractor-research-swarm-check.mjs`
- `npm run process:god-mode-extractor-research-swarm-check -- --close-card --json`
- `npm run process:current-sprint-active-card-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run process:foundation-plan-reconcile-check -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=GOD-MODE-EXTRACTOR-RESEARCH-SWARM-001 --planApprovalRef=docs/process/approvals/GOD-MODE-EXTRACTOR-RESEARCH-SWARM-001.json --closeoutKey=god-mode-extractor-research-swarm-v1 --commitRef=HEAD`

## Changed Files

- `lib/god-mode-extractor-research-swarm.js`
- `scripts/process-god-mode-extractor-research-swarm-check.mjs`
- `docs/process/god-mode-extractor-research-swarm-001-plan.md`
- `docs/process/approvals/GOD-MODE-EXTRACTOR-RESEARCH-SWARM-001.json`
- `docs/source-notes/god-mode-extractor-research-swarm-2026-05-23.md`
- `docs/_archive/handoffs/2026-05-23-god-mode-extractor-research-swarm-closeout.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `lib/foundation-build-closeout-intelligence-records.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `package.json`

## Not Next

- Do not build the Eyes runtime in this card.
- Do not extract Mark last-50 or creator latest-20 in this card.
- Do not crawl Skool, MyICOR, Discord, Reddit login-only, comments/member, private, paid, or auth-required sources.
- Do not copy private ClaudeClaw package code into AIOS production paths.
- Do not purchase, download, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from the research.
- Do not work Strategy, People, MEETING-VAULT-ACL-001 Phase B, or Drive permission mutation.
