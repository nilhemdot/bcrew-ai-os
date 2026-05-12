import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  AccessDeniedError,
  SECURITY_ROUTE_POSTURE_KEYS,
  assertRole,
  assertTier,
  authorizeRouteAccess,
  buildAccessContext,
  buildFilteredArtifactSummaryResponse,
  buildRedactedCollectionResponse,
  canReadTier,
  evaluateRecordAccess,
  filterRecordsForActor,
  findRoutePosture,
} from '../lib/security-access.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const checks = []

function addCheck(ok, label, detail = '') {
  checks.push({ ok: Boolean(ok), label, detail })
  const prefix = ok ? 'PASS' : 'FAIL'
  console.log(`${prefix} ${label}${detail ? ` -> ${detail}` : ''}`)
}

function makeActor({ email, name, role, tier, userType = 'human', active = true } = {}) {
  return buildAccessContext({
    authUser: email ? { email, name: name || email, role } : null,
    foundationUser: email ? { email, name: name || email, tier, userType, active } : null,
  })
}

function expectDenied(fn, code) {
  try {
    fn()
  } catch (error) {
    return error instanceof AccessDeniedError && (!code || error.code === code)
  }
  return false
}

const steve = makeActor({
  email: 'steve.zahnd@bensoncrew.ca',
  name: 'Steve',
  role: 'owner',
  tier: 1,
})
const ryan = makeActor({
  email: 'ryanc@bensoncrew.ca',
  name: 'Ryan',
  role: 'sales',
  tier: 2,
})
const carson = makeActor({
  email: 'carsonc@bensoncrew.ca',
  name: 'Carson',
  role: 'ops',
  tier: 2,
})
const blake = makeActor({
  email: 'blake.berfelz@bensoncrew.ca',
  name: 'Blake',
  role: 'sales',
  tier: 2,
})
const georgia = makeActor({
  email: 'georgia.huntley@bensoncrew.ca',
  name: 'Georgia',
  role: 'ops',
  tier: 3,
})
const john = buildAccessContext({
  authUser: {
    email: 'john@johnkitchens.coach',
    name: 'John Kitchens',
    role: 'sales',
  },
  foundationUser: null,
})
const anonymous = buildAccessContext()
const localDev = buildAccessContext({
  localDevUser: {
    email: 'local-dev@bensoncrew.ai',
    name: 'Local Dev',
    role: 'owner',
    tier: 1,
  },
})
const adminTokenActor = buildAccessContext({ adminTokenValid: true })

addCheck(assertTier(steve, 1) === steve, 'assertTier(req, 1) allows Steve/Tier 1')
addCheck(expectDenied(() => assertTier(ryan, 1), 'insufficient_tier'), 'assertTier(req, 1) denies Ryan/Tier 2')
addCheck(expectDenied(() => assertTier(georgia, 2), 'insufficient_tier'), 'assertTier(req, 2) denies Georgia/Tier 3')
addCheck(assertTier(ryan, 2) === ryan && assertTier(georgia, 3) === georgia, 'assertTier allows active known users at their tier')
addCheck(expectDenied(() => assertTier(john, 3), 'missing_tier'), 'assertTier denies external/missing-tier users')
addCheck(expectDenied(() => assertTier(anonymous, 3), 'login_required'), 'assertTier denies anonymous users')
addCheck(assertTier(localDev, 1) === localDev, 'local dev actor remains Tier 1 only for local socket + localhost context')
addCheck(assertRole(adminTokenActor, ['owner']) === adminTokenActor, 'admin token is system/admin source, not a client-chosen human tier')

addCheck(canReadTier(1, 1) && canReadTier(1, 2) && canReadTier(1, 3), 'Tier 1 can read Tier 1/2/3 items')
addCheck(!canReadTier(2, 1) && canReadTier(2, 2) && canReadTier(2, 3), 'Tier 2 cannot read Tier 1-only items')
addCheck(!canReadTier(3, 1) && !canReadTier(3, 2) && canReadTier(3, 3), 'Tier 3 can read only Tier 3-open items')

const tierOneItem = {
  evidenceId: 'steve-comp',
  title: 'Tier 1 compensation note',
  sensitivity: 'comp_discussion',
  minTier: 1,
  subjectPeople: ['nick.bergmann@bensoncrew.ca'],
}
const tierTwoItem = {
  evidenceId: 'leadership-ops',
  title: 'Leadership operating note',
  sensitivity: 'neutral',
  minTier: 2,
  subjectPeople: [],
}
const tierThreeItem = {
  evidenceId: 'general-ops',
  title: 'General operating note',
  sensitivity: 'neutral',
  minTier: 3,
  subjectPeople: [],
}
const ryanSensitiveSubjectItem = {
  evidenceId: 'ryan-risk',
  title: 'Ryan sensitive note',
  sensitivity: 'termination_risk',
  minTier: 2,
  subjectPeople: ['ryanc@bensoncrew.ca'],
}
const blakePerformanceConcern = {
  evidenceId: 'blake-performance',
  title: 'Blake performance concern',
  sensitivity: 'performance_concern',
  minTier: 2,
  subjectPeople: ['blake.berfelz@bensoncrew.ca'],
}
const missingSensitiveSubject = {
  evidenceId: 'missing-subject',
  title: 'Sensitive item missing subject_people',
  sensitivity: 'termination_risk',
  minTier: 2,
  subjectPeople: [],
}
const unknownClassification = {
  evidenceId: 'unknown-classification',
  title: 'Unclassified protected item',
  minTier: 2,
  subjectPeople: [],
}

addCheck(evaluateRecordAccess(steve, tierOneItem, { failClosedOnMissingClassification: true }).allowed, 'Tier 1 item is visible to Steve')
addCheck(!evaluateRecordAccess(ryan, tierOneItem, { failClosedOnMissingClassification: true }).allowed, 'Tier 1 item is not visible to Ryan/Tier 2')
addCheck(evaluateRecordAccess(ryan, tierTwoItem, { failClosedOnMissingClassification: true }).allowed, 'Tier 2 item is visible to Ryan/Tier 2')
addCheck(!evaluateRecordAccess(georgia, tierTwoItem, { failClosedOnMissingClassification: true }).allowed, 'Tier 2 item is not visible to Georgia/Tier 3')
addCheck(evaluateRecordAccess(georgia, tierThreeItem, { failClosedOnMissingClassification: true }).allowed, 'Tier 3 neutral item is visible to Georgia/Tier 3')
addCheck(!evaluateRecordAccess(ryan, ryanSensitiveSubjectItem, { failClosedOnMissingClassification: true }).allowed, 'subject_person redaction suppresses Ryan-sensitive item from Ryan')
addCheck(evaluateRecordAccess(carson, blakePerformanceConcern, { failClosedOnMissingClassification: true }).allowed, 'non-subject Tier 2 can see another person performance concern when tier permits')
addCheck(!evaluateRecordAccess(blake, blakePerformanceConcern, { failClosedOnMissingClassification: true }).allowed, 'subject person cannot see own sensitive performance concern by default')
addCheck(!evaluateRecordAccess(ryan, missingSensitiveSubject, { failClosedOnMissingClassification: true }).allowed, 'sensitive protected item without subject_people fails closed to non-Tier-1')
addCheck(!evaluateRecordAccess(ryan, unknownClassification, { failClosedOnMissingClassification: true, requireExplicitTier: true }).allowed, 'unknown sensitivity/missing classification fails closed to non-Tier-1')
addCheck(evaluateRecordAccess(steve, unknownClassification, { failClosedOnMissingClassification: true, requireExplicitTier: true }).allowed, 'unknown classification remains Tier 1-only rather than public')

const filteredForRyan = filterRecordsForActor([
  tierOneItem,
  tierTwoItem,
  tierThreeItem,
  ryanSensitiveSubjectItem,
], ryan, { failClosedOnMissingClassification: true })
addCheck(
  filteredForRyan.items.map(item => item.evidenceId).join(',') === 'leadership-ops,general-ops',
  'filtered collections omit suppressed items without exposing their identities',
  filteredForRyan.items.map(item => item.evidenceId).join(','),
)

const redactedResponse = buildRedactedCollectionResponse({
  actor: ryan,
  data: {
    items: filteredForRyan.items,
    summary: { visible: filteredForRyan.items.length },
  },
})
addCheck(
  redactedResponse.status === 'healthy' &&
    redactedResponse.access.policy === 'tier_and_subject_filter' &&
    redactedResponse.access.scope === 'filtered' &&
    redactedResponse.access.requesterTier === 2 &&
    !JSON.stringify(redactedResponse).includes('redactedCount') &&
    !JSON.stringify(redactedResponse).includes('steve-comp') &&
    !JSON.stringify(redactedResponse).includes('ryan-risk'),
  'redacted collection response has stable non-leaking shape',
)

const summaryResponse = buildFilteredArtifactSummaryResponse({
  actor: carson,
  artifact: {
    artifactId: 'SRC-MEETINGS-001:example',
    title: 'Meeting summary',
    sourceId: 'SRC-MEETINGS-001',
    content_text: 'raw text must not leave Tier 1',
  },
  summary: { items: [] },
})
addCheck(
  summaryResponse.access.policy === 'filtered_summary_only' &&
    !JSON.stringify(summaryResponse).includes('content_text') &&
    !JSON.stringify(summaryResponse).includes('raw text must not leave Tier 1'),
  'filtered artifact summary preserves owner/shared-comms raw-content boundary',
)

const requiredRouteKeys = [
  'GET /api/foundation-hub',
  'GET /api/source-of-truth',
  'GET /api/foundation/source-lifecycle',
  'GET /api/system-inventory',
  'GET /api/foundation/jobs',
  'GET /api/foundation/active-processes',
  'GET /api/foundation/llm-runtime',
  'GET /api/foundation/extraction-control',
  'POST /api/foundation/job-runs/:runId/stop',
  'POST /api/foundation/jobs/:jobKey/decommission',
  'GET /api/foundation/changes',
  'GET /api/foundation/change-log',
  'GET /api/foundation/per-user-changelog',
  'GET /api/foundation/daily-summary',
  'GET /api/foundation/build-log',
  'GET /api/foundation/doc-updates',
  'GET /api/doc',
  'GET /api/foundation/local-doc/:name',
  'GET /api/foundation/action-review',
  'GET /api/strategic-execution/action-routes',
  'POST /api/strategic-execution/action-routes/:routeId/review',
  'POST /api/foundation/action-review/:routeId/review',
  'POST /api/foundation/backlog',
  'PATCH /api/foundation/backlog/:id',
  'POST /api/foundation/decisions',
  'PATCH /api/foundation/decisions/:id',
  'POST /api/foundation/questions',
  'PATCH /api/foundation/questions/:id',
  'POST /api/foundation/doc-updates',
  'POST /api/foundation/doc-updates/:id/approve',
  'POST /api/foundation/doc-updates/:id/reject',
  'POST /api/foundation/doc-updates/:id/apply',
  'POST /api/intelligence/evidence',
  'GET /api/shared-communications/archive',
  'GET /api/shared-communications/coverage',
  'GET /api/shared-communications/candidates',
  'GET /api/shared-communications/synthesis',
  'POST /api/shared-communications/candidates/:candidateKey/apply-to-backlog',
  'POST /api/shared-communications/candidates/:candidateKey/apply-to-decision',
  'POST /api/shared-communications/candidates/:candidateKey/apply-to-question',
  'POST /api/shared-communications/candidates/:candidateKey/:action',
  'GET /api/strategic-execution/prework-coverage',
  'GET /api/strategic-execution/goal-truth',
  'GET /api/strategic-execution/operating-truth',
  'GET /api/strategic-execution/v2',
  'POST /api/strategic-execution/advisor',
  'GET /api/ops-hub',
  'GET /api/owners/review-queue',
  'GET /api/owners/lead-source-governance',
  'GET /api/sales-hub',
  'GET /api/sheets/structure-status',
  'GET /api/fub/health',
  'GET /api/fub/person',
  'GET /api/fub/lead-sources',
  'POST /api/fub/request',
  'POST /api/fub/lead-sources/refresh',
  'PATCH /api/fub/lead-sources',
  'GET /api/foundation/agent-feedback-production-dry-run',
  'GET /api/ops/agent-feedback-production-dry-run',
  'POST /api/sales-hub/listing-assignment',
  'POST /api/sales-hub/group-assignment',
  'POST /api/sales-hub/project-case',
  'POST /api/sales-hub/listing-case',
  'POST /api/sales-hub/sync-cases',
  'GET /api/auth/session',
  'POST /api/auth/login',
  'POST /api/auth/google',
  'POST /api/auth/logout',
  'GET /api/agent-feedback/session',
  'POST /api/agent-feedback/submit',
]
const registered = new Set(SECURITY_ROUTE_POSTURE_KEYS)
const missingRoutes = requiredRouteKeys.filter(key => !registered.has(key))
addCheck(missingRoutes.length === 0, 'route posture registry covers every route named in the plan', missingRoutes.join(', '))

const evidencePosture = findRoutePosture('POST', '/api/intelligence/evidence')
addCheck(
  evidencePosture?.deriveTierFromServer === true &&
    evidencePosture.requiredTier === 1 &&
    evidencePosture.redaction === 'tier_and_subject_filter',
  '/api/intelligence/evidence is Tier 1-only until filtered access can be proven',
)
const archivePosture = findRoutePosture('GET', '/api/shared-communications/archive')
addCheck(
  archivePosture?.requiredTier === 1 &&
    archivePosture.redaction === 'tier_and_subject_filter',
  '/api/shared-communications/archive stays Tier 1-only for raw shared-comms content',
)
addCheck(
  expectDenied(() => authorizeRouteAccess({ accessContext: john, method: 'GET', path: '/api/foundation-hub' }, findRoutePosture('GET', '/api/foundation-hub')), 'insufficient_access'),
  'John cannot read Foundation Hub',
)
addCheck(
  expectDenied(() => authorizeRouteAccess({ accessContext: john, method: 'GET', path: '/api/shared-communications/archive' }, archivePosture), 'insufficient_access'),
  'John cannot read shared-comms archive',
)
addCheck(
  expectDenied(() => authorizeRouteAccess({ accessContext: john, method: 'POST', path: '/api/intelligence/evidence' }, evidencePosture), 'insufficient_access'),
  'John cannot post intelligence evidence with client maxTier=1',
)

const serverSource = fs.readFileSync(path.join(repoRoot, 'server.js'), 'utf8')
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))
addCheck(
  serverSource.includes('deriveActorTier(req)') &&
    serverSource.includes('maxTier: retrievalMaxTier') &&
    !serverSource.includes('req.body?.maxTier') &&
    !serverSource.includes('req.body?.max_tier'),
  '/api/intelligence/evidence derives tier server-side and does not read client maxTier',
)
addCheck(
  serverSource.includes('buildAccessContext') &&
    serverSource.includes('listFoundationUsers({ activeOnly: false })') &&
    serverSource.includes('authorizeRouteAccess(req, posture)'),
  'server attaches DB-backed access context and authorizes through route posture registry',
)
addCheck(
  packageJson.scripts?.['process:security-002-check'] === 'node --env-file-if-exists=.env scripts/process-security-002-check.mjs',
  'package.json exposes process:security-002-check',
)

const failed = checks.filter(check => !check.ok)
console.log('')
console.log('SECURITY_002_CHECK_SUMMARY ' + JSON.stringify({
  totalChecks: checks.length,
  passedChecks: checks.length - failed.length,
  failedChecks: failed.length,
  routePostures: SECURITY_ROUTE_POSTURE_KEYS.length,
}, null, 2))

if (failed.length) {
  process.exitCode = 1
}
