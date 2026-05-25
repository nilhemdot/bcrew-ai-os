# INTELLIGENCE-SPINE-GOD-MODE-001 Plan

## What

Upgrade the core Intelligence Spine so extracted evidence from Foundation sources can become elite operator-grade intelligence before any hub or Director uses it.

The spine is:

`source evidence -> synthesis -> action router -> hub intelligence Director -> Scoper/backlog proposal`

This card upgrades the three critical decision layers:

- Synthesis Engine: turns raw facts/evidence into plain-English, owner-ready signals.
- Action Router: routes those signals into human-review destinations with useful reasons, owners, and next actions.
- Dev Intelligence Director: ranks and explains build candidates, including whether each one is ready for Scoper or missing proof.

## Why

Extraction quality only matters if the brain layer can turn it into decisions Steve can trust. More YouTube, meetings, Slack, email, Skool, course, or GitHub extraction will create noise unless the shared synthesizer/router/Director layer is A-plus.

The old safe posture was useful but not enough:

- Synthesis was structurally verified but too internal/hash-heavy.
- Router was approval-gated but used generic route reasons.
- Director ranked ideas but did not clearly say "ready for Scoper" versus "missing proof."
- Model routing still allowed OpenClaw `gpt-5.4` style candidate routes to sit ahead of official high-intelligence API routes if later enabled, and extraction still had an OpenClaw route that could become runnable.

## Acceptance Criteria

- Synthesis dogfood produces operator-readable titles, summaries, action readiness, decision question, and evidence strength.
- Synthesis dogfood rejects internal language such as "collapsed evidence facts," "atom/evidence refs," and "retrieval chunks" in user-facing copy.
- Action Router dogfood produces plain-English routing reasons and avoids generic route-type explanations.
- Action Router payload explains why the human should review the item without internal provenance jargon.
- Dev Intelligence Director dogfood promotes full-watch proof above weaker scout summaries.
- Dev Intelligence Director dogfood emits build readiness, missing pieces, and the Scoper question for top recommendations.
- Core synthesis/deep-review routes use the official `gpt-5.5` route with `extra_high_required` reasoning and `fast` speed mode.
- OpenClaw 5.4/medium routes are blocked for all Foundation workloads unless a future approved policy deliberately re-enables a specific route.

## Definition Of Done

Done means `npm run intelligence:spine-god-mode-check -- --apply --json` and `npm run intelligence:spine-god-mode-check -- --json` both pass and prove the Synthesis Engine, Action Router, Dev Intelligence Director, and model-route posture all reject the old weak behavior in code and runtime route truth.

## Details

Existing code reused:

- `lib/intelligence-synthesis.js`
- `lib/intelligence-action-router.js`
- `lib/dev-team-intelligence-director.js`
- `lib/llm-router.js`
- Existing synthesis verification and Action Router approval gates.

New focused code:

- `lib/intelligence-spine-god-mode.js`
- `scripts/process-intelligence-spine-god-mode-check.mjs`

Model route posture:

- Primary core intelligence route must be official API, `gpt-5.5`, `extra_high_required`, and `fast`.
- OpenClaw is adapter-only and is blocked for core Intelligence Spine brain work.
- Runtime route truth must keep OpenClaw `openai-codex/gpt-5.4` blocked at lower priority for extraction, synthesis, and deep review.
- No live provider call is made by this focused check. It verifies route posture and deterministic dogfood behavior only.

## Not Next

Out of scope:

- No more Mark extraction scale-up.
- No auto backlog promotion.
- No live model/provider call.
- No private/auth source crawling.
- No destination writes.
- No hub UI rebuild.

## Tests

- `node --check lib/intelligence-synthesis.js lib/intelligence-action-router.js lib/dev-team-intelligence-director.js lib/intelligence-spine-god-mode.js lib/llm-router.js scripts/process-intelligence-spine-god-mode-check.mjs`
- `npm run intelligence:spine-god-mode-check -- --apply --json`
- `npm run intelligence:spine-god-mode-check -- --json`
- `npm run intelligence:synthesis-proof -- --json`
- `npm run intelligence:action-router-proof -- --json`
- `npm run process:dev-team-intelligence-director-check -- --json`
- `npm run process:dev-team-hub-v0-check -- --json`
