export const SECURITY_POLICY_VERSION = 'security-002-v1'

export const SECURITY_SENSITIVITIES = [
  'neutral',
  'positive',
  'performance_concern',
  'termination_risk',
  'comp_discussion',
  'undisclosed_feedback',
]

const SUBJECT_REDACTION_SENSITIVITIES = new Set([
  'performance_concern',
  'termination_risk',
  'comp_discussion',
  'undisclosed_feedback',
])

const SECURITY_SENSITIVITY_DEFAULT_TIERS = {
  neutral: 3,
  positive: 3,
  performance_concern: 2,
  termination_risk: 1,
  comp_discussion: 1,
  undisclosed_feedback: 1,
}

export class AccessDeniedError extends Error {
  constructor(statusCode, code, message, details = {}) {
    super(message)
    this.name = 'AccessDeniedError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

export function normalizeRole(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (['owner', 'ops', 'sales', 'external', 'system'].includes(normalized)) return normalized
  return normalized ? 'external' : ''
}

export function normalizeTier(value) {
  const tier = Number(value)
  if (!Number.isFinite(tier)) return null
  const normalized = Math.floor(tier)
  return [1, 2, 3].includes(normalized) ? normalized : null
}

export function normalizeSensitivity(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return SECURITY_SENSITIVITIES.includes(normalized) ? normalized : ''
}

function normalizeTextArray(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean)
  }
  if (value && typeof value === 'object') {
    return Object.values(value).map(item => String(item || '').trim()).filter(Boolean)
  }
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function normalizeEmailArray(value) {
  return normalizeTextArray(value).map(normalizeEmail).filter(Boolean)
}

function metadataObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

function defaultTierForSensitivity(sensitivity) {
  return SECURITY_SENSITIVITY_DEFAULT_TIERS[sensitivity] || 1
}

function extractSubjectPeople(record = {}) {
  const metadata = metadataObject(record.metadata)
  const attributes = metadataObject(record.attributes)
  const candidates = [
    record.subject_people,
    record.subjectPeople,
    record.subjects,
    metadata.subject_people,
    metadata.subjectPeople,
    metadata.subjects,
    attributes.subject_people,
    attributes.subjectPeople,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeEmailArray(candidate)
    if (normalized.length) return normalized
  }

  return []
}

function extractOwnerEmails(record = {}) {
  const metadata = metadataObject(record.metadata)
  return normalizeEmailArray(firstDefined(
    record.owner_emails,
    record.ownerEmails,
    record.owner_email,
    record.ownerEmail,
    record.sourceAccount,
    record.source_account,
    metadata.owner_emails,
    metadata.ownerEmails,
    metadata.owner_email,
    metadata.ownerEmail,
    metadata.primarySourceAccount,
    metadata.sourceAccount,
    metadata.source_account,
  ))
}

function extractParticipantEmails(record = {}) {
  const metadata = metadataObject(record.metadata)
  return normalizeEmailArray(firstDefined(
    record.participant_emails,
    record.participantEmails,
    metadata.participant_emails,
    metadata.participantEmails,
    metadata.participants,
  ))
}

export function normalizeSecurityRecord(record = {}, options = {}) {
  const metadata = metadataObject(record.metadata)
  const attributes = metadataObject(record.attributes)
  const sensitivity = normalizeSensitivity(firstDefined(
    record.sensitivity,
    metadata.sensitivity,
    attributes.sensitivity,
  ))
  const explicitTier = normalizeTier(firstDefined(
    record.min_tier,
    record.minTier,
    record.maxTier,
    metadata.min_tier,
    metadata.minTier,
    metadata.maxTier,
    attributes.min_tier,
    attributes.minTier,
  ))
  const minTier = explicitTier || defaultTierForSensitivity(sensitivity)
  const subjectPeople = extractSubjectPeople(record)
  const classificationMissing = !sensitivity || (!explicitTier && options.requireExplicitTier === true)

  return {
    minTier,
    explicitMinTier: explicitTier,
    sensitivity,
    subjectPeople,
    ownerEmails: extractOwnerEmails(record),
    participantEmails: extractParticipantEmails(record),
    classificationMissing,
  }
}

export function buildAccessContext({
  authUser = null,
  localDevUser = null,
  adminTokenValid = false,
  foundationUser = null,
} = {}) {
  const sourceUser = localDevUser || authUser || null
  const dbUser = foundationUser && typeof foundationUser === 'object' ? foundationUser : null
  const email = normalizeEmail(sourceUser?.email || dbUser?.email)
  const dbEmail = normalizeEmail(dbUser?.email)
  const role = normalizeRole(sourceUser?.role || dbUser?.role || dbUser?.metadata?.role)
  const tier = normalizeTier(localDevUser ? 1 : dbUser?.tier ?? sourceUser?.tier)
  const userType = String(dbUser?.userType || dbUser?.user_type || sourceUser?.userType || 'human').trim().toLowerCase()

  if (adminTokenValid && !sourceUser) {
    return {
      authenticated: true,
      authSource: 'admin-token',
      email: 'admin-token',
      name: 'Admin Token',
      role: 'system',
      tier: 1,
      userType: 'system',
      isSteve: false,
      isLocalDev: false,
      isSystem: true,
      active: true,
      subjectEmails: [],
    }
  }

  return {
    authenticated: Boolean(sourceUser),
    authSource: localDevUser ? 'local-dev' : sourceUser ? 'session' : 'anonymous',
    email,
    name: String(sourceUser?.name || dbUser?.name || '').trim(),
    role,
    tier,
    userType,
    isSteve: email === 'steve.zahnd@bensoncrew.ca',
    isLocalDev: Boolean(localDevUser),
    isSystem: userType === 'system',
    active: dbUser ? dbUser.active !== false : Boolean(sourceUser),
    foundationUserMatched: Boolean(dbEmail && email && dbEmail === email),
    subjectEmails: email ? [email] : [],
  }
}

export function getAccessContext(input) {
  const context = input?.accessContext || input
  if (!context || typeof context !== 'object') {
    throw new AccessDeniedError(401, 'login_required', 'Login required.')
  }
  return context
}

export function assertRole(input, roles, options = {}) {
  const context = getAccessContext(input)
  const allowedRoles = Array.isArray(roles) ? roles.map(normalizeRole).filter(Boolean) : [normalizeRole(roles)]
  const allowLocalDev = options.allowLocalDev !== false
  const allowSystem = options.allowSystem !== false

  if (context.isLocalDev && allowLocalDev) return context
  if (context.isSystem && allowSystem) return context
  if (!context.authenticated) {
    throw new AccessDeniedError(401, 'login_required', 'Login required.')
  }
  if (!context.active) {
    throw new AccessDeniedError(403, 'inactive_user', 'This login is not active.')
  }
  if (!allowedRoles.length || allowedRoles.includes(context.role)) return context

  throw new AccessDeniedError(403, 'insufficient_access', 'This login does not have access to that area.', {
    requiredRoles: allowedRoles,
    role: context.role || null,
  })
}

export function assertTier(input, requiredTier, options = {}) {
  const context = getAccessContext(input)
  const normalizedRequiredTier = normalizeTier(requiredTier)
  if (!normalizedRequiredTier) {
    throw new AccessDeniedError(500, 'invalid_tier_policy', 'Route tier policy is invalid.')
  }

  const allowLocalDev = options.allowLocalDev !== false
  const allowSystem = options.allowSystem === true
  if (context.isLocalDev && allowLocalDev) return context
  if (context.isSystem && allowSystem) return context
  if (!context.authenticated) {
    throw new AccessDeniedError(401, 'login_required', 'Login required.')
  }
  if (!context.active) {
    throw new AccessDeniedError(403, 'inactive_user', 'This login is not active.')
  }
  if (!context.tier) {
    throw new AccessDeniedError(403, 'missing_tier', 'This login does not have a verified access tier.')
  }
  if (context.tier > normalizedRequiredTier) {
    throw new AccessDeniedError(403, 'insufficient_tier', 'This login cannot access that surface.', {
      requiredTier: normalizedRequiredTier,
      actorTier: context.tier,
    })
  }

  return context
}

export function deriveActorTier(input) {
  const context = getAccessContext(input)
  if (!context.tier) {
    throw new AccessDeniedError(403, 'missing_tier', 'This login does not have a verified access tier.')
  }
  return context.tier
}

export function canReadTier(actorTier, itemMinTier) {
  const normalizedActorTier = normalizeTier(actorTier)
  const normalizedItemMinTier = normalizeTier(itemMinTier)
  if (!normalizedActorTier || !normalizedItemMinTier) return false
  return normalizedActorTier <= normalizedItemMinTier
}

export function evaluateRecordAccess(actorInput, record = {}, options = {}) {
  const actor = getAccessContext(actorInput)
  const security = normalizeSecurityRecord(record, options)
  const reasons = []

  if (!actor.tier) reasons.push('missing_actor_tier')
  if (
    security.classificationMissing &&
    options.failClosedOnMissingClassification !== false &&
    actor.tier !== 1
  ) {
    reasons.push('missing_classification')
  }
  if (!canReadTier(actor.tier, security.minTier)) reasons.push('insufficient_tier')

  const actorSubjects = new Set((actor.subjectEmails || [actor.email]).map(normalizeEmail).filter(Boolean))
  const actorIsSubject = security.subjectPeople.some(email => actorSubjects.has(email))
  const disclosed = Boolean(record.disclosedPerformanceReview || record.disclosed_performance_review || metadataObject(record.metadata).disclosedPerformanceReview)
  if (
    actorIsSubject &&
    SUBJECT_REDACTION_SENSITIVITIES.has(security.sensitivity) &&
    !disclosed
  ) {
    reasons.push('subject_person_redaction')
  }
  if (
    SUBJECT_REDACTION_SENSITIVITIES.has(security.sensitivity) &&
    security.subjectPeople.length === 0 &&
    actor.tier !== 1
  ) {
    reasons.push('missing_sensitive_subject')
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    security,
  }
}

export function filterRecordsForActor(records, actorInput, options = {}) {
  const actor = getAccessContext(actorInput)
  const items = []
  let suppressedCount = 0
  for (const record of Array.isArray(records) ? records : []) {
    const evaluation = evaluateRecordAccess(actor, record, options)
    if (evaluation.allowed) {
      items.push(record)
    } else {
      suppressedCount += 1
    }
  }

  return {
    items,
    suppressedCount,
  }
}

export function buildRedactedCollectionResponse({
  actor,
  data = {},
  items = null,
  summary = null,
  generatedAt = new Date().toISOString(),
  policy = 'tier_and_subject_filter',
  scope = 'filtered',
  status = 'healthy',
} = {}) {
  const context = getAccessContext(actor)
  const normalizedData = data && typeof data === 'object' && !Array.isArray(data) ? { ...data } : {}
  if (items) normalizedData.items = items
  if (summary) normalizedData.summary = summary

  return {
    status,
    generatedAt,
    access: {
      policy,
      scope,
      requesterTier: context.tier || null,
    },
    data: normalizedData,
  }
}

export function buildFilteredArtifactSummaryResponse({
  actor,
  artifact = {},
  summary = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  const context = getAccessContext(actor)
  return {
    status: 'healthy',
    generatedAt,
    access: {
      policy: 'filtered_summary_only',
      scope: 'filtered',
      requesterTier: context.tier || null,
    },
    artifact: {
      artifactId: artifact.artifactId || artifact.artifact_id || null,
      title: artifact.title || '',
      sourceId: artifact.sourceId || artifact.source_id || null,
    },
    summary: summary && typeof summary === 'object' && !Array.isArray(summary) ? summary : { items: [] },
  }
}

const ownerTier1 = {
  roles: ['owner'],
  requiredTier: 1,
  allowSystem: true,
  allowLocalDev: true,
  policy: 'owner_tier_1',
}

const redactionAwareTier1 = {
  roles: ['owner'],
  requiredTier: 1,
  allowSystem: true,
  allowLocalDev: true,
  policy: 'tier_and_subject_filter',
  deriveTierFromServer: true,
  redaction: 'tier_and_subject_filter',
}

const roleOps = {
  roles: ['owner', 'ops'],
  requiredTier: 3,
  allowSystem: true,
  allowLocalDev: true,
  policy: 'role_plus_verified_tier',
}

const roleSales = {
  roles: ['owner', 'ops', 'sales'],
  requiredTier: 3,
  allowSystem: true,
  allowLocalDev: true,
  policy: 'role_plus_verified_tier',
}

const publicAuth = {
  public: true,
  policy: 'auth_session_only',
}

const tokenScopedPublic = {
  public: true,
  policy: 'token_scoped_feedback_only',
}

function route(method, path, posture = {}) {
  return {
    method,
    path,
    ...posture,
  }
}

export const SECURITY_ROUTE_POSTURES = [
  route('POST', '/api/auth/login', publicAuth),
  route('POST', '/api/auth/google', publicAuth),
  route('GET', '/api/auth/session', publicAuth),
  route('POST', '/api/auth/logout', publicAuth),
  route('GET', '/login', publicAuth),
  route('GET', '/api/agent-feedback/session', tokenScopedPublic),
  route('POST', '/api/agent-feedback/submit', tokenScopedPublic),

  route('GET', '/api/foundation-hub', ownerTier1),
  route('GET', '/api/source-of-truth', ownerTier1),
  route('GET', '/api/foundation/source-lifecycle', ownerTier1),
  route('GET', '/api/foundation/source-maturity-grid', ownerTier1),
  route('GET', '/api/foundation/source-extraction-coverage', ownerTier1),
  route('GET', '/api/foundation/source-coverage-closeout', ownerTier1),
  route('GET', '/api/foundation/marketing-source-map', ownerTier1),
  route('GET', '/api/foundation/brand-stack', ownerTier1),
  route('GET', '/api/foundation/tier-behavioral-completion', ownerTier1),
  route('GET', '/api/foundation/verification-runs', ownerTier1),
  route('GET', '/api/foundation/per-user-changelog', ownerTier1),
  route('GET', '/api/foundation/restricted-decision-queue', ownerTier1),
  route('GET', '/api/foundation/current-sprint', ownerTier1),
  route('GET', '/api/system-inventory', ownerTier1),
  route('GET', '/api/foundation/jobs', ownerTier1),
  route('GET', '/api/foundation/active-processes', ownerTier1),
  route('GET', '/api/foundation/llm-runtime', ownerTier1),
  route('GET', '/api/foundation/extraction-control', ownerTier1),
  route('GET', '/api/foundation/extraction-runtime-readiness', ownerTier1),
  route('GET', '/api/foundation/gstack-build-intel', ownerTier1),
  route('POST', '/api/foundation/jobs/:jobKey/control', ownerTier1),
  route('POST', '/api/foundation/job-runs/:runId/stop', ownerTier1),
  route('POST', '/api/foundation/jobs/:jobKey/decommission', ownerTier1),
  route('GET', '/api/foundation/changes', ownerTier1),
  route('GET', '/api/foundation/change-log', ownerTier1),
  route('GET', '/api/foundation/daily-summary', ownerTier1),
  route('GET', '/api/foundation/build-log', ownerTier1),
  route('GET', '/api/foundation/doc-updates', ownerTier1),
  route('GET', '/api/foundation/backlog', ownerTier1),
  route('GET', '/api/foundation/backlog/done-archive', ownerTier1),
  route('GET', '/api/doc', ownerTier1),
  route('GET', '/api/foundation/local-doc/:name', { ...ownerTier1, localOnly: true, policy: 'private_local_doc_allowlist' }),
  route('GET', '/api/foundation/local-doc/*', { ...ownerTier1, localOnly: true, policy: 'private_local_doc_allowlist' }),
  route('GET', '/api/foundation/action-review', ownerTier1),
  route('GET', '/api/foundation/action-route-review-inbox', ownerTier1),
  route('GET', '/api/strategic-execution/action-routes', ownerTier1),
  route('POST', '/api/strategic-execution/action-routes/:routeId/review', ownerTier1),
  route('POST', '/api/foundation/action-review/:routeId/review', ownerTier1),
  route('POST', '/api/foundation/backlog', ownerTier1),
  route('PATCH', '/api/foundation/backlog/:id', ownerTier1),
  route('POST', '/api/foundation/decisions', ownerTier1),
  route('PATCH', '/api/foundation/decisions/:id', ownerTier1),
  route('POST', '/api/foundation/questions', ownerTier1),
  route('PATCH', '/api/foundation/questions/:id', ownerTier1),
  route('POST', '/api/foundation/doc-updates', ownerTier1),
  route('POST', '/api/foundation/doc-updates/:id/approve', ownerTier1),
  route('POST', '/api/foundation/doc-updates/:id/reject', ownerTier1),
  route('POST', '/api/foundation/doc-updates/:id/apply', ownerTier1),
  route('GET', '/foundation/export/strategy.pdf', ownerTier1),

  route('POST', '/api/intelligence/evidence', redactionAwareTier1),
  route('GET', '/api/shared-communications/archive', redactionAwareTier1),
  route('GET', '/api/shared-communications/coverage', redactionAwareTier1),
  route('GET', '/api/shared-communications/candidates', redactionAwareTier1),
  route('GET', '/api/shared-communications/synthesis', redactionAwareTier1),
  route('POST', '/api/shared-communications/candidates/:candidateKey/apply-to-backlog', redactionAwareTier1),
  route('POST', '/api/shared-communications/candidates/:candidateKey/apply-to-decision', redactionAwareTier1),
  route('POST', '/api/shared-communications/candidates/:candidateKey/apply-to-question', redactionAwareTier1),
  route('POST', '/api/shared-communications/candidates/:candidateKey/:action', redactionAwareTier1),
  route('GET', '/api/strategic-execution/prework-coverage', redactionAwareTier1),
  route('GET', '/api/strategic-execution/goal-truth', redactionAwareTier1),
  route('GET', '/api/strategic-execution/operating-truth', redactionAwareTier1),
  route('GET', '/api/strategic-execution/v2', redactionAwareTier1),
  route('POST', '/api/strategic-execution/advisor', redactionAwareTier1),

  route('GET', '/api/ops-hub', roleOps),
  route('GET', '/api/owners/review-queue', roleOps),
  route('GET', '/api/owners/lead-source-governance', ownerTier1),
  route('GET', '/api/sales-hub', roleSales),
  route('GET', '/api/sheets/structure-status', ownerTier1),
  route('GET', '/api/fub/health', ownerTier1),
  route('GET', '/api/fub/person', ownerTier1),
  route('GET', '/api/fub/lead-sources', ownerTier1),
  route('POST', '/api/fub/request', ownerTier1),
  route('POST', '/api/fub/lead-sources/refresh', ownerTier1),
  route('PATCH', '/api/fub/lead-sources', ownerTier1),
  route('GET', '/api/foundation/agent-feedback-production-dry-run', ownerTier1),
  route('GET', '/api/ops/agent-feedback-production-dry-run', roleOps),
  route('POST', '/api/sales-hub/listing-assignment', roleSales),
  route('POST', '/api/sales-hub/group-assignment', roleSales),
  route('POST', '/api/sales-hub/project-case', roleSales),
  route('POST', '/api/sales-hub/listing-case', roleSales),
  route('POST', '/api/sales-hub/sync-cases', roleSales),
]

export const SECURITY_ROUTE_POSTURE_KEYS = SECURITY_ROUTE_POSTURES.map(posture => `${posture.method} ${posture.path}`)

export const DEFAULT_PROTECTED_ROUTE_POSTURE = {
  method: '*',
  path: '*',
  ...ownerTier1,
  policy: 'default_fail_closed_owner_tier_1',
}

function matchRoutePath(pattern, pathname) {
  const normalizedPattern = String(pattern || '').trim()
  const normalizedPath = String(pathname || '').split('?')[0]
  if (!normalizedPattern || !normalizedPath) return false
  if (normalizedPattern === normalizedPath) return true
  if (normalizedPattern.endsWith('/*')) {
    const prefix = normalizedPattern.slice(0, -1)
    return normalizedPath.startsWith(prefix)
  }

  const patternParts = normalizedPattern.split('/').filter(Boolean)
  const pathParts = normalizedPath.split('/').filter(Boolean)
  if (patternParts.length !== pathParts.length) return false
  return patternParts.every((part, index) => part.startsWith(':') || part === pathParts[index])
}

export function findRoutePosture(method, pathname) {
  const normalizedMethod = String(method || '').trim().toUpperCase()
  return SECURITY_ROUTE_POSTURES.find(posture =>
    posture.method === normalizedMethod &&
    matchRoutePath(posture.path, pathname)
  ) || null
}

export function authorizeRouteAccess(req, posture = null) {
  const context = getAccessContext(req)
  const activePosture = posture || DEFAULT_PROTECTED_ROUTE_POSTURE

  if (activePosture.public) return context
  if (activePosture.localOnly && !context.isLocalDev) {
    throw new AccessDeniedError(403, 'local_only', 'This route is only available from localhost.')
  }
  if (activePosture.roles) {
    assertRole(context, activePosture.roles, {
      allowLocalDev: activePosture.allowLocalDev !== false,
      allowSystem: activePosture.allowSystem !== false,
    })
  }
  if (activePosture.requiredTier) {
    assertTier(context, activePosture.requiredTier, {
      allowLocalDev: activePosture.allowLocalDev !== false,
      allowSystem: activePosture.allowSystem === true,
    })
  }

  return context
}
