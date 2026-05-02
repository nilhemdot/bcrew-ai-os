# SECURITY-002 Auth, Tier, And Redaction Plan

Status: proposed plan artifact, not approved. Do not implement until Steve approves this plan at 9.8 or higher.

Card: `SECURITY-002`

Goal: implement real authenticated user/tier/redaction before any broader hub, query, assistant, Strategy Hub, Sales expansion, Agent Feedback expansion, Scoper, Agent Factory, corpus expansion, or UI polish.

## Current Model And Gaps

Current auth:

- `lib/app-auth.js` defines cookie sessions with `aios_session`, `AIOS_AUTH_USERS_JSON` / `AIOS_AUTH_USERS`, Google login allow-list support, and role values `owner`, `ops`, `sales`.
- `server.js` attaches `req.authUser = getAuthUserFromRequest(req)` early in middleware.
- `server.js` has `getLocalDevUser(req)` that returns local socket + localhost as role `owner`.
- `server.js` has `requireAdminToken(req, res, next)` that allows local dev, owner, limited ops/sales API paths, or `X-Admin-Token`.
- `lib/foundation-db.js` already seeds a `users` table with `email`, `name`, `tier`, `user_type`, `active`, `meeting_sync_enabled`, and metadata. This includes Steve Tier 1, leadership Tier 2, Tanner/Georgia Tier 3, and system users `ai@bensoncrew.ca` / `crewbert@bensoncrew.ca`.

Gaps to close:

- Request auth context does not include DB-backed `tier`, `userType`, source, or subject identity.
- `app-auth` roles and Foundation DB `users.tier` are separate truth paths.
- `requireAdminToken` is a route gate, not a tier/redaction policy.
- Client-supplied `maxTier` can influence `/api/intelligence/evidence`; the server must derive tier from the authenticated actor.
- Existing intelligence code uses inconsistent tier language. For SECURITY-002, define `min_tier` as the least-privileged numeric tier allowed: `1` means Tier 1 only, `2` means Tier 1-2, `3` means Tier 1-3. The safe predicate is `actor.tier <= item.min_tier`.
- Current shared-comms archive/candidate/synthesis endpoints can expose titles, excerpts, candidate summaries, evidence excerpts, participants, source URLs, and synthesis items behind admin gates but without subject-person filtering.
- `shared_communication_candidates.metadata` already stores `minTier`, `subjectPeople`, and `sensitivity`; downstream tables do not consistently persist or enforce all three fields.
- Missing or malformed tier/sensitivity/subject metadata is not consistently treated as non-Steve blocked.

## Files And Modules To Inspect

Read before edits:

- `server.js`:
  - auth middleware, `getRequestAuthUser`, `getLocalDevUser`, `requireAdminToken`, `requirePageAccess`
  - all read routes listed below
  - `/api/intelligence/evidence`
  - `/api/shared-communications/*`
  - `/api/strategic-execution/*`
  - `/api/foundation-hub`
  - `/api/foundation/action-review`
  - `/api/doc`
- `lib/app-auth.js`: session user shape, default allow-list, Google/password login, role normalization.
- `lib/foundation-db.js`: `users` schema/seed, shared communications schema/read helpers, Foundation snapshot, change-event/audit helpers.
- `lib/shared-candidate-extraction.js`: `subject_people`, `sensitivity`, `min_tier` extraction/sanitization.
- `lib/intelligence-atoms.js`: `intelligence_atoms.subject_people`, `sensitivity`, `min_tier`, Scoper query filter.
- `lib/intelligence-retrieval.js`: retrieval chunk schema/search, candidate promotion, `maxTier` filters, sensitivity-to-tier coercion.
- `lib/intelligence-synthesis-facts.js`: facts schema/query filters.
- `lib/intelligence-synthesis.js`: synthesized item schema/query filters.
- `lib/intelligence-action-router.js`: routeable item filters and action-route snapshots.
- `lib/meeting-classification.js`, `lib/meeting-transcripts.js`, `scripts/sync-meeting-notes-archive.mjs`: owner/participant/privacy metadata currently available for meetings.
- `scripts/extract-meeting-transcript-candidates.mjs`, `scripts/extract-gmail-thread-candidates.mjs`, `scripts/extract-missive-thread-candidates.mjs`, `scripts/extract-slack-thread-candidates.mjs`, `scripts/extract-zoom-chat-candidates.mjs`, `scripts/extract-zoom-audio-transcript-candidates.mjs`: extractor prompt coverage for `subject_people`, `sensitivity`, `min_tier`.
- `scripts/foundation-verify.mjs`: existing auth/admin-gate checks and where SECURITY-002 verifier coverage will land.
- `package.json`: add only focused proof script wiring after approval.
- `docs/specs/2026-04-23-auth-tiers-vault.md`, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`: doctrine and closeout updates after implementation.

Likely implementation files, after approval only:

- New `lib/security-access.js`: canonical request access context, `assertTier`, redaction helpers, subject-person policy.
- New `scripts/process-security-002-check.mjs`: focused synthetic proof.
- Update `lib/app-auth.js`, `server.js`, `lib/foundation-db.js`, `lib/shared-candidate-extraction.js`, `lib/intelligence-atoms.js`, `lib/intelligence-retrieval.js`, `lib/intelligence-synthesis-facts.js`, `lib/intelligence-synthesis.js`, `lib/intelligence-action-router.js`, `scripts/foundation-verify.mjs`, `package.json`, and closeout docs.

## Read Surfaces Covered

Owner-only / Tier 1 unless a narrower response wrapper is explicitly implemented:

- `GET /api/foundation-hub`
- `GET /api/source-of-truth`
- `GET /api/foundation/source-lifecycle`
- `GET /api/system-inventory`
- `GET /api/foundation/jobs`
- `GET /api/foundation/llm-runtime`
- `GET /api/foundation/extraction-control`
- `GET /api/foundation/changes`
- `GET /api/foundation/change-log`
- `GET /api/foundation/daily-summary`
- `GET /api/foundation/build-log`
- `GET /api/foundation/doc-updates`
- `GET /api/doc`
- `GET /api/foundation/local-doc/:name`
- `GET /api/foundation/action-review`
- `GET /api/strategic-execution/action-routes`
- `POST /api/strategic-execution/action-routes/:routeId/review`
- `POST /api/foundation/action-review/:routeId/review`
- Foundation mutation routes that return Foundation state after writes:
  - `POST /api/foundation/backlog`
  - `PATCH /api/foundation/backlog/:id`
  - `POST /api/foundation/decisions`
  - `PATCH /api/foundation/decisions/:id`
  - `POST /api/foundation/questions`
  - `PATCH /api/foundation/questions/:id`
  - `POST /api/foundation/doc-updates`
  - `POST /api/foundation/doc-updates/:id/approve`
  - `POST /api/foundation/doc-updates/:id/reject`
  - `POST /api/foundation/doc-updates/:id/apply`

Shared-comms / intelligence surfaces requiring tier plus subject redaction:

- `POST /api/intelligence/evidence`
- `GET /api/shared-communications/archive`
- `GET /api/shared-communications/coverage`
- `GET /api/shared-communications/candidates`
- `GET /api/shared-communications/synthesis`
- `POST /api/shared-communications/candidates/:candidateKey/apply-to-backlog`
- `POST /api/shared-communications/candidates/:candidateKey/apply-to-decision`
- `POST /api/shared-communications/candidates/:candidateKey/apply-to-question`
- `POST /api/shared-communications/candidates/:candidateKey/:action`
- `GET /api/strategic-execution/prework-coverage`
- `GET /api/strategic-execution/goal-truth`
- `GET /api/strategic-execution/operating-truth`
- `GET /api/strategic-execution/v2`
- `POST /api/strategic-execution/advisor` remains offline but must keep failing closed.

Ops/Sales/source read surfaces that keep role gates and receive explicit tier posture:

- `GET /api/ops-hub`
- `GET /api/owners/review-queue`
- `GET /api/owners/lead-source-governance`
- `GET /api/sales-hub`
- `GET /api/sheets/structure-status`
- `GET /api/fub/health`
- `GET /api/fub/person`
- `GET /api/fub/lead-sources`
- `POST /api/fub/request`
- `POST /api/fub/lead-sources/refresh`
- `PATCH /api/fub/lead-sources`
- `GET /api/foundation/agent-feedback-production-dry-run`
- `GET /api/ops/agent-feedback-production-dry-run`
- Sales mutation routes that return Sales Hub state after writes:
  - `POST /api/sales-hub/listing-assignment`
  - `POST /api/sales-hub/group-assignment`
  - `POST /api/sales-hub/project-case`
  - `POST /api/sales-hub/listing-case`
  - `POST /api/sales-hub/sync-cases`

Auth/token surfaces with separate posture:

- `GET /api/auth/session`, `POST /api/auth/login`, `POST /api/auth/google`, `POST /api/auth/logout`: auth/session only, no shared intelligence.
- `GET /api/agent-feedback/session`, `POST /api/agent-feedback/submit`: token-scoped public feedback flow. SECURITY-002 should not expand it, but verifier must confirm it does not expose shared-comms/intelligence data.

## Proposed User/Tier Model

Canonical request actor:

```js
{
  authenticated: true,
  authSource: 'session' | 'google' | 'local-dev' | 'admin-token' | 'system',
  email: 'steve.zahnd@bensoncrew.ca',
  name: 'Steve',
  role: 'owner' | 'ops' | 'sales' | 'external' | 'system',
  tier: 1 | 2 | 3,
  userType: 'human' | 'system',
  isSteve: true,
  isLocalDev: false,
  isSystem: false,
  subjectEmails: ['steve.zahnd@bensoncrew.ca']
}
```

Rules:

- Human users must resolve from the DB-backed `users` table, not only env JSON.
- `role` remains surface/navigation access; `tier` controls sensitive intelligence access.
- Steve is Tier 1 and owner.
- Leadership is Tier 2.
- Department/head or narrower users are Tier 3.
- Explicit external collaborators can authenticate, but default to the narrowest route role and no shared intelligence unless DB `users` assigns a tier and allowed surfaces.
- System identities `ai@bensoncrew.ca` and `crewbert@bensoncrew.ca` have `userType: system`; they may run controlled jobs but are not human subjects for response access unless a job explicitly declares `system` access.
- Local dev remains Tier 1 only for local socket + localhost, and verifier keeps the Host-spoof guard.
- `X-Admin-Token` becomes a system/admin source for process proof and owner diagnostics, not a way for a human-facing query to choose its own tier.

## `assertTier` API Shape

Add to `lib/security-access.js` after approval:

```js
export class AccessDeniedError extends Error {
  constructor(statusCode, code, message, details = {}) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export async function attachAccessContext(req) {
  // Resolves session/admin/local/system source to req.accessContext.
}

export function assertTier(req, requiredTier, options = {}) {
  // requiredTier: 1 means Tier 1 only; 2 means Tier 1-2; 3 means Tier 1-3.
  // Throws AccessDeniedError on missing auth, inactive user, missing tier, or actor.tier > requiredTier.
  // Returns req.accessContext on success.
}
```

Options:

```js
{
  surface: '/api/intelligence/evidence',
  purpose: 'read_intelligence_evidence',
  allowSystem: false,
  allowLocalDev: true,
  roles: ['owner', 'ops', 'sales'],
  audit: true
}
```

Required helpers:

- `getAccessContext(req)`: returns attached context or throws if missing.
- `assertRole(req, roles, options)`: route role gate, separate from tier.
- `sendAccessDenied(res, error)`: normalizes `AccessDeniedError` to existing `sendApiError` shape.
- `canReadTier(actorTier, itemMinTier)`: true only when `actorTier <= itemMinTier`.
- `deriveActorTier(req)`: server-only; never trust client `maxTier` for human routes.

## Redacted Response Shape

Normal collection/query response shape must not reveal that specific suppressed items exist.

For redaction-aware collection routes:

```json
{
  "status": "healthy",
  "generatedAt": "2026-05-02T00:00:00.000Z",
  "access": {
    "policy": "tier_and_subject_filter",
    "scope": "filtered",
    "requesterTier": 2
  },
  "data": {
    "items": [],
    "summary": {}
  }
}
```

Rules:

- `access.policy` and `access.scope` are always present on redaction-aware responses, even when nothing was suppressed.
- Non-Tier-1 responses do not include `redactedCount`, suppressed IDs, denied subjects, or suppressed reasons.
- Items that fail tier or subject filters are omitted from collections and synthesis input.
- Whole-route denial uses the existing error envelope:

```json
{
  "error": {
    "code": "insufficient_tier",
    "message": "This login cannot access that surface."
  }
}
```

For direct artifact/raw-access style routes, do not return raw content to non-Tier-1. Return a filtered-summary envelope with stable shape:

```json
{
  "status": "healthy",
  "generatedAt": "2026-05-02T00:00:00.000Z",
  "access": {
    "policy": "filtered_summary_only",
    "scope": "filtered",
    "requesterTier": 2
  },
  "artifact": {
    "artifactId": "SRC-MEETINGS-001:example",
    "title": "Meeting summary",
    "sourceId": "SRC-MEETINGS-001"
  },
  "summary": {
    "items": []
  }
}
```

Tier 1 may use diagnostic/audit routes to see redaction counts. That debug shape must be Tier 1 only and not reused by user-facing routes.

## Enforcement Rules

Tier:

- `min_tier = 1`: Tier 1 only.
- `min_tier = 2`: Tier 1 and Tier 2.
- `min_tier = 3`: Tier 1, Tier 2, and Tier 3.
- Allowed predicate: `actor.tier <= item.min_tier`.
- If `actor.tier` is missing, deny.
- If `item.min_tier` is missing on a protected intelligence/shared-comms read, treat as Tier 1 only until backfilled.
- Human-facing APIs must ignore client-supplied `maxTier`; internal scripts can pass explicit actor/system tier but must name it as actor tier, not requester privilege.

Sensitivity:

- `neutral`: default `min_tier = 3` unless source explicitly narrows it.
- `positive`: default `min_tier = 3` unless source explicitly narrows it.
- `performance_concern`: default `min_tier = 2`.
- `termination_risk`: default `min_tier = 1`.
- `comp_discussion`: default `min_tier = 1`.
- `undisclosed_feedback`: default `min_tier = 1`.
- Unknown sensitivity on shared-comms/intelligence records is treated as Tier 1 for human-facing reads.

Subject-person redaction:

- Normalize `subject_people` to DB user emails.
- A subject person is who the content is about, not merely a participant or sender.
- Suppress an item from actor `U` when:
  - `U.email` is in `item.subject_people`
  - and `item.sensitivity` is one of `performance_concern`, `termination_risk`, `comp_discussion`, `undisclosed_feedback`
  - and the item is not explicitly tagged as a disclosed performance review involving `U`.
- The subject-person rule applies after tier filtering and before synthesis/routing/output.
- If sensitive content has no `subject_people`, fail closed to Tier 1 until reviewed.
- Personal assistants inherit the owner as subject. A future Ryan assistant must filter as Ryan, not as a neutral system user.

Propagation:

- Candidates, atoms, retrieval chunks, synthesis facts, synthesized items, and action routes must preserve `subject_people`, `sensitivity`, and `min_tier`.
- If downstream synthesis combines multiple items, the output gets the most restrictive tier and unioned `subject_people`.
- If any input is Tier 1-only, the synthesized item cannot become broader than Tier 1 unless a Tier 1 human explicitly downgrades it with a review note.

## Meeting Notes And Shared-Comms Owner Rules

Meeting/source ownership:

- Existing meeting artifact metadata includes source account, primary source account, observed accounts, participants, meeting class, privacy profile, transcript source, and sensitive-candidate flags.
- SECURITY-002 should add or backfill normalized owner fields where needed:
  - `owner_email`
  - `owner_emails`
  - `participant_emails`
  - `raw_access_policy`
- Until calendar organizer proof exists, `source_account` / `metadata.primarySourceAccount` is a provisional owner signal, not a full owner proof.

Rules:

- Steve/Tier 1 can read raw archive/debug content.
- Non-Tier-1 users do not receive raw transcript/email/Slack/Missive body from AIOS APIs.
- Owners keep their original Drive/source ownership outside AIOS. AIOS does not silently remove the owner from their source artifact.
- Non-owner participants do not get raw Drive/source links through AIOS.
- Owners and participants can receive only filtered summaries if a user-facing access flow exists.
- Subject-person redaction still applies to the owner. If a meeting owner requests a summary containing sensitive content about themselves, that content is suppressed unless it is tagged as disclosed performance review with that subject present.
- For shared communications, source account owner may see source metadata plus filtered summary for their own account artifacts; raw app content remains Tier 1/system only.
- Every raw-access request or filtered-summary request records metadata-only audit: requester, artifact ID, source ID, access result, policy version, no raw content.

## External / Non-Steve Denial Examples

These examples become synthetic proof cases:

- John Kitchens (`john@johnkitchens.coach`, role `sales`, external collaborator) requests `GET /api/foundation-hub`: `403 insufficient_access`.
- John requests `GET /api/shared-communications/archive`: `403 insufficient_tier` or owner-only denial; no archive counts or items returned.
- John posts `/api/intelligence/evidence` with `{ "query": "Steve compensation", "maxTier": 1 }`: server ignores `maxTier`, derives John access, and returns denial or an empty filtered data shape with no Tier 1 evidence.
- Ryan (`ryanc@bensoncrew.ca`, Tier 2) searches for content where `subject_people=["ryanc@bensoncrew.ca"]` and `sensitivity="termination_risk"`: item is suppressed; no marker says it exists.
- Ryan searches for neutral operational content with `min_tier=2`: item can appear.
- Georgia (`georgia.huntley@bensoncrew.ca`, Tier 3) searches for leadership-only performance concern with `min_tier=2`: item is suppressed by tier.
- Carson (`carsonc@bensoncrew.ca`, Tier 2) asks for a meeting he owns that includes a Blake performance concern: Carson gets a filtered summary if allowed by route; Blake-subject content is visible to Carson only if tier permits and Carson is not the subject. Blake asking the same question has the Blake-subject content suppressed.
- Anonymous/no cookie outside localhost requests any protected read surface: `401 login_required` or `503 auth_unconfigured` when auth is not configured.

## Migration And Backfill

Required schema/backfill plan after approval:

- `users`:
  - Add or normalize `role` if keeping roles outside metadata is cleaner than env-only `app-auth` roles.
  - Backfill role from current app allow-list: Steve owner, Carson/Clare/Georgia ops, Nick/Blake/Ryan/John sales, system users system.
  - Preserve existing `tier`, `user_type`, `active`, `meeting_sync_enabled`.
- `shared_communication_artifacts`:
  - Add normalized owner/access metadata columns if needed: `owner_email`, `owner_emails`, `participant_emails`, `sensitivity`, `min_tier`, `subject_people`, `raw_access_policy`.
  - Backfill owner from `source_account` and meeting metadata where available.
  - Backfill sensitivity/min_tier from metadata and artifact type. Missing sensitive classification remains Tier 1 for human-facing reads.
- `shared_communication_candidates`:
  - Promote `metadata.subjectPeople` / `metadata.subject_people`, `metadata.sensitivity`, and `metadata.minTier` / `metadata.min_tier` into typed columns or generated read fields for SQL filtering.
  - Backfill from existing metadata.
- `shared_communication_synthesized_items`:
  - Add `min_tier` and `subject_people`.
  - Backfill from source candidate metadata where possible; otherwise Tier 1 for non-Steve reads.
- `intelligence_retrieval_chunks`:
  - Add `subject_people` or enforce by joining to `intelligence_atoms`.
  - Correct tier predicate to `actorTier <= min_tier`.
- `intelligence_synthesis_facts`, `intelligence_synthesized_items`, `intelligence_action_routes`:
  - Add/propagate `subject_people` where missing.
  - Correct tier predicate to `actorTier <= min_tier`.
- Add a small `security_access_audit` or change-event based audit for denied/filtered raw-access requests with no content payload.

Rollback:

- If migration/backfill is incomplete, protected shared-comms/intelligence routes must stay Tier 1-only.
- Do not delete old metadata fields. Keep compatibility reads during rollout.
- If any new helper fails, the route denies rather than returning unfiltered data.

## Implementation Sequence

1. Build `lib/security-access.js` with actor attachment, `assertTier`, role assertion, tier predicate, subject filter, redaction envelope, and access-denied error.
2. Update `server.js` middleware to attach `req.accessContext` from session/local/admin/system, resolving DB `users` tier.
3. Replace direct `requireAdminToken` assumptions on covered routes with route posture:
   - owner-only routes use `assertTier(req, 1)` plus owner role when needed.
   - ops/sales routes keep role allow-lists and add explicit tier posture.
   - shared-comms/intelligence routes call filtering helpers before response.
4. Correct intelligence tier math and rename internal query options where possible:
   - derive actor tier server-side.
   - use `actorTier <= min_tier`.
   - remove human route trust in client `maxTier`.
5. Add typed subject/sensitivity/min_tier propagation and backfill where needed.
6. Add redaction-aware wrappers for shared-comms archive/candidates/synthesis, intelligence evidence, Strategy v2/action-review surfaces, and Foundation snapshot fields that include intelligence data.
7. Add owner-preserving meeting/shared-comms summary rules and audit metadata.
8. Add focused synthetic proof script.
9. Add verifier coverage.
10. Update current plan/state and closeout only after proof passes.

## Proof Commands

After approval and implementation:

```sh
npm run process:security-002-check
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=SECURITY-002 --planApprovalRef=docs/process/approvals/SECURITY-002.json --closeoutKey=security-002-auth-tier-redaction-v1 --commitRef=HEAD
```

Supporting checks to run when relevant:

```sh
npm run intelligence:hybrid-proof
npm run intelligence:retrieval-eval
npm run meeting-notes:verify
```

The supporting checks must not be substitutes for `process:security-002-check`; the SECURITY-002 check owns the leak-proof cases.

## Verifier And Process Checks

`scripts/process-security-002-check.mjs` should prove:

- session actor resolves to DB user tier
- local dev actor remains Tier 1 only for local socket + localhost
- admin token does not let a human route choose `maxTier=1`
- `assertTier(req, 1)` allows Steve and denies Tier 2/Tier 3/external
- `assertTier(req, 2)` allows Tier 1/Tier 2 and denies Tier 3/external
- `assertTier(req, 3)` allows active known humans but denies unknown/inactive/missing-tier
- synthetic Tier 1 item visible to Steve only
- synthetic Tier 2 item visible to Steve/Tier 2, not Tier 3
- synthetic Tier 3 neutral item visible to all active tiers
- subject-person sensitive item suppressed for the subject even if tier otherwise allows it
- subject-person sensitive item can be visible to a non-subject with sufficient tier
- unknown sensitivity or missing `subject_people` on a sensitive protected item fails closed to Tier 1
- external/non-Steve users cannot read Steve/person-sensitive Tier 1 data
- shared-comms archive does not return raw `content_text` to non-Tier-1
- redaction-aware responses keep stable shapes and do not emit redacted IDs/counts to non-Tier-1
- all covered shared-comms/intelligence routes are registered in a route posture map

`scripts/foundation-verify.mjs` should add durable checks:

- SECURITY-002 card state and closeout proof after implementation
- `lib/security-access.js` exists and exports `assertTier`
- route posture registry covers every route listed in this plan
- no `/api/intelligence/evidence` route uses client `maxTier` as authority
- intelligence retrieval/synthesis/action-router filters use the safe `actorTier <= min_tier` predicate or shared helper
- `shared_communication_candidates`, atoms, retrieval chunks, synthesis facts/items, and action routes preserve or derive `subject_people`, `sensitivity`, and `min_tier`
- synthetic redaction fixtures prove Steve vs external/non-Steve behavior
- public Agent Feedback token routes do not expose shared-comms/intelligence data

## Rollback And Fail-Closed Behavior

- If DB user lookup fails, deny protected reads.
- If user has no tier, deny protected reads.
- If item has no classification on a protected shared-comms/intelligence route, treat as Tier 1.
- If redaction helper throws, return access error or empty filtered data shape; never return unfiltered fallback data.
- If migration partially completes, keep the route Tier 1-only until backfill proof is healthy.
- If `/api/foundation-hub` cannot filter embedded intelligence safely, hide those sections from non-Tier-1 rather than returning broad snapshot data.
- If Strategy/assistant/query routes cannot prove filtered inputs, keep them offline.
- Rollback is allowed by disabling non-Tier-1 shared-comms/intelligence access, not by restoring unfiltered reads.

## Not Next

- No Strategy Hub continuation.
- No Sales expansion.
- No Agent Feedback expansion.
- No Scoper.
- No Agent Factory.
- No broad corpus expansion.
- No UI polish.
- No raw meeting-note vault move.
- No Cloudflare Access rollout unless needed only as a documented prerequisite; app-level auth/tier/redaction must work first.
- No user admin panel beyond the minimum needed to attach current DB tiers to requests.
- No new assistant/query product surface until SECURITY-002 proof is green.

## Acceptance

SECURITY-002 can move out of planning only after this plan is approved. It can close only when:

- every covered read surface has an explicit access posture
- requests carry authenticated DB-backed user/tier context
- `assertTier` is central and used by protected routes
- shared-comms/intelligence reads enforce `subject_people`, `sensitivity`, and `min_tier`
- redacted response shapes are stable and non-leaking
- owner-preserving meeting/shared-comms rules are implemented or fail closed
- external/non-Steve denial examples pass as runnable proof
- verifier/process coverage is durable
- `backlog:hygiene` and `foundation:verify` pass
