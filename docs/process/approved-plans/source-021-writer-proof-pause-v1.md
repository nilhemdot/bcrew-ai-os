# SOURCE-021 Writer Proof Pause V1

## Card

`SOURCE-021`

## Goal

Close `SOURCE-021` fully if the writer path can be proven from current local/repo/source evidence; otherwise pause it honestly with the exact missing proof while locking the read/coaching semantics.

## Scope

- Prove what the available Lee/FUBZahnd source says writes `LeadDate`.
- Prove what the available Lee/FUBZahnd source says writes `LeadClaimedDate`.
- Compare that source path against the checked-in direct Supabase writer.
- Verify live Supabase still has current `leaddate` and `leadclaimeddate` values.
- Lock plain-English coaching copy so AI OS does not say an agent created a lead when the proof only shows claim, recycle, re-entry, or status movement.
- Interpret `Active Client` rows correctly.
- Move `SOURCE-021` out of executing if the exact production writer/replication path cannot be proven from available access.
- Add verifier/process coverage so the scoped pause and coaching contract stay repo/live truth.

## Hard Boundaries

- Do not mark `SOURCE-021` done without exact production writer/replication proof.
- Do not rebuild or write to the KPI/FUB person pipeline.
- Do not start `SECURITY-002` implementation in this slice.
- Do not start Strategy Hub, Sales expansion, Agent Feedback expansion, Scoper, Agent Factory, broad corpus expansion, or UI polish.

## Proof

- `npm run process:source-021-writer-proof-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=SOURCE-021 --planApprovalRef=docs/process/approvals/SOURCE-021.json --closeoutKey=source-021-writer-proof-pause-v1 --commitRef=HEAD`

## Closeout

`SOURCE-021` is accepted when it is scoped/paused with the exact missing proof: the production writer/replication path into live Supabase. The read/coaching semantics are locked, and `SECURITY-002` becomes the next card as plan-only work.
