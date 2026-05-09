# Foundation Readiness Exit Test

`FOUNDATION-DONE-TEST-001` adds one explicit gate for the question: can Foundation be called ready enough for Strategy to resume?

The gate is intentionally allowed to say `not_ready`. Its job is not to make Foundation pass. Its job is to name the failed leg, blocker card, and next proof command.

## Command

```bash
npm run process:foundation-done-test
```

When Foundation is not ready, the default command exits nonzero.

For closeout proof of the detector itself:

```bash
npm run process:foundation-done-test -- --report-only
```

`--report-only` still prints `not_ready` when blockers remain; it only changes the process exit code so `FOUNDATION-DONE-TEST-001` can close honestly.

## Legs

The readiness test covers:

- Source-verifiable answers.
- Tier/redaction safety.
- Structural verifier coverage for every P0 gate.
- Runtime/process control health.
- Extraction retry, ledger, and backfill health.
- Raw meeting-note Drive ACL/vault status.
- Clear pass/fail output.

## Current Expected Shape

`SYSTEM-010-GHOST-CLOSEOUT-001` is closed under `system-010-ghost-closeout-v1`, so the runtime/process-control leg should pass.

`SOURCE-LIFECYCLE-COMPLETION-001` is closed under `source-lifecycle-completion-v1`, so the source lifecycle completion/revalidation blocker should not appear in the current readiness output.

`SYNTHESIS-VERIFY-001` is closed under `synthesis-verify-v1`, so the synthesized-claim verification blocker should not appear in the current readiness output.

`EXTRACT-RUN-HARDENING-001` is closed under `extract-run-hardening-v1`, so the extraction retry/ledger/backfill blocker should not appear in the current readiness output.

The result can still be `not_ready` while these blocker cards remain open:

- `MEETING-VAULT-ACL-001`
- `DRIVE-ACCESS-REQUEST-001`

Conditional gates are still visible but do not necessarily block owner-only Strategy readiness:

- `SECURITY-FILTERED-COMMS-ACCESS-001` blocks non-Tier-1 shared-comms/intelligence access.
- `SECURITY-EDGE-001` blocks public or broader external exposure.
- `SECURITY-PROVIDER-ROTATION-PROOF-001` blocks treating exposed credential incidents as fully closed and blocks broader exposure claims.

## Output Contract

Human output names each leg as `PASS` or `FAIL`.

Machine output always ends with:

```text
FOUNDATION_DONE_TEST_SUMMARY {...}
```

That summary includes:

- `status`: `ready` or `not_ready`
- `readyForStrategy`
- `failedLegs`
- `blockingCards`
- leg totals

## Boundaries

This gate does not:

- reopen `SECURITY-002`
- mutate Drive ACLs
- broaden public/external access
- start Strategy Hub work
- expand Sales, Agent Feedback, Scoper, Agent Factory, or corpus lanes
- add UI polish
