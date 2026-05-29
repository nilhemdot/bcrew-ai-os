# Source Browser Agent Protocol Scope

Date: 2026-05-28
Cards: `EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001`, `SOURCE-BROWSER-AGENTIC-RUNTIME-001`, `SOURCE-SESSION-BROKER-001`

## Why This Exists

Steve asked whether the "Browser Agent That Can Work" and "Extractor That Can Go Anywhere" should be built as a real agent instead of another pile of browser scripts.

The answer from repo and intelligence evidence is yes: do not throw away the existing runtime work, but stop treating it as only code paths. `SOURCE-BROWSER-AGENTIC-RUNTIME-001` should become the first flagship source agent that runs under the already-closed agent protocol contracts.

## Evidence Read

Live evidence and repo truth reviewed on 2026-05-28:

- `AGENT-CAPABILITY-REGISTRY-001` is done. It defines agent capabilities, tools, source refs, read/write posture, model route policy, logging, approval boundaries, and fallback behavior.
- `AGENT-TEMPLATE-RUNTIME-CONTRACT-001` is done. It defines identity, owner, role, purpose, permission tier, source access, memory scope, tools, model route/cost policy, approval posture, live-answer preflight, action routing, logging, failure visibility, onboarding/profile contract, and decommission path.
- `EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001` is the P0 parent contract for the full God Mode extractor runtime plus source SOP system.
- `SOURCE-BROWSER-AGENTIC-RUNTIME-001` is executing. The V1 runtime and handoff loop are built, but the live card still needs source-session credentials, first real free-community/newsletter/paid-auth runs, production scheduling, and source-stack persistence before it can be called done.
- `SOURCE-SESSION-BROKER-001` is scoped for isolated source profiles, macOS Keychain secret refs, source identities, login recipes, auth-needed escalation, wait/resume, and fail-closed behavior.
- `FREE-SKOOL-COMMUNITY-GOD-MODE-RUNNER-001` is executing with the corrected 20-day free-community SOP, but still needs the first real source-session run.
- The prior agentic-browser review found 105 backlog cards and 39 atoms for browser-agent work, 137 backlog cards and 875 atoms for extractor/source-stack work, 342 backlog cards and 413 atoms for navigation/Hands/auth/session work, and 219 backlog cards and 165 atoms for self-healing/verification/browser-proof work.
- Current intelligence atom theme counts show 716 extract-anywhere atoms, 109 agent-runtime atoms, 44 browser-agent atoms, 1,835 hands/navigation-related atoms, 1,051 repo/source atoms, and 1,689 community/newsletter-related atoms.
- Current source-browser proof history includes 56 source-handoff proof reports, 925 source handoff rows, 100 YouTube watch reports, 6 repo-related reports, 19 newsletter-related reports, and 131 community-related reports.
- High-value extracted ideas include natural-language web scraping agents, visual browser agents, workflow recorders, human-like QA agents, OpenClaw/local OS control, multi-agent browser automation, source session skills, credential vaulting, skill registries, context compaction, and self-correcting agent loops.

## Truth

The missing layer is not "find another browser library first."

The missing layer is the Source Browser Agent harness:

- The existing browser runtimes, repo runner, newsletter dry-run, Skool runner, session broker, source packet policies, and evidence writers become tools.
- The agent protocol decides what the agent is allowed to do, what source it is working on, which account/profile it may use, when it can click, when it must stop, what evidence it must preserve, and how it escalates.
- The Source Browser Agent loops through observe -> plan -> act -> extract -> evaluate -> record -> continue/stop.
- Source-specific SOPs decide the steps for YouTube, public pages, repos, newsletters, free communities, paid courses, and paid/private communities.
- Human help is allowed while the system is being bootstrapped, but the goal is closed-loop: the system uses approved credentials/session profiles, asks through the human-agent auth path only when MFA or a true boundary blocks it, then resumes or fails closed.

## God Mode Stack

The practical stack should be:

1. Agent contract and capability registry
   - Identity, owner, role, mission, tools, sources, permission tier, model route, approval posture, logging, memory scope, failure visibility, and decommission path.

2. Source packet and mission packet
   - Exact source URL or source family, allowed areas, forbidden actions, actor/session boundary, storage rules, content-use rules, budget, expected output, and stop conditions.

3. Tool registry
   - Browser Hands (`source:god-mode`, `source:local-browser-hands`, and Stagehand/local browser), repo deep review, newsletter intake, free Skool runner, source session broker, YouTube full-watch, file/resource readers, Gmail/Drive where approved, evidence writers, and scoring/readback tools.

4. Source session broker
   - Isolated persistent profiles, macOS Keychain secret refs, source identity selection, Google/OAuth recipes, auth-needed events, wait/resume, and fail-closed reports.

5. Observe layer
   - DOM text, headings, anchors, forms, buttons, screenshots, page health, browser health, auth/paywall/form/download blockers, source type, and page state.

6. Planner and brain
   - Decide next safe action from the source packet and SOP. It should not hardcode "this URL is good"; it should reason from source evidence, source policy, visible page state, and mission fit.

7. Hands/action layer
   - Safe click/navigation/scroll only inside policy. Stop before login, join, signup, submit, download, buy, post, comment, message, account/profile changes, payment, private content, or CAPTCHA unless the exact source/session packet permits that action.

8. Extraction layer
   - Pull useful claims, code/resources/templates, implementation patterns, workflow steps, tools, dashboards, courses, linked resources, paid-gate value, and source-stack updates.

9. Evidence spine
   - Every output needs source URL, capture time, artifact ID, page title, page hash/text hash where useful, screenshot hash when visual, source report ID, video ID/timestamp when applicable, action log, blocker, and stop reason.

10. Memory and skill layer
   - Successful source workflows become reusable skills/SOPs. Repeated failures become verifier or recovery rules, not chat reminders.

11. Queue and autopilot
   - Scheduled source jobs, lease/lock, budget, run caps, retry caps, idempotency, stale/fresh status, no-babysitting mode, and a clear next action when blocked.

12. UI/control surface
   - Show running/idle/error, last run, source stack, source grade, evidence counts, blockers, handoff queue, parked paid/auth rows, and what the agent is doing next.

13. Verification and audit
   - Dogfood exact failures: blank browser page, wrong signup branch, restore-session prompt, auth wall, paid gate, unsafe download, hidden form submit, no evidence, false God Mode claim, stale source state, and missing source-stack persistence.

## Build Order

Implementation slice now exists in `lib/source-browser-agent-harness.js`, with focused proof `npm run process:source-browser-agent-harness-check -- --json` and CLI entrypoint `npm run source:browser-agent -- --url=<exact-source-url> --sourceType=<source-type> --json`.

This slice does not claim full live source extraction. It creates the governing Source Browser Agent harness that accepts an exact source packet, chooses the existing runner, checks page/browser health, routes session/auth work through `SOURCE-SESSION-BROKER-001`, and fails closed before unsafe action. The dogfood proof covers public resource routing, repo routing, newsletter no-submit parking, free Skool session gating, MyICOR Google SSO auth-needed, MyICOR wrong-signup fail-closed, blank browser fail-closed, and purchase/action blocking.

The second slice makes the harness readback-ready. Any plan can now be serialized into the same `source_crawl_items`-style record used by the Dev source-browser summary, including bucket, route, terminal state, blocker, auth-needed, side-effect, and source-stack metadata. `npm run source:browser-agent -- --url=<exact-source-url> --sourceType=<source-type> --crawlItem --json` prints that handoff shape for inspection, and the focused proof verifies that public, repo, newsletter, free-community, paid/auth, and failed-closed states render without unsafe side effects.

The third slice wires the agent into the real YouTube source handoff path. Selected runnable YouTube-discovered source rows now pass through Source Browser Agent preflight before `source:god-mode`, `repo:deep-review`, or `skool:free-god-mode` runs, and the persisted source handoff crawl items carry the agent plan, route, terminal state, source-stack surface, and side-effect truth.

The public repo lane now has a quality hardening slice: `repo:deep-review` blocks GitHub/GitLab chrome paths such as pulls, projects, issues, actions, releases, settings, branches, tags, and commits before they can be followed as implementation evidence. It also prefers primary repo content and filters GitHub navigation/session snippets so repo implementation patterns come from README/docs/examples/license content instead of site chrome.

The browser-fallback slice now turns page-health failures into explicit continuation plans. Blank/control/empty browser states still fail closed, while browser challenge/interstitial pages now attach a structured fallback plan with route, first step, next action, allowed actions, forbidden actions, source-session requirement, and normal-Chrome prohibition. Fallback plans now include bounded self-recovery policy: retry clean/isolated first, use source-specific session when required, then escalate to the Harlan Telegram operator lane only after retries fail, auth/2FA is required, or real source content still cannot be proven. This does not solve the challenge, send a message, or run a hosted browser; it prevents a generic stop from losing the next move.

The Harlan escalation bridge now connects those stuck-source plans to the existing Harlan auth-escalation dry-run contract. Source-browser fallback and auth-needed plans prepare an `auth_needed` operator packet with Harlan card ID, Telegram notification metadata, `waitsForDoneToken: DONE`, and `sendsMessageNow=false`. Dev/source readback can show that a Harlan Telegram draft exists, but the proof path still sends nothing and mutates no credentials. Actual Telegram messages, source-session resume, CAPTCHA/challenge handling, and login execution remain approval-bound follow-up work. Hosted Browserbase fallback is parked outside Human Web Agent V1.

The executor slice adds the first standalone execute-and-ledger wrapper for the Source Browser Agent. `npm run source:browser-agent -- --url=<exact-source-url> --sourceType=<source-type> --execute --json` plans the exact source packet, runs the selected existing source tool when the plan is allowed, and builds a `source-browser-agent-runs` ledger item with runner status, page counts, source-stack metadata, blockers, and side-effect truth. Short form: `source:browser-agent -- --execute` is the safe exact-packet execution front door. Public pages, public repos, and newsletter no-submit intake can run through this wrapper; session-bound Skool, paid/auth MyICOR, external newsletter signup, downloads, purchases, posting, messaging, and Scoper promotion still stop until the source-session/operator lanes are approved. In plain English: this makes the agent executable for safe source packets, but it is still no external signup, paid/auth, download, purchase, post, message, or Scoper promotion.

The local virtual browser hands slice now gives the agent a no-model/no-Browserbase browser adapter. `npm run source:local-browser-hands -- --url=<exact-source-url> --json` opens the exact URL in an isolated Playwright source profile, captures DOM/text/screenshot evidence, classifies anchors/buttons/forms, makes at most explicitly requested safe anchor navigation, and fails closed on restore/blank/browser-control pages. The focused proof is `npm run process:local-virtual-browser-hands-runtime-check -- --json`. This is the preferred local hands path; Browserbase is parked outside Human Web Agent V1.

The source-session profile probe now uses that local hands adapter as the first auth/session preflight. `npm run source:session-probe -- --url=<exact-source-url> --sourceFamily=<source-family> --source=<source-id> --json` opens the exact URL in an isolated source profile, reads auth/browser state, calls `SOURCE-SESSION-BROKER-001`, and returns ready, auth_needed, wrong_signup_branch, or blocked. Its focused proof covers a ready free-community session, a login wall, a MyICOR Start Free/profile branch, and MyICOR Google SSO MFA without submitting credentials, using Browserbase, calling a model, or sending Harlan live.

The source-session readiness surface now points Skool and MyICOR prep rows at that profile probe first. A parked Skool row shows `source:session-probe` against the exact community/about URL before `skool:free-god-mode`; a parked MyICOR row shows `source:session-probe` against a myICOR URL with the existing Google SSO account before any browser fallback or course extraction.

The brain route policy now makes the route choice explicit before source-browser runs. It uses deterministic worker first for normal public/free pages, repo deep review for code/docs, newsletter no-submit intake for newsletter pages, local virtual browser hands for source-specific interaction, Source Session Broker/Harlan for auth/session/MFA, and API/Stagehand only with explicit proof-sized model caps. Browserbase is parked outside Human Web Agent V1, and hosted Browserbase requests fail closed even if old env keys or stale bakeoff flags exist. This prevents unsupported subscription-style model labels, uncapped API loops, or Browserbase env keys from silently becoming the source-browser brain. The focused proof is `npm run process:source-browser-brain-route-policy-check -- --json`.

The creator source-stack readback now consumes persisted source-browser run metadata instead of only counting discovered links. Creator stack surfaces expose saved source-run evidence counts, last processed time, pages/resources/blockers, best safe grade/score signal, runner/runtime status, and no raw artifact paths. Live proof currently shows saved source-run evidence visible on 35 of 36 creator source stacks while the remaining session/auth/community/product work stays parked behind its source-specific boundary.

The fallback executor slice makes saved browser-challenge rows actionable without pretending they are extracted. `npm run source:browser-fallback -- --url=<exact-source-url> --bucketId=<handoff-bucket> --json` dry-runs by default, builds an exact clean-isolated retry packet, and can execute only when explicitly requested. Public bridge rows retry through the public/free source family first; session-bound Skool/newsletter/MyICOR rows wait for source-session proof and expose an after-session retry command. If the clean retry still sees a browser challenge, the row parks for Harlan/operator escalation or future explicitly approved fallback instead of counting as source evidence.

The fallback batch planner turns that retry packet layer into a bounded operator/scheduler batch. Browser-challenge review now exposes `retryBatch`, and `npm run source:browser-fallback-batch -- --json --max-runs=5` shows the first clean-isolated retries without launching them. The selector uses Dev source priority but spreads across hosts first, so one challenged host cannot consume the entire batch.

Live persistence repair: the Source Browser Agent recovery target now uses the registered YouTube Intelligence source contract, the existing `recovery` crawl lane, manual runtime mode, and explicit runtime caps so Postgres constraints protect the run ledger instead of being bypassed by fixture proof. Clean retry batches also treat safe parked rows as handled: if a row still hits a browser challenge and has no unsafe side effects, the batch records it as parked for operator/future-fallback review instead of crashing or claiming extraction.

1. Promote Source Browser from runtime to agent harness.
   - Use `AGENT-TEMPLATE-RUNTIME-CONTRACT-001` and `AGENT-CAPABILITY-REGISTRY-001` as the governing protocol.
   - Do not create a brand-new protocol unless a concrete missing field is found.
   - Add a Source Browser Agent run state machine: queued, preparing_session, observing, planning, acting, extracting, evaluating, recording, waiting_auth, blocked, completed, failed_closed, parked.

2. Wrap current tools behind the agent.
   - `source:god-mode` for public/free pages.
   - `repo:deep-review` for public repos/docs.
   - `skool:free-god-mode` for free communities.
   - Newsletter intake for signup/status/extraction.
   - Source Session Broker for auth/session/MFA.
   - YouTube full-watch and handoff queue as upstream source discovery.

3. Build the policy brain and step evaluator.
   - The agent must inspect visible state and source packet rules before acting.
   - It must classify the next action as allowed, blocked, needs source session, needs human auth, needs value review, needs file policy, or stop.
   - It must not treat provenance, URL title, creator name, or approval queue label alone as enough to act.

4. Harden session and auth loop.
   - Use isolated source profiles, not normal Chrome.
   - Use Keychain secret refs, not chat or git secrets.
   - Use source-specific login recipes only where approved.
   - Emit auth-needed through the Harlan Telegram operator flow for MFA/challenges, wait for done, silently reverify, then resume or fail closed.

5. Prove one real source family at a time.
   - Public page/resource.
   - Public repo/docs.
   - Newsletter page and later approved signup.
   - Free Skool/community with 20-day SOP.
   - MyICOR/native read-only connector or paid browser session only after exact packet.
   - Paid Skool/course only after exact paid/private packet.

6. Persist source-stack output.
   - Creator/source cards must show YouTube, blog/site, repo/docs/resources, newsletter, free community, paid community/course, status, grade contribution, artifacts, blockers, and next action.
   - V1 readback shape now exists for source-browser agent plans; the remaining work is live DB persistence from real runner output and richer source-stack cards once real rows are saved.

7. Keep hosted/browser fallback out of this sprint.
   - Browserbase is parked outside Human Web Agent V1. Browser Use/OpenAI computer-use/Firecrawl-style ideas can inform local tooling and future fallback research, but the active build is local-first source packets, local browser hands, connectors, Source Session Broker, and Harlan escalation.

## What "Done" Means

`SOURCE-BROWSER-AGENTIC-RUNTIME-001` is not done because a page can be fetched.

It is done when a Source Browser Agent can:

- accept an exact source packet and mission packet
- prepare the right isolated source session
- observe the page/source state
- choose safe next steps
- click/navigate/scroll where allowed
- stop at boundaries with a useful reason
- extract source value with evidence
- update the creator/source stack
- route paid/auth/newsletter/community/repo follow-ups correctly
- write run/evidence artifacts
- show status in the Dev/source UI
- recover from known browser-state failures
- ask for human auth only when truly needed
- run on schedule without Steve or Codex babysitting ordinary public/free work

## What Is Not Next

- Do not throw away `source:god-mode`, repo deep review, Skool runner, source session broker, or YouTube handoff work.
- Do not buy a browser vendor before the local Source Browser Agent has a dogfood failure that proves the missing capability.
- Do not claim CAPTCHA bypass, paid/private content access, purchases, posting, messaging, trading, banking, or external writes are normal extractor actions.
- Do not auto-promote build ideas to Scoper from this work.
- Do not store raw secrets, paid/private course content, screenshots, or page text in git.

## Steve Manual Help Path Until Closed Loop

Steve can manually help in three ways without weakening the target system:

- Provide repo/source URLs to seed the source packet queue.
- Approve exact paid/private/auth source packets.
- Clear MFA or human verification through the human-agent auth-needed flow.

That help should become less frequent over time. If the same manual help is needed repeatedly, it should become a credential/session recipe, source policy, verifier rule, or explicit blocker.
