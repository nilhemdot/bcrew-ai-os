import { buildSourceCoverageCloseoutSnapshot } from './source-coverage-closeout.js'
import { buildSourceExtractionCoverageSnapshot } from './source-extraction-coverage.js'
import { buildSourceMaturityGridSnapshot } from './source-maturity-grid.js'

export const SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CARD_ID = 'SOURCE-MATURITY-CONTRACT-GAP-REPAIR-001'
export const SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CLOSEOUT_KEY = 'source-maturity-contract-gap-repair-v1'
export const SOURCE_MATURITY_CONTRACT_GAP_REPAIR_PLAN_PATH = 'docs/process/source-maturity-contract-gap-repair-001-plan.md'
export const SOURCE_MATURITY_CONTRACT_GAP_REPAIR_APPROVAL_PATH = 'docs/process/approvals/SOURCE-MATURITY-CONTRACT-GAP-REPAIR-001.json'
export const SOURCE_MATURITY_CONTRACT_GAP_REPAIR_SCRIPT_PATH = 'scripts/process-source-maturity-contract-gap-repair-check.mjs'
export const SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-source-maturity-contract-gap-repair-closeout.md'
export const SOURCE_MATURITY_CONTRACT_GAP_REPAIR_SPRINT_ID = 'source-maturity-contract-gap-repair-2026-05-18'
export const SOURCE_MATURITY_CONTRACT_GAP_REPAIR_TARGET_SOURCE_ID = 'SRC-VIDEO-001'

export const SOURCE_MATURITY_CONTRACT_GAP_REPAIR_NOT_NEXT_BOUNDARIES = [
  'No live extraction, extraction target creation, transcript fetch, screenshot capture, crawl, or model summarization.',
  'No auth-required provider call, OAuth repair, paid-source run, or connector live call.',
  'No external write, Google Drive permission mutation, request-access email, ClickUp write, or Gmail send.',
  'Do not mutate Drive permissions.',
  'No live Agent Feedback auto-send.',
  'No Harlan, Fal, voice, Canva, OpenHuman, Marketing Hub production, or broad UI redesign.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'Do not mark Loom, Drive video, Zoom, Skool, or rich-vision video extraction complete from the V1 video manifest repair.',
]

export const SOURCE_MATURITY_CONTRACT_GAP_REPAIR_PROOF_COMMANDS = [
  'node --check lib/source-maturity-contract-gap-repair.js scripts/process-source-maturity-contract-gap-repair-check.mjs',
  'npm run source-contract-registry:sync -- --apply --actor=codex-source-maturity-contract-gap-repair --json',
  'npm run process:source-maturity-contract-gap-repair-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  `npm run process:foundation-ship -- --card=${SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CARD_ID} --planApprovalRef=${SOURCE_MATURITY_CONTRACT_GAP_REPAIR_APPROVAL_PATH} --closeoutKey=${SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CHANGED_FILES = [
  'lib/source-maturity-contract-gap-repair.js',
  'lib/source-contracts.js',
  'lib/foundation-build-closeout-source-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/process-source-maturity-contract-gap-repair-check.mjs',
  'package.json',
  SOURCE_MATURITY_CONTRACT_GAP_REPAIR_PLAN_PATH,
  SOURCE_MATURITY_CONTRACT_GAP_REPAIR_APPROVAL_PATH,
  SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CLOSEOUT_PATH,
  'docs/source-registry.md',
  'docs/source-notes/video-link-inventory.md',
  'docs/rebuild/current-state.md',
  'docs/rebuild/current-plan.md',
]

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function text(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function includesAll(source = '', needles = []) {
  return needles.every(needle => String(source || '').includes(needle))
}

function rowBySourceId(rows = [], sourceId = SOURCE_MATURITY_CONTRACT_GAP_REPAIR_TARGET_SOURCE_ID) {
  return list(rows).find(row => (row.sourceId || row.source_id) === sourceId) || null
}

function targetContract(sources = []) {
  return rowBySourceId(sources)
}

function activeAuthRequiredExtractionTargets({ sourceContractValidation = {}, extractionControl = {} } = {}) {
  const authRequiredIds = new Set(
    list(sourceContractValidation.rows)
      .filter(row => ['oauth_required', 'owner_authorization_required', 'unknown_auth_blocked'].includes(text(row.authPosture)))
      .map(row => row.sourceId),
  )
  return list(extractionControl.coverageByTarget || extractionControl.targets)
    .filter(target => authRequiredIds.has(target.sourceId || target.source_id))
    .filter(target => {
      const status = text(target.status)
      const runtime = text(target.runtimeMode || target.effectiveRuntimeMode)
      const schedule = text(target.schedulerMode || target.scheduleStatus || target.scheduleTruth)
      return status === 'active' || runtime === 'scheduled' || schedule === 'scheduled'
    })
}

export function buildSourceMaturityContractGapRepairSnapshot({
  sources = [],
  sourceMaturityGrid = {},
  sourceExtractionCoverage = {},
  sourceCoverageCloseout = {},
  sourceContractValidation = {},
  extractionControl = {},
  sourceRegistryMarkdown = '',
  sourceNoteMarkdown = '',
} = {}) {
  const contract = targetContract(sources)
  const maturityRow = rowBySourceId(sourceMaturityGrid.rows)
  const extractionRow = rowBySourceId(sourceExtractionCoverage.rows)
  const closeoutRow = rowBySourceId(sourceCoverageCloseout.rows)
  const registrySource = String(sourceRegistryMarkdown || '')
  const noteSource = String(sourceNoteMarkdown || '')
  const validationScope = text(contract?.validationScope)
  const knownLimits = text(contract?.stillOpen || contract?.boundaryNote || validationScope)
  const activeAuthRequiredTargets = activeAuthRequiredExtractionTargets({ sourceContractValidation, extractionControl })

  const checks = [
    {
      ok: Boolean(contract),
      check: 'target source contract exists',
      detail: contract?.sourceId || 'missing',
    },
    {
      ok: contract?.group === 'verified' &&
        text(contract?.status).includes('V1 Source Boundary Locked') &&
        text(contract?.validation).includes('Signed Off For Current Reality'),
      check: 'video contract is V1-boundary locked for current reality',
      detail: `${contract?.group || 'missing'} / ${contract?.status || 'missing'} / ${contract?.validation || 'missing'}`,
    },
    {
      ok: includesAll(validationScope, ['manifest', 'YouTube subtitle transcript V1', 'source_crawl_items']),
      check: 'validation scope names the bounded V1 contract',
      detail: validationScope || 'missing validation scope',
    },
    {
      ok: includesAll(knownLimits, ['Loom', 'Drive video', 'Zoom', 'Skool', 'rich-vision']),
      check: 'broader video extractors remain explicit follow-up boundaries',
      detail: knownLimits || 'missing boundary text',
    },
    {
      ok: list(contract?.actions).some(action => String(action.href || '').includes('docs/source-notes/video-link-inventory.md')),
      check: 'source contract links to video source note',
      detail: list(contract?.actions).map(action => action.href).join(', ') || 'missing actions',
    },
    {
      ok: noteSource.includes('Status: V1 Source Boundary Locked') &&
        noteSource.includes('Contract Repair Proof') &&
        noteSource.includes('not a live extraction run'),
      check: 'video source note records the repair boundary',
      detail: 'docs/source-notes/video-link-inventory.md',
    },
    {
      ok: registrySource.includes('SRC-VIDEO-001') &&
        registrySource.includes('V1 Source Boundary Locked') &&
        registrySource.includes('manifest/subtitle'),
      check: 'source registry reflects V1 source boundary',
      detail: 'docs/source-registry.md',
    },
    {
      ok: maturityRow?.stages?.connected?.ok === true &&
        maturityRow?.stages?.trusted?.ok === true &&
        maturityRow?.stages?.monitored?.ok === true &&
        maturityRow?.stages?.extracted?.ok === true,
      check: 'source maturity clears contract-connected stages without faking completion',
      detail: `nextGap=${maturityRow?.nextGap || 'missing'}`,
    },
    {
      ok: maturityRow?.nextGap !== 'connected' && maturityRow?.nextGap !== 'trusted' && maturityRow?.nextGap !== 'monitored',
      check: 'contract gap is no longer the next maturity blocker',
      detail: maturityRow?.nextGap || 'missing',
    },
    {
      ok: extractionRow?.extractionState === 'last_success' &&
        list(extractionRow?.targetKeys).includes('video-link-inventory') &&
        list(extractionRow?.targetKeys).includes('video-content-extract-backfill'),
      check: 'repair uses existing video manifest/transcript evidence only',
      detail: `${extractionRow?.extractionState || 'missing'} / ${list(extractionRow?.targetKeys).join(', ')}`,
    },
    {
      ok: closeoutRow?.maturityNextGap !== 'connected' &&
        !text(closeoutRow?.reason).includes('still proposed, blocked, or not connected'),
      check: 'source coverage closeout no longer routes SRC-VIDEO-001 as a connected contract gap',
      detail: `${closeoutRow?.maturityNextGap || 'missing'} / ${closeoutRow?.reason || 'missing'}`,
    },
    {
      ok: activeAuthRequiredTargets.length === 0,
      check: 'no active auth-required extraction target was introduced',
      detail: activeAuthRequiredTargets.map(target => `${target.sourceId}:${target.targetKey}`).join(', ') || 'none',
    },
  ]

  const failures = checks.filter(check => !check.ok)
  return {
    status: failures.length ? 'risk' : 'healthy',
    cardId: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CARD_ID,
    closeoutKey: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CLOSEOUT_KEY,
    targetSourceId: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_TARGET_SOURCE_ID,
    contract,
    maturity: maturityRow,
    extraction: extractionRow,
    closeout: closeoutRow,
    summary: {
      connectedOk: maturityRow?.stages?.connected?.ok === true,
      trustedOk: maturityRow?.stages?.trusted?.ok === true,
      monitoredOk: maturityRow?.stages?.monitored?.ok === true,
      extractedOk: maturityRow?.stages?.extracted?.ok === true,
      nextGapAfterRepair: maturityRow?.nextGap || 'missing',
      extractionState: extractionRow?.extractionState || 'missing',
      targetKeys: list(extractionRow?.targetKeys),
      closeoutDecision: closeoutRow?.decision || 'missing',
      activeAuthRequiredExtractionTargets: activeAuthRequiredTargets.length,
      noLiveExtractionStarted: true,
    },
    checks,
    failures,
  }
}

function buildSyntheticSnapshot(contract) {
  const sources = [contract]
  const extractionControl = {
    coverageByTarget: [
      {
        sourceId: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_TARGET_SOURCE_ID,
        targetKey: 'video-link-inventory',
        status: 'active',
        runtimeMode: 'scheduled',
        lastSuccessAt: '2026-05-17T21:12:17.796Z',
        archivedCount: 192,
        extractedCount: 0,
      },
      {
        sourceId: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_TARGET_SOURCE_ID,
        targetKey: 'video-content-extract-backfill',
        status: 'active',
        runtimeMode: 'scheduled',
        lastSuccessAt: '2026-05-17T21:12:17.796Z',
        archivedCount: 0,
        extractedCount: 13,
      },
    ],
  }
  const sourceMaturityGrid = buildSourceMaturityGridSnapshot({ sources, extractionControl })
  const sourceExtractionCoverage = buildSourceExtractionCoverageSnapshot({
    sources,
    extractionControl,
    sourceMaturityGrid,
  })
  const sourceCoverageCloseout = buildSourceCoverageCloseoutSnapshot({
    sources,
    sourceMaturityGrid,
    sourceExtractionCoverage,
  })
  return { sources, extractionControl, sourceMaturityGrid, sourceExtractionCoverage, sourceCoverageCloseout }
}

export function buildSyntheticSourceMaturityContractGapRepairProof() {
  const baseContract = {
    sourceId: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_TARGET_SOURCE_ID,
    title: 'Video Link Inventory',
    owner: 'Steve',
    location: 'source_crawl_items video manifest',
    scope: 'Video URL manifest and YouTube subtitle transcript V1',
    owns: 'Video URL manifest and transcript queue boundary',
    accessMethod: 'Internal crawl ledger and DataForSEO YouTube subtitles V1',
    lastVerified: '2026-05-17',
  }
  const before = buildSyntheticSnapshot({
    ...baseContract,
    group: 'pending',
    status: 'Pending Revalidation',
    validation: 'Not Signed Off',
  })
  const after = buildSyntheticSnapshot({
    ...baseContract,
    group: 'verified',
    status: 'V1 Source Boundary Locked',
    validation: 'Signed Off For Current Reality',
    validationScope: 'Video manifest in source_crawl_items plus YouTube subtitle transcript V1 are signed off for current Foundation source maturity.',
    boundaryNote: 'Loom, Drive video, Zoom, Skool, and rich-vision extraction remain separate follow-up proof lanes.',
    actions: [{ label: 'Open Video Source Note', href: '/doc?path=docs/source-notes/video-link-inventory.md' }],
  })
  const beforeMaturity = rowBySourceId(before.sourceMaturityGrid.rows)
  const beforeCloseout = rowBySourceId(before.sourceCoverageCloseout.rows)
  const afterMaturity = rowBySourceId(after.sourceMaturityGrid.rows)
  const afterCloseout = rowBySourceId(after.sourceCoverageCloseout.rows)
  const checks = [
    {
      ok: beforeMaturity?.nextGap === 'connected' &&
        beforeCloseout?.maturityNextGap === 'connected',
      check: 'synthetic stale contract reproduces connected gap',
      detail: `${beforeMaturity?.nextGap || 'missing'} / ${beforeCloseout?.maturityNextGap || 'missing'}`,
    },
    {
      ok: afterMaturity?.stages?.connected?.ok === true &&
        afterMaturity?.stages?.trusted?.ok === true &&
        afterMaturity?.stages?.monitored?.ok === true &&
        afterMaturity?.stages?.extracted?.ok === true,
      check: 'synthetic repaired contract clears connected/trusted/monitored/extracted stages',
      detail: `nextGap=${afterMaturity?.nextGap || 'missing'}`,
    },
    {
      ok: afterMaturity?.nextGap === 'atomized' &&
        afterCloseout?.maturityNextGap === 'atomized' &&
        afterCloseout?.decision === 'advance_maturity_gap',
      check: 'synthetic repair does not fake full source maturity',
      detail: `${afterMaturity?.nextGap || 'missing'} / ${afterCloseout?.decision || 'missing'}`,
    },
  ]
  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    checks,
    failures,
    before: {
      maturityNextGap: beforeMaturity?.nextGap || null,
      closeoutNextGap: beforeCloseout?.maturityNextGap || null,
    },
    after: {
      maturityNextGap: afterMaturity?.nextGap || null,
      closeoutNextGap: afterCloseout?.maturityNextGap || null,
      closeoutDecision: afterCloseout?.decision || null,
    },
  }
}

export function renderSourceMaturityContractGapRepairCloseout(snapshot = {}) {
  const summary = snapshot.summary || {}
  return `# Source Maturity Contract Gap Repair Closeout

Card: \`${SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CARD_ID}\`  
Closeout key: \`${SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CLOSEOUT_KEY}\`  
Target source: \`${SOURCE_MATURITY_CONTRACT_GAP_REPAIR_TARGET_SOURCE_ID}\`

## What Shipped

- Repaired the \`${SOURCE_MATURITY_CONTRACT_GAP_REPAIR_TARGET_SOURCE_ID}\` source contract from pending revalidation to a V1 source-boundary-locked current-reality contract.
- The signed boundary is only the existing video URL manifest in \`source_crawl_items\` plus YouTube subtitle transcript V1 evidence.
- Loom, Drive video, Zoom, Skool, rich-vision, no-subtitle vision/transcription, and GOD-mode video understanding remain follow-up lanes.
- No live extraction, transcript fetch, screenshot capture, crawl, provider call, auth repair, paid run, external write, Drive permission mutation, or Agent Feedback auto-send was run.

## Proof

- Contract connected stage: ${summary.connectedOk ? 'passed' : 'failed'}
- Trust boundary: ${summary.trustedOk ? 'passed' : 'failed'}
- Monitoring boundary: ${summary.monitoredOk ? 'passed' : 'failed'}
- Existing extraction evidence: ${summary.extractedOk ? 'passed' : 'failed'}
- Next maturity gap after repair: \`${summary.nextGapAfterRepair || 'missing'}\`
- Extraction state used: \`${summary.extractionState || 'missing'}\`
- Target keys: ${list(summary.targetKeys).map(targetKey => `\`${targetKey}\``).join(', ') || 'none'}
- Active auth-required extraction targets introduced: ${summary.activeAuthRequiredExtractionTargets || 0}

## Next

Continue the safe Foundation source-maturity child queue. The likely next safe cards are \`SOURCE-MATURITY-EVIDENCE-GAP-REPAIR-001\` or \`SOURCE-MATURITY-ROUTING-GAP-REPAIR-001\`; atom-flow repair requires source-backed atom evidence and must not fabricate atoms.
`
}
