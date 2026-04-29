# Closeout Backfill Phase 1

Backfill target snapshot captured at build start for `CLOSEOUT-BACKFILL-001`.

Source command:

```sh
npm run backlog:hygiene -- --json
```

The bounded `done_without_closeout_proof` target list is:

- `MEMORY-001`
- `SCHEMA-001`
- `DECISION-001`
- `DECISION-002`
- `DECISION-003`
- `DATA-018`
- `DATA-019`
- `DATA-020`
- `GOVERNANCE-IMPORTRANGE-001`
- `UX-003`
- `SYSTEM-009`
- `SOURCE-004`
- `SOURCE-005`

Rule: do not invent proof. If real dated proof is available, backfill it. If the card is historical and proof is incomplete, preserve that uncertainty through the existing verifier exception ledger or an explicit closeout note.
