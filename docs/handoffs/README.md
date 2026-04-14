# Handoffs

Use this folder for end-of-chat checkpoints that another Codex or Claude session can pick up safely.

## Rules

1. Create one file per meaningful checkpoint:
   - `YYYY-MM-DD-<short-slug>.md`
2. Include:
   - what was done
   - what is locked vs still in review
   - key commits
   - next recommended step
   - raw local session path if a native Codex session file exists
3. If a native live-thread export is not available, store a reconstructed transcript or checkpoint handoff instead of pretending the export is complete.
4. Commit and push the handoff in the same turn so the next chat can pull it from GitHub.

## Current convention

- `full-convo` files:
  - long-form transcript or reconstructed transcript
- focused checkpoint files:
  - smaller handoffs for one review pass, feature, or audit cycle
