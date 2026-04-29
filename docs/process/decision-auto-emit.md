# Decision Auto-Emit

Plain English: this tool finds obvious decision language in commit text and turns it into proposed decisions that still need human review.

It is part of `DECISION-AUTO-EMIT-001`.

## What It Does

- Scans commit messages, commit bodies, a text file, or synthetic proof text.
- Looks for decision verbs: Pin, Park, Defer, Pivot, Lock, Disable, Adopt, and `Use X over Y`.
- V2 also recognizes explicit Override and sequence-change language.
- Emits decision candidates as `proposed` only.
- Uses only the existing decision categories: `strategy`, `system`, `execution`, and `people`.
- Defaults uncertain categories to `system` with an evidence note that the category was inferred.
- Deduplicates by source commit plus normalized title.
- Writes to the live decision ledger only when `--apply=true` is passed.
- Refuses private workspace text files before reading them.

## What It Does Not Do

- It does not lock decisions.
- It does not expand the decision category taxonomy.
- It does not do broad historical backfill.
- It does not apply business changes from the decision.
- It does not write anything in synthetic mode.
- It does not silently create applied or locked decisions from detected language.

## CLI Usage

Dry-run the latest commit:

```bash
node --env-file-if-exists=.env scripts/decision-auto-emit.mjs
```

Dry-run one commit:

```bash
node --env-file-if-exists=.env scripts/decision-auto-emit.mjs --commitRef=HEAD
```

Dry-run a commit range:

```bash
node --env-file-if-exists=.env scripts/decision-auto-emit.mjs --fromRef=main~5 --toRef=HEAD
```

Dry-run the approved Foundation source surfaces:

```bash
node --env-file-if-exists=.env scripts/decision-auto-emit.mjs --foundationSources=true
```

Dry-run provided text:

```bash
node --env-file-if-exists=.env scripts/decision-auto-emit.mjs --text="Adopt evidence-based gates before feature work."
```

Run the verifier-friendly synthetic proof:

```bash
node --env-file-if-exists=.env scripts/decision-auto-emit.mjs --synthetic=true
```

Write proposed decisions:

```bash
node --env-file-if-exists=.env scripts/decision-auto-emit.mjs --commitRef=HEAD --apply=true --actor=codex
```

## Write Safety

Dry-run is the default. `--apply=true` is required before anything is written.

Synthetic mode is always read-only. If someone tries `--synthetic=true --apply=true`, the tool fails in plain English.

The write path uses the existing `createDecision` helper. That means new records land in the current decision ledger as `proposed`, not locked.

Apply mode writes proposed decision records only unless a separate explicit approval path is present outside this tool. Detected language by itself must not create applied or locked decisions.

## V2 Source Boundaries

The approved tracked source surfaces are:

- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `lib/foundation-build-log.js`

Private workspace files such as `USER.md`, `MEMORY.md`, and `memory/*.md` are refused as text-file inputs before content is read.

## Dedupe Rule

The dedupe key is:

```text
commit SHA + normalized decision title
```

For text without a commit SHA, the source label replaces the commit SHA.

The same key is also stored in `contextRef` using this shape:

```text
decision-auto-emit:<source>:<normalized-title>
```

When `--apply=true` runs, existing decisions with the same `contextRef` are skipped instead of duplicated.

## Category Rule

The tool only uses the four current categories:

- `strategy`
- `system`
- `execution`
- `people`

If it is unsure, it uses `system` and writes that the category was inferred in `evidenceNotes`.

## Parent Integration Hooks

The parent Wave 4 integration should wire:

- `package.json`: add `decision:auto-emit`
- `scripts/foundation-verify.mjs`: run synthetic proof and idempotency checks
- `lib/foundation-db.js`: add/mark `DECISION-AUTO-EMIT-001`
- `lib/foundation-build-log.js`: add the seven-field closeout
- `/api/foundation-hub` or Decisions surface: expose summary after integration

This core slice intentionally does not edit those shared integration files.
