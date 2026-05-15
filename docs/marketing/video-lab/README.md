# Marketing Video Lab

Status: Phase 1 dry-run core only.

This folder documents the Marketing-owned Video Lab slice for `MARKETING-VIDEO-LAB-001`.

Current scope:

- provider payload builders;
- synthetic asset validation;
- prompt compiler;
- cost estimator;
- mock job lifecycle;
- no-spend dry-run proof.

Stop lines:

- no live video generation;
- no provider spend;
- no UI;
- no `server.js`;
- no `package.json`;
- no database schema or storage changes;
- no nav/home Marketing Hub wiring;
- no Foundation file edits.

Run the focused proof directly:

```bash
node --env-file-if-exists=.env scripts/process-marketing-video-lab-check.mjs --json
```

