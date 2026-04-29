# Personal Workspace Boundary

Plain English: Foundation can know private local workspace files exist, but it cannot use their content as repo truth or proof.

## Private Local Surfaces

These surfaces are local/private unless a separate approved card promotes a specific non-private rule into repo truth:

- `USER.md`
- `MEMORY.md`
- `memory/*.md`
- `SOUL.md`
- `TOOLS.md`
- `HEARTBEAT.md`
- `IDENTITY.md`
- `.openclaw/**`
- `.claude/**`
- operator-only local notes

## Proof Rule

Real private files are metadata-only proof sources. The allowed fields are:

- relative path
- path class
- existence
- file or directory size
- modified-time metadata
- metadata fingerprint
- allowlist status

Real private file content must never be copied, quoted, summarized, tokenized, or logged into tracked docs, API JSON, verifier logs, generated skill output, or closeout proof.

## Leak Tests

Leak tests use synthetic sentinel fixtures only. The checker proves that a synthetic sentinel would be caught if it appeared in a tracked output, without reading or echoing real private content.

Run:

```sh
npm run process:personal-workspace-boundary-check
```

## Promotion Rule

If private memory exposes a durable rule, the builder writes a fresh plain-English summary into the correct repo surface by hand. The summary must not quote, summarize, or reveal private content. If the rule needs work, create or update a live backlog card.

## Limits

This boundary is a metadata and process guard. It does not claim semantic detection of every possible secret. The durable protection is that real private file content is not read into the verifier, API response, generated doctrine, or closeout proof.
