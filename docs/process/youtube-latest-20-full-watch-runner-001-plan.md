# YOUTUBE-LATEST-20-FULL-WATCH-RUNNER-001 Plan

## What

Build the guarded full-watch runner for the selected non-Mark public YouTube Build Intel batch.

Plain English: the latest-20 manifest picks the next small batch. This card actually processes that batch through the proven God Mode route: video/audio/visual watching, page evidence, description/resource links, safe public link resolution, blocked-link reasons, proposal-only atoms, and a Director-readable report. Each applied batch gets its own report ID and source note so repeated ICOR/general runs do not overwrite prior evidence.

## Why

Steve should not manually chase YouTube description links. The code, skill package, docs, or template often lives behind those links, and the Scoper needs that context before an idea can be called scoped.

The Mark baseline proved the route. The non-Mark runner makes the same path reusable for other approved public creators without broad extraction, private source drift, or automatic backlog spam.

## Acceptance Criteria

- Reads the bounded selection from `YOUTUBE-LATEST-20-INTEL-RUN-001`.
- Requires `--apply --live-gemini-api` before any paid provider/full-watch run.
- Processes only public/no-auth, non-Mark, non-private, non-paid YouTube videos selected by the manifest.
- Supports targeted creator batches, for example ICOR with Tom, while keeping the same public/no-auth, non-private, non-paid boundaries and 1-9 video cap.
- Uses Gemini API full video/audio/visual understanding, not transcript-only output and not Gemini Workspace/subscription scout output.
- Captures YouTube page/description evidence and screenshot metadata without storing raw video or screenshot bytes in git.
- Runs the YouTube resource-link resolver for every video:
  - safe public repo/docs/page links are read as metadata
  - unsafe/private/paid/login/download/form links are blocked with exact reason
  - unresolved safe public links block Scoper readiness
- Persists one unique report artifact per applied batch, proposal-only atoms, and evidence hits.
- Does not create backlog cards, approve work, open sprint work, purchase, download, opt in, submit forms, log in, mutate credentials, or write externally.

## Definition Of Done

- Add `lib/youtube-latest-20-full-watch-runner.js`.
- Add `scripts/process-youtube-latest-20-full-watch-runner-check.mjs`.
- Add package script `process:youtube-latest-20-full-watch-runner-check`.
- Focused dogfood proves:
  - healthy full-watch batch can proceed to Director resynthesis
  - unresolved public resource links block Scoper readiness
  - runner stays proposal-only and does not write backlog/external systems
- Default proof is read-only and selects the current batch without calling Gemini.
- Read-only proof and Director resynthesis can discover prior unique latest-20 full-watch batch reports instead of relying on one overwrite-prone static report ID.
- Apply path requires both `--apply` and `--live-gemini-api`.

## Not Next

- Do not run all creators.
- Do not run Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not download videos or store raw video/screenshot bytes in git.
- Do not auto-promote build candidates into backlog or sprint.
- Do not use OpenClaw, subscription scout output, or metadata-only extraction as full-watch proof.

## Tests

- `node --check lib/youtube-latest-20-full-watch-runner.js`
- `node --check scripts/process-youtube-latest-20-full-watch-runner-check.mjs`
- `npm run process:youtube-latest-20-full-watch-runner-check -- --json`
- Apply proof, only when explicitly running the live batch:
  - `npm run process:youtube-latest-20-full-watch-runner-check -- --apply --live-gemini-api --batch-size=9 --json`
