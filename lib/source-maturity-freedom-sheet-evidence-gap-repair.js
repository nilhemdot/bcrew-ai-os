import { createHash } from 'node:crypto'

export const SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_GAP_REPAIR_CARD_ID = 'SOURCE-MATURITY-FREEDOM-SHEET-EVIDENCE-GAP-REPAIR-001'
export const SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY = 'source-maturity-freedom-sheet-evidence-gap-repair-v1'
export const SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_GAP_REPAIR_PLAN_PATH = 'docs/process/source-maturity-freedom-sheet-evidence-gap-repair-001-plan.md'
export const SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_GAP_REPAIR_APPROVAL_PATH = 'docs/process/approvals/SOURCE-MATURITY-FREEDOM-SHEET-EVIDENCE-GAP-REPAIR-001.json'
export const SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_GAP_REPAIR_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-source-maturity-freedom-sheet-evidence-gap-repair-closeout.md'
export const SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_GAP_REPAIR_SCRIPT_PATH = 'scripts/process-source-maturity-freedom-sheet-evidence-gap-repair-check.mjs'
export const SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_GAP_REPAIR_SPRINT_ID = 'source-maturity-freedom-sheet-evidence-gap-repair-2026-05-18'

export const SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_TARGETS = [
  {
    sourceId: 'SRC-FREEDOM-TEAM-001',
    label: 'Freedom Team',
    unitName: 'Data Entry - BCrew Team/Community · Team records',
    scope: 'A:E',
    owns: 'Team/member records: agent name, team origin/recruited by, status, start date, end date',
    factTitle: 'Freedom Team current-reality source boundary',
    claim: 'SRC-FREEDOM-TEAM-001 is the signed-off current-reality source for Freedom team/member records in Data Entry - BCrew Team/Community A:E.',
  },
  {
    sourceId: 'SRC-FREEDOM-COMMUNITY-REV-001',
    label: 'Freedom Community Revenue',
    unitName: 'Data Entry - BCrew Team/Community · Community revenue',
    scope: 'P:U',
    owns: 'Community revenue by leader plus Bcrew In Before HST',
    factTitle: 'Freedom Community Revenue current-reality source boundary',
    claim: 'SRC-FREEDOM-COMMUNITY-REV-001 is the signed-off current-reality source for Freedom community revenue fields in Data Entry - BCrew Team/Community P:U.',
  },
]

export const SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_GAP_REPAIR_NOT_NEXT_BOUNDARIES = [
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

export const SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_GAP_REPAIR_PROOF_COMMANDS = [
  'node --check lib/source-maturity-freedom-sheet-evidence-gap-repair.js scripts/process-source-maturity-freedom-sheet-evidence-gap-repair-check.mjs',
  'npm run process:source-maturity-freedom-sheet-evidence-gap-repair-check -- --apply --stage=building_now --json',
  'npm run process:source-maturity-freedom-sheet-evidence-gap-repair-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=SOURCE-MATURITY-FREEDOM-SHEET-EVIDENCE-GAP-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-FREEDOM-SHEET-EVIDENCE-GAP-REPAIR-001.json --closeoutKey=source-maturity-freedom-sheet-evidence-gap-repair-v1 --commitRef=HEAD',
]

export const SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_GAP_REPAIR_CHANGED_FILES = [
  'lib/source-maturity-freedom-sheet-evidence-gap-repair.js',
  'lib/foundation-build-closeout-source-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_GAP_REPAIR_SCRIPT_PATH,
  'package.json',
  SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_GAP_REPAIR_PLAN_PATH,
  SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_GAP_REPAIR_APPROVAL_PATH,
  SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_GAP_REPAIR_CLOSEOUT_PATH,
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
  return SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_TARGETS.find(target => target.sourceId === sourceId) || null
}

function validateTargetEvidence({ target, contract, sourceNote = '', sourceRegistry = '', currentState = '' }) {
  const failures = []
  const contractText = text(`${contract?.status || ''} ${contract?.validation || ''} ${contract?.validationScope || ''} ${contract?.scope || ''} ${contract?.unitName || ''}`)
  if (!contract) failures.push('missing_source_contract')
  if (contract && !contractText.includes('Current reality captured')) failures.push('contract_not_current_reality')
  if (contract && !contractText.includes('Signed Off For Current Reality')) failures.push('contract_not_signed_off_current_reality')
  if (contract && !contractText.includes(target.scope)) failures.push('contract_missing_target_scope')
  if (contract && !contractText.includes('Freedom master note')) failures.push('contract_missing_freedom_master_note_boundary')
  if (!includesAll(sourceNote, [
    'Tracked Sections',
    target.sourceId,
    target.scope,
    'Global source-contract state: these five Freedom units are `Signed Off For Current Reality`',
    'Data Entry - BCrew Team/Community',
  ])) failures.push('freedom_source_note_missing_required_evidence')
  if (!includesAll(sourceRegistry, [
    target.sourceId,
    target.scope,
    'Signed Off For Current Reality',
  ])) failures.push('source_registry_missing_current_reality_row')
  if (!includesAll(currentState, [
    target.sourceId,
    'source-maturity-freedom',
  ])) failures.push('current_state_missing_freedom_maturity_context')
  return failures
}

export function selectFreedomSheetEvidenceRepairCandidates({
  sourceContracts = [],
  sourceMaturityGrid = {},
  sourceNote = '',
  sourceRegistry = '',
  currentState = '',
  targetSourceIds = SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_TARGETS.map(target => target.sourceId),
} = {}) {
  const candidates = targetSourceIds.map(sourceId => {
    const target = targetBySourceId(sourceId)
    const contract = contractBySourceId(sourceContracts, sourceId)
    const row = rowBySourceId(sourceMaturityGrid.rows, sourceId)
    const failures = target
      ? validateTargetEvidence({ target, contract, sourceNote, sourceRegistry, currentState })
      : ['unknown_target_source_id']
    return {
      ok: failures.length === 0,
      failures,
      target,
      sourceId,
      contract,
      maturityRow: row,
      evidenceRefs: [
        'docs/source-notes/freedom-sheet.md',
        'docs/source-registry.md',
        'docs/rebuild/current-state.md',
        'lib/source-contracts.js',
      ],
    }
  })
  return {
    ok: candidates.every(candidate => candidate.ok),
    candidates,
    failures: candidates.flatMap(candidate => candidate.failures.map(failure => `${candidate.sourceId}:${failure}`)),
  }
}

export function buildFreedomSheetEvidenceFacts(selection = {}, now = new Date().toISOString()) {
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
    const naturalKey = `source-maturity-freedom-sheet-evidence-gap-repair:${sourceId}:current-reality-source-fact`
    const factId = stableId('fact', naturalKey)
    return {
      factId,
      naturalKey,
      factType: 'source_contract',
      sourceId,
      sourceIds: [sourceId],
      title: target.factTitle,
      claim: target.claim,
      value: 'Signed Off For Current Reality',
      detail: text([
        contract.validationScope,
        `${target.unitName} (${target.scope}) owns ${target.owns}.`,
        'Evidence is repo/source-contract documentation only; this repair does not read Sheets or run extraction.',
      ].filter(Boolean).join(' ')),
      sourceRef: 'docs/source-notes/freedom-sheet.md',
      sourceUrl: '/doc?path=docs/source-notes/freedom-sheet.md',
      asOf: contract.lastVerified || '2026-04-18',
      sensitivity: 'neutral',
      minTier: 1,
      status: 'active',
      metadata: {
        cardId: SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_GAP_REPAIR_CARD_ID,
        closeoutKey: SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY,
        sourceMaturityFreedomSheetEvidenceGapRepair: true,
        sourceMaturityTargetSourceId: sourceId,
        sourceMaturityTargetScope: target.scope,
        evidenceRefs: candidate.evidenceRefs,
        noLiveExtraction: true,
        noSheetsReadWrite: true,
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
      runId: 'source-maturity-freedom-sheet-evidence-gap-repair',
      runType: 'source_fact_proof',
      status: 'succeeded',
      requestedBy: 'codex-source-maturity-freedom-sheet-evidence-gap-repair',
      sourceIds: facts.map(fact => fact.sourceId),
      maxTier: 1,
      metadata: {
        cardId: SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_GAP_REPAIR_CARD_ID,
        closeoutKey: SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY,
        proofOnly: true,
        noLiveExtraction: true,
        noSheetsReadWrite: true,
        noExternalWrite: true,
        noDriveMutation: true,
      },
      facts,
    },
  }
}

export function evaluateFreedomSheetEvidenceGapRepair({
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

  add(selection.ok, 'Freedom Sheet evidence candidates are source-backed', list(selection.failures).join(', ') || 'ok')
  add(factBuild.ok, 'Freedom Sheet source facts build is valid', list(factBuild.failures).join(', ') || `${list(factBuild.facts).length} facts`)
  add(savedFactRows.length === SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_TARGETS.length, 'all Freedom Sheet source facts are saved', `${savedFactRows.length}/${SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_TARGETS.length}`)

  for (const target of SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_TARGETS) {
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
      sourceIds: SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_TARGETS.map(target => target.sourceId),
      before: SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_TARGETS.map(target => {
        const row = rowBySourceId(beforeRows, target.sourceId) || {}
        return {
          sourceId: target.sourceId,
          nextGap: row.nextGap || null,
          factSignals: Number(row.metrics?.synthesisFactSignals || 0),
        }
      }),
      after: SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_TARGETS.map(target => {
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
      noSheetsReadWrite: true,
    },
  }
}

export function buildSyntheticFreedomSheetEvidenceGapRepairProof() {
  const baseContracts = SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_TARGETS.map(target => ({
    sourceId: target.sourceId,
    title: 'Benson Crew - Freedom Sheet',
    unitName: target.unitName,
    group: 'verified',
    status: 'Current reality captured',
    validation: 'Signed Off For Current Reality',
    validationScope: `Current spreadsheet reality is signed off for meaning: ${target.owns}, dependencies, and caveats are captured in the Freedom master note.`,
    owner: 'System',
    scope: target.scope,
    accessMethod: 'Google Drive / Google Sheets',
    lastVerified: '2026-04-18',
    refreshSchedule: 'On demand / weekly operator review.',
  }))
  const rowsBefore = SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_TARGETS.map(target => ({
    sourceId: target.sourceId,
    nextGap: 'extracted',
    metrics: { synthesisFactSignals: 0, atomSignals: 0, routeSignals: 0 },
  }))
  const rowsAfter = SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_TARGETS.map(target => ({
    sourceId: target.sourceId,
    nextGap: 'atomized',
    metrics: { synthesisFactSignals: 1, atomSignals: 0, routeSignals: 0 },
  }))
  const sourceNote = [
    'Tracked Sections',
    ...SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_TARGETS.flatMap(target => [target.sourceId, target.scope]),
    'Global source-contract state: these five Freedom units are `Signed Off For Current Reality`',
    'Data Entry - BCrew Team/Community',
  ].join('\n')
  const sourceRegistry = SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_TARGETS
    .map(target => `${target.sourceId} ${target.scope} Signed Off For Current Reality`)
    .join('\n')
  const currentState = SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_TARGETS
    .map(target => `${target.sourceId} source-maturity-freedom evidence context`)
    .join('\n')

  const selection = selectFreedomSheetEvidenceRepairCandidates({
    sourceContracts: baseContracts,
    sourceMaturityGrid: { rows: rowsBefore },
    sourceNote,
    sourceRegistry,
    currentState,
  })
  const factBuild = buildFreedomSheetEvidenceFacts(selection, '2026-05-18T09:30:00.000Z')
  const missingNote = selectFreedomSheetEvidenceRepairCandidates({
    sourceContracts: baseContracts,
    sourceMaturityGrid: { rows: rowsBefore },
    sourceNote: '',
    sourceRegistry,
    currentState,
  })
  const evaluation = evaluateFreedomSheetEvidenceGapRepair({
    beforeRows: rowsBefore,
    afterRows: rowsAfter,
    selection,
    factBuild,
    savedFacts: factBuild.facts,
  })

  return {
    ok: selection.ok &&
      factBuild.ok &&
      factBuild.facts.length === 2 &&
      evaluation.ok &&
      !missingNote.ok &&
      missingNote.failures.some(failure => failure.includes('freedom_source_note_missing_required_evidence')) &&
      factBuild.facts.every(fact => fact.metadata.noLiveExtraction === true && fact.metadata.noSheetsReadWrite === true),
    selection,
    factBuild,
    missingNote,
    evaluation,
  }
}

export function renderFreedomSheetEvidenceGapRepairCloseout(snapshot = {}) {
  const summary = snapshot.summary || {}
  const lines = []
  lines.push('# Source Maturity Freedom Sheet Evidence Gap Repair Closeout')
  lines.push('')
  lines.push(`Card: \`${SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_GAP_REPAIR_CARD_ID}\``)
  lines.push(`Closeout key: \`${SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY}\``)
  lines.push('')
  lines.push('## What Shipped')
  lines.push('')
  lines.push('- Attached governed source facts for `SRC-FREEDOM-TEAM-001` and `SRC-FREEDOM-COMMUNITY-REV-001` from existing Freedom source-contract/source-registry/current-state evidence.')
  lines.push(`- Saved facts: ${list(summary.factIds).map(factId => `\`${factId}\``).join(', ') || '`pending facts`'}.`)
  lines.push('- The repair uses repo/source-contract evidence only and does not run extraction or read/write Google Sheets.')
  lines.push('- This clears only the extracted-stage evidence gap; atom-flow/synthesis/routing remain separate proof lanes.')
  lines.push('')
  lines.push('## Proof')
  lines.push('')
  for (const after of list(summary.after)) {
    const before = list(summary.before).find(row => row.sourceId === after.sourceId) || {}
    lines.push(`- \`${after.sourceId}\`: \`${before.nextGap || 'unknown'}\` -> \`${after.nextGap || 'unknown'}\`; source fact signals ${before.factSignals ?? 0} -> ${after.factSignals ?? 0}.`)
  }
  lines.push('- Focused proof dogfoods missing Freedom source-note evidence failure, Plan Critic, Current Sprint metadata, source fact persistence, source maturity grid movement, no live extraction, no Sheets read/write, no external write, and closeout registry coverage.')
  lines.push('- Full `process:foundation-ship` is required before push.')
  lines.push('')
  lines.push('## Boundaries')
  lines.push('')
  for (const boundary of SOURCE_MATURITY_FREEDOM_SHEET_EVIDENCE_GAP_REPAIR_NOT_NEXT_BOUNDARIES) {
    lines.push(`- ${boundary}`)
  }
  lines.push('')
  lines.push('## Next')
  lines.push('')
  lines.push('Continue the safe source maturity child queue. The likely next safe Freedom Sheet work is atom-flow for sources that now have source facts; do not fabricate atoms or run live extraction.')
  return `${lines.join('\n')}\n`
}
