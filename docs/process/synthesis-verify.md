# Synthesis Claim Verification Closeout

`SYNTHESIS-VERIFY-001` closes the synthesized-claim verification blocker in the Foundation readiness exit test.

The rule is simple: generated synthesis is not decision-grade unless it is verified against governed source evidence. Unsupported, stale, contradicted, missing-tier, or single-evidence Strategy-grade claims fail closed.

## Covered Surfaces

- Governed synthesized items in `intelligence_synthesized_items`.
- Legacy shared-comms synthesized items in `shared_communication_synthesized_items`.
- Action Router routes in `intelligence_action_routes`.
- Strategy Hub v2 route review.
- Action route proposal, approval, and apply paths.

## Behavior

- Governed synthesis stamps `metadata.synthesisVerification` on generated items.
- Action Router selects only verified synthesized items for new decision-grade routes.
- Action routes preserve the verification metadata.
- Approval/apply refuses unverified decision-grade routes.
- Strategy Hub v2 excludes unverified synthesized claims from Strategy route review.
- Shared-comms synthesis rows are verified when candidate/source refs support them; otherwise they remain advisory or blocked.
- Strategy Advisor remains fail-closed.

## Proof

```bash
npm run process:synthesis-verify-check
npm run intelligence:retrieval-eval
npm run intelligence:synthesis-facts-proof
npm run intelligence:synthesis-proof
npm run intelligence:action-router-proof
npm run process:foundation-done-test -- --report-only
npm run backlog:hygiene -- --json
npm run foundation:verify
```

## Boundaries

This does not implement Strategy expansion, Sales, Agent Feedback, Scoper, Agent Factory, broad corpus, researcher, video mining, extraction retry/backoff, meeting ACL/vault work, public access, advisor chat, sprint view, or UI polish.

Foundation can still report `not_ready` while `EXTRACT-RUN-HARDENING-001`, `MEETING-VAULT-ACL-001`, and `DRIVE-ACCESS-REQUEST-001` remain open.
