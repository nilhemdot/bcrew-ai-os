import {
  evaluateAgenticCodebaseMap,
} from './agentic-codebase-map.js'

export const FOUNDATION_TUNEUP_REMAP_CARD_ID = 'FOUNDATION-TUNEUP-REMAP-PROOF-001'
export const FOUNDATION_TUNEUP_REMAP_CLOSEOUT_KEY = 'foundation-tuneup-remap-proof-v1'
export const FOUNDATION_TUNEUP_REMAP_PLAN_PATH = 'docs/process/foundation-tuneup-remap-proof-001-plan.md'
export const FOUNDATION_TUNEUP_REMAP_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-TUNEUP-REMAP-PROOF-001.json'
export const FOUNDATION_TUNEUP_REMAP_SCRIPT_PATH = 'scripts/process-foundation-tuneup-remap-proof-check.mjs'
export const FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID = 'FOUNDATION-HUB-FOLDER-ISOLATION-001'

export const FOUNDATION_TUNEUP_REMAP_CHANGED_FILES = [
  'lib/agentic-codebase-map.js',
  'lib/foundation-tuneup-remap-proof.js',
  FOUNDATION_TUNEUP_REMAP_SCRIPT_PATH,
  FOUNDATION_TUNEUP_REMAP_PLAN_PATH,
  FOUNDATION_TUNEUP_REMAP_APPROVAL_PATH,
  'lib/foundation-verify-coverage-card-ids.js',
  'lib/foundation-build-closeout-process-gate-operations-records.js',
  'package.json',
]

export const FOUNDATION_TUNEUP_REMAP_PROOF_COMMANDS = [
  'node --check lib/agentic-codebase-map.js',
  'node --check lib/foundation-tuneup-remap-proof.js',
  'node --check scripts/process-foundation-tuneup-remap-proof-check.mjs',
  'npm run process:agentic-codebase-map-check -- --json',
  'npm run process:foundation-tuneup-remap-proof-check -- --json',
  'npm run process:foundation-tuneup-remap-proof-check -- --apply --stage=building_now --json',
  'npm run process:foundation-tuneup-remap-proof-check -- --close-card --json',
  'npm run process:foundation-tuneup-roadmap-check -- --json',
  'npm run process:builder-memory-system-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${FOUNDATION_TUNEUP_REMAP_CARD_ID} --planApprovalRef=${FOUNDATION_TUNEUP_REMAP_APPROVAL_PATH} --closeoutKey=${FOUNDATION_TUNEUP_REMAP_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${FOUNDATION_TUNEUP_REMAP_CARD_ID} --closeoutKey=${FOUNDATION_TUNEUP_REMAP_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${FOUNDATION_TUNEUP_REMAP_CARD_ID} --planApprovalRef=${FOUNDATION_TUNEUP_REMAP_APPROVAL_PATH} --closeoutKey=${FOUNDATION_TUNEUP_REMAP_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const FOUNDATION_TUNEUP_REMAP_BASELINE = Object.freeze({
  foundationDbFacadeImporters: 551,
  publicDevCssLines: 4998,
  foundationVerifyLines: 4981,
  devTeamHubLines: 3210,
  publicDevJsLines: 3167,
  verifierProcessCheckFiles: 517,
  sourceMaturityLines: 31191,
})

export const FOUNDATION_TUNEUP_REQUIRED_DONE_CARDS = Object.freeze([
  'FOUNDATION-DB-IMPORT-OWNERSHIP-SPLIT-001',
  'FOUNDATION-VERIFY-GATE-TIERING-FINISH-001',
  'SOURCE-MATURITY-REPAIR-COLLAPSE-001',
  'FOUNDATION-CLOSEOUT-RECORDS-DATA-STORE-001',
  'FOUNDATION-OVERSIZED-FILE-SPLIT-WAVE-001',
  'FOUNDATION-DONE-SEMANTICS-REPAIR-001',
  'FOUNDATION-ORPHAN-SCRIPT-REVIEW-001',
  'FOUNDATION-DOC-CONSOLIDATION-TRUTH-ARCHIVE-001',
])

export const FOUNDATION_TUNEUP_REMAP_NOT_NEXT_BOUNDARIES = [
  'Do not start per-hub folder implementation without Steve checkpoint.',
  'Do not delete verifier, approval, plan, check, closeout, source/browser proof, route-policy, source-session readiness, or Dev Hub System Truth files.',
  'Do not delete scripts/codex-status.mjs.',
  'Do not move docs, generated graphs, or private memory into tracked repo truth.',
  'Do not install Understand-Anything or any third-party code graph plugin in this card.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'Do not mutate Drive permissions.',
  'Do not mutate source rows, extraction state, browser/session state, atoms/vectors, credentials, or external systems.',
]

const FOUNDATION_DB_DOMAIN_MODULES = new Set([
  'lib/foundation-db-session.js',
  'lib/foundation-backlog-sprint-db.js',
  'lib/foundation-source-crawl-db.js',
  'lib/foundation-intelligence-db.js',
  'lib/foundation-runtime-jobs-db.js',
  'lib/foundation-strategy-docs-db.js',
  'lib/foundation-shared-comms-db.js',
  'lib/foundation-people-sales-db.js',
])

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function sourceLines(source = '') {
  if (!source) return 0
  return String(source).split('\n').length
}

function isActualFoundationDbImportLine(trimmed = '') {
  return /^(?:import\b|export\b).*from\s+['"][^'"]*foundation-db\.js['"]/.test(trimmed) ||
    /^}\s+from\s+['"][^'"]*foundation-db\.js['"]/.test(trimmed) ||
    /^import\(['"][^'"]*foundation-db\.js['"]\)/.test(trimmed)
}

function hasFoundationDbFacadeImport(source = '') {
  return String(source || '')
    .split('\n')
    .map(line => line.trim())
    .some(isActualFoundationDbImportLine)
}

function buildLineCounts(trackedSources = {}) {
  const entries = Object.entries(trackedSources)
  const counts = Object.fromEntries(entries.map(([path, source]) => [path, sourceLines(source)]))
  const sizeRisks = entries
    .map(([path, source]) => ({
      path,
      lines: sourceLines(source),
      risk: sourceLines(source) >= 10000 ? 'danger_10k' : sourceLines(source) >= 5000 ? 'split_required_5k' : sourceLines(source) >= 3000 ? 'warn_3k' : 'normal',
    }))
    .filter(record => record.risk !== 'normal')
    .sort((left, right) => right.lines - left.lines)
  return { counts, sizeRisks }
}

function buildFoundationDbImportSnapshot(trackedSources = {}) {
  const importers = Object.entries(trackedSources)
    .filter(([path]) => /\.(mjs|js)$/.test(path))
    .filter(([, source]) => hasFoundationDbFacadeImport(source))
    .map(([path]) => path)
    .sort()
  const domainImporters = importers.filter(path => FOUNDATION_DB_DOMAIN_MODULES.has(path))
  const nonDomainImporters = importers.filter(path => !FOUNDATION_DB_DOMAIN_MODULES.has(path))
  return {
    importers,
    directImporterCount: importers.length,
    domainImporterCount: domainImporters.length,
    nonDomainImporterCount: nonDomainImporters.length,
    domainImporters,
    nonDomainImporters,
    reductionFromBaseline: FOUNDATION_TUNEUP_REMAP_BASELINE.foundationDbFacadeImporters - importers.length,
  }
}

function buildRoadmapStatus(liveCards = []) {
  const byId = new Map(list(liveCards).map(card => [card.id, card]))
  return {
    requiredDoneCards: FOUNDATION_TUNEUP_REQUIRED_DONE_CARDS.map(id => ({
      id,
      lane: byId.get(id)?.lane || 'missing',
      statusNote: byId.get(id)?.statusNote || '',
    })),
    hubCard: byId.get(FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID) || null,
    remapCard: byId.get(FOUNDATION_TUNEUP_REMAP_CARD_ID) || null,
  }
}

export function buildFoundationTuneupRemapDogfoodProof() {
  const healthy = buildFoundationTuneupRemapSnapshot({
    map: {
      version: 'agentic-codebase-map-v1',
      privacy: { archiveIncluded: false, includedPrivatePathCount: 0 },
      files: [
        ...Array.from({ length: 120 }, (_, index) => ({ path: `lib/example-${index}.js` })),
        { path: 'docs/source-notes/understand-anything-repo-eval-2026-05-28.md' },
      ],
      criticalSurfaces: [{ path: 'server.js', present: true }],
      scripts: {
        sourceScripts: ['source:browser-agent', 'source:local-browser-hands'],
        processChecks: ['process:source-browser-agent-harness-check'],
      },
      summary: { fileCount: 120, criticalSurfacePresentCount: 1, criticalSurfaceCount: 1, sizeRiskCount: 1 },
    },
    packageScripts: {
      'process:foundation-tuneup-remap-proof-check': 'node --env-file-if-exists=.env scripts/process-foundation-tuneup-remap-proof-check.mjs',
    },
    trackedSources: {
      'lib/foundation-db-session.js': "import { x } from './foundation-db-core.js'\n",
      'lib/foundation-backlog-sprint-db.js': "import { x } from './foundation-db-core.js'\n",
      'lib/foundation-source-crawl-db.js': "import { x } from './foundation-db-core.js'\n",
      'lib/foundation-intelligence-db.js': "import { x } from './foundation-db-core.js'\n",
      'lib/foundation-runtime-jobs-db.js': "import { x } from './foundation-db-core.js'\n",
      'lib/foundation-strategy-docs-db.js': "import { x } from './foundation-db-core.js'\n",
      'lib/foundation-shared-comms-db.js': "import { x } from './foundation-db-core.js'\n",
      'lib/foundation-people-sales-db.js': "import { x } from './foundation-db-core.js'\n",
      'server.js': 'console.log("server")\n',
      'public/dev.css': Array.from({ length: 3109 }, () => '.x{}').join('\n'),
      'public/dev-youtube-source.css': '.x{}\n',
      'public/dev-source-approval.css': '.x{}\n',
      'scripts/foundation-verify.mjs': Array.from({ length: 4994 }, () => 'x').join('\n'),
      'lib/dev-team-hub.js': Array.from({ length: 3211 }, () => 'x').join('\n'),
      'public/dev.js': Array.from({ length: 3168 }, () => 'x').join('\n'),
    },
    liveCards: [
      ...FOUNDATION_TUNEUP_REQUIRED_DONE_CARDS.map(id => ({ id, lane: 'done', statusNote: `${id} closeout` })),
      { id: FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID, lane: 'scoped' },
      { id: FOUNDATION_TUNEUP_REMAP_CARD_ID, lane: 'executing' },
    ],
    planSource: `${FOUNDATION_TUNEUP_REMAP_CARD_ID} no generated graph before/after`,
    closeoutSource: `${FOUNDATION_TUNEUP_REMAP_CLOSEOUT_KEY} ${FOUNDATION_TUNEUP_REMAP_CARD_ID}`,
    coverageSource: FOUNDATION_TUNEUP_REMAP_CARD_ID,
    roadmapSource: `${FOUNDATION_TUNEUP_REMAP_CARD_ID} Re-map codebase after tune-up for before/after proof`,
  })
  const baselineNotReduced = buildFoundationTuneupRemapSnapshot({
    map: healthy.map,
    packageScripts: healthy.packageScripts,
    trackedSources: Object.fromEntries(
      Array.from({ length: 551 }, (_, index) => [`lib/importer-${index}.js`, "import { x } from './foundation-db.js'\n"])
    ),
    liveCards: healthy.roadmap.requiredDoneCards.map(card => ({ id: card.id, lane: 'done', statusNote: 'done' })),
    planSource: healthy.planSource,
    closeoutSource: healthy.closeoutSource,
    coverageSource: healthy.coverageSource,
    roadmapSource: healthy.roadmapSource,
  })
  const hubStarted = buildFoundationTuneupRemapSnapshot({
    map: healthy.map,
    packageScripts: healthy.packageScripts,
    trackedSources: healthy.trackedSources,
    liveCards: [
      ...FOUNDATION_TUNEUP_REQUIRED_DONE_CARDS.map(id => ({ id, lane: 'done', statusNote: `${id} closeout` })),
      { id: FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID, lane: 'executing' },
      { id: FOUNDATION_TUNEUP_REMAP_CARD_ID, lane: 'executing' },
    ],
    planSource: healthy.planSource,
    closeoutSource: healthy.closeoutSource,
    coverageSource: healthy.coverageSource,
    roadmapSource: healthy.roadmapSource,
  })
  return {
    ok: healthy.ok === true && baselineNotReduced.ok === false && hubStarted.ok === false,
    healthy,
    baselineNotReduced,
    hubStarted,
  }
}

export function buildFoundationTuneupRemapSnapshot({
  map = {},
  packageScripts = {},
  trackedSources = {},
  liveCards = [],
  planSource = '',
  closeoutSource = '',
  coverageSource = '',
  roadmapSource = '',
} = {}) {
  const checks = []
  const mapEvaluation = evaluateAgenticCodebaseMap(map)
  const importSnapshot = buildFoundationDbImportSnapshot(trackedSources)
  const lineCounts = buildLineCounts(trackedSources)
  const roadmap = buildRoadmapStatus(liveCards)
  const requiredDoneMissing = roadmap.requiredDoneCards.filter(card => card.lane !== 'done')
  const publicDevCssLines = lineCounts.counts['public/dev.css'] || 0
  const docConsolidationDone = roadmap.requiredDoneCards
    .find(card => card.id === 'FOUNDATION-DOC-CONSOLIDATION-TRUTH-ARCHIVE-001')?.lane === 'done'

  addCheck(
    checks,
    mapEvaluation.ok === true &&
      map.privacy?.includedPrivatePathCount === 0 &&
      map.privacy?.archiveIncluded === false,
    'agentic codebase map is healthy and privacy-safe',
    mapEvaluation.failed?.map(check => check.check).join(', ') || `${map.summary?.fileCount || 0} files`,
  )
  addCheck(
    checks,
    importSnapshot.directImporterCount === 0 &&
      importSnapshot.nonDomainImporterCount === 0 &&
      importSnapshot.reductionFromBaseline >= 551,
    'foundation-db facade import pressure is reduced from audit baseline',
    `${importSnapshot.directImporterCount} direct importers vs ${FOUNDATION_TUNEUP_REMAP_BASELINE.foundationDbFacadeImporters} baseline`,
  )
  addCheck(
    checks,
    publicDevCssLines > 0 &&
      publicDevCssLines < FOUNDATION_TUNEUP_REMAP_BASELINE.publicDevCssLines &&
      Boolean(trackedSources['public/dev-youtube-source.css']) &&
      Boolean(trackedSources['public/dev-source-approval.css']),
    'Dev CSS root was split and no longer matches the audit bloat baseline',
    `${publicDevCssLines} lines vs ${FOUNDATION_TUNEUP_REMAP_BASELINE.publicDevCssLines} baseline`,
  )
  addCheck(
    checks,
    lineCounts.sizeRisks.length <= 8 &&
      lineCounts.sizeRisks.some(file => file.path === 'scripts/foundation-verify.mjs') &&
      lineCounts.sizeRisks.some(file => file.path === 'lib/dev-team-hub.js'),
    'remaining oversized files are bounded and visible for the next audit',
    lineCounts.sizeRisks.slice(0, 8).map(file => `${file.path}:${file.lines}`).join(', '),
  )
  addCheck(
    checks,
    requiredDoneMissing.length === 0 && docConsolidationDone,
    'safe tune-up cleanup cards before remap are closed in live backlog',
    requiredDoneMissing.map(card => `${card.id}:${card.lane}`).join(', ') || `${roadmap.requiredDoneCards.length} done cards`,
  )
  addCheck(
    checks,
    roadmap.hubCard?.lane === 'scoped',
    'per-hub restructure remains checkpoint-only and unstarted',
    `${FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID}:${roadmap.hubCard?.lane || 'missing'}`,
  )
  addCheck(
    checks,
    packageScripts['process:foundation-tuneup-remap-proof-check'] ===
      'node --env-file-if-exists=.env scripts/process-foundation-tuneup-remap-proof-check.mjs',
    'package exposes focused tune-up remap checker',
    packageScripts['process:foundation-tuneup-remap-proof-check'] || 'missing',
  )
  addCheck(
    checks,
    planSource.includes(FOUNDATION_TUNEUP_REMAP_CARD_ID) &&
      planSource.includes('before/after') &&
      planSource.includes('no generated graph'),
    'plan captures before/after remap scope and no-generated-graph boundary',
    FOUNDATION_TUNEUP_REMAP_PLAN_PATH,
  )
  addCheck(
    checks,
    closeoutSource.includes(FOUNDATION_TUNEUP_REMAP_CLOSEOUT_KEY) &&
      closeoutSource.includes(FOUNDATION_TUNEUP_REMAP_CARD_ID),
    'closeout registry includes tune-up remap closeout',
    FOUNDATION_TUNEUP_REMAP_CLOSEOUT_KEY,
  )
  addCheck(
    checks,
    coverageSource.includes(FOUNDATION_TUNEUP_REMAP_CARD_ID),
    'verifier coverage card IDs include tune-up remap card',
    FOUNDATION_TUNEUP_REMAP_CARD_ID,
  )
  addCheck(
    checks,
    roadmapSource.includes(FOUNDATION_TUNEUP_REMAP_CARD_ID) &&
      roadmapSource.includes('Re-map codebase after tune-up for before/after proof'),
    'tune-up roadmap keeps remap card in sequence',
    FOUNDATION_TUNEUP_REMAP_CARD_ID,
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
    summary: {
      fileCount: map.summary?.fileCount || 0,
      totalLines: map.summary?.totalLines || 0,
      sizeRiskCount: lineCounts.sizeRisks.length,
      foundationDbDirectImporters: importSnapshot.directImporterCount,
      foundationDbImportReduction: importSnapshot.reductionFromBaseline,
      publicDevCssLines,
      publicDevCssLineReduction: FOUNDATION_TUNEUP_REMAP_BASELINE.publicDevCssLines - publicDevCssLines,
      requiredDoneCount: roadmap.requiredDoneCards.filter(card => card.lane === 'done').length,
      staleRiskFiles: lineCounts.sizeRisks.slice(0, 8),
    },
    baseline: FOUNDATION_TUNEUP_REMAP_BASELINE,
    importSnapshot,
    roadmap,
    map,
    packageScripts,
    trackedSources,
    planSource,
    closeoutSource,
    coverageSource,
    roadmapSource,
  }
}
