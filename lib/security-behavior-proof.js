import {
  AccessDeniedError,
  DEFAULT_PROTECTED_ROUTE_POSTURE,
  authorizeRouteAccess,
  buildAccessContext,
  buildRedactedCollectionResponse,
  evaluateRecordAccess,
  filterRecordsForActor,
  findRoutePosture,
} from './security-access.js'

export const SECURITY_BEHAVIOR_PROOF_CARD_ID = 'SECURITY-BEHAVIOR-PROOF-001'
export const SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY = 'security-behavior-proof-v1'
export const SECURITY_BEHAVIOR_PROOF_PLAN_PATH = 'docs/process/security-behavior-proof-001-plan.md'
export const SECURITY_BEHAVIOR_PROOF_APPROVAL_PATH = 'docs/process/approvals/SECURITY-BEHAVIOR-PROOF-001.json'
export const SECURITY_BEHAVIOR_PROOF_SCRIPT_PATH = 'scripts/process-security-behavior-proof-check.mjs'
export const SECURITY_BEHAVIOR_PROOF_SUMMARY_MARKER = 'SECURITY_BEHAVIOR_PROOF_SUMMARY'

function makeActor({ email, name, role, tier, userType = 'human', active = true } = {}) {
  return buildAccessContext({
    authUser: email ? { email, name: name || email, role, tier } : null,
    foundationUser: email ? { email, name: name || email, role, tier, userType, active } : null,
  })
}

export function buildSecurityBehaviorActors() {
  return {
    steve: makeActor({
      email: 'steve.zahnd@bensoncrew.ca',
      name: 'Steve',
      role: 'owner',
      tier: 1,
    }),
    carsonOps: makeActor({
      email: 'carsonc@bensoncrew.ca',
      name: 'Carson',
      role: 'ops',
      tier: 2,
    }),
    ryanSales: makeActor({
      email: 'ryanc@bensoncrew.ca',
      name: 'Ryan',
      role: 'sales',
      tier: 2,
    }),
    tannerSubject: makeActor({
      email: 'tanner.marsh@bensoncrew.ca',
      name: 'Tanner',
      role: 'ops',
      tier: 3,
    }),
    unknownUser: buildAccessContext({
      authUser: {
        email: 'unknown@example.com',
        name: 'Unknown User',
        role: 'sales',
      },
      foundationUser: null,
    }),
    anonymous: buildAccessContext(),
    adminToken: buildAccessContext({ adminTokenValid: true }),
  }
}

export const SECURITY_BEHAVIOR_ROUTE_CASES = [
  {
    id: 'owner-can-read-foundation-hub',
    actorKey: 'steve',
    method: 'GET',
    path: '/api/foundation-hub',
    expectedAllowed: true,
    expectedPolicy: 'owner_tier_1',
  },
  {
    id: 'ops-cannot-read-foundation-hub',
    actorKey: 'carsonOps',
    method: 'GET',
    path: '/api/foundation-hub',
    expectedAllowed: false,
    expectedCode: 'insufficient_access',
    expectedPolicy: 'owner_tier_1',
  },
  {
    id: 'sales-cannot-read-foundation-hub',
    actorKey: 'ryanSales',
    method: 'GET',
    path: '/api/foundation-hub',
    expectedAllowed: false,
    expectedCode: 'insufficient_access',
    expectedPolicy: 'owner_tier_1',
  },
  {
    id: 'admin-token-can-read-foundation-hub-as-system',
    actorKey: 'adminToken',
    method: 'GET',
    path: '/api/foundation-hub',
    expectedAllowed: true,
    expectedPolicy: 'owner_tier_1',
  },
  {
    id: 'ops-can-read-ops-hub',
    actorKey: 'carsonOps',
    method: 'GET',
    path: '/api/ops-hub',
    expectedAllowed: true,
    expectedPolicy: 'role_plus_verified_tier',
  },
  {
    id: 'sales-cannot-read-ops-hub',
    actorKey: 'ryanSales',
    method: 'GET',
    path: '/api/ops-hub',
    expectedAllowed: false,
    expectedCode: 'insufficient_access',
    expectedPolicy: 'role_plus_verified_tier',
  },
  {
    id: 'sales-can-read-sales-hub',
    actorKey: 'ryanSales',
    method: 'GET',
    path: '/api/sales-hub',
    expectedAllowed: true,
    expectedPolicy: 'role_plus_verified_tier',
  },
  {
    id: 'unknown-sales-role-without-tier-cannot-read-sales-hub',
    actorKey: 'unknownUser',
    method: 'GET',
    path: '/api/sales-hub',
    expectedAllowed: false,
    expectedCode: 'missing_tier',
    expectedPolicy: 'role_plus_verified_tier',
  },
  {
    id: 'shared-comms-archive-stays-owner-only-for-ops',
    actorKey: 'carsonOps',
    method: 'GET',
    path: '/api/shared-communications/archive',
    expectedAllowed: false,
    expectedCode: 'insufficient_access',
    expectedPolicy: 'tier_and_subject_filter',
  },
  {
    id: 'strategy-v2-stays-owner-only-for-sales',
    actorKey: 'ryanSales',
    method: 'GET',
    path: '/api/strategic-execution/v2',
    expectedAllowed: false,
    expectedCode: 'insufficient_access',
    expectedPolicy: 'tier_and_subject_filter',
  },
  {
    id: 'intelligence-evidence-stays-owner-only-for-tanner',
    actorKey: 'tannerSubject',
    method: 'POST',
    path: '/api/intelligence/evidence',
    expectedAllowed: false,
    expectedCode: 'insufficient_access',
    expectedPolicy: 'tier_and_subject_filter',
  },
  {
    id: 'anonymous-can-read-public-session-route',
    actorKey: 'anonymous',
    method: 'GET',
    path: '/api/auth/session',
    expectedAllowed: true,
    expectedPolicy: 'auth_session_only',
  },
  {
    id: 'anonymous-cannot-read-unregistered-protected-route',
    actorKey: 'anonymous',
    method: 'GET',
    path: '/api/private/unregistered',
    expectedAllowed: false,
    expectedCode: 'login_required',
    expectedPolicy: 'default_fail_closed_owner_tier_1',
  },
  {
    id: 'sales-cannot-read-unregistered-protected-route',
    actorKey: 'ryanSales',
    method: 'GET',
    path: '/api/private/unregistered',
    expectedAllowed: false,
    expectedCode: 'insufficient_access',
    expectedPolicy: 'default_fail_closed_owner_tier_1',
  },
  {
    id: 'owner-can-read-unregistered-protected-route',
    actorKey: 'steve',
    method: 'GET',
    path: '/api/private/unregistered',
    expectedAllowed: true,
    expectedPolicy: 'default_fail_closed_owner_tier_1',
  },
]

function evaluateRouteCase(routeCase, actors = buildSecurityBehaviorActors()) {
  const actor = actors[routeCase.actorKey]
  const posture = findRoutePosture(routeCase.method, routeCase.path) || DEFAULT_PROTECTED_ROUTE_POSTURE
  let allowed = false
  let code = null
  let statusCode = null
  try {
    authorizeRouteAccess({
      accessContext: actor,
      method: routeCase.method,
      path: routeCase.path,
    }, posture)
    allowed = true
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      code = error.code
      statusCode = error.statusCode
    } else {
      throw error
    }
  }

  const ok = allowed === routeCase.expectedAllowed &&
    (!routeCase.expectedCode || code === routeCase.expectedCode) &&
    posture.policy === routeCase.expectedPolicy

  return {
    ...routeCase,
    ok,
    actualAllowed: allowed,
    actualCode: code,
    actualStatusCode: statusCode,
    actualPolicy: posture.policy,
    posturePath: posture.path,
  }
}

export function buildSubjectPersonLeakProof(actors = buildSecurityBehaviorActors()) {
  const records = [
    {
      evidenceId: 'tanner-tier1-comp',
      title: 'Tanner Tier 1 compensation note',
      sensitivity: 'comp_discussion',
      minTier: 1,
      subjectPeople: ['tanner.marsh@bensoncrew.ca'],
    },
    {
      evidenceId: 'tanner-performance-concern',
      title: 'Tanner performance concern',
      sensitivity: 'performance_concern',
      minTier: 2,
      subjectPeople: ['tanner.marsh@bensoncrew.ca'],
    },
    {
      evidenceId: 'team-open-operating-note',
      title: 'Team open operating note',
      sensitivity: 'neutral',
      minTier: 3,
      subjectPeople: [],
    },
    {
      evidenceId: 'blake-performance-concern',
      title: 'Blake performance concern',
      sensitivity: 'performance_concern',
      minTier: 2,
      subjectPeople: ['blake.berfelz@bensoncrew.ca'],
    },
    {
      evidenceId: 'ryan-performance-concern',
      title: 'Ryan performance concern',
      sensitivity: 'performance_concern',
      minTier: 2,
      subjectPeople: ['ryanc@bensoncrew.ca'],
    },
  ]

  const tannerEvaluation = evaluateRecordAccess(actors.tannerSubject, records[0], {
    failClosedOnMissingClassification: true,
    requireExplicitTier: true,
  })
  const tannerFiltered = filterRecordsForActor(records, actors.tannerSubject, {
    failClosedOnMissingClassification: true,
    requireExplicitTier: true,
  })
  const ryanFiltered = filterRecordsForActor(records, actors.ryanSales, {
    failClosedOnMissingClassification: true,
    requireExplicitTier: true,
  })
  const tannerIds = tannerFiltered.items.map(item => item.evidenceId)
  const ryanIds = ryanFiltered.items.map(item => item.evidenceId)
  const response = buildRedactedCollectionResponse({
    actor: actors.tannerSubject,
    data: {
      items: tannerFiltered.items,
      summary: { visible: tannerFiltered.items.length },
    },
  })
  const responseText = JSON.stringify(response)
  const checks = [
    {
      id: 'tanner-tier1-subject-content-suppressed',
      ok: !tannerIds.includes('tanner-tier1-comp') &&
        tannerEvaluation.reasons.includes('insufficient_tier') &&
        tannerEvaluation.reasons.includes('subject_person_redaction'),
      detail: tannerEvaluation.reasons.join(','),
    },
    {
      id: 'tanner-sensitive-self-content-suppressed',
      ok: !tannerIds.includes('tanner-performance-concern'),
      detail: tannerIds.join(','),
    },
    {
      id: 'tanner-can-see-tier3-neutral-content',
      ok: tannerIds.includes('team-open-operating-note'),
      detail: tannerIds.join(','),
    },
    {
      id: 'ryan-can-see-non-subject-tier2-but-not-self-sensitive',
      ok: ryanIds.includes('blake-performance-concern') &&
        !ryanIds.includes('ryan-performance-concern'),
      detail: ryanIds.join(','),
    },
    {
      id: 'redacted-response-does-not-leak-suppressed-identities',
      ok: response.access.policy === 'tier_and_subject_filter' &&
        response.access.scope === 'filtered' &&
        !responseText.includes('tanner-tier1-comp') &&
        !responseText.includes('tanner-performance-concern') &&
        !responseText.includes('suppressedCount'),
      detail: responseText,
    },
  ]

  return {
    ok: checks.every(check => check.ok),
    checks,
    tannerVisibleIds: tannerIds,
    ryanVisibleIds: ryanIds,
  }
}

export function buildSyntheticSecurityBehaviorProof() {
  const actors = buildSecurityBehaviorActors()
  const routeCases = SECURITY_BEHAVIOR_ROUTE_CASES.map(routeCase => evaluateRouteCase(routeCase, actors))
  const subjectPerson = buildSubjectPersonLeakProof(actors)
  const failedRouteCases = routeCases.filter(routeCase => !routeCase.ok)
  const failedSubjectChecks = subjectPerson.checks.filter(check => !check.ok)

  return {
    ok: failedRouteCases.length === 0 && failedSubjectChecks.length === 0,
    cardId: SECURITY_BEHAVIOR_PROOF_CARD_ID,
    closeoutKey: SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY,
    routeCases,
    subjectPerson,
    failedRouteCases,
    failedSubjectChecks,
    summary: {
      routeCaseCount: routeCases.length,
      failedRouteCaseCount: failedRouteCases.length,
      subjectCheckCount: subjectPerson.checks.length,
      failedSubjectCheckCount: failedSubjectChecks.length,
      coveredActors: Object.keys(actors),
    },
  }
}
