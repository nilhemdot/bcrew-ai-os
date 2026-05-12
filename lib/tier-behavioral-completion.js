import {
  AccessDeniedError,
  DEFAULT_PROTECTED_ROUTE_POSTURE,
  authorizeRouteAccess,
  findRoutePosture,
} from './security-access.js'
import {
  buildSecurityBehaviorActors,
  buildSubjectPersonLeakProof,
} from './security-behavior-proof.js'

export const TIER_BEHAVIORAL_COMPLETION_CARD_ID = 'TIER-BEHAVIORAL-COMPLETION-001'
export const TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY = 'tier-behavioral-completion-v1'
export const TIER_BEHAVIORAL_COMPLETION_PLAN_PATH = 'docs/process/tier-behavioral-completion-001-plan.md'
export const TIER_BEHAVIORAL_COMPLETION_APPROVAL_PATH = 'docs/process/approvals/TIER-BEHAVIORAL-COMPLETION-001.json'
export const TIER_BEHAVIORAL_COMPLETION_SCRIPT_PATH = 'scripts/process-tier-behavioral-completion-check.mjs'
export const TIER_BEHAVIORAL_COMPLETION_SUMMARY_MARKER = 'TIER_BEHAVIORAL_COMPLETION_SUMMARY'

export const TIER_BEHAVIORAL_COMPLETION_BOUNDARY = [
  'No shared communications or Strategy team access is opened by this card.',
  'Foundation/source depth APIs stay owner-only until a separate filtered-access card exists.',
  'Ops and Sales reads remain role-plus-tier surfaces; this card proves their route behavior rather than changing payloads.',
  'Subject-person redaction remains mandatory before any intelligence evidence route opens beyond Tier 1.',
  'Unknown users and unregistered protected routes continue to fail closed.',
]

export const TIER_BEHAVIORAL_SURFACES = [
  {
    id: 'foundation-hub-command',
    label: 'Foundation Hub',
    method: 'GET',
    path: '/api/foundation-hub',
    decision: 'owner_only',
    rationale: 'Command truth, backlog, decisions, source health, and operator diagnostics are owner-only during Foundation buildout.',
    allowedActorKeys: ['steve', 'adminToken'],
    deniedActorKeys: ['carsonOps', 'ryanSales', 'tannerSubject', 'unknownUser'],
    expectedPolicy: 'owner_tier_1',
  },
  {
    id: 'source-lifecycle-depth',
    label: 'Source Lifecycle',
    method: 'GET',
    path: '/api/foundation/source-lifecycle',
    decision: 'owner_only',
    rationale: 'Source maturity, extraction gaps, marketing source map, and brand stack are build/control data.',
    allowedActorKeys: ['steve', 'adminToken'],
    deniedActorKeys: ['carsonOps', 'ryanSales', 'tannerSubject', 'unknownUser'],
    expectedPolicy: 'owner_tier_1',
  },
  {
    id: 'source-maturity-grid',
    label: 'Source Maturity Grid',
    method: 'GET',
    path: '/api/foundation/source-maturity-grid',
    decision: 'owner_only',
    rationale: 'Foundation depth scoring stays owner-only until team-ready source views are separately designed.',
    allowedActorKeys: ['steve', 'adminToken'],
    deniedActorKeys: ['carsonOps', 'ryanSales', 'tannerSubject', 'unknownUser'],
    expectedPolicy: 'owner_tier_1',
  },
  {
    id: 'source-extraction-coverage',
    label: 'Source Extraction Coverage',
    method: 'GET',
    path: '/api/foundation/source-extraction-coverage',
    decision: 'owner_only',
    rationale: 'Extraction failures, connector gaps, and deferrals are Foundation operator state.',
    allowedActorKeys: ['steve', 'adminToken'],
    deniedActorKeys: ['carsonOps', 'ryanSales', 'tannerSubject', 'unknownUser'],
    expectedPolicy: 'owner_tier_1',
  },
  {
    id: 'source-coverage-closeout',
    label: 'Source Coverage Closeout',
    method: 'GET',
    path: '/api/foundation/source-coverage-closeout',
    decision: 'owner_only',
    rationale: 'Source gap decisions are owner/operator command truth, not a general team read surface.',
    allowedActorKeys: ['steve', 'adminToken'],
    deniedActorKeys: ['carsonOps', 'ryanSales', 'tannerSubject', 'unknownUser'],
    expectedPolicy: 'owner_tier_1',
  },
  {
    id: 'marketing-source-map',
    label: 'Marketing Source Map',
    method: 'GET',
    path: '/api/foundation/marketing-source-map',
    decision: 'owner_only',
    rationale: 'Brand/source/avatar mapping is foundation data until marketing operators and Brand Guardian enforcement exist.',
    allowedActorKeys: ['steve', 'adminToken'],
    deniedActorKeys: ['carsonOps', 'ryanSales', 'tannerSubject', 'unknownUser'],
    expectedPolicy: 'owner_tier_1',
  },
  {
    id: 'brand-stack',
    label: 'Brand Stack',
    method: 'GET',
    path: '/api/foundation/brand-stack',
    decision: 'owner_only',
    rationale: 'Brand entities and Guardian boundaries are visible to the owner before generated-content enforcement is built.',
    allowedActorKeys: ['steve', 'adminToken'],
    deniedActorKeys: ['carsonOps', 'ryanSales', 'tannerSubject', 'unknownUser'],
    expectedPolicy: 'owner_tier_1',
  },
  {
    id: 'ops-hub',
    label: 'Ops Hub',
    method: 'GET',
    path: '/api/ops-hub',
    decision: 'role_filtered',
    rationale: 'Ops is the first non-owner read surface already declared safe for ops-role users.',
    allowedActorKeys: ['steve', 'carsonOps', 'tannerSubject', 'adminToken'],
    deniedActorKeys: ['ryanSales', 'unknownUser'],
    expectedPolicy: 'role_plus_verified_tier',
  },
  {
    id: 'ops-agent-feedback-dry-run',
    label: 'Ops Agent Feedback Dry Run',
    method: 'GET',
    path: '/api/ops/agent-feedback-production-dry-run',
    decision: 'role_filtered',
    rationale: 'Ops can inspect production-send readiness without gaining Foundation command surfaces.',
    allowedActorKeys: ['steve', 'carsonOps', 'tannerSubject', 'adminToken'],
    deniedActorKeys: ['ryanSales', 'unknownUser'],
    expectedPolicy: 'role_plus_verified_tier',
  },
  {
    id: 'owners-review-queue',
    label: 'Owners Review Queue',
    method: 'GET',
    path: '/api/owners/review-queue',
    decision: 'role_filtered',
    rationale: 'Ops can inspect governed Owners review items; Sales and unknown users stay blocked.',
    allowedActorKeys: ['steve', 'carsonOps', 'tannerSubject', 'adminToken'],
    deniedActorKeys: ['ryanSales', 'unknownUser'],
    expectedPolicy: 'role_plus_verified_tier',
  },
  {
    id: 'sales-hub',
    label: 'Sales Hub',
    method: 'GET',
    path: '/api/sales-hub',
    decision: 'role_filtered',
    rationale: 'Sales is the first non-owner read surface already declared safe for sales-role users.',
    allowedActorKeys: ['steve', 'carsonOps', 'ryanSales', 'tannerSubject', 'adminToken'],
    deniedActorKeys: ['unknownUser'],
    expectedPolicy: 'role_plus_verified_tier',
  },
  {
    id: 'shared-comms-archive',
    label: 'Shared Communications Archive',
    method: 'GET',
    path: '/api/shared-communications/archive',
    decision: 'redaction_ready_owner_only',
    rationale: 'Shared communications has redaction posture but stays Tier 1-only until filtered comms access is built.',
    allowedActorKeys: ['steve', 'adminToken'],
    deniedActorKeys: ['carsonOps', 'ryanSales', 'tannerSubject', 'unknownUser'],
    expectedPolicy: 'tier_and_subject_filter',
  },
  {
    id: 'strategy-hub-v2',
    label: 'Strategy Hub v2',
    method: 'GET',
    path: '/api/strategic-execution/v2',
    decision: 'redaction_ready_owner_only',
    rationale: 'Strategy remains owner-only until team-facing packets have explicit filtering and audit behavior.',
    allowedActorKeys: ['steve', 'adminToken'],
    deniedActorKeys: ['carsonOps', 'ryanSales', 'tannerSubject', 'unknownUser'],
    expectedPolicy: 'tier_and_subject_filter',
  },
  {
    id: 'intelligence-evidence',
    label: 'Intelligence Evidence',
    method: 'POST',
    path: '/api/intelligence/evidence',
    decision: 'redaction_ready_owner_only',
    rationale: 'Evidence retrieval has subject-person redaction but the read endpoint stays Tier 1-only until broader query access is separately approved.',
    allowedActorKeys: ['steve', 'adminToken'],
    deniedActorKeys: ['carsonOps', 'ryanSales', 'tannerSubject', 'unknownUser'],
    expectedPolicy: 'tier_and_subject_filter',
    subjectPersonProofRequired: true,
  },
]

function evaluateActorOnSurface(surface, actorKey, actors) {
  const posture = findRoutePosture(surface.method, surface.path) || DEFAULT_PROTECTED_ROUTE_POSTURE
  let allowed = false
  let code = null
  let statusCode = null
  try {
    authorizeRouteAccess({
      accessContext: actors[actorKey],
      method: surface.method,
      path: surface.path,
    }, posture)
    allowed = true
  } catch (error) {
    if (!(error instanceof AccessDeniedError)) throw error
    code = error.code
    statusCode = error.statusCode
  }
  const expectedAllowed = surface.allowedActorKeys.includes(actorKey)
  return {
    actorKey,
    expectedAllowed,
    actualAllowed: allowed,
    actualCode: code,
    actualStatusCode: statusCode,
    ok: allowed === expectedAllowed,
  }
}

function evaluateSurface(surface, actors) {
  const posture = findRoutePosture(surface.method, surface.path) || DEFAULT_PROTECTED_ROUTE_POSTURE
  const actorKeys = Array.from(new Set([
    ...surface.allowedActorKeys,
    ...surface.deniedActorKeys,
  ]))
  const actorResults = actorKeys.map(actorKey => evaluateActorOnSurface(surface, actorKey, actors))
  const routeRegistered = Boolean(findRoutePosture(surface.method, surface.path))
  const hasNonOwnerAllowed = surface.allowedActorKeys.some(actorKey =>
    !['steve', 'adminToken'].includes(actorKey)
  )
  const decisionOk = surface.decision === 'role_filtered'
    ? hasNonOwnerAllowed && posture.policy === 'role_plus_verified_tier'
    : !hasNonOwnerAllowed && posture.requiredTier === 1
  const policyOk = posture.policy === surface.expectedPolicy
  const failedActorResults = actorResults.filter(result => !result.ok)
  return {
    ...surface,
    routeRegistered,
    policy: posture.policy,
    requiredTier: posture.requiredTier || null,
    roles: posture.roles || [],
    actorResults,
    failedActorResults,
    hasNonOwnerAllowed,
    ok: routeRegistered && policyOk && decisionOk && failedActorResults.length === 0,
  }
}

export function buildTierBehavioralCompletionSnapshot() {
  const actors = buildSecurityBehaviorActors()
  const surfaces = TIER_BEHAVIORAL_SURFACES.map(surface => evaluateSurface(surface, actors))
  const subjectPerson = buildSubjectPersonLeakProof(actors)
  const failedSurfaces = surfaces.filter(surface => !surface.ok)
  const missingRoutePostures = surfaces.filter(surface => !surface.routeRegistered)
  const decisionCounts = surfaces.reduce((acc, surface) => {
    acc[surface.decision] = (acc[surface.decision] || 0) + 1
    return acc
  }, {})
  const nonOwnerAllowedSurfaces = surfaces.filter(surface => surface.hasNonOwnerAllowed)
  const ownerOnlySurfaces = surfaces.filter(surface => !surface.hasNonOwnerAllowed)

  const findings = []
  if (missingRoutePostures.length) {
    findings.push({
      check: 'all tier completion surfaces have explicit route posture',
      detail: missingRoutePostures.map(surface => `${surface.method} ${surface.path}`).join(', '),
    })
  }
  if (failedSurfaces.length) {
    findings.push({
      check: 'surface decisions match actual route behavior',
      detail: failedSurfaces.map(surface => surface.id).join(', '),
    })
  }
  if (!subjectPerson.ok) {
    findings.push({
      check: 'subject-person leak proof passes before evidence access broadens',
      detail: subjectPerson.failedSubjectChecks?.map(check => check.id).join(', ') || 'subject proof failed',
    })
  }

  return {
    status: findings.length ? 'risk' : 'healthy',
    cardId: TIER_BEHAVIORAL_COMPLETION_CARD_ID,
    closeoutKey: TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY,
    generatedAt: new Date().toISOString(),
    summary: {
      surfaceCount: surfaces.length,
      routeRegisteredCount: surfaces.filter(surface => surface.routeRegistered).length,
      missingRoutePostureCount: missingRoutePostures.length,
      ownerOnlySurfaceCount: ownerOnlySurfaces.length,
      roleFilteredSurfaceCount: decisionCounts.role_filtered || 0,
      redactionReadyOwnerOnlySurfaceCount: decisionCounts.redaction_ready_owner_only || 0,
      nonOwnerAllowedSurfaceCount: nonOwnerAllowedSurfaces.length,
      failedSurfaceCount: failedSurfaces.length,
      subjectPersonProofOk: subjectPerson.ok,
      broadSharedCommsOpened: false,
      strategyTeamAccessOpened: false,
      foundationTeamAccessOpened: false,
      nextCardId: 'VERIFICATION-RUNS-001',
    },
    actors: Object.keys(actors),
    surfaces,
    subjectPerson,
    boundary: TIER_BEHAVIORAL_COMPLETION_BOUNDARY,
    findings,
  }
}

export function buildSyntheticTierBehavioralCompletionProof() {
  const snapshot = buildTierBehavioralCompletionSnapshot()
  const roleFiltered = snapshot.surfaces.filter(surface => surface.decision === 'role_filtered')
  const ownerOnly = snapshot.surfaces.filter(surface => surface.decision === 'owner_only')
  const redactionReadyOwnerOnly = snapshot.surfaces.filter(surface => surface.decision === 'redaction_ready_owner_only')
  const opsHub = snapshot.surfaces.find(surface => surface.id === 'ops-hub')
  const salesHub = snapshot.surfaces.find(surface => surface.id === 'sales-hub')
  const evidence = snapshot.surfaces.find(surface => surface.id === 'intelligence-evidence')
  const checks = [
    {
      id: 'all-surfaces-healthy',
      ok: snapshot.status === 'healthy',
      detail: snapshot.findings.map(finding => finding.check).join(', '),
    },
    {
      id: 'non-owner-surfaces-are-role-filtered',
      ok: roleFiltered.length >= 4 && roleFiltered.every(surface => surface.hasNonOwnerAllowed && surface.policy === 'role_plus_verified_tier'),
      detail: roleFiltered.map(surface => surface.id).join(', '),
    },
    {
      id: 'foundation-source-surfaces-stay-owner-only',
      ok: ownerOnly.length >= 7 && ownerOnly.every(surface => !surface.hasNonOwnerAllowed && surface.requiredTier === 1),
      detail: ownerOnly.map(surface => surface.id).join(', '),
    },
    {
      id: 'redaction-ready-surfaces-stay-owner-only',
      ok: redactionReadyOwnerOnly.length >= 3 && redactionReadyOwnerOnly.every(surface => !surface.hasNonOwnerAllowed && surface.requiredTier === 1),
      detail: redactionReadyOwnerOnly.map(surface => surface.id).join(', '),
    },
    {
      id: 'ops-and-sales-first-reads-work-as-declared',
      ok: Boolean(opsHub?.ok && salesHub?.ok),
      detail: `ops=${opsHub?.ok || false} sales=${salesHub?.ok || false}`,
    },
    {
      id: 'subject-person-proof-required-for-evidence',
      ok: Boolean(evidence?.subjectPersonProofRequired && snapshot.subjectPerson.ok),
      detail: `evidence=${evidence?.ok || false} subject=${snapshot.subjectPerson.ok}`,
    },
    {
      id: 'no-broad-access-opened',
      ok: snapshot.summary.broadSharedCommsOpened === false &&
        snapshot.summary.strategyTeamAccessOpened === false &&
        snapshot.summary.foundationTeamAccessOpened === false,
      detail: JSON.stringify({
        sharedComms: snapshot.summary.broadSharedCommsOpened,
        strategy: snapshot.summary.strategyTeamAccessOpened,
        foundation: snapshot.summary.foundationTeamAccessOpened,
      }),
    },
  ]

  return {
    ok: checks.every(check => check.ok),
    cardId: TIER_BEHAVIORAL_COMPLETION_CARD_ID,
    closeoutKey: TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY,
    checks,
    failedChecks: checks.filter(check => !check.ok),
    summary: snapshot.summary,
  }
}
