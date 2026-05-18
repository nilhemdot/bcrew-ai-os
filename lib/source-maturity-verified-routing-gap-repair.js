import { createHash } from 'node:crypto'

import {
  buildSourceMaturityRoutingRepairRecords,
  evaluateSourceMaturityRoutingGapRepair,
  selectSourceMaturityRoutingRepairCandidate,
} from './source-maturity-routing-gap-repair.js'

export const SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CARD_ID = 'SOURCE-MATURITY-VERIFIED-ROUTING-GAP-REPAIR-001'
export const SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CLOSEOUT_KEY = 'source-maturity-verified-routing-gap-repair-v1'
export const SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_PLAN_PATH = 'docs/process/source-maturity-verified-routing-gap-repair-001-plan.md'
export const SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_APPROVAL_PATH = 'docs/process/approvals/SOURCE-MATURITY-VERIFIED-ROUTING-GAP-REPAIR-001.json'
export const SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-source-maturity-verified-routing-gap-repair-closeout.md'
export const SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_SCRIPT_PATH = 'scripts/process-source-maturity-verified-routing-gap-repair-check.mjs'
export const SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_SPRINT_ID = 'source-maturity-verified-routing-gap-repair-2026-05-18'

export const SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS = [
  {
    sourceId: 'SRC-CLICKUP-001',
    factId: 'fact:44ecd00a1c18edd32086bc2e',
    atomId: 'atom:79bc05e6c8dd38bd4cba5b44',
    chunkId: 'chunk:source-maturity-clickup-verified-boundary-review',
    label: 'ClickUp',
    routeSlug: 'clickup-verified-boundary-owner-review',
  },
  {
    sourceId: 'SRC-GDOCS-001',
    factId: 'fact:95460ff02f9ff168ea45a467',
    atomId: 'atom:717f538b22e4c8361b774bcd',
    chunkId: 'chunk:source-maturity-google-docs-verified-boundary-review',
    label: 'Google Docs Source Type',
    routeSlug: 'google-docs-verified-boundary-owner-review',
  },
  {
    sourceId: 'SRC-GSHEETS-001',
    factId: 'fact:9072210d62317f86ff231c7c',
    atomId: 'atom:8ba533dce84c8837b07d544c',
    chunkId: 'chunk:source-maturity-google-sheets-verified-boundary-review',
    label: 'Google Sheets Source Type',
    routeSlug: 'google-sheets-verified-boundary-owner-review',
  },
  {
    sourceId: 'SRC-DATAFORSEO-001',
    factId: 'fact:a6571fb06859cecd05138fac',
    atomId: 'atom:dda7a732d7a2bec53cdc6d99',
    chunkId: 'chunk:source-maturity-dataforseo-verified-boundary-review',
    label: 'DataForSEO',
    routeSlug: 'dataforseo-verified-boundary-owner-review',
  },
  {
    sourceId: 'SRC-GHL-001',
    factId: 'fact:edcecea350071c499e040514',
    atomId: 'atom:74e61df97724577e92ecbbae',
    chunkId: 'chunk:source-maturity-ghl-verified-boundary-review',
    label: 'GoHighLevel',
    routeSlug: 'ghl-verified-boundary-owner-review',
  },
  {
    sourceId: 'SRC-META-001',
    factId: 'fact:905fde9fc2fcf1d0f24662a1',
    atomId: 'atom:5ea6a2a9c629367e4ba752d8',
    chunkId: 'chunk:source-maturity-meta-verified-boundary-review',
    label: 'Meta API',
    routeSlug: 'meta-verified-boundary-owner-review',
  },
]

export const SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID = SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS[0].sourceId
export const SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGET_FACT_ID = SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS[0].factId
export const SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGET_ATOM_ID = SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS[0].atomId
export const SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGET_CHUNK_ID = SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS[0].chunkId

export const SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_NOT_NEXT_BOUNDARIES = [
  'No live extraction, extraction target creation, transcript fetch, screenshot capture, crawl, or model/provider call.',
  'No auth-required or paid run.',
  'No live provider/source read or write.',
  'No external write.',
  'No action-route apply; proposed internal routes must stay approval-required and pending.',
  'No Google Drive permission mutation.',
  'Do not mutate Drive permissions.',
  'No live Agent Feedback auto-send.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
  'No broad Foundation UI redesign.',
]

export const SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_PROOF_COMMANDS = [
  'node --check lib/source-maturity-routing-gap-repair.js lib/source-maturity-routing-gap-repair-db.js lib/source-maturity-verified-routing-gap-repair.js lib/intelligence-action-router.js lib/strategy-shared-comms-routes.js scripts/process-source-maturity-verified-routing-gap-repair-check.mjs',
  'npm run process:source-maturity-verified-routing-gap-repair-check -- --apply --stage=building_now --json',
  'npm run process:source-maturity-verified-routing-gap-repair-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=SOURCE-MATURITY-VERIFIED-ROUTING-GAP-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-VERIFIED-ROUTING-GAP-REPAIR-001.json --closeoutKey=source-maturity-verified-routing-gap-repair-v1 --commitRef=HEAD',
]

export const SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CHANGED_FILES = [
  'lib/source-maturity-verified-routing-gap-repair.js',
  'lib/intelligence-action-router.js',
  'lib/strategy-shared-comms-routes.js',
  'lib/foundation-build-closeout-source-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_SCRIPT_PATH,
  'package.json',
  SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_PLAN_PATH,
  SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_APPROVAL_PATH,
  SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CLOSEOUT_PATH,
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

function targetBySourceId(sourceId) {
  return SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS.find(target => target.sourceId === sourceId) || null
}

function rowBySourceId(rows = [], sourceId) {
  return list(rows).find(row => row.sourceId === sourceId || row.source_id === sourceId) || {}
}

export function buildVerifiedSourceRoutingRetrievalChunk(target = SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS[0], atom = {}, fact = {}) {
  const body = text(atom.content || atom.evidenceExcerpt || atom.derivedClaim || fact.claim || fact.detail || fact.value)
  const title = text(atom.title || fact.title || `${target.sourceId} ${target.label} current-reality route path`)
  return {
    chunkId: target.chunkId,
    chunkType: 'proof',
    sourceId: target.sourceId,
    atomId: target.atomId,
    title,
    body,
    bodyHash: stableHash([title, body].join('\n')),
    anchorType: 'source_fact',
    anchorValue: target.factId,
    sensitivity: atom.sensitivity || fact.sensitivity || 'neutral',
    minTier: Math.max(Number(atom.minTier ?? atom.min_tier ?? 1) || 1, Number(fact.minTier ?? fact.min_tier ?? 1) || 1),
    status: 'active',
    metadata: {
      cardId: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CARD_ID,
      closeoutKey: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
      sourceFactId: target.factId,
      noLiveExtraction: true,
      noProviderCall: true,
      noPaidRun: true,
      noSourceReadWrite: true,
      noExternalWrite: true,
      sourceMaturityRoutingReadinessRepair: true,
    },
  }
}

export function buildVerifiedSourceRoutingRepairRecords(candidate = {}, now = new Date().toISOString(), target = targetBySourceId(candidate.sourceId)) {
  const resolvedTarget = target || targetBySourceId(candidate.sourceId) || SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS[0]
  return buildSourceMaturityRoutingRepairRecords(candidate, now, {
    actor: 'codex-source-maturity-verified-routing-gap-repair',
    cardId: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CARD_ID,
    closeoutKey: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
    naturalKey: `source-maturity-routing-gap-repair:${resolvedTarget.sourceId}:${resolvedTarget.routeSlug}`,
    synthesisScopeKey: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
  })
}

export function evaluateVerifiedSourceRoutingGapRepairs({
  beforeRows = [],
  afterRows = [],
  candidates = [],
  records = [],
  routeRows = [],
} = {}) {
  const checks = []
  const summaries = []
  for (const target of SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS) {
    const candidate = list(candidates).find(item => item.sourceId === target.sourceId) || {}
    const record = list(records).find(item => item.sourceId === target.sourceId) || {}
    const routeRow = list(routeRows).find(row => row.routeId === record.route?.routeId) || null
    const evaluation = evaluateSourceMaturityRoutingGapRepair({
      beforeRow: rowBySourceId(beforeRows, target.sourceId),
      afterRow: rowBySourceId(afterRows, target.sourceId),
      candidate,
      records: record,
      routeRow,
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
      sourceIds: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS.map(target => target.sourceId),
      routeIds: summaries.map(summary => summary.routeId).filter(Boolean),
      beforeNextGaps: summaries.map(summary => `${summary.sourceId}:${summary.beforeNextGap || 'unknown'}`),
      afterNextGaps: summaries.map(summary => `${summary.sourceId}:${summary.afterNextGap || 'unknown'}`),
      routeSignals: summaries.map(summary => `${summary.sourceId}:${summary.beforeRouteSignals ?? 0}->${summary.afterRouteSignals ?? 0}`),
      approvalStatuses: summaries.map(summary => `${summary.sourceId}:${summary.approvalStatus || 'unknown'}`),
      noExternalWrite: summaries.every(summary => summary.noExternalWrite === true),
    },
  }
}

function buildSyntheticTargetRows(target) {
  const fact = {
    factId: target.factId,
    factType: 'source_contract',
    sourceId: target.sourceId,
    sourceIds: [target.sourceId],
    title: `${target.sourceId}: ${target.label}`,
    claim: `${target.sourceId} is a verified/readable source boundary and can be routed for owner review from existing governed evidence only.`,
    detail: 'Synthetic proof uses local fact/atom/chunk rows only; no source read/write, live extraction, provider call, or external write occurs.',
    status: 'active',
    sensitivity: 'neutral',
    minTier: 1,
  }
  const atom = {
    atomId: target.atomId,
    sourceId: target.sourceId,
    title: `${target.label} current-reality source boundary`,
    content: `${target.sourceId} is a verified/readable source boundary and can be routed for owner review from existing governed evidence only.`,
    atomType: 'proof_point',
    status: 'accepted',
    sensitivity: 'neutral',
    minTier: 1,
  }
  const chunk = buildVerifiedSourceRoutingRetrievalChunk(target, atom, fact)
  return { fact, atom, chunk }
}

export function buildSyntheticVerifiedSourceRoutingGapRepairProof(now = '2026-05-18T10:10:00.000Z') {
  const candidates = []
  const records = []
  const routeRows = []
  const missingChunkChecks = []
  const beforeRows = []
  const afterRows = []
  const chunks = []
  for (const target of SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS) {
    const { fact, atom, chunk } = buildSyntheticTargetRows(target)
    chunks.push(chunk)
    const candidate = selectSourceMaturityRoutingRepairCandidate({
      sourceId: target.sourceId,
      facts: [fact],
      atoms: [atom],
      chunks: [chunk],
    })
    const record = buildVerifiedSourceRoutingRepairRecords(candidate, now, target)
    const missingChunk = selectSourceMaturityRoutingRepairCandidate({
      sourceId: target.sourceId,
      facts: [fact],
      atoms: [atom],
      chunks: [],
    })
    candidates.push(candidate)
    records.push(record)
    routeRows.push({ ...record.route, approvalRequired: true, destinationRecordId: null })
    missingChunkChecks.push(!missingChunk.ok && missingChunk.failures.includes('missing_active_tier_one_evidence_chunk'))
    beforeRows.push({ sourceId: target.sourceId, nextGap: 'routed', metrics: { routeSignals: 0 } })
    afterRows.push({ sourceId: target.sourceId, nextGap: 'complete', metrics: { routeSignals: 1 } })
  }
  const evaluation = evaluateVerifiedSourceRoutingGapRepairs({ beforeRows, afterRows, candidates, records, routeRows })
  return {
    ok: chunks.every(chunk => chunk.metadata.noLiveExtraction === true && chunk.metadata.noProviderCall === true && chunk.metadata.noSourceReadWrite === true) &&
      candidates.every(candidate => candidate.ok) &&
      records.every(record => record.ok && record.route.approvalRequired === true && record.route.approvalStatus === 'pending' && record.route.metadata.noExternalWrite === true) &&
      missingChunkChecks.every(Boolean) &&
      evaluation.ok,
    chunks,
    candidates,
    records,
    routeRows,
    missingChunkChecks,
    evaluation,
  }
}

export function renderVerifiedSourceRoutingGapRepairCloseout(snapshot = {}) {
  const summary = snapshot.summary || {}
  const targets = list(summary.targets)
  const lines = []
  lines.push('# Source Maturity Verified Source Routing Gap Repair Closeout')
  lines.push('')
  lines.push(`Card: \`${SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CARD_ID}\``)
  lines.push(`Closeout key: \`${SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CLOSEOUT_KEY}\``)
  lines.push('')
  lines.push('## What Shipped')
  lines.push('')
  lines.push(`- Created ${targets.length || SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS.length} active retrieval chunks for the existing verified/readable source atoms.`)
  for (const target of targets) {
    lines.push(`- \`${target.sourceId}\`: route \`${target.routeId || 'pending route'}\`, gap \`${target.beforeNextGap || 'unknown'}\` -> \`${target.afterNextGap || 'unknown'}\`.`)
  }
  if (!targets.length) {
    lines.push(`- Target sources: ${SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS.map(target => `\`${target.sourceId}\``).join(', ')}.`)
  }
  lines.push('- Created approval-required pending internal routes only; no action route was applied and no destination record was written.')
  lines.push('- The repair uses existing source facts, existing accepted atoms, and new bounded retrieval chunks only.')
  lines.push('- Repaired the exposed Strategy Hub route-window gate so operational route inserts cannot push strategy review routes out of the Strategy Hub v2 payload.')
  lines.push('')
  lines.push('## Proof')
  lines.push('')
  lines.push(`- Before next gaps on this proof run: ${(summary.beforeNextGaps || []).join(', ') || 'unknown'}.`)
  lines.push(`- After next gaps on this proof run: ${(summary.afterNextGaps || []).join(', ') || 'unknown'}.`)
  lines.push(`- Route signals on this proof run: ${(summary.routeSignals || []).join(', ') || 'unknown'}.`)
  lines.push('- Building-now proof created the transition from `routed` to `complete`; later closeout reruns are idempotent and may show `complete` before and after.')
  lines.push('- Focused proof dogfoods missing evidence chunk failure, verified synthesized item/route metadata, pending approval gate, no destination apply, no external write, no provider/source read/write, Plan Critic, Current Sprint metadata, closeout registry, and source maturity grid movement.')
  lines.push('- Full `process:foundation-ship` is required before push.')
  lines.push('')
  lines.push('## Boundaries')
  lines.push('')
  for (const boundary of SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_NOT_NEXT_BOUNDARIES) lines.push(`- ${boundary}`)
  lines.push('')
  lines.push('## Next')
  lines.push('')
  lines.push('Continue safe source maturity/source-contract work from live truth. If a source needs live extraction, auth-required access, paid spend, or external writes, mark it blocked/pending approval and move to the next safe Foundation card.')
  lines.push('')
  return `${lines.join('\n')}\n`
}
