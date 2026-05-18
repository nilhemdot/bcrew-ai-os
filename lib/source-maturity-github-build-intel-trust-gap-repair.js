import { buildSourceMaturityGridSnapshot } from './source-maturity-grid.js'

export const SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_CARD_ID = 'SOURCE-MATURITY-GITHUB-BUILD-INTEL-TRUST-GAP-REPAIR-001'
export const SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_CLOSEOUT_KEY = 'source-maturity-github-build-intel-trust-gap-repair-v1'
export const SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_PLAN_PATH = 'docs/process/source-maturity-github-build-intel-trust-gap-repair-001-plan.md'
export const SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_APPROVAL_PATH = 'docs/process/approvals/SOURCE-MATURITY-GITHUB-BUILD-INTEL-TRUST-GAP-REPAIR-001.json'
export const SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-source-maturity-github-build-intel-trust-gap-repair-closeout.md'
export const SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_SCRIPT_PATH = 'scripts/process-source-maturity-github-build-intel-trust-gap-repair-check.mjs'
export const SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_SPRINT_ID = 'source-maturity-github-build-intel-trust-gap-repair-2026-05-18'
export const SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_TARGET_SOURCE_ID = 'SRC-GITHUB-BUILD-INTEL-001'

export const SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_NOT_NEXT_BOUNDARIES = [
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

export const SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_PROOF_COMMANDS = [
  'node --check lib/source-maturity-github-build-intel-trust-gap-repair.js scripts/process-source-maturity-github-build-intel-trust-gap-repair-check.mjs',
  'npm run source-contract-registry:sync -- --apply --actor=codex-source-maturity-github-build-intel-trust-gap-repair --json',
  'npm run process:source-maturity-github-build-intel-trust-gap-repair-check -- --apply --stage=building_now --json',
  'npm run process:source-maturity-github-build-intel-trust-gap-repair-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=SOURCE-MATURITY-GITHUB-BUILD-INTEL-TRUST-GAP-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-GITHUB-BUILD-INTEL-TRUST-GAP-REPAIR-001.json --closeoutKey=source-maturity-github-build-intel-trust-gap-repair-v1 --commitRef=HEAD',
]

export const SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_CHANGED_FILES = [
  'lib/source-maturity-github-build-intel-trust-gap-repair.js',
  'lib/source-contracts.js',
  'lib/foundation-build-closeout-source-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_SCRIPT_PATH,
  'package.json',
  SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_PLAN_PATH,
  SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_APPROVAL_PATH,
  SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_CLOSEOUT_PATH,
  'docs/source-registry.md',
  'docs/source-notes/github-build-intel.md',
]

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function text(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function includesAll(source = '', needles = []) {
  const normalizedSource = String(source || '').toLowerCase()
  return needles.every(needle => normalizedSource.includes(String(needle || '').toLowerCase()))
}

function rowBySourceId(rows = [], sourceId = SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_TARGET_SOURCE_ID) {
  return list(rows).find(row => (row.sourceId || row.source_id) === sourceId) || null
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

export function buildSourceMaturityGithubBuildIntelTrustGapRepairSnapshot({
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
  const registrySource = String(sourceRegistryMarkdown || '')
  const noteSource = String(sourceNoteMarkdown || '')
  const activeAuthTargets = activeAuthRequiredExtractionTargets({ sourceContractValidation, extractionControl })

  const checks = [
    {
      ok: Boolean(contract),
      check: 'target source contract exists',
      detail: contract?.sourceId || 'missing',
    },
    {
      ok: contract?.sourceId === SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_TARGET_SOURCE_ID &&
        text(contract?.status).includes('Active Read-Only V1') &&
        text(contract?.validation).includes('Source Boundary Locked'),
      check: 'GitHub Build Intel contract has locked read-only trust boundary',
      detail: `${contract?.status || 'missing'} / ${contract?.validation || 'missing'}`,
    },
    {
      ok: includesAll(text(contract?.accessMethod), ['Read-only public repo inspection', 'no private scraping', 'no automatic backlog mutation']),
      check: 'source contract keeps public read-only boundaries',
      detail: contract?.accessMethod || 'missing',
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
      ok: text(registryRow?.validation).includes('Source Boundary Locked') &&
        text(registryRow?.validation).includes('Read-Only V1') &&
        text(registryRow?.status).includes('Active Read-Only V1'),
      check: 'DB source contract registry is synced to locked boundary',
      detail: `${registryRow?.status || 'missing'} / ${registryRow?.validation || 'missing'}`,
    },
    {
      ok: noteSource.includes('Trust Boundary: Source Boundary Locked') &&
        noteSource.includes('No wholesale code import') &&
        noteSource.includes('No automatic backlog mutation'),
      check: 'source note records the locked trust boundary',
      detail: 'docs/source-notes/github-build-intel.md',
    },
    {
      ok: registrySource.includes('SRC-GITHUB-BUILD-INTEL-001') &&
        registrySource.includes('Source Boundary Locked') &&
        registrySource.includes('proposal-only'),
      check: 'source registry reflects locked proposal-only boundary',
      detail: 'docs/source-registry.md',
    },
    {
      ok: maturityRow?.stages?.connected?.ok === true && maturityRow?.stages?.trusted?.ok === true,
      check: 'source maturity clears trusted gap',
      detail: `nextGap=${maturityRow?.nextGap || 'missing'}`,
    },
    {
      ok: maturityRow?.nextGap === 'monitored',
      check: 'repair exposes monitored as the next real gap instead of faking completion',
      detail: maturityRow?.nextGap || 'missing',
    },
    {
      ok: maturityRow?.stages?.monitored?.ok === false &&
        maturityRow?.stages?.extracted?.ok === false &&
        maturityRow?.stages?.atomized?.ok === false &&
        maturityRow?.stages?.routed?.ok === false,
      check: 'repair does not fake monitoring, extraction, atom flow, or routing',
      detail: `monitored=${maturityRow?.stages?.monitored?.status || 'missing'} extracted=${maturityRow?.stages?.extracted?.status || 'missing'}`,
    },
    {
      ok: activeAuthTargets.length === 0,
      check: 'no active auth-required extraction target was introduced',
      detail: activeAuthTargets.map(target => `${target.sourceId || target.source_id}:${target.targetKey}`).join(', ') || 'none',
    },
  ]

  const failures = checks.filter(check => !check.ok)
  return {
    status: failures.length ? 'risk' : 'healthy',
    cardId: SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_CARD_ID,
    closeoutKey: SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_CLOSEOUT_KEY,
    targetSourceId: SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_TARGET_SOURCE_ID,
    contract,
    validation: validationRow,
    registry: registryRow,
    maturity: maturityRow,
    summary: {
      sourceId: SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_TARGET_SOURCE_ID,
      trustedOk: maturityRow?.stages?.trusted?.ok === true,
      nextGapAfterRepair: maturityRow?.nextGap || 'missing',
      validation: contract?.validation || 'missing',
      noLiveExtractionStarted: true,
      activeAuthRequiredExtractionTargets: activeAuthTargets.length,
    },
    checks,
    failures,
  }
}

export function buildSyntheticGithubBuildIntelTrustGapRepairProof() {
  const baseContract = {
    sourceId: SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_TARGET_SOURCE_ID,
    title: 'Public GitHub Build Intelligence',
    group: 'pending',
    status: 'Active Read-Only V1',
    owner: 'Steve',
    location: 'docs/source-notes/github-build-intel.md',
    scope: 'Public GitHub repositories and public metadata for proposal-only Build Intel.',
    owns: 'Proposal-only implementation-pattern evidence.',
    accessMethod: 'Read-only public repo inspection and public metadata only; no private scraping, paid auth, install, code import, or automatic backlog mutation',
  }
  const beforeGrid = buildSourceMaturityGridSnapshot({
    sources: [{ ...baseContract, validation: 'Read-Only V1' }],
  })
  const afterGrid = buildSourceMaturityGridSnapshot({
    sources: [{ ...baseContract, validation: 'Source Boundary Locked' }],
  })
  const before = rowBySourceId(beforeGrid.rows)
  const after = rowBySourceId(afterGrid.rows)
  return {
    ok: before?.stages?.trusted?.ok === false &&
      before?.nextGap === 'trusted' &&
      after?.stages?.trusted?.ok === true &&
      after?.nextGap === 'monitored' &&
      after?.stages?.monitored?.ok === false &&
      after?.stages?.extracted?.ok === false,
    before,
    after,
  }
}

export function renderGithubBuildIntelTrustGapRepairCloseout(snapshot = {}) {
  const summary = snapshot.summary || {}
  const lines = []
  lines.push('# Source Maturity GitHub Build Intel Trust Gap Repair Closeout')
  lines.push('')
  lines.push(`Card: \`${SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_CARD_ID}\``)
  lines.push(`Closeout key: \`${SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_CLOSEOUT_KEY}\``)
  lines.push('')
  lines.push('## What Shipped')
  lines.push('')
  lines.push('- Locked `SRC-GITHUB-BUILD-INTEL-001` as a read-only, proposal-only public source boundary.')
  lines.push('- Synced the source contract registry so live DB truth matches repo source-contract truth.')
  lines.push('- Cleared only the trusted-stage maturity gap; the next real gap remains monitored.')
  lines.push('')
  lines.push('## Proof')
  lines.push('')
  lines.push(`- Source: \`${summary.sourceId || SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_TARGET_SOURCE_ID}\`.`)
  lines.push(`- Validation: \`${summary.validation || 'missing'}\`.`)
  lines.push(`- Next maturity gap after repair: \`${summary.nextGapAfterRepair || 'missing'}\`.`)
  lines.push('- Focused proof dogfoods the previous `Read-Only V1` label failing trusted, the locked source boundary passing trusted, and monitored/extracted/atomized/routed staying red.')
  lines.push('- Full `process:foundation-ship` is required before push.')
  lines.push('')
  lines.push('## Boundaries')
  lines.push('')
  for (const boundary of SOURCE_MATURITY_GITHUB_BUILD_INTEL_TRUST_GAP_REPAIR_NOT_NEXT_BOUNDARIES) lines.push(`- ${boundary}`)
  lines.push('')
  lines.push('## Next')
  lines.push('')
  lines.push('Continue safe Foundation source work from live truth. Public GitHub monitoring/extraction remains proposal-only and must use a separate approved card before any live repo fetch or scheduled crawler.')
  lines.push('')
  return `${lines.join('\n')}\n`
}
