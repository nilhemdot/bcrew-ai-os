# Doctrine Propagation

Plain English: this check keeps the active `bcrew-foundation` skill aligned with the operating rules Steve approved during the rebuild.

## What It Does

- Keeps a marked generated doctrine section inside the local `bcrew-foundation` skill.
- Uses a hardcoded doctrine source list in `lib/doctrine-propagation.js`.
- Checks private memory files by metadata only: root private files plus every tracked daily note under `memory/*.md`.
- Flags tier-two surfaces for human review instead of editing them automatically.

## Privacy Rule

Private memory files can trigger review, but their content is not copied into tracked repo docs or shared skill output.

That means `MEMORY.md`, `USER.md`, `TOOLS.md`, `IDENTITY.md`, `HEARTBEAT.md`, and `memory/*.md` are used as signals, not as text sources. The checker records path, existence, modified time, and whether the file changed after the generated skill section. It does not read or copy private file content into tracked docs, skill output, API JSON, or verifier logs.

If a memory entry contains a new durable rule, a builder must add a plain-English summary to `lib/doctrine-propagation.js` manually.

## Generated Section Rule

Only the section between these markers is generated:

```md
<!-- BEGIN GENERATED BCrew Foundation Doctrine -->
<!-- END GENERATED BCrew Foundation Doctrine -->
```

The rest of the skill stays human-maintained.

## How To Run

Check only:

```sh
npm run doctrine:propagation-check
```

Regenerate the marked skill section:

```sh
npm run doctrine:propagation-check -- --apply
```

## V2 Behavior

- Private memory detection is wildcard-backed for `memory/*.md`; adding a new daily memory file does not require editing the checker.
- Tier-two persona surfaces include `SOUL.md`, `docs/users/steve.md`, and agent-persona docs. They are checked through semantic signal groups rather than one brittle exact phrase.
- Private memory stats expose `contentMode: metadata-only` and `contentCopied: false`.

## Limits

- V2 does not automatically update `SOUL.md`, `docs/users/steve.md`, or agent personas.
- V2 does not read private memory content into repo truth.
- V2 does not know Steve's external Google Doc hit list. That drift class is parked under `HIT-LIST-RECONCILE-001`.
