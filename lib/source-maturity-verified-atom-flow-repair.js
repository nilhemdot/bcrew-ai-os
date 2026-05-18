import { createHash } from 'node:crypto'

export const SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_CARD_ID = 'SOURCE-MATURITY-VERIFIED-ATOM-FLOW-REPAIR-001'
export const SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_CLOSEOUT_KEY = 'source-maturity-verified-atom-flow-repair-v1'
export const SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_PLAN_PATH = 'docs/process/source-maturity-verified-atom-flow-repair-001-plan.md'
export const SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_APPROVAL_PATH = 'docs/process/approvals/SOURCE-MATURITY-VERIFIED-ATOM-FLOW-REPAIR-001.json'
export const SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-source-maturity-verified-atom-flow-repair-closeout.md'
export const SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_SCRIPT_PATH = 'scripts/process-source-maturity-verified-atom-flow-repair-check.mjs'
export const SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_SPRINT_ID = 'source-maturity-verified-atom-flow-repair-2026-05-18'

export const SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_TARGETS = [
  {
    sourceId: 'SRC-CLICKUP-001',
    factId: 'fact:44ecd00a1c18edd32086bc2e',
    label: 'ClickUp',
    atomTitle: 'ClickUp verified source boundary',
    topicRefs: ['source-maturity', 'verified-source', 'clickup', 'ops-workflow', 'source-backed-current-reality'],
  },
  {
    sourceId: 'SRC-GDOCS-001',
    factId: 'fact:95460ff02f9ff168ea45a467',
    label: 'Google Docs Source Type',
    atomTitle: 'Google Docs verified source-type boundary',
    topicRefs: ['source-maturity', 'verified-source', 'google-docs', 'drive-corpus', 'source-backed-current-reality'],
  },
  {
    sourceId: 'SRC-GSHEETS-001',
    factId: 'fact:9072210d62317f86ff231c7c',
    label: 'Google Sheets Source Type',
    atomTitle: 'Google Sheets verified source-type boundary',
    topicRefs: ['source-maturity', 'verified-source', 'google-sheets', 'spreadsheet-provenance', 'source-backed-current-reality'],
  },
  {
    sourceId: 'SRC-DATAFORSEO-001',
    factId: 'fact:a6571fb06859cecd05138fac',
    label: 'DataForSEO',
    atomTitle: 'DataForSEO verified readable source boundary',
    topicRefs: ['source-maturity', 'verified-source', 'dataforseo', 'seo-research', 'source-backed-current-reality'],
  },
  {
    sourceId: 'SRC-GHL-001',
    factId: 'fact:edcecea350071c499e040514',
    label: 'GoHighLevel',
    atomTitle: 'GoHighLevel verified readable source boundary',
    topicRefs: ['source-maturity', 'verified-source', 'gohighlevel', 'crm-metadata', 'source-backed-current-reality'],
  },
  {
    sourceId: 'SRC-META-001',
    factId: 'fact:905fde9fc2fcf1d0f24662a1',
    label: 'Meta API',
    atomTitle: 'Meta API verified readable source boundary',
    topicRefs: ['source-maturity', 'verified-source', 'meta-api', 'marketing-metrics', 'source-backed-current-reality'],
  },
]

export const SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_TARGET_SOURCE_ID = SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_TARGETS[0].sourceId
export const SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_TARGET_FACT_ID = SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_TARGETS[0].factId

export const SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_NOT_NEXT_BOUNDARIES = [
  'No live extraction, extraction target creation, transcript fetch, screenshot capture, crawl, or model/provider call.',
  'No auth-required or paid run.',
  'No external write.',
  'No live provider/source read or write.',
  'No Google Drive permission mutation.',
  'Do not mutate Drive permissions.',
  'No live Agent Feedback auto-send.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
  'No broad Foundation UI redesign.',
  'No atom fabrication: every atom must cite an existing active source fact or source-backed evidence row.',
  'No attempt to mark synthesized, routed, or governed-apply complete.',
]

export const SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_PROOF_COMMANDS = [
  'node --check lib/source-maturity-verified-atom-flow-repair.js scripts/process-source-maturity-verified-atom-flow-repair-check.mjs',
  'npm run process:source-maturity-verified-atom-flow-repair-check -- --apply --stage=building_now --json',
  'npm run process:source-maturity-verified-atom-flow-repair-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=SOURCE-MATURITY-VERIFIED-ATOM-FLOW-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-VERIFIED-ATOM-FLOW-REPAIR-001.json --closeoutKey=source-maturity-verified-atom-flow-repair-v1 --commitRef=HEAD',
]

export const SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_CHANGED_FILES = [
  'lib/source-maturity-verified-atom-flow-repair.js',
  'lib/foundation-build-closeout-source-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_SCRIPT_PATH,
  'package.json',
  SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_PLAN_PATH,
  SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_APPROVAL_PATH,
  SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_CLOSEOUT_PATH,
  'docs/rebuild/current-state.md',
  'docs/rebuild/current-plan.md',
]

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function text(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function stableHash(value) {
  return createHash('sha256').update(String(value || '')).digest('hex')
}

function stableId(prefix, value) {
  return `${prefix}:${stableHash(value).slice(0, 24)}`
}

function targetBySourceId(sourceId) {
  return SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_TARGETS.find(target => target.sourceId === sourceId) || null
}

function rowBySourceId(rows = [], sourceId) {
  return list(rows).find(row => row.sourceId === sourceId || row.source_id === sourceId) || {}
}

function targetFact(facts = [], factId = SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_TARGET_FACT_ID) {
  return list(facts).find(fact => (fact.factId || fact.fact_id) === factId) || null
}

export function selectVerifiedSourceAtomFlowRepairCandidate({
  beforeRow = {},
  sourceFacts = [],
  target = targetBySourceId(SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_TARGET_SOURCE_ID),
} = {}) {
  const failures = []
  const sourceId = target?.sourceId || beforeRow.sourceId || SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_TARGET_SOURCE_ID
  const factId = target?.factId || SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_TARGET_FACT_ID
  if (!target) failures.push('unknown_target_source')
  if (!beforeRow.sourceId) failures.push('missing_source_maturity_row')
  if (beforeRow.sourceId && beforeRow.sourceId !== sourceId) failures.push('wrong_source_row')
  if (beforeRow.nextGap && beforeRow.nextGap !== 'atomized') {
    const alreadyRepaired = Number(beforeRow.metrics?.atomSignals || 0) > 0 && beforeRow.nextGap !== 'atomized'
    if (!alreadyRepaired) failures.push('target_not_atomized_gap')
  }
  const fact = targetFact(sourceFacts, factId)
  if (!fact) failures.push('missing_target_source_fact')
  if (fact && (fact.status || 'active') !== 'active') failures.push('source_fact_not_active')
  if (fact && Number(fact.minTier ?? fact.min_tier ?? 1) > 1) failures.push('source_fact_tier_too_restricted')
  if (fact && !(fact.claim || fact.detail || fact.value)) failures.push('source_fact_missing_claim')
  const candidateFactId = fact?.factId || fact?.fact_id || factId
  const sourceRef = fact?.sourceRef || fact?.source_ref || fact?.sourceUrl || fact?.source_url
  const evidenceRefs = list(fact?.metadata?.evidenceRefs || fact?.metadata?.sourceRefs || fact?.sourceRefs)
  return {
    ok: failures.length === 0,
    failures,
    target,
    sourceId,
    fact,
    evidenceRefs: Array.from(new Set([
      sourceRef,
      `intelligence_synthesis_facts:${candidateFactId}`,
      ...evidenceRefs,
      'intelligence_synthesis_facts',
    ].filter(Boolean))),
  }
}

export function selectVerifiedSourceAtomFlowRepairCandidates({
  beforeRows = [],
  sourceFacts = [],
  targets = SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_TARGETS,
} = {}) {
  const candidates = targets.map(target => selectVerifiedSourceAtomFlowRepairCandidate({
    beforeRow: rowBySourceId(beforeRows, target.sourceId),
    sourceFacts: list(sourceFacts).filter(fact => (fact.sourceId || fact.source_id) === target.sourceId || list(fact.sourceIds || fact.source_ids).includes(target.sourceId)),
    target,
  }))
  return {
    ok: candidates.every(candidate => candidate.ok),
    candidates,
    failures: candidates.flatMap(candidate => list(candidate.failures).map(failure => `${candidate.sourceId}:${failure}`)),
  }
}

export function buildVerifiedSourceAtomFromFact(candidate = {}, now = new Date().toISOString()) {
  const sourceId = candidate.sourceId || SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_TARGET_SOURCE_ID
  if (!candidate.ok || !candidate.fact) {
    return {
      ok: false,
      failures: list(candidate.failures).length ? candidate.failures : ['missing_source_fact_candidate'],
      sourceId,
    }
  }
  const fact = candidate.fact
  const factId = fact.factId || fact.fact_id
  const naturalKey = `source-maturity-verified-atom-flow-repair:${sourceId}:${factId}`
  const atomId = stableId('atom', naturalKey)
  const hitId = stableId('atom-hit', naturalKey)
  const claim = text(fact.claim || fact.detail || fact.value)
  const detail = text(fact.detail || fact.claim || '')
  const evidenceExcerpt = text([claim, detail].filter(Boolean).join(' '))
  const atom = {
    atomId,
    title: candidate.target?.atomTitle || `${sourceId} current-reality source boundary`,
    content: evidenceExcerpt,
    atomType: 'proof_point',
    sourceId,
    modality: 'text',
    anchorType: 'source_fact',
    anchorValue: factId,
    evidenceExcerpt,
    derivedClaim: claim,
    topicRefs: candidate.target?.topicRefs || ['source-maturity', 'verified-source', 'source-backed-current-reality'],
    department: 'Foundation',
    pillar: 'source-readiness',
    valueRoute: 'foundation-source-maturity',
    qualityScore: 88,
    relevanceScore: 93,
    sourceConfidence: 0.98,
    extractionConfidence: 0.9,
    sensitivity: fact.sensitivity || 'neutral',
    minTier: Number(fact.minTier ?? fact.min_tier ?? 1),
    freshness: 'structural',
    status: 'accepted',
    dedupHash: stableHash(naturalKey),
    acceptedAt: now,
    acceptedBy: 'codex-source-maturity-verified-atom-flow-repair',
    reviewNote: 'Promoted from an existing governed verified source fact only; no live extraction, provider call, source read/write, or external write occurred.',
    tags: ['source-maturity', 'atom-flow-repair', 'verified-source', 'no-live-extraction'],
    metadata: {
      cardId: SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_CARD_ID,
      closeoutKey: SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_CLOSEOUT_KEY,
      sourceMaturityAtomFlowRepair: true,
      sourceMaturityTargetSourceId: sourceId,
      sourceFactId: factId,
      sourceFactNaturalKey: fact.naturalKey || fact.natural_key || null,
      evidenceRefs: candidate.evidenceRefs,
      noLiveExtraction: true,
      noProviderCall: true,
      noPaidRun: true,
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
      cardId: SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_CARD_ID,
      closeoutKey: SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_CLOSEOUT_KEY,
      sourceFactId: factId,
      evidenceRefs: candidate.evidenceRefs,
      noLiveExtraction: true,
      noProviderCall: true,
      noPaidRun: true,
      noExternalWrite: true,
    },
  }
  return { ok: true, sourceId, factId, atom, hit }
}

export function buildVerifiedSourceAtomsFromFacts(selection = {}, now = new Date().toISOString()) {
  const atomBuilds = list(selection.candidates).map(candidate => buildVerifiedSourceAtomFromFact(candidate, now))
  return {
    ok: atomBuilds.every(atomBuild => atomBuild.ok),
    atomBuilds,
    failures: atomBuilds.flatMap(atomBuild => list(atomBuild.failures).map(failure => `${atomBuild.sourceId}:${failure}`)),
  }
}

export function evaluateVerifiedSourceAtomFlowRepair({
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
  add(savedAtom ? savedAtom.metadata?.noProviderCall === true || atomBuild.atom?.metadata?.noProviderCall === true : false, 'atom records no provider call', JSON.stringify(savedAtom?.metadata || atomBuild.atom?.metadata || {}))
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
      sourceId: candidate.sourceId || beforeRow.sourceId || afterRow.sourceId || SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_TARGET_SOURCE_ID,
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

export function evaluateVerifiedSourceAtomFlowRepairs({
  beforeRows = [],
  afterRows = [],
  selection = {},
  atomBuilds = [],
  savedAtoms = [],
  savedHits = [],
} = {}) {
  const checks = []
  const summaries = []
  for (const target of SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_TARGETS) {
    const candidate = list(selection.candidates).find(item => item.sourceId === target.sourceId) || {}
    const atomBuild = list(atomBuilds).find(item => item.sourceId === target.sourceId) || {}
    const savedAtom = list(savedAtoms).find(item => (item.atomId || item.atom_id) === atomBuild.atom?.atomId) || null
    const savedHit = list(savedHits).find(item => (item.hitId || item.hit_id) === atomBuild.hit?.hitId) || null
    const evaluation = evaluateVerifiedSourceAtomFlowRepair({
      beforeRow: rowBySourceId(beforeRows, target.sourceId),
      afterRow: rowBySourceId(afterRows, target.sourceId),
      candidate,
      atomBuild,
      savedAtom,
      savedHit,
    })
    checks.push(...evaluation.checks.map(check => ({ ...check, check: `${target.sourceId} ${check.check}` })))
    summaries.push(evaluation.summary)
  }
  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'risk' : 'healthy',
    checks,
    failures,
    summary: {
      targets: summaries,
      sourceIds: SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_TARGETS.map(target => target.sourceId),
      atomIds: summaries.map(summary => summary.atomId).filter(Boolean),
      hitIds: summaries.map(summary => summary.hitId).filter(Boolean),
      beforeNextGaps: summaries.map(summary => `${summary.sourceId}:${summary.beforeNextGap || 'unknown'}`),
      afterNextGaps: summaries.map(summary => `${summary.sourceId}:${summary.afterNextGap || 'unknown'}`),
      atomSignals: summaries.map(summary => `${summary.sourceId}:${summary.beforeAtomSignals ?? 0}->${summary.afterAtomSignals ?? 0}`),
      sourceFactIds: summaries.map(summary => summary.sourceFactId).filter(Boolean),
      noLiveExtraction: summaries.every(summary => summary.noLiveExtraction === true),
    },
  }
}

export function buildSyntheticVerifiedSourceAtomFlowRepairProof() {
  const fact = {
    factId: SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_TARGET_FACT_ID,
    sourceId: SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_TARGET_SOURCE_ID,
    title: 'ClickUp verified source boundary',
    claim: 'SRC-CLICKUP-001 is the V1 locked source boundary for ClickUp deal workflow, agent roster, onboarding, contract-link monitoring, and ops follow-through tasks.',
    detail: 'Evidence comes from the existing governed verified source fact; this proof does not call ClickUp, read external systems, or run extraction.',
    metadata: { status: 'ahead', evidenceRefs: ['intelligence_synthesis_facts:fact:44ecd00a1c18edd32086bc2e'] },
    minTier: 1,
    sensitivity: 'neutral',
    status: 'active',
  }
  const beforeRow = {
    sourceId: SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_TARGET_SOURCE_ID,
    nextGap: 'atomized',
    metrics: { atomSignals: 0 },
    atomFlow: { status: 'missing' },
  }
  const afterRow = {
    sourceId: SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_TARGET_SOURCE_ID,
    nextGap: 'complete',
    metrics: { atomSignals: 1 },
    atomFlow: { status: 'healthy', reason: 'fresh promoted atom flow' },
    stages: { atomized: { ok: true, detail: '1 intelligence atom signal.' } },
  }
  const candidate = selectVerifiedSourceAtomFlowRepairCandidate({ beforeRow, sourceFacts: [fact] })
  const atomBuild = buildVerifiedSourceAtomFromFact(candidate, '2026-05-18T11:05:00.000Z')
  const evaluation = evaluateVerifiedSourceAtomFlowRepair({
    beforeRow,
    afterRow,
    candidate,
    atomBuild,
    savedAtom: { ...atomBuild.atom, status: 'accepted' },
    savedHit: { ...atomBuild.hit },
  })
  const missingFact = selectVerifiedSourceAtomFlowRepairCandidate({ beforeRow, sourceFacts: [] })
  const tierBlocked = selectVerifiedSourceAtomFlowRepairCandidate({ beforeRow, sourceFacts: [{ ...fact, minTier: 4 }] })
  return {
    ok: candidate.ok &&
      atomBuild.ok &&
      evaluation.ok &&
      !missingFact.ok &&
      missingFact.failures.includes('missing_target_source_fact') &&
      !tierBlocked.ok &&
      tierBlocked.failures.includes('source_fact_tier_too_restricted') &&
      atomBuild.atom.metadata.evidenceRefs.includes(`intelligence_synthesis_facts:${fact.factId}`) &&
      atomBuild.atom.metadata.noLiveExtraction === true &&
      atomBuild.atom.metadata.noProviderCall === true &&
      atomBuild.atom.metadata.sourceFactId === fact.factId,
    candidate,
    atomBuild,
    evaluation,
    missingFact,
    tierBlocked,
  }
}

export function renderVerifiedSourceAtomFlowRepairCloseout(snapshot = {}) {
  const summary = snapshot.summary || {}
  const targets = list(summary.targets)
  const lines = []
  lines.push('# Source Maturity Verified Source Atom Flow Repair Closeout')
  lines.push('')
  lines.push(`Card: \`${SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_CARD_ID}\``)
  lines.push(`Closeout key: \`${SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_CLOSEOUT_KEY}\``)
  lines.push('')
  lines.push('## What Shipped')
  lines.push('')
  lines.push(`- Promoted ${targets.length || SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_TARGETS.length} source-backed atoms for verified/readable sources from existing source facts.`)
  for (const target of targets) {
    lines.push(`- \`${target.sourceId}\`: atom \`${target.atomId || 'pending atom'}\`, fact \`${target.sourceFactId || 'pending fact'}\`, gap \`${target.beforeNextGap || 'unknown'}\` -> \`${target.afterNextGap || 'unknown'}\`.`)
  }
  if (!targets.length) {
    lines.push(`- Target sources: ${SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_TARGETS.map(target => `\`${target.sourceId}\``).join(', ')}.`)
  }
  lines.push('- The repair uses internal source-fact evidence only and does not run extraction, call providers, read/write external sources, or write externally.')
  lines.push('- This clears only the atomized-stage atom-flow gap; synthesis/routing/apply remain separate proof lanes.')
  lines.push('')
  lines.push('## Proof')
  lines.push('')
  lines.push(`- Before next gaps on this proof run: ${(summary.beforeNextGaps || []).join(', ') || 'unknown'}.`)
  lines.push(`- After next gaps on this proof run: ${(summary.afterNextGaps || []).join(', ') || 'unknown'}.`)
  lines.push(`- Atom signals on this proof run: ${(summary.atomSignals || []).join(', ') || 'unknown'}.`)
  lines.push('- Focused proof dogfoods missing source fact, restricted-tier fact, source-fact evidence refs, Plan Critic, Current Sprint metadata, atom persistence, atom-hit persistence, source maturity grid movement, no live extraction, no external write, and closeout registry coverage.')
  lines.push('- Full `process:foundation-ship` is required before push.')
  lines.push('')
  lines.push('## Boundaries')
  lines.push('')
  for (const boundary of SOURCE_MATURITY_VERIFIED_ATOM_FLOW_REPAIR_NOT_NEXT_BOUNDARIES) lines.push(`- ${boundary}`)
  lines.push('')
  lines.push('## Next')
  lines.push('')
  lines.push('Continue the safe source maturity/source-contract queue from live truth. Prefer atom-flow repair only where source-backed facts or evidence rows already exist; otherwise leave the gap visible.')
  lines.push('')
  return `${lines.join('\n')}\n`
}
