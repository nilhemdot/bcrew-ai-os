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

live-safety gate:

- concurrent mock submits must allow one running job and reject the duplicate;
- live asset validation must reject placeholder, sample, mock, local, private-network, and non-HTTPS URLs;
- no provider spend, live provider calls, route wiring, or UI wiring is allowed in the safety proof.

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
npm run process:marketing-video-lab-live-safety-check -- --json
```
