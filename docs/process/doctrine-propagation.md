# Doctrine Propagation

Plain English: this check keeps the active `bcrew-foundation` skill aligned with the operating rules Steve approved during the rebuild.

## What It Does

- Keeps a marked generated doctrine section inside the local `bcrew-foundation` skill.
- Uses a hardcoded doctrine source list in `lib/doctrine-propagation.js`.
- Checks private memory files by timestamp only.
- Flags tier-two surfaces for human review instead of editing them automatically.

## Privacy Rule

Private memory files can trigger review, but their content is not copied into tracked repo docs or shared skill output.

That means `MEMORY.md` and `memory/*.md` are used as signals, not as text sources. If a memory entry contains a new durable rule, a builder must add a plain-English summary to `lib/doctrine-propagation.js` manually.

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

## V1 Limits

- V1 does not automatically update `SOUL.md`, `docs/users/steve.md`, or agent personas.
- V1 does not read private memory content into repo truth.
- V1 does not know Steve's external Google Doc hit list. That drift class is parked under `HIT-LIST-RECONCILE-001`.
