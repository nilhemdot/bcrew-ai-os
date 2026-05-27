# Matt Pocock Claude Folder Eval Closeout

Card: `MATT-POCOCK-CLAUDE-FOLDER-EVAL-001`  
Closeout key: `matt-pocock-claude-folder-eval-v1`

## What Changed

Created the public GitHub/source eval packet for `mattpocock/skills` without installing, importing, extracting, or copying raw skill content.

## What It Does

- Records public repo metadata, inspected commit, MIT license, lookup-time stars/forks/open issues, tree shape, skill count, plugin-exposed skills, and inspected public files.
- Classifies transferable patterns: small composable skills, setup-before-dependent-skills, glossary/ADR markdown memory, feedback-loop proof, and handoff compaction.
- Records the 90-day context-retention claim as unverified because the public repo scan did not find that pattern.
- Blocks installer/plugin/symlink/config mutation, raw content copy, YouTube/course extraction, paid/private auth, model calls, downstream writes, and hidden workers.

## Proof

- `node --check lib/matt-pocock-claude-folder-eval.js lib/foundation-intelligence-audit-verifier.js scripts/process-matt-pocock-claude-folder-eval-check.mjs scripts/foundation-verify.mjs`
- `npm run process:matt-pocock-claude-folder-eval-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=MATT-POCOCK-CLAUDE-FOLDER-EVAL-001 --planApprovalRef=docs/process/approvals/MATT-POCOCK-CLAUDE-FOLDER-EVAL-001.json --closeoutKey=matt-pocock-claude-folder-eval-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=MATT-POCOCK-CLAUDE-FOLDER-EVAL-001 --closeoutKey=matt-pocock-claude-folder-eval-v1`
- `npm run process:foundation-ship -- --card=MATT-POCOCK-CLAUDE-FOLDER-EVAL-001 --planApprovalRef=docs/process/approvals/MATT-POCOCK-CLAUDE-FOLDER-EVAL-001.json --closeoutKey=matt-pocock-claude-folder-eval-v1 --commitRef=HEAD`

## Known Limits

This does not install Matt Pocock skills, import raw repo content, adapt a runtime skill system, extract public YouTube/course material, use paid/private auth, call models, write downstream intelligence outputs, mutate external systems, or launch hidden subagents/parallel builders.

## Next

Continue `FOUNDATION-KB-ACTION-REVIEW-SPRINT-001` from live repo truth.
