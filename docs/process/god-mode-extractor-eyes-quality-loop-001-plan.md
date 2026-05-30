# GOD-MODE-EXTRACTOR-EYES-QUALITY-LOOP-001 Plan

## What

Build the first bounded God Mode Extractor EYES quality loop.

The card compares current YouTube extraction mode against Gemini video-understanding EYES V0 on three exact approved public YouTube videos:

- Mark Kashef: `https://www.youtube.com/watch?v=5xrjO38WUYY`
- Nick Saraev: `https://www.youtube.com/watch?v=K65vd9EYbDU`
- Kia AI Automations: `https://www.youtube.com/watch?v=yi1JlBnDZgc`

Current mode means transcript artifact plus public page description/resource-link evidence. EYES V0 means Gemini video understanding over the public YouTube URL, with timestamped visual evidence, visible workflow/tool/code observations, build candidates, and a measured quality comparison.

## Why

Steve rejected scaling Mark last-50 or other creators latest-20 while the system is still mostly transcript/page metadata. The Dev Team needs proof that the extractor can actually see video content and produce better build intelligence before broader extraction runs.

This card is the proof loop. If EYES adds enough value, the next card adds overnight-run guardrails before scale-up. If it does not, the system loops on extractor quality instead of creating hundreds of weak rows.

## Acceptance Criteria

- The proof uses only three to five exact approved public YouTube videos.
- Each video has a current-mode baseline from transcript/page/description/resource evidence where available.
- Each video has public/no-auth browser page evidence and local temp screenshot metadata; raw screenshot/video bytes are not committed.
- Each video runs through the Gemini video route with a Brain Fleet ledger call.
- EYES output includes timestamped visual evidence, visible workflow/tool/code observations, missed-by-transcript-only notes, and build candidates.
- The snapshot compares baseline score vs EYES score and records average quality delta.
- The proof passes only when at least two videos improve by 15+ points, the average delta is at least 15, timestamped visual evidence exists, and build candidates exist.
- The result persists as a Foundation intelligence report, proposal-only atoms, and evidence hits.
- Dev Team Hub reads the EYES report from Foundation truth; no Dev-only silo is created.
- No private/auth/paid/community/comment/course crawling, link following, downloads, purchases, opt-ins, external writes, credential mutation, or automatic backlog card creation happen.

## Definition Of Done

Done means `GOD-MODE-EXTRACTOR-EYES-QUALITY-LOOP-001` is closed under `god-mode-extractor-eyes-quality-loop-v1`, the EYES quality report reads back from Foundation truth, Dev Team Hub can consume it, Brain Fleet ledger records the Gemini calls, raw Foundation health remains green, and Current Sprint advances to `EXTRACTOR-OVERNIGHT-RUN-GUARD-001`.

## Details

Existing docs, scripts, and code reused:

- Existing docs: `docs/source-notes/god-mode-extractor-research-swarm-2026-05-23.md`, `docs/process/multimodal-extractor-001-plan.md`, `docs/process/gemini-video-brain-route-001-plan.md`, and the YouTube Dev Team sprint plan.
- Existing scripts: `scripts/process-gemini-video-brain-route-check.mjs`, `scripts/process-god-mode-extractor-research-swarm-check.mjs`, and `scripts/process-youtube-build-intel-link-resource-check.mjs`.
- Existing code: `lib/gemini-video-brain-route.js`, `lib/brain-fleet-quota-ledger.js`, `lib/web-godmode-live-operator.js`, `lib/dev-team-hub.js`, and Foundation intelligence report/atom/hit persistence.

New focused code:

- `lib/god-mode-extractor-eyes-quality-loop.js`
- `scripts/process-god-mode-extractor-eyes-quality-loop-check.mjs`

Behavior proof: the focused proof calls actual function paths: public YouTube page capture, transcript artifact readback, Brain Fleet ledger planning/finalization, Gemini video understanding over approved public YouTube URLs, Foundation report/atom/hit persistence, Dev Team Hub read-path wiring, and Current Sprint update. We reject substring-only proof; marker checks cannot replace the live browser/provider/API/DB round trip.

Gate decision tree: this is a full ship gate. The blast radius includes live provider calls, quota ledger truth, report/atom/hit writes, Dev Team Hub data contract, Current Sprint live state, closeout registry, verifier coverage, and `process:foundation-ship`. Static-only or focused-only gates are not enough for closeout.

Operator value: Steve gets a clear answer to the practical question: "Does adding eyes produce better build recommendations than transcript/page metadata?" The answer is persisted with proof, not hidden in a chat claim.

Speed boundary: the live closeout proof is capped to three approved public videos and targets under 8 minutes, with rate-limit waits only when Gemini requires them. The normal read-only rerun reads the persisted report and should stay under 2 minutes, so the gate remains fast enough to use by default after the first live proof. It is not Mark last-50, not creator latest-20, not Skool/MyICOR, and not an overnight run.

Repair path: if Gemini auth/quota fails, stop and report the exact stop condition. If YouTube page capture fails, fix the capture path or replace only with another approved public URL. If the quality delta is weak, keep the card active and improve the prompt/source selection; do not lower the quality gate to ship weak proof.

## Risks

- Gemini YouTube URL support is preview and can fail or rate-limit. Repair path: fail closed with Brain Fleet stop condition and keep scale-up blocked.
- Videos may have weak screen evidence. Repair path: keep the result honest and use a better approved video sample before scale-up.
- Transcript artifacts can be missing for some videos. Repair path: baseline can be lower, but EYES must still produce source-backed visual evidence.
- Provider output can hallucinate visible details. Repair path: prompt requires uncertainty marking, timestamp evidence, and no invented links/code.
- The card can drift into broad extraction. Repair path: enforce the three-video cap and explicit not-next boundaries.

## Not Next

- No Mark last-50 extraction.
- No other creator latest-20 extraction.
- No Skool, MyICOR, Gumroad, Calendly, Discord, Reddit login-only, comments, members, paid, private, auth-required, or course source extraction.
- No purchases, downloads, opt-ins, bookings, form submits, credential mutation, browser profile mutation, public posts, emails, or external writes.
- No bulk screenshot every two seconds as the default extractor.
- No automatic backlog card creation from EYES findings.
- No Strategy, People, MEETING-VAULT-ACL-001 Phase B, or Drive permission mutation.

## Tests

- `node --check lib/god-mode-extractor-eyes-quality-loop.js`
- `node --check scripts/process-god-mode-extractor-eyes-quality-loop-check.mjs`
- `npm run process:god-mode-extractor-eyes-quality-loop-check -- --close-card --live-gemini --json`
- `npm run process:current-sprint-active-card-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run process:foundation-plan-reconcile-check -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=GOD-MODE-EXTRACTOR-EYES-QUALITY-LOOP-001 --planApprovalRef=docs/process/approvals/GOD-MODE-EXTRACTOR-EYES-QUALITY-LOOP-001.json --closeoutKey=god-mode-extractor-eyes-quality-loop-v1 --commitRef=HEAD`

## Changed Files

- `lib/god-mode-extractor-eyes-quality-loop.js`
- `scripts/process-god-mode-extractor-eyes-quality-loop-check.mjs`
- `docs/source-notes/god-mode-extractor-eyes-quality-loop-2026-05-23.md`
- `docs/process/god-mode-extractor-eyes-quality-loop-001-plan.md`
- `docs/process/approvals/GOD-MODE-EXTRACTOR-EYES-QUALITY-LOOP-001.json`
- `docs/_archive/handoffs/2026-05-23-god-mode-extractor-eyes-quality-loop-closeout.md`
- `lib/dev-team-hub.js`
- `lib/foundation-build-intel-routes.js`
- `lib/foundation-build-closeout-intelligence-records.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `package.json`
