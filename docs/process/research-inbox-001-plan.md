# RESEARCH-INBOX-001 Plan

## What

Define the proposal-only Research Inbox gate where Build Intel findings land before Steve and Codex decide whether to promote them into backlog work.

## Why

Steve wants AIOS to learn from outside builders, but he does not want autonomous dev or uncontrolled backlog mutation. Research Inbox is the buffer: extracted ideas can be captured with evidence, plain-English takeaway, related cards, recommendation, and proposed next action, while actual backlog creation remains explicit and reviewed.

## Acceptance Criteria

- A reusable Research Inbox module defines the v1 item schema and proposal states.
- Items require source reference, source type, why Steve cared, plain-English takeaway, system fit, related cards, recommendation, evidence links, owner, and proposed disposition.
- Promotion returns a proposal payload and never writes to backlog automatically.
- The module supports proposal-only dispositions: propose_new_card, enrich_existing_card, archive, needs_steve_review, and blocked.
- The card explicitly connects future `BUILD-SCOPER` output to Research Inbox rather than direct backlog mutation.
- Plan Critic has a pass row with score at least 9.8 before build.

## Definition Of Done

- Focused proof creates synthetic inbox proposals, validates required fields, rejects incomplete items, and proves promotion is proposed-only.
- Live backlog/current sprint readback shows the card closed only after proof.
- Closeout names Build Intel Extraction Implementation Sprint as the next step that can feed this inbox.

## Details

Existing code to reuse: live backlog helpers, Action Router proposed-only pattern, shared communication candidate apply discipline, Current Sprint stage gate, Plan Critic, and Foundation verifier. Existing docs to reuse: `docs/handoffs/2026-05-13-build-intel-direction-capture.md`, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, and the old-system lesson that agents propose while Steve+Codex approve.

The root invariant is: external Build Intel can suggest work, but cannot mutate backlog, sprints, sources, or code without Steve+Codex approval. The black-box proof should call actual function paths, create valid and invalid synthetic proposals, request a promotion proposal through an API-style round-trip fixture, verify no backlog write occurs, and verify a synthetic weak auto-mutation attempt is rejected. No substring-only proof is acceptable and substring-only proof is rejected.

Gate decision: focused proof plus full Foundation verify because this closes a live backlog card and creates a shared proposal gate. Blast radius is proposal data/contract only; no extraction, no backlog auto-write, and no external systems are called.

Repair path: if proof fails or a promotion path mutates backlog automatically, reopen/return the card, disable the promotion function, and keep Build Scoper work blocked until proposal-only behavior passes.

Operator value: Steve gets a reviewable inbox for useful outside builder ideas, with enough context to approve or reject quickly, without waking up to surprise cards or autonomous dev changes.

Speed bound: the focused proof targets under two minutes and uses synthetic inbox items plus live backlog count readback only.

## Risks

- Inbox can become a graveyard. Mitigation: required disposition, owner, review status, and next action.
- Inbox can become auto-dev. Mitigation: promotion function returns a proposal and proof verifies backlog count is unchanged.
- Thin proposals could waste review time. Mitigation: schema requires evidence links, related cards, recommendation, and why Steve cared.

## Tests

- `npm run process:build-intel-intake-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Not Next

- Do not run Build Scoper.
- Do not create or mutate backlog cards from inbox items.
- Do not build a UI-heavy review surface.
- Do not extract content from paid or public sources in this card.
