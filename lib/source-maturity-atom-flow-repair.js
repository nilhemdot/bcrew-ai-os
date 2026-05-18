import { createHash } from 'node:crypto'

export const SOURCE_MATURITY_ATOM_FLOW_REPAIR_CARD_ID = 'SOURCE-MATURITY-ATOM-FLOW-REPAIR-001'
export const SOURCE_MATURITY_ATOM_FLOW_REPAIR_CLOSEOUT_KEY = 'source-maturity-atom-flow-repair-v1'
export const SOURCE_MATURITY_ATOM_FLOW_REPAIR_PLAN_PATH = 'docs/process/source-maturity-atom-flow-repair-001-plan.md'
export const SOURCE_MATURITY_ATOM_FLOW_REPAIR_APPROVAL_PATH = 'docs/process/approvals/SOURCE-MATURITY-ATOM-FLOW-REPAIR-001.json'
export const SOURCE_MATURITY_ATOM_FLOW_REPAIR_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-source-maturity-atom-flow-repair-closeout.md'
export const SOURCE_MATURITY_ATOM_FLOW_REPAIR_SCRIPT_PATH = 'scripts/process-source-maturity-atom-flow-repair-check.mjs'
export const SOURCE_MATURITY_ATOM_FLOW_REPAIR_SPRINT_ID = 'source-maturity-atom-flow-repair-2026-05-18'
export const SOURCE_MATURITY_ATOM_FLOW_REPAIR_TARGET_SOURCE_ID = 'SRC-OWNERS-LISTS-001'

export const SOURCE_MATURITY_ATOM_FLOW_REPAIR_NOT_NEXT_BOUNDARIES = [
  'No live extraction, extraction target creation, transcript fetch, screenshot capture, crawl, or model/provider call.',
  'No auth-required or paid run.',
  'No external write.',
  'No Google Sheets read/write.',
  'No Google Drive permission mutation.',
  'Do not mutate Drive permissions.',
  'No live Agent Feedback auto-send.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
  'No broad Foundation UI redesign.',
  'No atom fabrication: every atom must cite an existing active source fact or source-backed evidence row.',
  'No attempt to mark synthesized or routed complete.',
]

export const SOURCE_MATURITY_ATOM_FLOW_REPAIR_PROOF_COMMANDS = [
  'node --check lib/source-maturity-atom-flow-repair.js scripts/process-source-maturity-atom-flow-repair-check.mjs',
  'npm run process:source-maturity-atom-flow-repair-check -- --apply --stage=building_now --json',
  'npm run process:source-maturity-atom-flow-repair-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=SOURCE-MATURITY-ATOM-FLOW-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-ATOM-FLOW-REPAIR-001.json --closeoutKey=source-maturity-atom-flow-repair-v1 --commitRef=HEAD',
]

export const SOURCE_MATURITY_ATOM_FLOW_REPAIR_CHANGED_FILES = [
  'lib/source-maturity-atom-flow-repair.js',
  'lib/foundation-build-closeout-source-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/process-source-maturity-atom-flow-repair-check.mjs',
  'package.json',
  SOURCE_MATURITY_ATOM_FLOW_REPAIR_PLAN_PATH,
  SOURCE_MATURITY_ATOM_FLOW_REPAIR_APPROVAL_PATH,
  SOURCE_MATURITY_ATOM_FLOW_REPAIR_CLOSEOUT_PATH,
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

function latestActiveFact(facts = []) {
  return list(facts)
    .filter(fact => (fact.status || 'active') === 'active')
    .sort((left, right) => String(right.updatedAt || right.updated_at || '').localeCompare(String(left.updatedAt || left.updated_at || '')))
    .shift() || null
}

export function selectSourceMaturityAtomFlowRepairCandidate({
  beforeRow = {},
  sourceFacts = [],
  sourceId = SOURCE_MATURITY_ATOM_FLOW_REPAIR_TARGET_SOURCE_ID,
} = {}) {
  const failures = []
  if (beforeRow.sourceId && beforeRow.sourceId !== sourceId) failures.push('wrong_source_row')
  if (beforeRow.nextGap && beforeRow.nextGap !== 'atomized') {
    const alreadyRepaired = Number(beforeRow.metrics?.atomSignals || 0) > 0 && beforeRow.nextGap !== 'atomized'
    if (!alreadyRepaired) failures.push('target_not_atomized_gap')
  }
  const fact = latestActiveFact(sourceFacts)
  if (!fact) failures.push('missing_active_source_fact')
  if (fact && !(fact.factId || fact.fact_id)) failures.push('source_fact_missing_id')
  if (fact && !(fact.claim || fact.detail || fact.value)) failures.push('source_fact_missing_claim')
  const sourceRefs = list(fact?.metadata?.evidenceRefs || fact?.metadata?.sourceRefs || fact?.sourceRefs)
  if (fact && !sourceRefs.length && !(fact.sourceRef || fact.source_ref)) failures.push('source_fact_missing_evidence_refs')
  if (fact && Number(fact.minTier ?? fact.min_tier ?? 1) > 1) failures.push('source_fact_tier_too_restricted')

  return {
    ok: failures.length === 0,
    failures,
    sourceId,
    fact,
    evidenceRefs: Array.from(new Set([
      fact?.sourceRef || fact?.source_ref,
      ...sourceRefs,
      'intelligence_synthesis_facts',
    ].filter(Boolean))),
  }
}

export function buildSourceMaturityAtomFromFact(candidate = {}, now = new Date().toISOString()) {
  const sourceId = candidate.sourceId || SOURCE_MATURITY_ATOM_FLOW_REPAIR_TARGET_SOURCE_ID
  if (!candidate.ok || !candidate.fact) {
    return {
      ok: false,
      failures: list(candidate.failures).length ? candidate.failures : ['missing_source_fact_candidate'],
      sourceId,
    }
  }

  const fact = candidate.fact
  const factId = fact.factId || fact.fact_id
  const naturalKey = `source-maturity-atom-flow-repair:${sourceId}:${factId}`
  const atomId = stableId('atom', naturalKey)
  const hitId = stableId('atom-hit', naturalKey)
  const dedupHash = stableHash(naturalKey)
  const claim = text(fact.claim || fact.detail || fact.value)
  const detail = text(fact.detail || fact.claim || '')
  const evidenceExcerpt = text([claim, detail].filter(Boolean).join(' '))

  const atom = {
    atomId,
    title: `${sourceId} governed list source boundary`,
    content: evidenceExcerpt,
    atomType: 'proof_point',
    sourceId,
    modality: 'sheet',
    anchorType: 'source_fact',
    anchorValue: factId,
    evidenceExcerpt,
    derivedClaim: claim,
    topicRefs: ['source-maturity', 'owners-lists', 'source-boundary'],
    department: 'Foundation',
    pillar: 'source-readiness',
    valueRoute: 'foundation-source-maturity',
    qualityScore: 86,
    relevanceScore: 92,
    sourceConfidence: 0.98,
    extractionConfidence: 0.9,
    sensitivity: fact.sensitivity || 'neutral',
    minTier: Number(fact.minTier ?? fact.min_tier ?? 1),
    freshness: 'structural',
    status: 'accepted',
    dedupHash,
    acceptedAt: now,
    acceptedBy: 'codex-source-maturity-atom-flow-repair',
    reviewNote: 'Promoted from an existing governed source fact only; no live extraction, provider call, Sheets read/write, or external write occurred.',
    tags: ['source-maturity', 'atom-flow-repair', 'no-live-extraction'],
    metadata: {
      cardId: SOURCE_MATURITY_ATOM_FLOW_REPAIR_CARD_ID,
      closeoutKey: SOURCE_MATURITY_ATOM_FLOW_REPAIR_CLOSEOUT_KEY,
      sourceMaturityAtomFlowRepair: true,
      sourceMaturityTargetSourceId: sourceId,
      sourceFactId: factId,
      sourceFactNaturalKey: fact.naturalKey || fact.natural_key || null,
      evidenceRefs: candidate.evidenceRefs,
      noLiveExtraction: true,
      noExternalWrite: true,
      noDriveMutation: true,
      noModelCall: true,
      noSheetsReadWrite: true,
      recordedAt: now,
    },
  }

  const hit = {
    hitId,
    atomId,
    sourceId,
    hitType: 'supporting_evidence',
    evidenceExcerpt,
    anchorType: 'source_fact',
    anchorValue: factId,
    confidence: 0.98,
    occurredAt: now,
    metadata: {
      cardId: SOURCE_MATURITY_ATOM_FLOW_REPAIR_CARD_ID,
      closeoutKey: SOURCE_MATURITY_ATOM_FLOW_REPAIR_CLOSEOUT_KEY,
      sourceFactId: factId,
      evidenceRefs: candidate.evidenceRefs,
      noLiveExtraction: true,
      noExternalWrite: true,
    },
  }

  return {
    ok: true,
    sourceId,
    factId,
    atom,
    hit,
  }
}

export function evaluateSourceMaturityAtomFlowRepair({
  beforeRow = {},
  afterRow = {},
  candidate = {},
  atomBuild = {},
  savedAtom = null,
  savedHit = null,
} = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const beforeAtomSignals = Number(beforeRow.metrics?.atomSignals || 0)
  const afterAtomSignals = Number(afterRow.metrics?.atomSignals || 0)
  const alreadyRepaired = beforeRow.nextGap !== 'atomized' && beforeAtomSignals >= 1
  const savedAtomActive = savedAtom && !['rejected', 'archived', 'superseded'].includes(savedAtom.status)

  add(beforeRow.nextGap === 'atomized' || alreadyRepaired, 'target source starts at atomized gap or is already repaired', `${beforeRow.sourceId || 'missing'}:${beforeRow.nextGap || 'missing'}`)
  add(beforeAtomSignals === 0 || alreadyRepaired || beforeRow.atomFlow?.status === 'stale', 'target starts without fresh atom flow or is already repaired', `${beforeAtomSignals}:${beforeRow.atomFlow?.status || 'missing'}`)
  add(candidate.ok, 'source-backed fact candidate exists', list(candidate.failures).join(', ') || candidate.sourceId)
  add(atomBuild.ok, 'atom build is valid', list(atomBuild.failures).join(', ') || atomBuild.atom?.atomId)
  add(Boolean(savedAtomActive), 'source-backed atom is saved active', savedAtom?.atomId || savedAtom?.atom_id || 'missing')
  add(Boolean(savedHit), 'source-backed atom hit is saved', savedHit?.hitId || savedHit?.hit_id || 'missing')
  add(savedAtom ? savedAtom.metadata?.noLiveExtraction === true || atomBuild.atom?.metadata?.noLiveExtraction === true : false, 'atom records no live extraction', JSON.stringify(savedAtom?.metadata || atomBuild.atom?.metadata || {}))
  add(savedAtom ? savedAtom.metadata?.sourceFactId === atomBuild.factId || atomBuild.atom?.metadata?.sourceFactId === atomBuild.factId : false, 'atom cites source fact', savedAtom?.metadata?.sourceFactId || atomBuild.atom?.metadata?.sourceFactId || 'missing')
  add(afterAtomSignals >= 1, 'target source has atom signal after repair', String(afterAtomSignals))
  add(afterRow.stages?.atomized?.ok === true, 'target source atomized stage is green after repair', afterRow.stages?.atomized?.detail || 'missing')
  add(afterRow.atomFlow?.status === 'healthy', 'target source atom flow is fresh after repair', afterRow.atomFlow?.reason || 'missing')
  add(afterRow.nextGap !== 'atomized', 'target source no longer blocks on atomized gap', afterRow.nextGap || 'missing')

  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'risk' : 'healthy',
    checks,
    failures,
    summary: {
      sourceId: candidate.sourceId || beforeRow.sourceId || afterRow.sourceId || SOURCE_MATURITY_ATOM_FLOW_REPAIR_TARGET_SOURCE_ID,
      beforeNextGap: beforeRow.nextGap || null,
      afterNextGap: afterRow.nextGap || null,
      beforeAtomSignals,
      afterAtomSignals,
      beforeAtomFlowStatus: beforeRow.atomFlow?.status || null,
      afterAtomFlowStatus: afterRow.atomFlow?.status || null,
      atomId: atomBuild.atom?.atomId || savedAtom?.atomId || savedAtom?.atom_id || null,
      hitId: atomBuild.hit?.hitId || savedHit?.hitId || savedHit?.hit_id || null,
      sourceFactId: atomBuild.factId || candidate.fact?.factId || candidate.fact?.fact_id || null,
      noLiveExtraction: atomBuild.atom?.metadata?.noLiveExtraction === true,
    },
  }
}

export function buildSyntheticSourceMaturityAtomFlowRepairProof() {
  const fact = {
    factId: 'fact:owners-lists-source-boundary',
    sourceId: 'SRC-OWNERS-LISTS-001',
    title: 'Owners Lists current-reality source boundary',
    claim: 'SRC-OWNERS-LISTS-001 is the signed-off source for governed Owners list truth.',
    detail: 'Evidence comes from the source note and source registry.',
    sourceRef: 'docs/source-notes/bhag-builder-lists.md',
    minTier: 1,
    sensitivity: 'neutral',
    status: 'active',
    metadata: { evidenceRefs: ['docs/source-notes/bhag-builder-lists.md'] },
  }
  const beforeRow = {
    sourceId: 'SRC-OWNERS-LISTS-001',
    nextGap: 'atomized',
    metrics: { atomSignals: 0 },
    atomFlow: { status: 'stale' },
  }
  const afterRow = {
    sourceId: 'SRC-OWNERS-LISTS-001',
    nextGap: 'routed',
    metrics: { atomSignals: 1 },
    atomFlow: { status: 'healthy', reason: 'fresh promoted atom flow' },
    stages: { atomized: { ok: true, detail: '1 intelligence atom signal.' } },
  }
  const candidate = selectSourceMaturityAtomFlowRepairCandidate({ beforeRow, sourceFacts: [fact] })
  const atomBuild = buildSourceMaturityAtomFromFact(candidate, '2026-05-18T05:15:00.000Z')
  const evaluation = evaluateSourceMaturityAtomFlowRepair({
    beforeRow,
    afterRow,
    candidate,
    atomBuild,
    savedAtom: { ...atomBuild.atom, status: 'accepted' },
    savedHit: { ...atomBuild.hit },
  })
  const missingFact = selectSourceMaturityAtomFlowRepairCandidate({ beforeRow, sourceFacts: [] })
  const tierBlocked = selectSourceMaturityAtomFlowRepairCandidate({
    beforeRow,
    sourceFacts: [{ ...fact, minTier: 4 }],
  })
  return {
    ok: candidate.ok &&
      atomBuild.ok &&
      evaluation.ok &&
      !missingFact.ok &&
      missingFact.failures.includes('missing_active_source_fact') &&
      !tierBlocked.ok &&
      tierBlocked.failures.includes('source_fact_tier_too_restricted') &&
      atomBuild.atom.metadata.noLiveExtraction === true &&
      atomBuild.atom.metadata.sourceFactId === fact.factId,
    candidate,
    atomBuild,
    evaluation,
    missingFact,
    tierBlocked,
  }
}

export function renderSourceMaturityAtomFlowRepairCloseout(snapshot = {}) {
  const summary = snapshot.summary || {}
  const lines = []
  lines.push('# Source Maturity Atom Flow Repair Closeout')
  lines.push('')
  lines.push(`Card: \`${SOURCE_MATURITY_ATOM_FLOW_REPAIR_CARD_ID}\``)
  lines.push(`Closeout key: \`${SOURCE_MATURITY_ATOM_FLOW_REPAIR_CLOSEOUT_KEY}\``)
  lines.push('')
  lines.push('## What Shipped')
  lines.push('')
  lines.push(`- Promoted one source-backed atom for \`${summary.sourceId || SOURCE_MATURITY_ATOM_FLOW_REPAIR_TARGET_SOURCE_ID}\` from an existing governed source fact.`)
  lines.push(`- Saved atom: \`${summary.atomId || 'pending atom'}\`.`)
  lines.push(`- Source fact evidence: \`${summary.sourceFactId || 'pending source fact'}\`.`)
  lines.push('- The repair uses internal source-fact evidence only and does not run extraction, read/write Sheets, call providers, or write externally.')
  lines.push('- This clears only the atomized-stage atom-flow gap; routing remains a separate review/action lane.')
  lines.push('')
  lines.push('## Proof')
  lines.push('')
  lines.push(`- Before next gap on this proof run: \`${summary.beforeNextGap || 'unknown'}\`.`)
  lines.push(`- After next gap on this proof run: \`${summary.afterNextGap || 'unknown'}\`.`)
  lines.push(`- Atom signals on this proof run: ${summary.beforeAtomSignals ?? 0} -> ${summary.afterAtomSignals ?? 0}.`)
  lines.push(`- Atom-flow status on this proof run: \`${summary.beforeAtomFlowStatus || 'unknown'}\` -> \`${summary.afterAtomFlowStatus || 'unknown'}\`.`)
  lines.push('- Focused proof dogfoods missing source fact failure, restricted-tier fact failure, Plan Critic, Current Sprint metadata, atom persistence, atom-hit persistence, source maturity grid movement, no live extraction, no external write, and closeout registry coverage.')
  lines.push('- Full `process:foundation-ship` is required before push.')
  lines.push('')
  lines.push('## Boundaries')
  lines.push('')
  for (const boundary of SOURCE_MATURITY_ATOM_FLOW_REPAIR_NOT_NEXT_BOUNDARIES) {
    lines.push(`- ${boundary}`)
  }
  lines.push('')
  lines.push('## Next')
  lines.push('')
  lines.push('Continue the safe source maturity child queue. Prefer routing repair only where source-backed atom/fact/chunk evidence exists; otherwise mark the source blocked or leave the gap visible instead of inventing truth.')
  lines.push('')
  return `${lines.join('\n')}\n`
}
