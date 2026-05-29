import { createHash } from 'node:crypto'

import {
  buildSourceMaturityRoutingRepairRecords,
  evaluateSourceMaturityRoutingGapRepair,
  selectSourceMaturityRoutingRepairCandidate,
} from './source-maturity-routing-gap-repair.js'

export const SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_CARD_ID = 'SOURCE-MATURITY-FUB-ROUTING-GAP-REPAIR-001'
export const SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_CLOSEOUT_KEY = 'source-maturity-fub-routing-gap-repair-v1'
export const SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_PLAN_PATH = 'docs/process/source-maturity-fub-routing-gap-repair-001-plan.md'
export const SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_APPROVAL_PATH = 'docs/process/approvals/SOURCE-MATURITY-FUB-ROUTING-GAP-REPAIR-001.json'
export const SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-29-hot-doc-refresh/2026-05-18-source-maturity-fub-routing-gap-repair-closeout.md'
export const SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_SCRIPT_PATH = 'scripts/process-source-maturity-fub-routing-gap-repair-check.mjs'
export const SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_SPRINT_ID = 'source-maturity-fub-routing-gap-repair-2026-05-18'
export const SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID = 'SRC-FUB-001'
export const SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_TARGET_FACT_ID = 'fact:af613c177546ec2a7267b669'
export const SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_TARGET_ATOM_ID = 'atom:a324d8e68f80c29e07daf2c3'
export const SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_TARGET_CHUNK_ID = 'chunk:source-maturity-fub-crm-source-truth-review'

export const SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_NOT_NEXT_BOUNDARIES = [
  'No live extraction, extraction target creation, transcript fetch, screenshot capture, crawl, or model/provider call.',
  'No FUB API call.',
  'No CRM mutation.',
  'No auth-required or paid run.',
  'No Google Sheets read/write.',
  'No external write.',
  'No action-route apply; proposed internal routes must stay approval-required and pending.',
  'No Google Drive permission mutation.',
  'Do not mutate Drive permissions.',
  'No live Agent Feedback auto-send.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
  'No broad Foundation UI redesign.',
]

export const SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_PROOF_COMMANDS = [
  'node --check lib/source-maturity-fub-routing-gap-repair.js scripts/process-source-maturity-fub-routing-gap-repair-check.mjs',
  'npm run process:source-maturity-fub-routing-gap-repair-check -- --apply --stage=building_now --json',
  'npm run process:source-maturity-fub-routing-gap-repair-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=SOURCE-MATURITY-FUB-ROUTING-GAP-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-FUB-ROUTING-GAP-REPAIR-001.json --closeoutKey=source-maturity-fub-routing-gap-repair-v1 --commitRef=HEAD',
]

export const SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_CHANGED_FILES = [
  'lib/source-maturity-fub-routing-gap-repair.js',
  'lib/source-maturity-routing-gap-repair-db.js',
  'lib/foundation-build-closeout-source-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_SCRIPT_PATH,
  'package.json',
  SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_PLAN_PATH,
  SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_APPROVAL_PATH,
  SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_CLOSEOUT_PATH,
  'docs/rebuild/current-state.md',
  'docs/rebuild/current-plan.md',
]

function stableHash(value) {
  return createHash('sha256').update(String(value || '')).digest('hex')
}

export function buildFUBRoutingRetrievalChunk(atom = {}, fact = {}) {
  const body = String(atom.content || fact.claim || '').trim()
  const title = String(atom.title || fact.title || 'SRC-FUB-001 FUB CRM source truth route path').trim()
  return {
    chunkId: SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_TARGET_CHUNK_ID,
    chunkType: 'proof',
    sourceId: SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID,
    atomId: SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_TARGET_ATOM_ID,
    title,
    body,
    bodyHash: stableHash([title, body].join('\n')),
    anchorType: 'source_fact',
    anchorValue: SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_TARGET_FACT_ID,
    sensitivity: atom.sensitivity || fact.sensitivity || 'neutral',
    minTier: Math.max(Number(atom.minTier ?? atom.min_tier ?? 1) || 1, Number(fact.minTier ?? fact.min_tier ?? 1) || 1),
    status: 'active',
    metadata: {
      cardId: SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_CARD_ID,
      closeoutKey: SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
      sourceFactId: SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_TARGET_FACT_ID,
      noLiveExtraction: true,
      noExternalWrite: true,
      noGoogleSheetsReadWrite: true,
      noFubApiCall: true,
      noCrmMutation: true,
      sourceMaturityRoutingReadinessRepair: true,
    },
  }
}

export function buildFUBRoutingRepairRecords(candidate = {}, now = new Date().toISOString()) {
  return buildSourceMaturityRoutingRepairRecords(candidate, now, {
    actor: 'codex-source-maturity-fub-routing-gap-repair',
    cardId: SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_CARD_ID,
    closeoutKey: SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
    naturalKey: `source-maturity-routing-gap-repair:${SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID}:fub-current-reality-owner-review`,
    synthesisScopeKey: SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
  })
}

export function buildSyntheticFUBRoutingGapRepairProof() {
  const fact = {
    factId: SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_TARGET_FACT_ID,
    factType: 'source_contract',
    sourceId: SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID,
    sourceIds: [SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID],
    title: 'SRC-FUB-001: Follow Up Boss',
    claim: 'SRC-FUB-001 is the governed source for CRM contacts, user roster, lead-source context, and person-level linkage used for attribution and parity checks.',
    detail: 'Read access is revalidated in the rebuild with owner/support and Steve account API contexts; this routing repair uses the existing source fact and atom only and does not call FUB live or mutate CRM data.',
    status: 'active',
    sensitivity: 'neutral',
    minTier: 1,
  }
  const atom = {
    atomId: SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_TARGET_ATOM_ID,
    sourceId: SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID,
    title: 'SRC-FUB-001 FUB CRM source truth',
    content: 'SRC-FUB-001 is the governed source for CRM contacts, user roster, lead-source context, and person-level linkage used for attribution and parity checks. Read access is revalidated in the rebuild with owner/support and Steve account API contexts; this routing repair uses the existing source fact and atom only and does not call FUB live or mutate CRM data.',
    atomType: 'proof_point',
    status: 'accepted',
    sensitivity: 'neutral',
    minTier: 1,
  }
  const chunk = buildFUBRoutingRetrievalChunk(atom, fact)
  const candidate = selectSourceMaturityRoutingRepairCandidate({
    sourceId: SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID,
    facts: [fact],
    atoms: [atom],
    chunks: [chunk],
  })
  const records = buildFUBRoutingRepairRecords(candidate, '2026-05-18T07:30:00.000Z')
  const missingChunk = selectSourceMaturityRoutingRepairCandidate({
    sourceId: SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID,
    facts: [fact],
    atoms: [atom],
    chunks: [],
  })
  const evaluation = evaluateSourceMaturityRoutingGapRepair({
    beforeRow: {
      sourceId: SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID,
      nextGap: 'routed',
      metrics: { routeSignals: 0 },
    },
    afterRow: {
      sourceId: SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID,
      nextGap: 'complete',
      metrics: { routeSignals: 1 },
    },
    candidate,
    records,
    routeRow: {
      ...records.route,
      approvalRequired: true,
      destinationRecordId: null,
    },
  })
  return {
    ok: chunk.chunkId === SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_TARGET_CHUNK_ID &&
      chunk.metadata.noLiveExtraction === true &&
      candidate.ok &&
      records.ok &&
      evaluation.ok &&
      !missingChunk.ok &&
      missingChunk.failures.includes('missing_active_tier_one_evidence_chunk') &&
      records.route.approvalRequired === true &&
      records.route.approvalStatus === 'pending' &&
      records.route.metadata.noExternalWrite === true &&
      records.route.metadata.cardId === SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_CARD_ID,
    fact,
    atom,
    chunk,
    candidate,
    records,
    missingChunk,
    evaluation,
  }
}

export function renderFUBRoutingGapRepairCloseout(snapshot = {}) {
  const lines = []
  const summary = snapshot.summary || {}
  lines.push('# Source Maturity FUB Routing Gap Repair Closeout')
  lines.push('')
  lines.push(`Card: \`${SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_CARD_ID}\``)
  lines.push(`Closeout key: \`${SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_CLOSEOUT_KEY}\``)
  lines.push('')
  lines.push('## What Shipped')
  lines.push('')
  lines.push('- Created one active retrieval chunk for the existing `SRC-FUB-001` FUB CRM source-truth atom.')
  lines.push(`- Routed \`${summary.sourceId || SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID}\` into the internal Action Route Review layer.`)
  lines.push(`- Created an approval-required pending route: \`${summary.routeId || 'pending route'}\`.`)
  lines.push('- No action route was applied; no destination backlog/decision/question record was written.')
  lines.push('')
  lines.push('## Proof')
  lines.push('')
  lines.push(`- Before next gap on this proof run: \`${summary.beforeNextGap || 'unknown'}\`.`)
  lines.push(`- After next gap on this proof run: \`${summary.afterNextGap || 'unknown'}\`.`)
  lines.push(`- Route signals on this proof run: ${summary.beforeRouteSignals ?? 0} -> ${summary.afterRouteSignals ?? 0}.`)
  lines.push('- Building-now proof created the bounded retrieval chunk and route transition; later closeout reruns are idempotent and may show `complete` before and after.')
  lines.push('- Focused proof dogfoods missing evidence chunk failure, verified synthesized item/route metadata, pending approval gate, no destination apply, and no external write posture.')
  lines.push('- Full `process:foundation-ship` is required before push.')
  lines.push('')
  lines.push('## Boundaries')
  lines.push('')
  for (const boundary of SOURCE_MATURITY_FUB_ROUTING_GAP_REPAIR_NOT_NEXT_BOUNDARIES) lines.push(`- ${boundary}`)
  lines.push('')
  lines.push('## Next')
  lines.push('')
  lines.push('Continue the safe source maturity/source-contract queue from live truth. Atomized and monitored gaps remain; do not fabricate atoms or run live extraction to clear them.')
  lines.push('')
  return `${lines.join('\n')}\n`
}
