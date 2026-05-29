import { createHash } from 'node:crypto'

export const SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CARD_ID = 'SOURCE-MATURITY-EVIDENCE-GAP-REPAIR-001'
export const SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY = 'source-maturity-evidence-gap-repair-v1'
export const SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_PLAN_PATH = 'docs/process/source-maturity-evidence-gap-repair-001-plan.md'
export const SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_APPROVAL_PATH = 'docs/process/approvals/SOURCE-MATURITY-EVIDENCE-GAP-REPAIR-001.json'
export const SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-29-hot-doc-refresh/2026-05-18-source-maturity-evidence-gap-repair-closeout.md'
export const SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_SCRIPT_PATH = 'scripts/process-source-maturity-evidence-gap-repair-check.mjs'
export const SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_SPRINT_ID = 'source-maturity-evidence-gap-repair-2026-05-18'
export const SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_TARGET_SOURCE_ID = 'SRC-OWNERS-LISTS-001'

export const SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_NOT_NEXT_BOUNDARIES = [
  'No live extraction, extraction target creation, transcript fetch, screenshot capture, crawl, or model/provider call.',
  'No auth-required or paid run.',
  'No external write.',
  'No Google Drive permission mutation.',
  'Do not mutate Drive permissions.',
  'No live Agent Feedback auto-send.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
  'No broad Foundation UI redesign.',
  'No atom fabrication and no attempt to mark atomized/synthesized/routed complete.',
]

export const SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_PROOF_COMMANDS = [
  'node --check lib/source-maturity-evidence-gap-repair.js scripts/process-source-maturity-evidence-gap-repair-check.mjs',
  'npm run process:source-maturity-evidence-gap-repair-check -- --apply --stage=building_now --json',
  'npm run process:source-maturity-evidence-gap-repair-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=SOURCE-MATURITY-EVIDENCE-GAP-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-EVIDENCE-GAP-REPAIR-001.json --closeoutKey=source-maturity-evidence-gap-repair-v1 --commitRef=HEAD',
]

export const SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CHANGED_FILES = [
  'lib/source-maturity-evidence-gap-repair.js',
  'lib/foundation-build-closeout-source-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/process-source-maturity-evidence-gap-repair-check.mjs',
  'package.json',
  SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_PLAN_PATH,
  SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_APPROVAL_PATH,
  SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CLOSEOUT_PATH,
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

function includesAll(source, fragments = []) {
  const haystack = String(source || '')
  return fragments.every(fragment => haystack.includes(fragment))
}

function findTargetContract(sourceContracts = [], sourceId = SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_TARGET_SOURCE_ID) {
  return list(sourceContracts).find(contract => contract.sourceId === sourceId) || null
}

export function selectSourceMaturityEvidenceRepairCandidate({
  sourceContracts = [],
  sourceNote = '',
  sourceRegistry = '',
  currentState = '',
  sourceId = SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_TARGET_SOURCE_ID,
} = {}) {
  const failures = []
  const contract = findTargetContract(sourceContracts, sourceId)
  if (!contract) failures.push('missing_source_contract')
  const validationText = text(`${contract?.status || ''} ${contract?.validation || ''} ${contract?.validationScope || ''}`)
  if (!/current reality|signed off/i.test(validationText)) failures.push('contract_not_current_reality_signed_off')
  if (!includesAll(sourceNote, [
    `Source ID: \`${sourceId}\``,
    'Workbook:',
    'Tab: `Lists`',
    'IMPORTRANGE',
    'Do not write into the Owners Dashboard',
  ])) failures.push('source_note_missing_required_evidence')
  if (!includesAll(sourceRegistry, [
    sourceId,
    'BHAG Builder / Old BIS KPI Lists Source',
    'Signed Off For Current Reality',
  ])) failures.push('source_registry_missing_current_reality_row')
  if (!includesAll(currentState, [
    sourceId,
    'Owners Dashboard `Lists` tab is verified as an `IMPORTRANGE` mirror',
  ])) failures.push('current_state_missing_mirror_boundary')

  return {
    ok: failures.length === 0,
    failures,
    sourceId,
    contract,
    evidenceRefs: [
      'docs/source-notes/bhag-builder-lists.md',
      'docs/source-registry.md',
      'docs/rebuild/current-state.md',
      'lib/source-contracts.js',
    ],
  }
}

export function buildSourceMaturityEvidenceFact(candidate = {}, now = new Date().toISOString()) {
  const sourceId = candidate.sourceId || SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_TARGET_SOURCE_ID
  if (!candidate.ok || !candidate.contract) {
    return {
      ok: false,
      failures: list(candidate.failures).length ? candidate.failures : ['missing_evidence_candidate'],
      sourceId,
    }
  }
  const naturalKey = `source-maturity-evidence-gap-repair:${sourceId}:current-reality-source-fact`
  const factId = stableId('fact', naturalKey)
  const fact = {
    factId,
    naturalKey,
    factType: 'source_contract',
    sourceId,
    sourceIds: [sourceId],
    title: `${sourceId} current-reality list source boundary`,
    claim: `${sourceId} is the signed-off current-reality source for governed Owners/FUB list and dropdown truth, while the Owners Dashboard Lists tab is an IMPORTRANGE mirror and not the governed write target.`,
    value: 'Signed Off For Current Reality',
    detail: text([
      candidate.contract.validationScope,
      candidate.contract.boundaryNote,
      'Evidence is repo/source-contract documentation only; this repair does not read Sheets or run extraction.',
    ].filter(Boolean).join(' ')),
    sourceRef: 'docs/source-notes/bhag-builder-lists.md',
    sourceUrl: '/doc?path=docs/source-notes/bhag-builder-lists.md',
    asOf: candidate.contract.lastVerified || '2026-04-24',
    sensitivity: 'neutral',
    minTier: 1,
    status: 'active',
    metadata: {
      cardId: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CARD_ID,
      closeoutKey: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY,
      sourceMaturityEvidenceGapRepair: true,
      sourceMaturityTargetSourceId: sourceId,
      evidenceRefs: candidate.evidenceRefs,
      noLiveExtraction: true,
      noExternalWrite: true,
      noDriveMutation: true,
      recordedAt: now,
    },
  }
  return {
    ok: true,
    sourceId,
    fact,
    bundle: {
      runId: `source-maturity-evidence-gap-repair-${sourceId.toLowerCase()}`,
      runType: 'source_fact_proof',
      status: 'succeeded',
      requestedBy: 'codex-source-maturity-evidence-gap-repair',
      sourceIds: [sourceId],
      maxTier: 1,
      metadata: {
        cardId: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CARD_ID,
        closeoutKey: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY,
        proofOnly: true,
        noLiveExtraction: true,
        noExternalWrite: true,
        noDriveMutation: true,
      },
      facts: [fact],
    },
  }
}

export function evaluateSourceMaturityEvidenceGapRepair({
  beforeRow = {},
  afterRow = {},
  candidate = {},
  factBuild = {},
  savedFacts = [],
} = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const beforeFacts = Number(beforeRow.metrics?.synthesisFactSignals || 0)
  const afterFacts = Number(afterRow.metrics?.synthesisFactSignals || 0)
  const alreadyRepaired = beforeRow.nextGap !== 'extracted' && beforeFacts >= 1
  const savedFact = list(savedFacts).find(fact => fact.factId === factBuild.fact?.factId || fact.fact_id === factBuild.fact?.factId)

  add(beforeRow.nextGap === 'extracted' || alreadyRepaired, 'target source starts at extracted gap or is already repaired', `${beforeRow.sourceId || 'missing'}:${beforeRow.nextGap || 'missing'}`)
  add(beforeFacts === 0 || alreadyRepaired, 'target source starts without source fact signal or is already repaired', String(beforeFacts))
  add(candidate.ok, 'source-backed evidence candidate exists', list(candidate.failures).join(', ') || candidate.sourceId)
  add(factBuild.ok, 'source fact build is valid', list(factBuild.failures).join(', ') || factBuild.fact?.factId)
  add(savedFact ? (savedFact.status || savedFact.status === undefined) !== 'archived' : false, 'source fact is saved active', savedFact?.factId || savedFact?.fact_id || 'missing')
  add(savedFact ? savedFact.metadata?.noLiveExtraction === true || savedFact.metadata?.no_live_extraction === true || factBuild.fact?.metadata?.noLiveExtraction === true : false, 'source fact records no live extraction', JSON.stringify(savedFact?.metadata || factBuild.fact?.metadata || {}))
  add(afterFacts >= 1, 'target source has source fact signal after repair', String(afterFacts))
  add(afterRow.nextGap !== 'extracted', 'target source no longer blocks on extracted gap', afterRow.nextGap || 'missing')

  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'risk' : 'healthy',
    checks,
    failures,
    summary: {
      sourceId: candidate.sourceId || beforeRow.sourceId || afterRow.sourceId || SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_TARGET_SOURCE_ID,
      beforeNextGap: beforeRow.nextGap || null,
      afterNextGap: afterRow.nextGap || null,
      beforeFactSignals: beforeFacts,
      afterFactSignals: afterFacts,
      factId: factBuild.fact?.factId || savedFact?.factId || savedFact?.fact_id || null,
      noLiveExtraction: factBuild.fact?.metadata?.noLiveExtraction === true,
    },
  }
}

export function buildSyntheticSourceMaturityEvidenceGapRepairProof() {
  const sourceContracts = [{
    sourceId: 'SRC-OWNERS-LISTS-001',
    status: 'Current reality captured',
    validation: 'Signed Off For Current Reality',
    validationScope: 'The upstream Lists tab is signed off for current-reality meaning.',
    boundaryNote: 'Never write governed helper lists directly into the Owners Dashboard mirror.',
    lastVerified: '2026-04-24',
  }]
  const sourceNote = 'Source ID: `SRC-OWNERS-LISTS-001`\nWorkbook:\nTab: `Lists`\nIMPORTRANGE\nDo not write into the Owners Dashboard'
  const sourceRegistry = 'SRC-OWNERS-LISTS-001 BHAG Builder / Old BIS KPI Lists Source Signed Off For Current Reality'
  const currentState = 'SRC-OWNERS-LISTS-001 Owners Dashboard `Lists` tab is verified as an `IMPORTRANGE` mirror'
  const candidate = selectSourceMaturityEvidenceRepairCandidate({ sourceContracts, sourceNote, sourceRegistry, currentState })
  const factBuild = buildSourceMaturityEvidenceFact(candidate, '2026-05-18T05:00:00.000Z')
  const missingNote = selectSourceMaturityEvidenceRepairCandidate({ sourceContracts, sourceNote: '', sourceRegistry, currentState })
  const evaluation = evaluateSourceMaturityEvidenceGapRepair({
    beforeRow: { sourceId: 'SRC-OWNERS-LISTS-001', nextGap: 'extracted', metrics: { synthesisFactSignals: 0 } },
    afterRow: { sourceId: 'SRC-OWNERS-LISTS-001', nextGap: 'atomized', metrics: { synthesisFactSignals: 1 } },
    candidate,
    factBuild,
    savedFacts: [{ ...factBuild.fact, status: 'active' }],
  })
  return {
    ok: candidate.ok &&
      factBuild.ok &&
      evaluation.ok &&
      !missingNote.ok &&
      missingNote.failures.includes('source_note_missing_required_evidence') &&
      factBuild.fact.metadata.noLiveExtraction === true &&
      factBuild.fact.metadata.noExternalWrite === true,
    candidate,
    factBuild,
    missingNote,
    evaluation,
  }
}

export function renderSourceMaturityEvidenceGapRepairCloseout(snapshot = {}) {
  const summary = snapshot.summary || {}
  const lines = []
  lines.push('# Source Maturity Evidence Gap Repair Closeout')
  lines.push('')
  lines.push(`Card: \`${SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CARD_ID}\``)
  lines.push(`Closeout key: \`${SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY}\``)
  lines.push('')
  lines.push('## What Shipped')
  lines.push('')
  lines.push(`- Attached a governed source fact for \`${summary.sourceId || SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_TARGET_SOURCE_ID}\` from existing source-contract/source-registry docs.`)
  lines.push(`- Saved fact: \`${summary.factId || 'pending fact'}\`.`)
  lines.push('- The repair uses repo/source-contract evidence only and does not run extraction or read/write Google Sheets.')
  lines.push('- This clears only the extracted-stage evidence gap; atom-flow/synthesis/routing remain separate proof lanes.')
  lines.push('')
  lines.push('## Proof')
  lines.push('')
  lines.push(`- Before next gap on this proof run: \`${summary.beforeNextGap || 'unknown'}\`.`)
  lines.push(`- After next gap on this proof run: \`${summary.afterNextGap || 'unknown'}\`.`)
  lines.push(`- Source fact signals on this proof run: ${summary.beforeFactSignals ?? 0} -> ${summary.afterFactSignals ?? 0}.`)
  lines.push('- Focused proof dogfoods missing source-note evidence failure, Plan Critic, Current Sprint metadata, source fact persistence, source maturity grid movement, no live extraction, no external write, and closeout registry coverage.')
  lines.push('- Full `process:foundation-ship` is required before push.')
  lines.push('')
  lines.push('## Boundaries')
  lines.push('')
  for (const boundary of SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_NOT_NEXT_BOUNDARIES) {
    lines.push(`- ${boundary}`)
  }
  lines.push('')
  lines.push('## Next')
  lines.push('')
  lines.push('Continue the safe source maturity child queue. Prefer another routing repair where source-backed facts/atoms/chunks already exist, or atom-flow repair only where source-backed atom evidence is clear. Do not fabricate atoms or run extraction.')
  lines.push('')
  return `${lines.join('\n')}\n`
}
