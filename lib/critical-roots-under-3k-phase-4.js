import fs from 'node:fs'
import path from 'node:path'
import { buildOwnersGovernanceRoutesSplitDogfoodProof } from './owners-governance-routes.js'
import { buildSalesHubRoutesSplitDogfoodProof } from './sales-hub-routes.js'

export const CRITICAL_ROOTS_UNDER_3K_PHASE_4_CARD_ID = 'CRITICAL-ROOTS-UNDER-3K-PHASE-4'
export const CRITICAL_ROOTS_UNDER_3K_PHASE_4_CLOSEOUT_KEY = 'critical-roots-under-3k-phase-4-v1'
export const CRITICAL_ROOTS_UNDER_3K_PHASE_4_PLAN_PATH = 'docs/process/critical-roots-under-3k-phase-4-plan.md'
export const CRITICAL_ROOTS_UNDER_3K_PHASE_4_APPROVAL_PATH = 'docs/process/approvals/CRITICAL-ROOTS-UNDER-3K-PHASE-4.json'
export const CRITICAL_ROOTS_UNDER_3K_PHASE_4_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-critical-roots-under-3k-phase-4-closeout.md'
export const CRITICAL_ROOTS_UNDER_3K_PHASE_4_SCRIPT_PATH = 'scripts/process-critical-roots-under-3k-phase-4-check.mjs'
export const CRITICAL_ROOTS_UNDER_3K_PHASE_4_SPRINT_ID = 'critical-roots-under-3k-phase-4-2026-05-18'
export const CRITICAL_ROOTS_UNDER_3K_PHASE_4_SERVER_BEFORE_LINES = 3883

export const CRITICAL_ROOTS_UNDER_3K_PHASE_4_ROOT_PATHS = [
  'server.js',
  'scripts/foundation-verify.mjs',
  'public/foundation.js',
  'lib/foundation-db.js',
]

export const CRITICAL_ROOTS_UNDER_3K_PHASE_4_MODULE_PATHS = [
  'lib/fub-lead-source-governance.js',
  'lib/owners-governance-routes.js',
  'lib/sales-hub-routes.js',
]

export const CRITICAL_ROOTS_UNDER_3K_PHASE_4_CHANGED_FILES = [
  'server.js',
  ...CRITICAL_ROOTS_UNDER_3K_PHASE_4_MODULE_PATHS,
  'lib/critical-roots-under-3k-phase-4.js',
  'scripts/process-critical-roots-under-3k-phase-4-check.mjs',
  'lib/foundation-build-closeout-size-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/foundation-verify.mjs',
  'docs/process/critical-roots-under-3k-phase-4-plan.md',
  'docs/process/approvals/CRITICAL-ROOTS-UNDER-3K-PHASE-4.json',
  'docs/handoffs/2026-05-18-critical-roots-under-3k-phase-4-closeout.md',
  'package.json',
]

export const CRITICAL_ROOTS_UNDER_3K_PHASE_4_PROOF_COMMANDS = [
  'node --check server.js lib/fub-lead-source-governance.js lib/owners-governance-routes.js lib/sales-hub-routes.js lib/critical-roots-under-3k-phase-4.js scripts/process-critical-roots-under-3k-phase-4-check.mjs scripts/foundation-verify.mjs',
  'npm run process:critical-roots-under-3k-phase-4-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run process:ship-check -- --card=CRITICAL-ROOTS-UNDER-3K-PHASE-4 --planApprovalRef=docs/process/approvals/CRITICAL-ROOTS-UNDER-3K-PHASE-4.json --closeoutKey=critical-roots-under-3k-phase-4-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=CRITICAL-ROOTS-UNDER-3K-PHASE-4 --closeoutKey=critical-roots-under-3k-phase-4-v1',
  'npm run foundation:verify -- --json-summary',
  'npm run process:foundation-ship -- --card=CRITICAL-ROOTS-UNDER-3K-PHASE-4 --planApprovalRef=docs/process/approvals/CRITICAL-ROOTS-UNDER-3K-PHASE-4.json --closeoutKey=critical-roots-under-3k-phase-4-v1 --commitRef=HEAD',
]

function countLines(source = '') {
  return String(source || '').split('\n').length
}

function readRepoText(repoRoot, relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

export function buildCriticalRootsUnder3kPhase4Snapshot({ repoRoot = process.cwd(), proofScriptSource = '' } = {}) {
  const serverSource = readRepoText(repoRoot, 'server.js')
  const ownersModuleSource = readRepoText(repoRoot, 'lib/owners-governance-routes.js')
  const salesModuleSource = readRepoText(repoRoot, 'lib/sales-hub-routes.js')
  const fubGovernanceSource = readRepoText(repoRoot, 'lib/fub-lead-source-governance.js')
  const proofSource = proofScriptSource || readRepoText(repoRoot, CRITICAL_ROOTS_UNDER_3K_PHASE_4_SCRIPT_PATH)
  const rootRows = CRITICAL_ROOTS_UNDER_3K_PHASE_4_ROOT_PATHS.map(filePath => ({
    filePath,
    lineCount: countLines(readRepoText(repoRoot, filePath)),
  }))
  const moduleRows = CRITICAL_ROOTS_UNDER_3K_PHASE_4_MODULE_PATHS.map(filePath => ({
    filePath,
    lineCount: countLines(readRepoText(repoRoot, filePath)),
  }))
  const ownersDogfood = buildOwnersGovernanceRoutesSplitDogfoodProof({
    serverSource,
    moduleSource: ownersModuleSource,
    proofScriptSource: proofSource,
  })
  const salesDogfood = buildSalesHubRoutesSplitDogfoodProof({
    serverSource,
    moduleSource: salesModuleSource,
    proofScriptSource: proofSource,
  })
  const serverMarkersRemoved = [
    "app.get('/api/owners/lead-source-governance'",
    "app.get('/api/owners/review-queue'",
    "app.post('/api/sales-hub/listing-assignment'",
    "app.post('/api/sales-hub/group-assignment'",
    "app.post('/api/sales-hub/project-case'",
    "app.post('/api/sales-hub/listing-case'",
    "app.post('/api/sales-hub/sync-cases'",
  ].every(marker => !serverSource.includes(marker))
  const registrarsPresent =
    serverSource.includes('registerOwnersGovernanceRoutes(app') &&
    serverSource.includes('registerSalesHubRoutes(app')
  const sharedGovernanceExtracted =
    fubGovernanceSource.includes('buildFubLeadSourcePayload') &&
    fubGovernanceSource.includes('buildSourceWatchFreshness') &&
    fubGovernanceSource.includes('syncFubLeadSourceDriftEvent') &&
    serverSource.includes("from './lib/fub-lead-source-governance.js'")
  const serverRoot = rootRows.find(row => row.filePath === 'server.js')

  return {
    ok:
      serverRoot?.lineCount < 3000 &&
      serverRoot?.lineCount < CRITICAL_ROOTS_UNDER_3K_PHASE_4_SERVER_BEFORE_LINES &&
      rootRows.find(row => row.filePath === 'scripts/foundation-verify.mjs')?.lineCount < 5000 &&
      rootRows.find(row => row.filePath === 'public/foundation.js')?.lineCount < 3000 &&
      rootRows.find(row => row.filePath === 'lib/foundation-db.js')?.lineCount < 3000 &&
      moduleRows.every(row => row.lineCount <= 1500) &&
      serverMarkersRemoved &&
      registrarsPresent &&
      sharedGovernanceExtracted &&
      ownersDogfood.ok &&
      salesDogfood.ok,
    rootRows,
    moduleRows,
    serverMarkersRemoved,
    registrarsPresent,
    sharedGovernanceExtracted,
    ownersDogfood,
    salesDogfood,
  }
}

export function buildCriticalRootsUnder3kPhase4DogfoodProof() {
  const healthyProof = 'does not call Owners success-path live reads; does not call Sales Hub success-path writes'
  const healthyServer = [
    'registerOwnersGovernanceRoutes(app',
    'registerSalesHubRoutes(app',
  ].join('\n')
  const ownersModule = "registerOwnersGovernanceRoutes app.get('/api/owners/lead-source-governance' app.get('/api/owners/review-queue'"
  const salesModule = [
    'registerSalesHubRoutes',
    "app.post('/api/sales-hub/listing-assignment'",
    "app.post('/api/sales-hub/group-assignment'",
    "app.post('/api/sales-hub/project-case'",
    "app.post('/api/sales-hub/listing-case'",
    "app.post('/api/sales-hub/sync-cases'",
  ].join('\n')
  const ownersHealthy = buildOwnersGovernanceRoutesSplitDogfoodProof({
    serverSource: healthyServer,
    moduleSource: ownersModule,
    proofScriptSource: healthyProof,
  })
  const salesHealthy = buildSalesHubRoutesSplitDogfoodProof({
    serverSource: healthyServer,
    moduleSource: salesModule,
    proofScriptSource: healthyProof,
  })
  return {
    ok: ownersHealthy.ok && salesHealthy.ok,
    ownersHealthy,
    salesHealthy,
    dogfoodInvariant: 'Phase 4 accepts owners and Sales Hub registrar/module ownership and rejects missing modules, old inline route ownership, missing registrars, live-read proof, and success-write proof.',
  }
}
