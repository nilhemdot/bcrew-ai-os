import { createHash } from 'node:crypto'

export const SOURCE_MATURITY_VERIFIED_EVIDENCE_GAP_REPAIR_CARD_ID = 'SOURCE-MATURITY-VERIFIED-EVIDENCE-GAP-REPAIR-001'
export const SOURCE_MATURITY_VERIFIED_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY = 'source-maturity-verified-evidence-gap-repair-v1'
export const SOURCE_MATURITY_VERIFIED_EVIDENCE_GAP_REPAIR_PLAN_PATH = 'docs/process/source-maturity-verified-evidence-gap-repair-001-plan.md'
export const SOURCE_MATURITY_VERIFIED_EVIDENCE_GAP_REPAIR_APPROVAL_PATH = 'docs/process/approvals/SOURCE-MATURITY-VERIFIED-EVIDENCE-GAP-REPAIR-001.json'
export const SOURCE_MATURITY_VERIFIED_EVIDENCE_GAP_REPAIR_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-source-maturity-verified-evidence-gap-repair-closeout.md'
export const SOURCE_MATURITY_VERIFIED_EVIDENCE_GAP_REPAIR_SCRIPT_PATH = 'scripts/process-source-maturity-verified-evidence-gap-repair-check.mjs'
export const SOURCE_MATURITY_VERIFIED_EVIDENCE_GAP_REPAIR_SPRINT_ID = 'source-maturity-verified-evidence-gap-repair-2026-05-18'

export const SOURCE_MATURITY_VERIFIED_EVIDENCE_TARGETS = [
  {
    sourceId: 'SRC-CLICKUP-001',
    label: 'ClickUp',
    factTitle: 'ClickUp verified source boundary',
    sourceRef: 'docs/source-notes/clickup.md',
    sourceUrl: '/doc?path=docs/source-notes/clickup.md',
    value: 'V1 Source Boundary Locked',
    claim: 'SRC-CLICKUP-001 is the V1 locked source boundary for ClickUp deal workflow, agent roster, onboarding, contract-link monitoring, and ops follow-through tasks.',
  },
  {
    sourceId: 'SRC-GDOCS-001',
    label: 'Google Docs Source Type',
    factTitle: 'Google Docs verified source-type boundary',
    sourceRef: 'docs/source-notes/google-drive-corpus.md',
    sourceUrl: '/doc?path=docs/source-notes/google-drive-corpus.md',
    value: 'Verified Readable',
    claim: 'SRC-GDOCS-001 is the verified readable source identity for native Google Docs content typing, provenance, and governed Drive export boundaries.',
  },
  {
    sourceId: 'SRC-GSHEETS-001',
    label: 'Google Sheets Source Type',
    factTitle: 'Google Sheets verified source-type boundary',
    sourceRef: 'docs/source-registry.md',
    sourceUrl: '/doc?path=docs/source-registry.md',
    value: 'Verified Readable',
    claim: 'SRC-GSHEETS-001 is the verified readable source identity for generic Google Sheets source typing and spreadsheet artifact provenance.',
  },
  {
    sourceId: 'SRC-DATAFORSEO-001',
    label: 'DataForSEO',
    factTitle: 'DataForSEO verified readable source boundary',
    sourceRef: 'docs/source-registry.md',
    sourceUrl: '/doc?path=docs/source-registry.md',
    value: 'Verified Readable',
    claim: 'SRC-DATAFORSEO-001 is the verified readable source boundary for SEO rankings and keyword research, with provider calls requiring separate approval and spend controls.',
  },
  {
    sourceId: 'SRC-GHL-001',
    label: 'GoHighLevel',
    factTitle: 'GoHighLevel verified readable source boundary',
    sourceRef: 'docs/source-notes/freedom-marketing.md',
    sourceUrl: '/doc?path=docs/source-notes/freedom-marketing.md',
    value: 'Verified Readable',
    claim: 'SRC-GHL-001 is the verified readable source boundary for GoHighLevel contacts, pipelines, and automation metadata, with CRM mutation requiring separate approval.',
  },
  {
    sourceId: 'SRC-META-001',
    label: 'Meta API',
    factTitle: 'Meta API verified readable source boundary',
    sourceRef: 'docs/source-notes/freedom-marketing.md',
    sourceUrl: '/doc?path=docs/source-notes/freedom-marketing.md',
    value: 'Verified Readable',
    claim: 'SRC-META-001 is the verified readable source boundary for Meta/Instagram/Facebook metrics across approved Benson Crew and Steve marketing contexts, with paid/campaign action requiring separate approval.',
  },
]

export const SOURCE_MATURITY_VERIFIED_EVIDENCE_GAP_REPAIR_NOT_NEXT_BOUNDARIES = [
  'No live extraction, extraction target creation, transcript fetch, screenshot capture, crawl, or model/provider call.',
  'No auth-required or paid run.',
  'No live Google Sheets read/write.',
  'No external write.',
  'No Google Drive permission mutation.',
  'Do not mutate Drive permissions.',
  'No live Agent Feedback auto-send.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
  'No broad Foundation UI redesign.',
  'No atom fabrication and no attempt to mark atomized/synthesized/routed complete.',
]

export const SOURCE_MATURITY_VERIFIED_EVIDENCE_GAP_REPAIR_PROOF_COMMANDS = [
  'node --check lib/source-maturity-verified-evidence-gap-repair.js scripts/process-source-maturity-verified-evidence-gap-repair-check.mjs',
  'npm run process:source-maturity-verified-evidence-gap-repair-check -- --apply --stage=building_now --json',
  'npm run process:source-maturity-verified-evidence-gap-repair-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=SOURCE-MATURITY-VERIFIED-EVIDENCE-GAP-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-VERIFIED-EVIDENCE-GAP-REPAIR-001.json --closeoutKey=source-maturity-verified-evidence-gap-repair-v1 --commitRef=HEAD',
]

export const SOURCE_MATURITY_VERIFIED_EVIDENCE_GAP_REPAIR_CHANGED_FILES = [
  'lib/source-maturity-verified-evidence-gap-repair.js',
  'lib/foundation-build-closeout-source-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  SOURCE_MATURITY_VERIFIED_EVIDENCE_GAP_REPAIR_SCRIPT_PATH,
  'package.json',
  SOURCE_MATURITY_VERIFIED_EVIDENCE_GAP_REPAIR_PLAN_PATH,
  SOURCE_MATURITY_VERIFIED_EVIDENCE_GAP_REPAIR_APPROVAL_PATH,
  SOURCE_MATURITY_VERIFIED_EVIDENCE_GAP_REPAIR_CLOSEOUT_PATH,
  'docs/rebuild/current-state.md',
  'docs/rebuild/current-plan.md',
]

function text(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function stableHash(value) {
  return createHash('sha256').update(String(value || '')).digest('hex')
}

function stableId(prefix, value) {
  return `${prefix}:${stableHash(value).slice(0, 24)}`
}

function contractBySourceId(sourceContracts = [], sourceId) {
  return list(sourceContracts).find(contract => contract.sourceId === sourceId) || null
}

function rowBySourceId(rows = [], sourceId) {
  return list(rows).find(row => row.sourceId === sourceId || row.source_id === sourceId) || null
}

function includesAll(source, fragments = []) {
  const haystack = String(source || '')
  return fragments.every(fragment => haystack.includes(fragment))
}

function targetBySourceId(sourceId) {
  return SOURCE_MATURITY_VERIFIED_EVIDENCE_TARGETS.find(target => target.sourceId === sourceId) || null
}

function validateTargetEvidence({ target, contract, monitoringCloseout = '', sourceRegistry = '', currentState = '' }) {
  const failures = []
  const contractText = text(`${contract?.status || ''} ${contract?.validation || ''} ${contract?.validationScope || ''} ${contract?.scope || ''} ${contract?.owns || ''} ${contract?.updateMethod || ''} ${contract?.refreshSchedule || ''} ${contract?.manualRefresh || ''}`)
  if (!contract) failures.push('missing_source_contract')
  if (contract && contract.group !== 'verified') failures.push('contract_not_verified_group')
  if (contract && !['Verified Readable', 'V1 Source Boundary Locked'].includes(contract.status)) failures.push('contract_not_verified_readable_or_locked')
  if (contract && !contract.owner) failures.push('contract_missing_owner')
  if (contract && !contract.accessMethod) failures.push('contract_missing_access_method')
  if (contract && !contract.updateMethod) failures.push('contract_missing_manual_update_method')
  if (contract && !contract.refreshSchedule) failures.push('contract_missing_refresh_schedule')
  if (contract && !contract.manualRefresh) failures.push('contract_missing_manual_refresh_boundary')
  if (contract && !/No background|does not call|does not read|does not query/i.test(contractText)) failures.push('contract_missing_no_background_or_no_call_boundary')
  if (!includesAll(monitoringCloseout, [
    target.sourceId,
    'source-maturity-verified-monitoring-gap-repair-v1',
    'No live extraction',
  ])) failures.push('monitoring_closeout_missing_required_evidence')
  if (!includesAll(sourceRegistry, [
    target.sourceId,
    target.value,
    'Monitoring boundary:',
  ])) failures.push('source_registry_missing_verified_boundary')
  if (!includesAll(currentState, [
    target.sourceId,
    'SOURCE-MATURITY-VERIFIED-MONITORING-GAP-REPAIR-001',
  ])) failures.push('current_state_missing_verified_monitoring_context')
  return failures
}

export function selectVerifiedEvidenceRepairCandidates({
  sourceContracts = [],
  sourceMaturityGrid = {},
  monitoringCloseout = '',
  sourceRegistry = '',
  currentState = '',
  targetSourceIds = SOURCE_MATURITY_VERIFIED_EVIDENCE_TARGETS.map(target => target.sourceId),
} = {}) {
  const candidates = targetSourceIds.map(sourceId => {
    const target = targetBySourceId(sourceId)
    const contract = contractBySourceId(sourceContracts, sourceId)
    const row = rowBySourceId(sourceMaturityGrid.rows, sourceId)
    const failures = target
      ? validateTargetEvidence({ target, contract, monitoringCloseout, sourceRegistry, currentState })
      : ['unknown_target_source_id']
    return {
      ok: failures.length === 0,
      failures,
      target,
      sourceId,
      contract,
      maturityRow: row,
      evidenceRefs: [
        'docs/handoffs/2026-05-18-source-maturity-verified-monitoring-gap-repair-closeout.md',
        'docs/source-registry.md',
        'docs/rebuild/current-state.md',
        'lib/source-contracts.js',
        'lib/source-contracts-marketing.js',
      ],
    }
  })
  return {
    ok: candidates.every(candidate => candidate.ok),
    candidates,
    failures: candidates.flatMap(candidate => candidate.failures.map(failure => `${candidate.sourceId}:${failure}`)),
  }
}

export function buildVerifiedEvidenceFacts(selection = {}, now = new Date().toISOString()) {
  const invalid = list(selection.candidates).filter(candidate => !candidate.ok || !candidate.contract || !candidate.target)
  if (invalid.length) {
    return {
      ok: false,
      failures: invalid.flatMap(candidate => list(candidate.failures).map(failure => `${candidate.sourceId}:${failure}`)),
      facts: [],
    }
  }

  const facts = list(selection.candidates).map(candidate => {
    const { target, contract, sourceId } = candidate
    const naturalKey = `source-maturity-verified-evidence-gap-repair:${sourceId}:current-reality-source-fact`
    const factId = stableId('fact', naturalKey)
    return {
      factId,
      naturalKey,
      factType: 'source_contract',
      sourceId,
      sourceIds: [sourceId],
      title: target.factTitle,
      claim: target.claim,
      value: target.value,
      detail: text([
        contract.validationScope,
        contract.boundaryNote,
        `${target.label} owns ${contract.owns || contract.scope}.`,
        'Evidence is repo/source-contract documentation only; this repair does not call providers, run extraction, or write externally.',
      ].filter(Boolean).join(' ')),
      sourceRef: target.sourceRef,
      sourceUrl: target.sourceUrl,
      asOf: contract.lastVerified || '2026-05-18',
      sensitivity: 'neutral',
      minTier: 1,
      status: 'active',
      metadata: {
        cardId: SOURCE_MATURITY_VERIFIED_EVIDENCE_GAP_REPAIR_CARD_ID,
        closeoutKey: SOURCE_MATURITY_VERIFIED_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY,
        sourceMaturityVerifiedEvidenceGapRepair: true,
        sourceMaturityTargetSourceId: sourceId,
        sourceMaturityTargetStatus: target.value,
        evidenceRefs: candidate.evidenceRefs,
        noLiveExtraction: true,
        noProviderCall: true,
        noPaidRun: true,
        noExternalWrite: true,
        noDriveMutation: true,
        recordedAt: now,
      },
    }
  })

  return {
    ok: true,
    facts,
    bundle: {
      runId: 'source-maturity-verified-evidence-gap-repair',
      runType: 'source_fact_proof',
      status: 'succeeded',
      requestedBy: 'codex-source-maturity-verified-evidence-gap-repair',
      sourceIds: facts.map(fact => fact.sourceId),
      maxTier: 1,
      metadata: {
        cardId: SOURCE_MATURITY_VERIFIED_EVIDENCE_GAP_REPAIR_CARD_ID,
        closeoutKey: SOURCE_MATURITY_VERIFIED_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY,
        proofOnly: true,
        noLiveExtraction: true,
        noProviderCall: true,
        noPaidRun: true,
        noExternalWrite: true,
        noDriveMutation: true,
      },
      facts,
    },
  }
}

export function evaluateVerifiedEvidenceGapRepair({
  beforeRows = [],
  afterRows = [],
  selection = {},
  factBuild = {},
  savedFacts = [],
} = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const factIds = new Set(list(factBuild.facts).map(fact => fact.factId))
  const savedFactRows = list(savedFacts).filter(fact => factIds.has(fact.factId || fact.fact_id))

  add(selection.ok, 'verified source evidence candidates are source-backed', list(selection.failures).join(', ') || 'ok')
  add(factBuild.ok, 'verified source facts build is valid', list(factBuild.failures).join(', ') || `${list(factBuild.facts).length} facts`)
  add(savedFactRows.length === SOURCE_MATURITY_VERIFIED_EVIDENCE_TARGETS.length, 'all verified source facts are saved', `${savedFactRows.length}/${SOURCE_MATURITY_VERIFIED_EVIDENCE_TARGETS.length}`)

  for (const target of SOURCE_MATURITY_VERIFIED_EVIDENCE_TARGETS) {
    const beforeRow = rowBySourceId(beforeRows, target.sourceId) || {}
    const afterRow = rowBySourceId(afterRows, target.sourceId) || {}
    const beforeFacts = Number(beforeRow.metrics?.synthesisFactSignals || 0)
    const afterFacts = Number(afterRow.metrics?.synthesisFactSignals || 0)
    const alreadyRepaired = beforeRow.nextGap !== 'extracted' && beforeFacts >= 1
    const savedFact = savedFactRows.find(fact => (fact.sourceId || fact.source_id) === target.sourceId)

    add(beforeRow.nextGap === 'extracted' || alreadyRepaired, `${target.sourceId} starts at extracted gap or is already repaired`, `${beforeRow.nextGap || 'missing'} / facts=${beforeFacts}`)
    add(beforeFacts === 0 || alreadyRepaired, `${target.sourceId} starts without source fact signal or is already repaired`, String(beforeFacts))
    add(savedFact ? (savedFact.status || savedFact.status === undefined) !== 'archived' : false, `${target.sourceId} source fact is saved active`, savedFact?.factId || savedFact?.fact_id || 'missing')
    add(savedFact ? savedFact.metadata?.noLiveExtraction === true || savedFact.metadata?.no_live_extraction === true : false, `${target.sourceId} source fact records no live extraction`, JSON.stringify(savedFact?.metadata || {}))
    add(savedFact ? savedFact.metadata?.noProviderCall === true || savedFact.metadata?.no_provider_call === true : false, `${target.sourceId} source fact records no provider call`, JSON.stringify(savedFact?.metadata || {}))
    add(afterFacts >= 1, `${target.sourceId} has source fact signal after repair`, String(afterFacts))
    add(afterRow.nextGap !== 'extracted', `${target.sourceId} no longer blocks on extracted gap`, afterRow.nextGap || 'missing')
    add(Number(afterRow.metrics?.atomSignals || 0) === 0, `${target.sourceId} repair does not invent atoms`, String(afterRow.metrics?.atomSignals || 0))
    add(Number(afterRow.metrics?.routeSignals || 0) === 0, `${target.sourceId} repair does not invent routes`, String(afterRow.metrics?.routeSignals || 0))
  }

  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'risk' : 'healthy',
    checks,
    failures,
    summary: {
      sourceIds: SOURCE_MATURITY_VERIFIED_EVIDENCE_TARGETS.map(target => target.sourceId),
      before: SOURCE_MATURITY_VERIFIED_EVIDENCE_TARGETS.map(target => {
        const row = rowBySourceId(beforeRows, target.sourceId) || {}
        return {
          sourceId: target.sourceId,
          nextGap: row.nextGap || null,
          factSignals: Number(row.metrics?.synthesisFactSignals || 0),
        }
      }),
      after: SOURCE_MATURITY_VERIFIED_EVIDENCE_TARGETS.map(target => {
        const row = rowBySourceId(afterRows, target.sourceId) || {}
        return {
          sourceId: target.sourceId,
          nextGap: row.nextGap || null,
          factSignals: Number(row.metrics?.synthesisFactSignals || 0),
          atomSignals: Number(row.metrics?.atomSignals || 0),
          routeSignals: Number(row.metrics?.routeSignals || 0),
        }
      }),
      factIds: list(factBuild.facts).map(fact => fact.factId),
      savedFactCount: savedFactRows.length,
      noLiveExtraction: true,
      noProviderCall: true,
    },
  }
}

export function buildSyntheticVerifiedEvidenceGapRepairProof() {
  const baseContracts = SOURCE_MATURITY_VERIFIED_EVIDENCE_TARGETS.map(target => ({
    sourceId: target.sourceId,
    title: target.label,
    group: 'verified',
    status: target.value,
    validation: target.sourceId === 'SRC-CLICKUP-001' ? 'Verified For Ops V1' : 'Not Signed Off',
    validationScope: `${target.label} source boundary is captured for source typing and provenance only.`,
    owner: 'System',
    scope: `${target.label} scope`,
    owns: `${target.label} owned source boundary`,
    accessMethod: `${target.label} API`,
    lastVerified: '2026-05-18',
    updateMethod: `Manual ${target.label} source review from existing source-contract proof until separately approved connector work runs.`,
    refreshSchedule: `On demand / weekly operator review. No background ${target.label} automation is approved.`,
    manualRefresh: `Future freshness cards may run approved read-only checks, but this repair does not call ${target.label} or write external systems.`,
  }))
  const rowsBefore = SOURCE_MATURITY_VERIFIED_EVIDENCE_TARGETS.map(target => ({
    sourceId: target.sourceId,
    nextGap: 'extracted',
    metrics: { synthesisFactSignals: 0, atomSignals: 0, routeSignals: 0 },
  }))
  const rowsAfter = SOURCE_MATURITY_VERIFIED_EVIDENCE_TARGETS.map(target => ({
    sourceId: target.sourceId,
    nextGap: 'atomized',
    metrics: { synthesisFactSignals: 1, atomSignals: 0, routeSignals: 0 },
  }))
  const monitoringCloseout = [
    'source-maturity-verified-monitoring-gap-repair-v1',
    'No live extraction',
    ...SOURCE_MATURITY_VERIFIED_EVIDENCE_TARGETS.map(target => target.sourceId),
  ].join('\n')
  const sourceRegistry = SOURCE_MATURITY_VERIFIED_EVIDENCE_TARGETS
    .map(target => `${target.sourceId} ${target.value} Monitoring boundary:`)
    .join('\n')
  const currentState = SOURCE_MATURITY_VERIFIED_EVIDENCE_TARGETS
    .map(target => `${target.sourceId} SOURCE-MATURITY-VERIFIED-MONITORING-GAP-REPAIR-001 evidence context`)
    .join('\n')

  const selection = selectVerifiedEvidenceRepairCandidates({
    sourceContracts: baseContracts,
    sourceMaturityGrid: { rows: rowsBefore },
    monitoringCloseout,
    sourceRegistry,
    currentState,
  })
  const factBuild = buildVerifiedEvidenceFacts(selection, '2026-05-18T10:30:00.000Z')
  const missingCloseout = selectVerifiedEvidenceRepairCandidates({
    sourceContracts: baseContracts,
    sourceMaturityGrid: { rows: rowsBefore },
    monitoringCloseout: '',
    sourceRegistry,
    currentState,
  })
  const evaluation = evaluateVerifiedEvidenceGapRepair({
    beforeRows: rowsBefore,
    afterRows: rowsAfter,
    selection,
    factBuild,
    savedFacts: factBuild.facts,
  })

  return {
    ok: selection.ok &&
      factBuild.ok &&
      factBuild.facts.length === SOURCE_MATURITY_VERIFIED_EVIDENCE_TARGETS.length &&
      evaluation.ok &&
      !missingCloseout.ok &&
      missingCloseout.failures.some(failure => failure.includes('monitoring_closeout_missing_required_evidence')) &&
      factBuild.facts.every(fact => fact.metadata.noLiveExtraction === true && fact.metadata.noProviderCall === true),
    selection,
    factBuild,
    missingCloseout,
    evaluation,
  }
}

export function renderVerifiedEvidenceGapRepairCloseout(snapshot = {}) {
  const summary = snapshot.summary || {}
  const lines = []
  lines.push('# Source Maturity Verified Evidence Gap Repair Closeout')
  lines.push('')
  lines.push(`Card: \`${SOURCE_MATURITY_VERIFIED_EVIDENCE_GAP_REPAIR_CARD_ID}\``)
  lines.push(`Closeout key: \`${SOURCE_MATURITY_VERIFIED_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY}\``)
  lines.push('')
  lines.push('## What Shipped')
  lines.push('')
  lines.push('- Attached governed source facts for `SRC-CLICKUP-001`, `SRC-GDOCS-001`, `SRC-GSHEETS-001`, `SRC-DATAFORSEO-001`, `SRC-GHL-001`, and `SRC-META-001` from existing source-contract/source-registry/current-state evidence.')
  lines.push(`- Saved facts: ${list(summary.factIds).map(factId => `\`${factId}\``).join(', ') || '`pending facts`'}.`)
  lines.push('- The repair uses repo/source-contract evidence only and does not call providers, run extraction, read/write external sources, or mutate Drive permissions.')
  lines.push('- This clears only the extracted-stage evidence gap; atom-flow/synthesis/routing remain separate proof lanes.')
  lines.push('')
  lines.push('## Proof')
  lines.push('')
  for (const after of list(summary.after)) {
    const before = list(summary.before).find(row => row.sourceId === after.sourceId) || {}
    lines.push(`- \`${after.sourceId}\`: close-card proof re-read \`${after.nextGap || 'unknown'}\` with source fact signals ${after.factSignals ?? 0}, atom signals ${after.atomSignals ?? 0}, and route signals ${after.routeSignals ?? 0}.`)
  }
  lines.push('- The initial `building_now` focused proof captured the live movement from `extracted` with 0 source fact signals to `atomized` with governed source fact evidence for all six targets.')
  lines.push('- Focused proof dogfoods missing monitoring-closeout evidence failure, Plan Critic, Current Sprint metadata, source fact persistence, source maturity grid movement, no live extraction, no provider calls, no external write, and closeout registry coverage.')
  lines.push('- Full `process:foundation-ship` is required before push.')
  lines.push('')
  lines.push('## Boundaries')
  lines.push('')
  for (const boundary of SOURCE_MATURITY_VERIFIED_EVIDENCE_GAP_REPAIR_NOT_NEXT_BOUNDARIES) {
    lines.push(`- ${boundary}`)
  }
  lines.push('')
  lines.push('## Next')
  lines.push('')
  lines.push('Continue the safe source maturity child queue. The likely next safe work is atom-flow only where source facts can be promoted without fabrication or live extraction.')
  return `${lines.join('\n')}\n`
}
