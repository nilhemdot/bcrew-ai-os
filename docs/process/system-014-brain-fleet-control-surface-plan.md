# SYSTEM-014 - Brain Fleet / System Control Surface

## Objective

Build a Foundation control surface that shows every LLM-powered system package in plain English and lets Steve switch approved model/effort routes without editing code.

## Why This Matters

The system has extractors, synthesis, action routing, Directors, audits, video eyes, coding/review lanes, and future hub-specific intelligence. These are not all "agents" in code, but they act like system workers from Steve's point of view.

Steve needs one governed place to see:

- what the component does;
- what brain/provider powers it;
- what model and effort/speed it is using;
- whether the route is available, blocked, pending proof, or cheap/experimental;
- what it costs or risks before switching it;
- what command or approved path changes it.

## V1 Scope

- Read from Foundation runtime truth: `llm_routes`, `llm_credentials`, route metadata, and existing extractor/system registries.
- Group routes by operator-facing package: video eyes, text extraction, synthesis, action router, Dev Intelligence Director, deep audit, coding/review lanes, embeddings, and future hub Directors.
- Show provider, model, effort/speed, status, policy, risk, credential status, and what the route powers.
- Use the new CLI control layer as the backend contract: `npm run llm:route`.
- Keep OpenClaw blocked unless a future approved card deliberately changes that.
- Keep changes governed: no silent provider promotion, no hidden credential changes, and no automatic external side effects.

## Not In Scope

- Do not build a new model provider adapter.
- Do not promote Claude/Codex subscription routes into scheduled automation without route proof.
- Do not expose raw secrets, tokens, browser profiles, or local account details.
- Do not make broad extractor/source changes from this card.

## Acceptance Criteria

- Foundation has a Brain Fleet/System Control page or card that Steve can understand without engineering translation.
- Every visible route has plain-English "what this powers" copy.
- Route status language is clear: Live, Ready to test, Needs proof, Blocked, or Missing key.
- Approved route changes go through one governed API/command path and write change events.
- The UI makes clear when a route is cheap, fast, quality, or max intelligence.
- The page can show subscription lanes like Claude/Codex as capacity lanes without pretending they are proven backend routes.

## Proof Commands

- `npm run llm:route -- --show --json`
- `npm run intelligence:spine-god-mode-check -- --json`
- focused UI proof once the page exists

