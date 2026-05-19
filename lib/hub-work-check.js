import fs from 'node:fs/promises'
import path from 'node:path'

export const HUB_WORK_COORDINATION_CARD_ID = 'HUB-001'
export const HUB_WORK_COORDINATION_CLOSEOUT_KEY = 'hub-work-coordination-v1'
export const HUB_WORK_COORDINATION_SPRINT_ID = 'hub-work-coordination-2026-05-14'
export const HUB_WORK_COORDINATION_PLAN_PATH = 'docs/process/hub-work-coordination-001-plan.md'
export const HUB_WORK_COORDINATION_APPROVAL_PATH = 'docs/process/approvals/HUB-001.json'
export const HUB_WORK_OWNERSHIP_MATRIX_PATH = 'docs/process/hub-file-ownership-matrix.json'
export const HUB_WORK_PROTOCOL_PATH = 'docs/process/hub-work-protocol.md'
export const HUB_WORK_PROMPT_TEMPLATE_PATH = 'docs/process/hub-chat-prompt-template.md'
export const HUB_WORK_HANDOFF_TEMPLATE_PATH = 'docs/process/hub-handoff-template.md'
export const HUB_WORK_SPRINT_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-14-hub-work-coordination-sprint-handoff.md'
export const HUB_WORK_CHECK_SCRIPT_PATH = 'scripts/process-hub-work-check.mjs'

function normalizeText(value) {
  return String(value || '').trim()
}

export function normalizeRepoPath(value) {
  return normalizeText(value).replace(/\\/g, '/').replace(/^\.\//, '')
}

function escapeRegex(value) {
  return String(value).replace(/[.+^${}()|[\]\\]/g, '\\$&')
}

export function patternMatchesPath(pattern, filePath) {
  const normalizedPattern = normalizeRepoPath(pattern)
  const normalizedPath = normalizeRepoPath(filePath)
  if (!normalizedPattern || !normalizedPath) return false
  if (!normalizedPattern.includes('*')) return normalizedPattern === normalizedPath
  const regexSource = normalizedPattern
    .split('*')
    .map(escapeRegex)
    .join('[^/]*')
  return new RegExp(`^${regexSource}$`).test(normalizedPath)
}

function matchesAny(patterns = [], filePath) {
  return patterns.some(pattern => patternMatchesPath(pattern, filePath))
}

export async function loadHubWorkOwnershipMatrix({ repoRoot = process.cwd(), matrixPath = HUB_WORK_OWNERSHIP_MATRIX_PATH } = {}) {
  const absolutePath = path.resolve(repoRoot, matrixPath)
  return JSON.parse(await fs.readFile(absolutePath, 'utf8'))
}

export function classifyHubWorkFile(filePath, hubKey, matrix) {
  const normalized = normalizeRepoPath(filePath)
  const hub = normalizeText(hubKey).toLowerCase()
  const hubConfig = matrix?.hubs?.[hub]
  if (!normalized) return { filePath: normalized, category: 'missing', owner: null, requiresCoordination: true }

  if (matchesAny(matrix?.foundationOwned || [], normalized)) {
    return { filePath: normalized, category: 'foundation-owned', owner: 'foundation', requiresCoordination: true }
  }

  if (matchesAny(hubConfig?.owned || [], normalized)) {
    return { filePath: normalized, category: 'hub-owned', owner: hub, requiresCoordination: false }
  }

  for (const [otherHub, otherConfig] of Object.entries(matrix?.hubs || {})) {
    if (otherHub !== hub && matchesAny(otherConfig?.owned || [], normalized)) {
      return { filePath: normalized, category: 'other-hub-owned', owner: otherHub, requiresCoordination: true }
    }
  }

  if (matchesAny(matrix?.sharedStopAndCoordinate || [], normalized)) {
    return { filePath: normalized, category: 'shared-stop-and-coordinate', owner: 'shared', requiresCoordination: true }
  }

  return { filePath: normalized, category: 'unknown', owner: null, requiresCoordination: true }
}

function hasHandoff(manifest) {
  if (normalizeText(manifest?.handoffRef)) return true
  if (normalizeText(manifest?.handoffText)) return true
  if (manifest?.handoff?.present === true) return true
  if (normalizeText(manifest?.handoff?.ref)) return true
  if (normalizeText(manifest?.handoff?.text)) return true
  return false
}

function commandMatchesRecommended(command, recommendedCommands = []) {
  const normalizedCommand = normalizeText(command)
  if (!normalizedCommand) return false
  return recommendedCommands.some(recommended => {
    const normalizedRecommended = normalizeText(recommended)
    return normalizedCommand === normalizedRecommended || normalizedCommand.startsWith(`${normalizedRecommended} `)
  })
}

function makeFailure(check, detail) {
  return { ok: false, check, detail }
}

function makePass(check, detail = '') {
  return { ok: true, check, detail }
}

function normalizeSharedFileRequests(manifest) {
  const explicit = Array.isArray(manifest?.requestedSharedFiles)
    ? manifest.requestedSharedFiles
    : []
  const structured = Array.isArray(manifest?.sharedFileRequests)
    ? manifest.sharedFileRequests.map(request => request?.filePath || request?.path || request?.file).filter(Boolean)
    : []
  return [...explicit, ...structured].map(normalizeRepoPath).filter(Boolean)
}

export function validateHubWorkManifest(manifest, {
  matrix,
  knownCardIds = [],
  requireKnownCard = true,
} = {}) {
  const checks = []
  const knownCards = new Set(knownCardIds.map(id => normalizeText(id)))
  const hub = normalizeText(manifest?.hub).toLowerCase()
  const cardId = normalizeText(manifest?.cardId)
  const hubConfig = matrix?.hubs?.[hub]
  const changedFiles = Array.isArray(manifest?.changedFiles)
    ? manifest.changedFiles.map(normalizeRepoPath).filter(Boolean)
    : []
  const proofCommands = Array.isArray(manifest?.proofCommands)
    ? manifest.proofCommands.map(normalizeText).filter(Boolean)
    : []
  const requestedSharedFiles = normalizeSharedFileRequests(manifest)
  const coordination = manifest?.coordination || {}
  const coordinationApproved = coordination?.mainSessionApproved === true
  const coordinationReason = normalizeText(coordination?.reason)

  checks.push(hubConfig ? makePass('hub key is approved', hub) : makeFailure('hub key is approved', hub || 'missing hub'))
  checks.push(cardId ? makePass('card ID is present', cardId) : makeFailure('card ID is present', 'missing cardId'))
  if (requireKnownCard) {
    checks.push(knownCards.has(cardId)
      ? makePass('card exists in live backlog/context', cardId)
      : makeFailure('card exists in live backlog/context', cardId || 'missing cardId'))
  }
  checks.push(changedFiles.length > 0
    ? makePass('changed files are declared', changedFiles.join(', '))
    : makeFailure('changed files are declared', 'missing changedFiles'))
  checks.push(proofCommands.length > 0
    ? makePass('proof commands are declared', proofCommands.join(' | '))
    : makeFailure('proof commands are declared', 'missing proofCommands'))
  checks.push(hasHandoff(manifest)
    ? makePass('handoff is present', normalizeText(manifest.handoffRef || manifest?.handoff?.ref || 'handoff text/presence flag'))
    : makeFailure('handoff is present', 'missing handoffRef, handoffText, or handoff.present=true'))

  if (hubConfig && proofCommands.length) {
    const recommendedMatch = proofCommands.some(command => commandMatchesRecommended(command, hubConfig.proofCommands || []))
    checks.push(recommendedMatch
      ? makePass('proof command matches hub recommendation', proofCommands.find(command => commandMatchesRecommended(command, hubConfig.proofCommands || [])))
      : makeFailure('proof command matches hub recommendation', `expected one of: ${(hubConfig.proofCommands || []).join(' | ')}`))
  }

  const classifications = changedFiles.map(filePath => classifyHubWorkFile(filePath, hub, matrix))
  const sharedFileClassifications = requestedSharedFiles.map(filePath => classifyHubWorkFile(filePath, hub, matrix))
  if (requestedSharedFiles.length) {
    const sharedDetail = sharedFileClassifications
      .map(classification => `${classification.filePath} -> ${classification.category}`)
      .join(', ')
    if (coordinationApproved && coordinationReason) {
      checks.push(makePass('requested shared files are main-session approved', sharedDetail))
    } else {
      checks.push(makeFailure('requested shared files are main-session approved', `${sharedDetail}; stop and return to main session before shared edits`))
    }
  }

  for (const classification of classifications) {
    if (classification.category === 'hub-owned') {
      checks.push(makePass('changed file is hub-owned or coordinated', `${classification.filePath} -> ${classification.category}`))
      continue
    }
    if (coordinationApproved && coordinationReason) {
      checks.push(makePass('changed file is hub-owned or coordinated', `${classification.filePath} -> ${classification.category} with main-session coordination`))
      continue
    }
    checks.push(makeFailure('changed file is hub-owned or coordinated', `${classification.filePath} -> ${classification.category}; main-session coordination required`))
  }

  if (coordinationApproved) {
    checks.push(coordinationReason
      ? makePass('coordination approval includes reason', coordinationReason)
      : makeFailure('coordination approval includes reason', 'coordination.mainSessionApproved=true without reason'))
  }

  if (manifest?.pushed === true) {
    checks.push(makeFailure('hub chat has not pushed', 'hub handoffs must return to main session before push'))
  } else {
    checks.push(makePass('hub chat has not pushed', 'pushed flag is not true'))
  }

  if (manifest?.committed === true && !coordinationApproved) {
    checks.push(makeFailure('hub chat did not commit without approval', 'committed=true without main-session coordination'))
  } else {
    checks.push(makePass('hub chat did not commit without approval', manifest?.committed === true ? 'committed with coordination' : 'committed flag is not true'))
  }

  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    hub,
    cardId,
    classifications,
    requestedSharedFiles,
    sharedFileClassifications,
    integrationRequired: requestedSharedFiles.length > 0,
    integrationRequiredFiles: requestedSharedFiles,
    checks,
    failures,
  }
}

export function buildHubWorkDogfoodProof({ matrix, knownCardIds = [] } = {}) {
  const base = {
    schemaVersion: 1,
    hub: 'sales',
    cardId: 'HUB-001',
    changedFiles: ['public/sales.js', 'lib/sales-listing-inventory.js'],
    proofCommands: ['npm run process:sales-listings-hub-check -- --json'],
    handoffRef: 'docs/handoffs/sales-hub-handoff-example.md',
    doNotTouchFiles: ['lib/foundation-db.js', 'scripts/process-*.mjs', 'package.json'],
    committed: false,
    pushed: false,
  }

  const cases = [
    {
      name: 'sales hub-owned files pass',
      expectOk: true,
      manifest: base,
    },
    {
      name: 'ops hub-owned files pass',
      expectOk: true,
      manifest: {
        ...base,
        hub: 'ops',
        changedFiles: ['public/ops.js', 'lib/ops-hub.js'],
        proofCommands: ['npm run clickup:verify'],
      },
    },
    {
      name: 'foundation file without coordination fails',
      expectOk: false,
      manifest: {
        ...base,
        changedFiles: ['public/sales.js', 'lib/foundation-db.js'],
      },
    },
    {
      name: 'shared package file with coordination passes',
      expectOk: true,
      manifest: {
        ...base,
        changedFiles: ['public/sales.js', 'package.json'],
        coordination: {
          mainSessionApproved: true,
          reason: 'Main session owns package script addition for focused proof.',
        },
      },
    },
    {
      name: 'missing backlog card fails',
      expectOk: false,
      manifest: {
        ...base,
        cardId: 'MISSING-HUB-CARD-999',
      },
    },
    {
      name: 'missing proof command fails',
      expectOk: false,
      manifest: {
        ...base,
        proofCommands: [],
      },
    },
    {
      name: 'missing handoff fails',
      expectOk: false,
      manifest: {
        ...base,
        handoffRef: '',
        handoffText: '',
        handoff: {},
      },
    },
    {
      name: 'hub pushed before main session fails',
      expectOk: false,
      manifest: {
        ...base,
        pushed: true,
      },
    },
    {
      name: 'unknown file path fails',
      expectOk: false,
      manifest: {
        ...base,
        changedFiles: ['public/random-experiment.js'],
      },
    },
    {
      name: 'hub shared-file request stops for main-session integration',
      expectOk: false,
      expectIntegrationRequired: true,
      manifest: {
        ...base,
        hub: 'marketing',
        cardId: 'MARKETING-VIDEO-LAB-OWNER-ROUTE-INTEGRATION-001',
        changedFiles: ['docs/marketing/video-lab/server-route-review-request.md'],
        requestedSharedFiles: ['server.js', 'lib/security-access.js'],
        proofCommands: ['npm run foundation:verify'],
        handoffRef: 'docs/marketing/video-lab/server-route-review-request.md',
      },
    },
    {
      name: 'hub shared-file request passes with main-session coordination',
      expectOk: true,
      expectIntegrationRequired: true,
      manifest: {
        ...base,
        hub: 'marketing',
        cardId: 'MARKETING-VIDEO-LAB-OWNER-ROUTE-INTEGRATION-001',
        changedFiles: ['docs/marketing/video-lab/server-route-review-request.md'],
        requestedSharedFiles: ['server.js', 'lib/security-access.js'],
        proofCommands: ['npm run foundation:verify'],
        handoffRef: 'docs/marketing/video-lab/server-route-review-request.md',
        coordination: {
          mainSessionApproved: true,
          reason: 'Main session approved the minimal route integration after review.',
        },
      },
    },
  ]

  const results = cases.map(testCase => {
    const validation = validateHubWorkManifest(testCase.manifest, {
      matrix,
      knownCardIds,
      requireKnownCard: true,
    })
    return {
      name: testCase.name,
      expectOk: testCase.expectOk,
      actualOk: validation.ok,
      expectIntegrationRequired: testCase.expectIntegrationRequired ?? null,
      actualIntegrationRequired: validation.integrationRequired,
      ok: validation.ok === testCase.expectOk &&
        (testCase.expectIntegrationRequired == null || validation.integrationRequired === testCase.expectIntegrationRequired),
      failures: validation.failures,
      classifications: validation.classifications,
      integrationRequiredFiles: validation.integrationRequiredFiles,
    }
  })

  return {
    ok: results.every(result => result.ok),
    cases: results,
  }
}
