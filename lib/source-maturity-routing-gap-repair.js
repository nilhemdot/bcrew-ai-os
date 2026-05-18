import { createHash } from 'node:crypto'

import {
  SYNTHESIS_VERIFICATION_METADATA_KEY,
  buildSynthesisEvidenceIndex,
  verifySynthesizedRecord,
} from './synthesis-claim-verification.js'

export const SOURCE_MATURITY_ROUTING_GAP_REPAIR_CARD_ID = 'SOURCE-MATURITY-ROUTING-GAP-REPAIR-001'
export const SOURCE_MATURITY_ROUTING_GAP_REPAIR_CLOSEOUT_KEY = 'source-maturity-routing-gap-repair-v1'
export const SOURCE_MATURITY_ROUTING_GAP_REPAIR_PLAN_PATH = 'docs/process/source-maturity-routing-gap-repair-001-plan.md'
export const SOURCE_MATURITY_ROUTING_GAP_REPAIR_APPROVAL_PATH = 'docs/process/approvals/SOURCE-MATURITY-ROUTING-GAP-REPAIR-001.json'
export const SOURCE_MATURITY_ROUTING_GAP_REPAIR_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-source-maturity-routing-gap-repair-closeout.md'
export const SOURCE_MATURITY_ROUTING_GAP_REPAIR_SCRIPT_PATH = 'scripts/process-source-maturity-routing-gap-repair-check.mjs'
export const SOURCE_MATURITY_ROUTING_GAP_REPAIR_SPRINT_ID = 'source-maturity-routing-gap-repair-2026-05-18'
export const SOURCE_MATURITY_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID = 'SRC-SLACK-001'

export const SOURCE_MATURITY_ROUTING_GAP_REPAIR_NOT_NEXT_BOUNDARIES = [
  'No live extraction, transcript fetch, screenshot capture, crawl, or model/provider call.',
  'No auth-required or paid run.',
  'No external write.',
  'No action-route apply; proposed internal routes must stay approval-required and pending.',
  'No Google Drive permission mutation.',
  'Do not mutate Drive permissions.',
  'No live Agent Feedback auto-send.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
  'No broad Foundation UI redesign.',
]

export const SOURCE_MATURITY_ROUTING_GAP_REPAIR_PROOF_COMMANDS = [
  'node --check lib/source-maturity-routing-gap-repair.js scripts/process-source-maturity-routing-gap-repair-check.mjs',
  'npm run process:source-maturity-routing-gap-repair-check -- --apply --stage=building_now --json',
  'npm run process:source-maturity-routing-gap-repair-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=SOURCE-MATURITY-ROUTING-GAP-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-ROUTING-GAP-REPAIR-001.json --closeoutKey=source-maturity-routing-gap-repair-v1 --commitRef=HEAD',
]

export const SOURCE_MATURITY_ROUTING_GAP_REPAIR_CHANGED_FILES = [
  'lib/source-maturity-routing-gap-repair.js',
  'lib/intelligence-synthesis.js',
  'lib/foundation-build-closeout-source-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/process-source-maturity-routing-gap-repair-check.mjs',
  'package.json',
  SOURCE_MATURITY_ROUTING_GAP_REPAIR_PLAN_PATH,
  SOURCE_MATURITY_ROUTING_GAP_REPAIR_APPROVAL_PATH,
  SOURCE_MATURITY_ROUTING_GAP_REPAIR_CLOSEOUT_PATH,
  'docs/rebuild/current-state.md',
  'docs/rebuild/current-plan.md',
]

const ACTIVE_ATOM_STATUSES = new Set(['active', 'accepted', 'detected'])

function text(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function uniqueText(values) {
  return Array.from(new Set(list(values).map(text).filter(Boolean)))
}

function stableHash(value) {
  return createHash('sha256').update(String(value || '')).digest('hex')
}

function stableId(prefix, value) {
  return `${prefix}:${stableHash(value).slice(0, 24)}`
}

function minTierFromRows(rows = []) {
  const tiers = list(rows)
    .map(row => Number(row.minTier ?? row.min_tier ?? 1))
    .filter(value => Number.isFinite(value) && value >= 1)
  return tiers.length ? Math.max(...tiers) : 1
}

function normalizeFact(row = {}) {
  return {
    factId: row.factId || row.fact_id,
    factType: row.factType || row.fact_type,
    sourceId: row.sourceId || row.source_id,
    sourceIds: uniqueText(row.sourceIds || row.source_ids || [row.sourceId || row.source_id]),
    title: row.title,
    claim: row.claim,
    value: row.value,
    detail: row.detail,
    status: row.status || 'active',
    sensitivity: row.sensitivity || 'neutral',
    minTier: Number(row.minTier ?? row.min_tier ?? 1) || 1,
    updatedAt: row.updatedAt || row.updated_at,
  }
}

function normalizeAtom(row = {}) {
  return {
    atomId: row.atomId || row.atom_id,
    sourceId: row.sourceId || row.source_id,
    title: row.title,
    content: row.content,
    atomType: row.atomType || row.atom_type,
    status: row.status || 'detected',
    candidateKey: row.candidateKey || row.candidate_key,
    artifactId: row.artifactId || row.artifact_id,
    reportArtifactId: row.reportArtifactId || row.report_artifact_id,
    evidenceExcerpt: row.evidenceExcerpt || row.evidence_excerpt,
    derivedClaim: row.derivedClaim || row.derived_claim,
    sensitivity: row.sensitivity || 'neutral',
    minTier: Number(row.minTier ?? row.min_tier ?? 1) || 1,
    updatedAt: row.updatedAt || row.updated_at,
  }
}

function normalizeChunk(row = {}) {
  return {
    chunkId: row.chunkId || row.chunk_id,
    chunkType: row.chunkType || row.chunk_type,
    sourceId: row.sourceId || row.source_id,
    atomId: row.atomId || row.atom_id,
    candidateKey: row.candidateKey || row.candidate_key,
    artifactId: row.artifactId || row.artifact_id,
    reportArtifactId: row.reportArtifactId || row.report_artifact_id,
    title: row.title,
    body: row.body,
    status: row.status || 'active',
    sensitivity: row.sensitivity || 'neutral',
    minTier: Number(row.minTier ?? row.min_tier ?? 1) || 1,
    updatedAt: row.updatedAt || row.updated_at,
  }
}

export function selectSourceMaturityRoutingRepairCandidate({
  sourceId = SOURCE_MATURITY_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID,
  facts = [],
  atoms = [],
  chunks = [],
} = {}) {
  const normalizedFacts = list(facts).map(normalizeFact)
  const normalizedAtoms = list(atoms).map(normalizeAtom)
  const normalizedChunks = list(chunks).map(normalizeChunk)
  const failures = []
  const activeFacts = normalizedFacts.filter(fact =>
    fact.factId &&
    fact.status === 'active' &&
    fact.sourceIds.includes(sourceId) &&
    fact.minTier <= 1
  )
  const activeChunks = normalizedChunks.filter(chunk =>
    chunk.chunkId &&
    chunk.sourceId === sourceId &&
    chunk.status === 'active' &&
    chunk.atomId &&
    chunk.minTier <= 1
  )
  const atomById = new Map(normalizedAtoms.map(atom => [atom.atomId, atom]).filter(([atomId]) => Boolean(atomId)))
  const matchedChunk = activeChunks.find(chunk => {
    const atom = atomById.get(chunk.atomId)
    return atom &&
      atom.sourceId === sourceId &&
      ACTIVE_ATOM_STATUSES.has(atom.status) &&
      atom.minTier <= 1
  })
  const matchedAtom = matchedChunk ? atomById.get(matchedChunk.atomId) : null
  const matchedFact = activeFacts[0] || null

  if (!matchedFact) failures.push('missing_active_tier_one_source_fact')
  if (!matchedChunk) failures.push('missing_active_tier_one_evidence_chunk')
  if (!matchedAtom) failures.push('missing_active_tier_one_atom')

  return {
    ok: failures.length === 0,
    failures,
    sourceId,
    fact: matchedFact,
    atom: matchedAtom,
    chunk: matchedChunk,
    facts: normalizedFacts,
    atoms: normalizedAtoms,
    chunks: normalizedChunks,
  }
}

export function buildSourceMaturityRoutingRepairRecords(candidate = {}, now = new Date().toISOString(), options = {}) {
  const failures = []
  if (!candidate.ok) failures.push(...list(candidate.failures))
  const sourceId = candidate.sourceId || SOURCE_MATURITY_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID
  const cardId = options.cardId || SOURCE_MATURITY_ROUTING_GAP_REPAIR_CARD_ID
  const closeoutKey = options.closeoutKey || SOURCE_MATURITY_ROUTING_GAP_REPAIR_CLOSEOUT_KEY
  const actor = options.actor || 'codex-source-maturity-routing-gap-repair'
  const synthesisScopeKey = options.synthesisScopeKey || 'source-maturity-routing-gap-repair-v1'
  const fact = candidate.fact
  const atom = candidate.atom
  const chunk = candidate.chunk
  if (!fact || !atom || !chunk) {
    return { ok: false, failures: uniqueText(failures.length ? failures : ['missing_candidate_evidence']), sourceId }
  }

  const naturalKey = options.naturalKey || `source-maturity-routing-gap-repair:${sourceId}:owner-review`
  const synthesisRunId = `source-maturity-routing-gap-repair-${sourceId.toLowerCase()}`
  const routeRunId = `source-maturity-routing-gap-repair-route-${sourceId.toLowerCase()}`
  const synthesizedItemId = stableId('synthesized-item', naturalKey)
  const minTier = minTierFromRows([fact, atom, chunk])
  const sensitivity = atom.sensitivity || fact.sensitivity || chunk.sensitivity || 'neutral'
  const title = `${sourceId} source-backed review route`
  const summary = `${sourceId} has active source-health proof and current tier-one evidence but no internal action-route signal; route it to owner review before any action is applied.`
  const sourceIds = [sourceId]
  const factRefs = [fact.factId]
  const evidenceRefs = [atom.atomId]
  const evidenceChunkRefs = [chunk.chunkId]
  const atomRefs = [atom.atomId]
  const candidateKeys = uniqueText([atom.candidateKey, chunk.candidateKey])
  const artifactIds = uniqueText([atom.artifactId, chunk.artifactId])

  const item = {
    synthesizedItemId,
    naturalKey,
    synthesisScopeKey,
    runId: synthesisRunId,
    itemType: 'source_health_issue',
    status: 'needs_owner',
    reviewOrder: 1,
    title,
    summary,
    suggestedOwner: 'needs-owner-decision',
    ownerConfidence: 'needs_owner',
    ownerResolutionReason: 'source maturity repair routes evidence to review without applying any action',
    ownerAction: 'Review the source-backed operational signal and decide whether it should become a backlog task, question, decision, duplicate, snooze, or rejection.',
    sourceIds,
    factRefs,
    evidenceRefs,
    evidenceChunkRefs,
    atomRefs,
    candidateKeys,
    artifactIds,
    sensitivity,
    minTier,
    attributes: {
      synthesisQuality: 'clustered',
      routeScope: 'operational',
      strategyHubEligible: false,
      themeKey: naturalKey,
      sourceMaturityRepair: cardId,
    },
    routingStatus: 'unrouted',
    metadata: {
      sourceMaturityRoutingGapRepair: true,
      sourceMaturityTargetSourceId: sourceId,
      cardId,
      closeoutKey,
      routeScope: 'operational',
      reviewSurface: 'operations',
      noLiveExtraction: true,
      noExternalWrite: true,
      recordedAt: now,
    },
  }

  const evidenceIndex = buildSynthesisEvidenceIndex({
    sourceIds,
    facts: [fact],
    atoms: [atom],
    chunks: [chunk],
  })
  const itemVerification = verifySynthesizedRecord({
    surface: 'intelligence_synthesized_items',
    record: item,
  }, evidenceIndex)
  if (itemVerification.status !== 'verified') {
    failures.push(`synthesized_item_not_verified:${list(itemVerification.blockedReasons).join(',') || itemVerification.status}`)
  }
  item.metadata = {
    ...item.metadata,
    [SYNTHESIS_VERIFICATION_METADATA_KEY]: itemVerification,
  }

  const routeId = stableId('action-route', `${synthesizedItemId}|needs_owner_decision|open_questions|needs-owner-decision`)
  const route = {
    routeId,
    runId: routeRunId,
    synthesizedItemId,
    synthesizedItemNaturalKey: naturalKey,
    routeType: 'needs_owner_decision',
    destinationTable: 'open_questions',
    approvalStatus: 'pending',
    approvalRequired: true,
    owner: 'needs-owner-decision',
    ownerConfidence: 'needs_owner',
    routingReason: 'Source maturity routing repair found source-backed evidence with no internal action route; human owner decision is required before any action is applied.',
    sourceIds,
    factRefs,
    evidenceRefs,
    evidenceChunkRefs,
    atomRefs,
    candidateKeys,
    artifactIds,
    sensitivity,
    minTier,
    proposedPayload: {
      title: `${sourceId}: decide routing for source-backed operational signal`,
      summary,
      question: 'Should this source-backed operational signal be promoted, assigned, linked to an existing card, rejected, duplicated, or snoozed?',
      sourceId,
      sourceRefs: [...sourceIds, ...factRefs, ...evidenceRefs, ...evidenceChunkRefs],
      noExternalWrite: true,
      approvalRequired: true,
    },
    metadata: {
      sourceMaturityRoutingGapRepair: true,
      sourceMaturityTargetSourceId: sourceId,
      cardId,
      closeoutKey,
      proposedBy: actor,
      approvalGate: 'human_required_before_destination_write',
      routeScope: 'operational',
      reviewSurface: 'operations',
      noLiveExtraction: true,
      noExternalWrite: true,
      recordedAt: now,
    },
  }
  const routeVerification = verifySynthesizedRecord({
    surface: 'intelligence_action_routes',
    record: route,
  }, evidenceIndex)
  if (routeVerification.status !== 'verified') {
    failures.push(`action_route_not_verified:${list(routeVerification.blockedReasons).join(',') || routeVerification.status}`)
  }
  route.metadata = {
    ...route.metadata,
    [SYNTHESIS_VERIFICATION_METADATA_KEY]: routeVerification,
  }

  return {
    ok: failures.length === 0,
    failures: uniqueText(failures),
    sourceId,
    synthesisRun: {
      runId: synthesisRunId,
      runType: 'governed_synthesis',
      status: 'succeeded',
      sourceIds,
      factCount: factRefs.length,
      evidenceCount: evidenceRefs.length,
      itemCount: 1,
      maxTier: minTier,
      metadata: {
        cardId,
        closeoutKey,
        proofOnly: true,
        qualityExempt: true,
        qualityExemptReason: 'targeted_source_maturity_repair_not_global_synthesis_quality_run',
        noLiveExtraction: true,
        noExternalWrite: true,
      },
    },
    routeRun: {
      runId: routeRunId,
      runType: 'route_proposal',
      status: 'succeeded',
      sourceIds,
      synthesizedItemCount: 1,
      routeCount: 1,
      maxTier: minTier,
      metadata: {
        cardId,
        closeoutKey,
        approvalGate: 'human_required_before_destination_write',
        noLiveExtraction: true,
        noExternalWrite: true,
      },
    },
    item,
    route,
    verification: {
      item: itemVerification,
      route: routeVerification,
    },
  }
}

export function evaluateSourceMaturityRoutingGapRepair({
  beforeRow = {},
  afterRow = {},
  candidate = {},
  records = {},
  routeRow = null,
} = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const beforeRouteSignals = Number(beforeRow.metrics?.routeSignals || 0)
  const alreadyRepaired = Boolean(routeRow) && beforeRow.nextGap !== 'routed' && beforeRouteSignals >= 1
  add(beforeRow.nextGap === 'routed' || alreadyRepaired, 'target source starts at routed gap or is already repaired', `${beforeRow.sourceId || 'missing'}:${beforeRow.nextGap || 'missing'}`)
  add(beforeRouteSignals === 0 || alreadyRepaired, 'target source starts without route signal or is already repaired', String(beforeRow.metrics?.routeSignals ?? 'missing'))
  add(candidate.ok, 'source-backed repair candidate exists', list(candidate.failures).join(', ') || candidate.sourceId)
  add(records.ok, 'repair records are verified', list(records.failures).join(', ') || records.route?.routeId)
  add(routeRow ? routeRow.approvalStatus === 'pending' : false, 'route remains pending approval', routeRow?.approvalStatus || 'missing')
  add(routeRow ? routeRow.approvalRequired === true : false, 'route requires approval before apply', String(routeRow?.approvalRequired ?? 'missing'))
  add(routeRow ? !routeRow.destinationRecordId : false, 'route has no destination record applied', routeRow?.destinationRecordId || 'none')
  add(routeRow ? routeRow.metadata?.noExternalWrite === true : false, 'route records no external write', JSON.stringify(routeRow?.metadata || {}))
  add(Number(afterRow.metrics?.routeSignals || 0) >= 1, 'target source has route signal after repair', String(afterRow.metrics?.routeSignals ?? 'missing'))
  add(afterRow.nextGap !== 'routed', 'target source no longer blocks on routed gap', afterRow.nextGap || 'missing')
  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'risk' : 'healthy',
    checks,
    failures,
    summary: {
      sourceId: candidate.sourceId || beforeRow.sourceId || afterRow.sourceId || SOURCE_MATURITY_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID,
      beforeNextGap: beforeRow.nextGap || null,
      afterNextGap: afterRow.nextGap || null,
      beforeRouteSignals,
      afterRouteSignals: Number(afterRow.metrics?.routeSignals || 0),
      routeId: records.route?.routeId || routeRow?.routeId || null,
      approvalStatus: routeRow?.approvalStatus || records.route?.approvalStatus || null,
      noExternalWrite: routeRow?.metadata?.noExternalWrite === true || records.route?.metadata?.noExternalWrite === true,
    },
  }
}

export function buildSyntheticSourceMaturityRoutingGapRepairProof() {
  const fact = {
    factId: 'fact:slack-health',
    factType: 'source_health',
    sourceId: 'SRC-SLACK-001',
    sourceIds: ['SRC-SLACK-001'],
    title: 'Slack current-day sync lane',
    claim: 'slack-current-day is active with last status succeeded.',
    value: 'succeeded',
    detail: 'Synthetic active source-health fact.',
    status: 'active',
    sensitivity: 'neutral',
    minTier: 1,
  }
  const atom = {
    atomId: 'atom:slack-operational',
    sourceId: 'SRC-SLACK-001',
    title: 'Operations channel reports the system is now live',
    content: 'A current operations thread records that the team is now live.',
    atomType: 'observation',
    status: 'detected',
    candidateKey: 'SRC-SLACK-001:synthetic:atom_candidate:live',
    artifactId: 'SRC-SLACK-001:synthetic',
    sensitivity: 'neutral',
    minTier: 1,
  }
  const chunk = {
    chunkId: 'chunk:slack-operational',
    sourceId: 'SRC-SLACK-001',
    atomId: atom.atomId,
    candidateKey: atom.candidateKey,
    artifactId: atom.artifactId,
    title: atom.title,
    body: atom.content,
    status: 'active',
    sensitivity: 'neutral',
    minTier: 1,
  }
  const candidate = selectSourceMaturityRoutingRepairCandidate({
    sourceId: 'SRC-SLACK-001',
    facts: [fact],
    atoms: [atom],
    chunks: [chunk],
  })
  const records = buildSourceMaturityRoutingRepairRecords(candidate, '2026-05-18T05:00:00.000Z')
  const missingChunk = selectSourceMaturityRoutingRepairCandidate({
    sourceId: 'SRC-SLACK-001',
    facts: [fact],
    atoms: [atom],
    chunks: [],
  })
  const evaluation = evaluateSourceMaturityRoutingGapRepair({
    beforeRow: { sourceId: 'SRC-SLACK-001', nextGap: 'routed', metrics: { routeSignals: 0 } },
    afterRow: { sourceId: 'SRC-SLACK-001', nextGap: 'complete', metrics: { routeSignals: 1 } },
    candidate,
    records,
    routeRow: {
      ...records.route,
      approvalRequired: true,
      destinationRecordId: null,
    },
  })
  return {
    ok: candidate.ok &&
      records.ok &&
      evaluation.ok &&
      !missingChunk.ok &&
      missingChunk.failures.includes('missing_active_tier_one_evidence_chunk') &&
      records.route.approvalRequired === true &&
      records.route.approvalStatus === 'pending' &&
      records.route.metadata.noExternalWrite === true,
    candidate,
    records,
    missingChunk,
    evaluation,
  }
}

export function renderSourceMaturityRoutingGapRepairCloseout(snapshot = {}) {
  const lines = []
  const summary = snapshot.summary || {}
  lines.push('# Source Maturity Routing Gap Repair Closeout')
  lines.push('')
  lines.push(`Card: \`${SOURCE_MATURITY_ROUTING_GAP_REPAIR_CARD_ID}\``)
  lines.push(`Closeout key: \`${SOURCE_MATURITY_ROUTING_GAP_REPAIR_CLOSEOUT_KEY}\``)
  lines.push('')
  lines.push('## What Shipped')
  lines.push('')
  lines.push(`- Routed \`${summary.sourceId || SOURCE_MATURITY_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID}\` from an existing source-backed maturity gap into the internal Action Route Review layer.`)
  lines.push(`- Created an approval-required pending route: \`${summary.routeId || 'pending route'}\`.`)
  lines.push('- The route uses existing source-health fact, atom, and retrieval chunk evidence only.')
  lines.push('- No action route was applied; no destination backlog/decision/question record was written.')
  lines.push('')
  lines.push('## Proof')
  lines.push('')
  lines.push(`- Before next gap on this proof run: \`${summary.beforeNextGap || 'unknown'}\`.`)
  lines.push(`- After next gap on this proof run: \`${summary.afterNextGap || 'unknown'}\`.`)
  lines.push(`- Route signals on this proof run: ${summary.beforeRouteSignals ?? 0} -> ${summary.afterRouteSignals ?? 0}.`)
  lines.push('- Building-now proof created the transition from `routed` to `complete`; later closeout reruns are idempotent and may show `complete` before and after.')
  lines.push('- Focused proof dogfoods missing evidence chunk failure, verified synthesized item/route metadata, pending approval gate, no destination apply, and no external write posture.')
  lines.push('- Full `process:foundation-ship` is required before push.')
  lines.push('')
  lines.push('## Boundaries')
  lines.push('')
  for (const boundary of SOURCE_MATURITY_ROUTING_GAP_REPAIR_NOT_NEXT_BOUNDARIES) {
    lines.push(`- ${boundary}`)
  }
  lines.push('')
  lines.push('## Next')
  lines.push('')
  lines.push('Continue the safe source maturity child queue from live source coverage truth. Prefer evidence or atom-flow repair only where existing source-backed evidence is sufficient; otherwise mark blocked/pending instead of inventing truth.')
  lines.push('')
  return `${lines.join('\n')}\n`
}
