# AVATAR-IMPORT-001 Plan

Status: scoped for v1 approval
Card: AVATAR-IMPORT-001
Closeout key: avatar-import-v1

## What

Import the old BCrew-Buddy avatar work into the new repo as governed Foundation truth: 10 RETAIN client avatars and 5 ATTRACT agent avatars, with stable avatar IDs, source-backed profile files, and a small registry API/library that future atoms, briefs, and marketing cards can reference.

## Why

The audits agreed that avatars are one of the highest-leverage old-system assets still missing from the new system. They have been stuck in research while the new intelligence spine already supports `avatar_ids`. This card carries the useful data forward without starting the full marketing production pipeline.

Operator value: Steve and future marketing/scoper work get one inspectable registry of the exact avatars the old system already researched, instead of hunting through old repos or asking agents to remember which avatar names are canonical.

## Acceptance Criteria

- The old source files are present under `docs/marketing/avatars/source/old-bcrew-buddy/` and include the full RETAIN, ATTRACT, reference brief, and old README content.
- A governed registry exposes exactly 15 avatar records: 10 `RETAIN-*` client avatars and 5 `ATTRACT-*` recruiting avatars.
- Every registry record has a stable ID, track, name, who, pain, emotions, trigger language, content direction, source docs, researched date, and marketing-use boundary.
- Full source profile proof confirms every avatar preserves platform behavior, objections, and buying signals in the imported source docs.
- Future integration is explicit: atoms may reference registry IDs through existing `avatar_ids`, but non-marketing atoms are not required to carry avatars.
- Current Sprint moves `AVATAR-IMPORT-001` to Done This Sprint and advances the active blocker only to the next approved sprint card.

## Definition Of Done

- `lib/marketing-avatar-registry.js` owns parsing, registry normalization, summary counts, and synthetic proof.
- `scripts/process-avatar-import-check.mjs` validates approval integrity, Plan Critic score, imported source files, registry counts, source section coverage, sprint state, current plan/state, Recent Work, package script, and canonical verifier coverage.
- `npm run process:avatar-import-check -- --json=true` passes.
- `npm run backlog:hygiene -- --json` stays healthy.
- `npm run process:foundation-ship -- --card=AVATAR-IMPORT-001 --planApprovalRef=docs/process/approvals/AVATAR-IMPORT-001.json --closeoutKey=avatar-import-v1 --commitRef=HEAD` passes.

## Details

Existing work reused:

- Existing old-system source docs copied from BCrew-Buddy avatar research.
- Existing intelligence atom `avatar_ids` and `avatar_names` fields in `lib/intelligence-atoms.js`.
- Existing live backlog card `AVATAR-IMPORT-001`, Current Sprint overlay, Recent Work closeout model, approval integrity, Plan Critic, backlog hygiene, and Foundation ship gate.
- Existing docs: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, and imported avatar source docs.
- Existing scripts: `scripts/foundation-verify.mjs`, `scripts/process-foundation-ship.mjs`, and the new focused proof script.

Source files:

- `docs/marketing/avatars/source/old-bcrew-buddy/retain-avatars.md`
- `docs/marketing/avatars/source/old-bcrew-buddy/attract-avatars.md`
- `docs/marketing/avatars/source/old-bcrew-buddy/avatar-reference-brief.md`
- `docs/marketing/avatars/source/old-bcrew-buddy/README.md`

Registry behavior:

- Parse the reference brief into concise registry records.
- Attach each record to its full profile source path.
- Summarize by track and validate the expected `10` RETAIN / `5` ATTRACT shape.
- Verify imported full profiles contain the platform behavior, objection, and buying-signal sections for all 15 avatars.
- Expose the registry snapshot through Foundation API truth so operators can inspect what was imported.

Behavior proof:

- The focused proof calls the real registry parser/function path, not only `currentState.includes(...)`.
- The synthetic behavior proof rejects a wrong-count variant and a missing-required-field variant.
- The source coverage proof fails if full profile docs stop preserving platform behavior, objections, or buying signals.
- Substring-only proof is rejected; source markers support the behavior proof but cannot replace it.

Gate decision tree: full based on blast radius. Static checks cover syntax and imported file presence; the focused `process:avatar-import-check` proof covers registry behavior; the full `process:foundation-ship` gate is required because this touches server API truth, Foundation current sprint, backlog seed, Recent Work, package scripts, imported docs, and canonical `foundation:verify`. The focused proof remains fast enough to run by default before the full gate.

Rollback or repair path: if proof fails, keep `AVATAR-IMPORT-001` out of done, leave the imported files as source evidence only, and repair the parser/registry or reopen the card before any marketing work consumes avatar IDs.

## Risks

- This could drift into Marketing Pipeline rebuild. It must not create writers, editors, schedulers, calendars, campaigns, or production content.
- This could overfit avatars into the entire intelligence atom model. It must keep avatars optional and marketing-overlay-first.
- Source files contain old-system research language and market references. V1 preserves them as imported source truth; freshness/refresh is a later card.
- The parser could become brittle if the reference brief format changes. The proof must fail loudly on count or required-field drift.

## Tests

- Behavior proof calls the registry/parser path and rejects missing-field or wrong-count variants.
- Source proof checks imported full profiles contain 15 platform behavior sections, 15 objection sections, and 15 buying-signal sections.
- Script proof checks live backlog lane, Current Sprint stage, active blocker advancement, package script, current plan/state closeout, Recent Work closeout, and `foundation:verify` canonical coverage.
- Full ship gate remains required because this touches Foundation backlog, current sprint, build log, package scripts, API truth, docs, and verifier coverage.
- Speed bound: `npm run process:avatar-import-check -- --json=true` should stay under one minute; the full ship gate remains the slower final closeout gate.

## Not Next

- Do not build the marketing writer/editor/designer/video/repurposer pipeline.
- Do not build Brand Guardian or brand stack in this card.
- Do not generate content, campaigns, posts, emails, or a content calendar.
- Do not make avatars mandatory for Strategy, Ops, Sales, or all intelligence atoms.
- Do not refresh or rewrite the avatar research beyond importing and governing the existing source.
