import { buildSourceMaturityGridSnapshot } from './source-maturity-grid.js'

export const SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CARD_ID = 'SOURCE-MATURITY-GITHUB-BUILD-INTEL-MONITORING-GAP-REPAIR-001'
export const SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CLOSEOUT_KEY = 'source-maturity-github-build-intel-monitoring-gap-repair-v1'
export const SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_PLAN_PATH = 'docs/process/source-maturity-github-build-intel-monitoring-gap-repair-001-plan.md'
export const SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_APPROVAL_PATH = 'docs/process/approvals/SOURCE-MATURITY-GITHUB-BUILD-INTEL-MONITORING-GAP-REPAIR-001.json'
export const SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-source-maturity-github-build-intel-monitoring-gap-repair-closeout.md'
export const SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_SCRIPT_PATH = 'scripts/process-source-maturity-github-build-intel-monitoring-gap-repair-check.mjs'
export const SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_SPRINT_ID = 'source-maturity-github-build-intel-monitoring-gap-repair-2026-05-18'
export const SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID = 'SRC-GITHUB-BUILD-INTEL-001'

export const GITHUB_BUILD_INTEL_MANUAL_UPDATE_METHOD = 'Manual public GitHub Build Intel review from existing source notes, shipped GStack Build Intel proof, and public-repo evidence already captured in repo truth until a separately approved monitoring card runs.'
export const GITHUB_BUILD_INTEL_REFRESH_SCHEDULE = 'On demand / weekly operator review. No background GitHub crawler, repo clone, scraping, or scheduled public-repo extraction is approved by this monitoring repair.'
export const GITHUB_BUILD_INTEL_MANUAL_REFRESH = 'Future public GitHub monitoring may use approved read-only public metadata checks, but this repair does not call GitHub, clone repositories, import code, create atoms, create routes, or mutate backlog automatically.'

export const SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_NOT_NEXT_BOUNDARIES = [
  'No live GitHub calls, repo cloning, scraping, installs, code import, or broad external crawling.',
  'No live extraction, transcript fetch, screenshot capture, provider/model call, or atom generation.',
  'No automatic backlog mutation from public repo content.',
  'No auth-required or paid run.',
  'No external write, ClickUp write, Gmail send, or Google Drive permission mutation.',
  'Do not mutate Drive permissions.',
  'No live Agent Feedback auto-send.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
  'No broad Foundation UI redesign.',
]

export const SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_PROOF_COMMANDS = [
  'node --check lib/source-maturity-github-build-intel-monitoring-gap-repair.js scripts/process-source-maturity-github-build-intel-monitoring-gap-repair-check.mjs',
  'npm run source-contract-registry:sync -- --apply --actor=codex-source-maturity-github-build-intel-monitoring-gap-repair --json',
  'npm run process:source-maturity-github-build-intel-monitoring-gap-repair-check -- --apply --stage=building_now --json',
  'npm run process:source-maturity-github-build-intel-monitoring-gap-repair-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=SOURCE-MATURITY-GITHUB-BUILD-INTEL-MONITORING-GAP-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-GITHUB-BUILD-INTEL-MONITORING-GAP-REPAIR-001.json --closeoutKey=source-maturity-github-build-intel-monitoring-gap-repair-v1 --commitRef=HEAD',
]

export const SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CHANGED_FILES = [
  'lib/source-maturity-github-build-intel-monitoring-gap-repair.js',
  'lib/source-contracts.js',
  'lib/foundation-build-closeout-source-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_SCRIPT_PATH,
  'package.json',
  SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_PLAN_PATH,
  SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_APPROVAL_PATH,
  SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CLOSEOUT_PATH,
  'docs/source-registry.md',
  'docs/source-notes/github-build-intel.md',
]

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function text(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function lower(value) {
  return text(value).toLowerCase()
}

function rowBySourceId(rows = [], sourceId = SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID) {
  return list(rows).find(row => (row.sourceId || row.source_id) === sourceId) || null
}

function activeExtractionTargetsForSource({ extractionControl = {}, sourceId = SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID } = {}) {
  return list(extractionControl.coverageByTarget || extractionControl.targets)
    .filter(target => (target.sourceId || target.source_id) === sourceId)
    .filter(target => {
      const status = lower(target.status)
      const runtime = lower(target.runtimeMode || target.effectiveRuntimeMode)
      const schedule = lower(target.schedulerMode || target.scheduleStatus || target.scheduleTruth)
      return status === 'active' || runtime === 'scheduled' || schedule === 'scheduled'
    })
}

function hasMonitoringBoundary(contract = {}) {
  const boundaryText = text(`${contract.updateMethod || ''} ${contract.refreshSchedule || ''} ${contract.manualRefresh || ''}`)
  return boundaryText.includes('Manual public GitHub Build Intel review') &&
    boundaryText.includes('No background GitHub crawler') &&
    boundaryText.includes('does not call GitHub') &&
    boundaryText.includes('mutate backlog automatically')
}

export function buildSourceMaturityGithubBuildIntelMonitoringGapRepairSnapshot({
  sources = [],
  sourceMaturityGrid = {},
  sourceContractValidation = {},
  extractionControl = {},
  sourceContractRegistry = {},
  sourceRegistryMarkdown = '',
  sourceNoteMarkdown = '',
} = {}) {
  const contract = rowBySourceId(sources)
  const maturityRow = rowBySourceId(sourceMaturityGrid.rows)
  const validationRow = rowBySourceId(sourceContractValidation.rows)
  const registryRow = rowBySourceId(sourceContractRegistry.registryRows || sourceContractRegistry.expectedRows)
  const activeTargets = activeExtractionTargetsForSource({ extractionControl })

  const checks = [
    {
      ok: Boolean(contract),
      check: 'target source contract exists',
      detail: contract?.sourceId || 'missing',
    },
    {
      ok: text(contract?.status).includes('Active Read-Only V1') &&
        text(contract?.validation).includes('Read-Only V1') &&
        text(contract?.validation).includes('Source Boundary Locked'),
      check: 'GitHub Build Intel keeps read-only locked source boundary',
      detail: `${contract?.status || 'missing'} / ${contract?.validation || 'missing'}`,
    },
    {
      ok: hasMonitoringBoundary(contract),
      check: 'GitHub Build Intel has explicit manual monitoring boundary',
      detail: contract?.refreshSchedule || contract?.updateMethod || 'missing',
    },
    {
      ok: validationRow?.authPosture === 'no_auth_internal' &&
        validationRow?.extractionPosture === 'proposal_only' &&
        validationRow?.connectorStatus === 'not_applicable' &&
        validationRow?.atomFlowExpectation === 'proposal_only',
      check: 'validation layer remains no-auth proposal-only',
      detail: `${validationRow?.authPosture || 'missing'} / ${validationRow?.extractionPosture || 'missing'} / ${validationRow?.connectorStatus || 'missing'}`,
    },
    {
      ok: text(registryRow?.validation).includes('Read-Only V1') &&
        text(registryRow?.validation).includes('Source Boundary Locked') &&
        text(registryRow?.status).includes('Active Read-Only V1'),
      check: 'DB source contract registry remains synced to locked boundary',
      detail: `${registryRow?.status || 'missing'} / ${registryRow?.validation || 'missing'}`,
    },
    {
      ok: String(sourceNoteMarkdown || '').includes('Monitoring Boundary: Manual public GitHub Build Intel review') &&
        String(sourceNoteMarkdown || '').includes('No background GitHub crawler') &&
        String(sourceNoteMarkdown || '').includes('No automatic backlog mutation'),
      check: 'source note records manual monitoring boundary',
      detail: 'docs/source-notes/github-build-intel.md',
    },
    {
      ok: String(sourceRegistryMarkdown || '').includes('SRC-GITHUB-BUILD-INTEL-001') &&
        lower(sourceRegistryMarkdown).includes('manual public github build intel review') &&
        lower(sourceRegistryMarkdown).includes('proposal-only'),
      check: 'source registry reflects manual proposal-only monitoring boundary',
      detail: 'docs/source-registry.md',
    },
    {
      ok: maturityRow?.stages?.connected?.ok === true &&
        maturityRow?.stages?.trusted?.ok === true &&
        maturityRow?.stages?.monitored?.ok === true,
      check: 'source maturity clears monitored gap',
      detail: `nextGap=${maturityRow?.nextGap || 'missing'}`,
    },
    {
      ok: maturityRow?.nextGap === 'extracted',
      check: 'repair exposes extracted as the next real gap instead of faking completion',
      detail: maturityRow?.nextGap || 'missing',
    },
    {
      ok: maturityRow?.stages?.extracted?.ok === false &&
        maturityRow?.stages?.atomized?.ok === false &&
        maturityRow?.stages?.routed?.ok === false,
      check: 'repair does not fake extraction, atom flow, synthesis, or routing',
      detail: `extracted=${maturityRow?.stages?.extracted?.status || 'missing'} atomized=${maturityRow?.stages?.atomized?.status || 'missing'} routed=${maturityRow?.stages?.routed?.status || 'missing'}`,
    },
    {
      ok: activeTargets.length === 0,
      check: 'no active GitHub Build Intel extraction target was introduced',
      detail: activeTargets.map(target => target.targetKey || target.sourceId || target.source_id).join(', ') || 'none',
    },
  ]

  const failures = checks.filter(check => !check.ok)
  return {
    status: failures.length ? 'risk' : 'healthy',
    cardId: SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CARD_ID,
    closeoutKey: SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CLOSEOUT_KEY,
    targetSourceId: SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID,
    contract,
    validation: validationRow,
    registry: registryRow,
    maturity: maturityRow,
    summary: {
      sourceId: SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID,
      monitoredOk: maturityRow?.stages?.monitored?.ok === true,
      nextGapAfterRepair: maturityRow?.nextGap || 'missing',
      validation: contract?.validation || 'missing',
      noLiveExtractionStarted: true,
      activeExtractionTargets: activeTargets.length,
    },
    checks,
    failures,
  }
}

export function buildSyntheticGithubBuildIntelMonitoringGapRepairProof() {
  const baseContract = {
    sourceId: SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID,
    title: 'Public GitHub Build Intelligence',
    group: 'pending',
    status: 'Active Read-Only V1',
    validation: 'Read-Only V1; Source Boundary Locked',
    owner: 'Steve',
    accessMethod: 'Read-only public repo inspection and public metadata only; no private scraping, paid auth, install, code import, or automatic backlog mutation',
  }
  const beforeGrid = buildSourceMaturityGridSnapshot({ sources: [baseContract] })
  const afterGrid = buildSourceMaturityGridSnapshot({
    sources: [{
      ...baseContract,
      updateMethod: GITHUB_BUILD_INTEL_MANUAL_UPDATE_METHOD,
      refreshSchedule: GITHUB_BUILD_INTEL_REFRESH_SCHEDULE,
      manualRefresh: GITHUB_BUILD_INTEL_MANUAL_REFRESH,
    }],
  })
  const before = rowBySourceId(beforeGrid.rows)
  const after = rowBySourceId(afterGrid.rows)
  return {
    ok: before?.stages?.trusted?.ok === true &&
      before?.stages?.monitored?.ok === false &&
      before?.nextGap === 'monitored' &&
      after?.stages?.monitored?.ok === true &&
      after?.nextGap === 'extracted' &&
      after?.stages?.extracted?.ok === false &&
      after?.stages?.atomized?.ok === false,
    before,
    after,
  }
}

export function renderGithubBuildIntelMonitoringGapRepairCloseout(snapshot = {}) {
  const summary = snapshot.summary || {}
  const lines = []
  lines.push('# Source Maturity GitHub Build Intel Monitoring Gap Repair Closeout')
  lines.push('')
  lines.push(`Card: \`${SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CARD_ID}\``)
  lines.push(`Closeout key: \`${SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CLOSEOUT_KEY}\``)
  lines.push('')
  lines.push('## What Shipped')
  lines.push('')
  lines.push('- Added an explicit manual/on-demand monitoring boundary to `SRC-GITHUB-BUILD-INTEL-001`.')
  lines.push('- Synced the source contract registry so live DB truth matches repo source-contract truth.')
  lines.push('- Cleared only the monitored-stage maturity gap; the next real gap remains extracted.')
  lines.push('')
  lines.push('## Proof')
  lines.push('')
  lines.push(`- Source: \`${summary.sourceId || SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID}\`.`)
  lines.push(`- Validation: \`${summary.validation || 'missing'}\`.`)
  lines.push(`- Next maturity gap after repair: \`${summary.nextGapAfterRepair || 'missing'}\`.`)
  lines.push('- Focused proof dogfoods the previous missing-monitoring failure, proves the manual boundary clears `monitored`, and proves extracted/atomized/routed remain red.')
  lines.push('- Full `process:foundation-ship` is required before push.')
  lines.push('')
  lines.push('## Boundaries')
  lines.push('')
  for (const boundary of SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_NOT_NEXT_BOUNDARIES) lines.push(`- ${boundary}`)
  lines.push('')
  lines.push('## Next')
  lines.push('')
  lines.push('Continue safe Foundation source work from live truth. Public GitHub extraction, atoms, and routes remain separate approved work and must not run automatically.')
  lines.push('')
  return `${lines.join('\n')}\n`
}
