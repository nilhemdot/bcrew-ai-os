# GEMINI-VIDEO-BRAIN-ROUTE-001 Plan

Closeout key: `gemini-video-brain-route-v1`

## What

Add and prove one bounded Gemini API route for Brain Fleet video/vision and long-context extraction readiness. V1 registers the existing Gemini credential/route with explicit model truth, runs one ledgered Gemini API readiness probe in close-card mode, records auth method, selected model, quota tier/reset posture, video/vision/long-context capability, artifact contract, fallback behavior, route-probe evidence, and no-credential-mutation proof.

This is route readiness only. It does not process source videos, upload files, run broad YouTube extraction, crawl Skool/MyICOR/Loom, create atoms, or promote Gemini to scheduled extractor runtime.

## Why

Extractor proof needs a governed video/long-context brain route before Build Intel extraction can start. Gemini is the practical route for public-video and long-context workloads, but it must be visible to Brain Fleet as a ledgered, credential-safe, fail-closed route instead of an untracked provider call.

Operator value: Steve can see which Gemini account label/model is available, what quota posture is known or unknown, what artifact contract future extractor calls must preserve, and what fallback exists before exact Build Intel source items are approved.

Useful operator behavior this unlocks: Steve can approve a real workflow for the next extractor proof with confidence that video/long-context work will either route through a ledgered Gemini brain, fall back to transcript/text-only extraction, or stop with an auth/quota reason he can act on. This improves extraction quality and speed because the builder no longer has to guess which account/model/fallback is safe during the first approved Build Intel source run.

## Acceptance Criteria

- `GEMINI-VIDEO-BRAIN-ROUTE-001` has a 9.8+ Plan Critic row and approval file.
- `lib/llm-router.js` contains Gemini credential/route metadata with an explicit primary model, fallback route, allowed video/long-context workloads, and route limitations.
- `lib/gemini-video-brain-route.js` runs the bounded route proof through the official Gemini API using an env API key only.
- The proof writes Brain Fleet quota ledger truth before live Gemini execution: workload, route, model, account label, status, artifact, quota/reset posture, failure reason, and stop condition.
- The proof records route-probe evidence with account label, auth method, selected model, primary/fallback availability, quota tier posture, video/vision/long-context capability, artifact contract, fallback, and no-external-write posture.
- If auth/API-key repair is needed, the proof records the failure, uses the Harlan auth-needed flow, prepares dry-run Steve-only notification, fails closed, and does not close the card.
- The Gemini API credential environment fingerprint is checked before/after and any mutation fails the proof.
- No source video is processed, no raw video is stored, no file upload occurs, and no broad extraction runs from this card.
- Current Sprint advances to `CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001` only after focused proof and Foundation ship gates pass.

## Definition Of Done

Done means the Gemini route is added to existing LLM runtime truth, the close-card proof runs exactly one bounded Gemini API readiness probe after creating a Brain Fleet ledger row, route-probe evidence is recorded, auth/model/capability/quota/artifact/fallback truth is visible, the API key environment posture is unchanged, Current Sprint advances to `CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001`, and all listed proof commands pass through `process:foundation-ship`.

Done does not mean Gemini is approved for broad extraction, paid/private source access, raw video storage, source crawling, scheduled extractor runtime, Strategy work, People work, or autonomous provider retries. Exact source approval and extractor proof remain separate cards.

## Details

V1 is a route/proof slice. It changes Gemini route metadata, runs one bounded provider probe, records proof rows, and advances Current Sprint only when the proof passes.

Official Gemini docs used as capability anchors:

- Gemini model docs record `gemini-2.5-flash` as supporting text/images/video/audio input, text output, and a 1,048,576-token input limit: <https://ai.google.dev/gemini-api/docs/models/gemini>
- Gemini video understanding docs describe Gemini video input methods, public YouTube URL support, supported formats, and video limits: <https://ai.google.dev/gemini-api/docs/video-understanding>
- Gemini long context docs describe 1M+ token context windows and long-context use cases: <https://ai.google.dev/gemini-api/docs/long-context>
- Gemini rate-limit docs explain that quota tiers/rate limits are provider/account dependent: <https://ai.google.dev/gemini-api/docs/rate-limits>

## Existing Work Reused

Existing code reused:

- `lib/llm-router.js` remains the canonical route/credential seed surface.
- `lib/brain-fleet-quota-ledger.js` remains the required call ledger boundary.
- `lib/brain-fleet-model-capability-registry.js` remains the route capability truth reader.
- `lib/harlan-auth-escalation-loop.js` remains the auth-needed escalation path.
- `lib/foundation-llm-runtime-store.js` remains the `llm_credentials`, `llm_routes`, `llm_route_probes`, and `llm_calls` store.
- Current Sprint, live backlog, approval integrity, Plan Critic, process write guard, closeout registry, and `process:foundation-ship` remain the process control plane.

Existing docs reused:

- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/_archive/handoffs/2026-05-20-orchestrator-builder-run-checkpoint.md`
- `docs/_archive/handoffs/2026-05-20-harlan-auth-escalation-loop-closeout.md`
- `docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-brain-fleet-quota-ledger-closeout.md`
- `docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-brain-fleet-model-capability-registry-closeout.md`
- `docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-codex-direct-subscription-route-closeout.md`

Existing scripts reused:

- `scripts/process-harlan-auth-escalation-loop-check.mjs`
- `scripts/process-brain-fleet-quota-ledger-check.mjs`
- `scripts/process-brain-fleet-model-capability-registry-check.mjs`
- `scripts/process-codex-direct-subscription-route-check.mjs`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship`

Live backlog and Current Sprint truth reused:

- `GEMINI-VIDEO-BRAIN-ROUTE-001` is the active P0 card.
- `CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001` is the next card.
- Strategy, People, broad extraction, and broad paid/private source work remain parked.

Implementation behavior:

- Use credential `gemini-api-default` with provider `gemini`, auth path `gemini_api_direct`, canonical account label `GEMINI_API_KEY`, and API fallback policy.
- Use route `foundation-video-gemini-api` with workload `video_vision`, primary model `gemini-2.5-flash`, fallback model evidence `gemini-2.5-flash-lite`, and text/transcript fallback route `foundation-extraction-openai-api`.
- Use the Gemini REST API with `x-goog-api-key` and `generateContent` for one tiny readiness response in close-card mode.
- Use model metadata to record `inputTokenLimit`, `outputTokenLimit`, and `supportedGenerationMethods`.
- Store only proof metadata, route-probe capability truth, artifact refs, quota posture, and ledger truth. Do not store API keys, raw source videos, private profile content, or broad model output.
- Mark quota tier/reset as explicit unknown when the bounded Gemini probe does not expose provider quota tier/reset truth.
- Preserve the route-readiness boundary: future extractor source item approval and runtime extraction remain separate cards.

Behavior proof, not substring proof:

- Synthetic dogfood exercises successful Gemini proof, ledger create/finish, auth-needed failure through Harlan, rate-limit failure, fallback-model selection, missing key failure, no external sends, and no credential mutation.
- Live close-card proof writes a planned `llm_calls` ledger row before the Gemini API call and finishes it as succeeded or failed with a stop condition.
- Live close-card proof records an `llm_route_probes` row for the Gemini route.
- Live close-card proof checks the Gemini API key environment fingerprint before and after the probe and fails if it changes.

## Not Next

- Do not run broad YouTube extraction, Skool, MyICOR, Loom, or other source crawls from this card.
- Do not process private, paid, unlisted, or Steve-unapproved video/source items.
- Do not upload files, store raw video, create atoms, write training notes, or create Build Intel review routes from this card.
- Do not send emails, Telegram, Slack, public posts, Drive writes, or other external writes.
- No external writes are allowed from the focused proof or close-card proof.
- Do not mutate credentials, API keys, browser profiles, provider config, source systems, Drive permissions, or public exposure settings.
- Do not hide auth, quota, rate-limit, provider, ledger, capability, artifact-contract, or credential-mutation failures by classification. Green means raw green.

## Gate Decision Tree

Static checks alone are not enough because this card adds route metadata, writes live `llm_calls` and `llm_route_probes` proof rows, and runs one bounded provider call. The focused card proof is required while building because it dogfoods the ledger-before-provider invariant, Harlan auth-needed branch, rate-limit branch, fallback branch, artifact contract, quota tier posture, and no-credential-mutation proof. Full gates are required for closeout because the card changes live sprint truth, closeout records, verifier coverage, package scripts, and served Foundation truth.

Speed budget: the focused proof is intentionally thin and should finish under 5 minutes in normal conditions. It performs static syntax checks, synthetic branch dogfood, one small Gemini `generateContent` readiness call in close-card mode, and the standard Foundation gates; it does not run video extraction, file uploads, source crawls, batch work, or another heavy audit.

## Risks

- Risk: Gemini route proof becomes broad extraction. Mitigation: v1 sends only a tiny readiness prompt, processes no source video, uploads no files, stores no raw video, and blocks source extraction to later cards.
- Risk: route probe spends capacity without ledger truth. Mitigation: close-card proof creates the Brain Fleet ledger row before the Gemini API request.
- Risk: Gemini API key is missing, expired, or quota-blocked. Mitigation: failure is classified as `auth_needed`, `rate_limited`, or `quota_exhausted`, routed through Harlan when auth is needed, and the card stays blocked.
- Risk: quota tier is guessed. Mitigation: quota tier is recorded as explicit unknown unless the provider response exposes it.
- Risk: capability is claimed from stale memory. Mitigation: route-probe evidence records live model metadata plus official docs anchors; unsupported or unproven posture remains `probe_required`.
- Repair path: if focused proof, System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, or `process:foundation-ship` fails, keep this card active, repair the exact failing invariant, and do not start Claude.

## Tests

Focused proof:

- `node --check lib/gemini-video-brain-route.js lib/llm-router.js scripts/process-gemini-video-brain-route-check.mjs`
- `npm run process:gemini-video-brain-route-check -- --close-card --json`

System gates:

- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=GEMINI-VIDEO-BRAIN-ROUTE-001 --planApprovalRef=docs/process/approvals/GEMINI-VIDEO-BRAIN-ROUTE-001.json --closeoutKey=gemini-video-brain-route-v1 --commitRef=HEAD`

Gate decision tree: this is a P0 Foundation runtime/governance card with a bounded live provider call, live LLM route/probe/ledger writes, Current Sprint truth, closeout registry, package script, and verifier coverage. It needs focused behavior proof, live route proof, System Health, repeated-failure gate, backlog hygiene, full `foundation:verify`, and `process:foundation-ship`.
