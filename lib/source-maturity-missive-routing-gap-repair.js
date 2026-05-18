import {
  buildSourceMaturityRoutingRepairRecords,
  evaluateSourceMaturityRoutingGapRepair,
  selectSourceMaturityRoutingRepairCandidate,
} from './source-maturity-routing-gap-repair.js'

export const SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CARD_ID = 'SOURCE-MATURITY-MISSIVE-ROUTING-GAP-REPAIR-001'
export const SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY = 'source-maturity-missive-routing-gap-repair-v1'
export const SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_PLAN_PATH = 'docs/process/source-maturity-missive-routing-gap-repair-001-plan.md'
export const SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_APPROVAL_PATH = 'docs/process/approvals/SOURCE-MATURITY-MISSIVE-ROUTING-GAP-REPAIR-001.json'
export const SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-source-maturity-missive-routing-gap-repair-closeout.md'
export const SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_SCRIPT_PATH = 'scripts/process-source-maturity-missive-routing-gap-repair-check.mjs'
export const SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_SPRINT_ID = 'source-maturity-missive-routing-gap-repair-2026-05-18'
export const SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID = 'SRC-MISSIVE-001'
export const SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_ATOM_ID = 'atom:shared-candidate:669f63ab79db7dc0bd59626b'
export const SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_CHUNK_ID = 'chunk:shared-candidate:669f63ab79db7dc0bd59626b'

export const SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_NOT_NEXT_BOUNDARIES = [
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

export const SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_PROOF_COMMANDS = [
  'node --check lib/source-maturity-routing-gap-repair.js lib/source-maturity-missive-routing-gap-repair.js scripts/process-source-maturity-missive-routing-gap-repair-check.mjs',
  'npm run process:source-maturity-missive-routing-gap-repair-check -- --apply --stage=building_now --json',
  'npm run process:source-maturity-missive-routing-gap-repair-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=SOURCE-MATURITY-MISSIVE-ROUTING-GAP-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-MISSIVE-ROUTING-GAP-REPAIR-001.json --closeoutKey=source-maturity-missive-routing-gap-repair-v1 --commitRef=HEAD',
]

export const SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CHANGED_FILES = [
  'lib/source-maturity-routing-gap-repair.js',
  'lib/source-maturity-missive-routing-gap-repair.js',
  'lib/foundation-build-closeout-source-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_SCRIPT_PATH,
  'package.json',
  SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_PLAN_PATH,
  SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_APPROVAL_PATH,
  SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_PATH,
  'docs/rebuild/current-state.md',
  'docs/rebuild/current-plan.md',
]

export function buildMissiveRoutingRepairRecords(candidate = {}, now = new Date().toISOString()) {
  return buildSourceMaturityRoutingRepairRecords(candidate, now, {
    actor: 'codex-source-maturity-missive-routing-gap-repair',
    cardId: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CARD_ID,
    closeoutKey: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
    naturalKey: `source-maturity-routing-gap-repair:${SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID}:missive-owner-review`,
    synthesisScopeKey: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
  })
}

export function buildSyntheticMissiveRoutingGapRepairProof() {
  const fact = {
    factId: 'fact:missive-health',
    factType: 'source_health',
    sourceId: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID,
    sourceIds: [SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID],
    title: 'SRC-MISSIVE-001: Missive current-day sync lane',
    claim: 'missive-current-day is active with last status succeeded.',
    value: 'succeeded',
    detail: 'Synthetic active source-health fact.',
    status: 'active',
    sensitivity: 'neutral',
    minTier: 1,
  }
  const atom = {
    atomId: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_ATOM_ID,
    sourceId: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID,
    title: 'Atlassian organization now has Goals and Projects enabled',
    content: 'The organization has been provisioned with Atlassian Goals and Projects.',
    atomType: 'observation',
    status: 'detected',
    candidateKey: 'SRC-MISSIVE-001:synthetic:atom_candidate:atlassian-goals',
    artifactId: 'SRC-MISSIVE-001:synthetic',
    sensitivity: 'neutral',
    minTier: 1,
  }
  const chunk = {
    chunkId: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_CHUNK_ID,
    sourceId: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID,
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
    sourceId: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID,
    facts: [fact],
    atoms: [atom],
    chunks: [chunk],
  })
  const records = buildMissiveRoutingRepairRecords(candidate, '2026-05-18T05:30:00.000Z')
  const missingFact = selectSourceMaturityRoutingRepairCandidate({
    sourceId: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID,
    facts: [],
    atoms: [atom],
    chunks: [chunk],
  })
  const missingChunk = selectSourceMaturityRoutingRepairCandidate({
    sourceId: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID,
    facts: [fact],
    atoms: [atom],
    chunks: [],
  })
  const evaluation = evaluateSourceMaturityRoutingGapRepair({
    beforeRow: {
      sourceId: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID,
      nextGap: 'routed',
      metrics: { routeSignals: 0 },
    },
    afterRow: {
      sourceId: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID,
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
    ok: candidate.ok &&
      records.ok &&
      evaluation.ok &&
      !missingFact.ok &&
      missingFact.failures.includes('missing_active_tier_one_source_fact') &&
      !missingChunk.ok &&
      missingChunk.failures.includes('missing_active_tier_one_evidence_chunk') &&
      records.route.approvalRequired === true &&
      records.route.approvalStatus === 'pending' &&
      records.route.metadata.noExternalWrite === true &&
      records.route.metadata.cardId === SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CARD_ID,
    candidate,
    records,
    missingFact,
    missingChunk,
    evaluation,
  }
}

export function renderMissiveRoutingGapRepairCloseout(snapshot = {}) {
  const lines = []
  const summary = snapshot.summary || {}
  lines.push('# Source Maturity Missive Routing Gap Repair Closeout')
  lines.push('')
  lines.push(`Card: \`${SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CARD_ID}\``)
  lines.push(`Closeout key: \`${SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY}\``)
  lines.push('')
  lines.push('## What Shipped')
  lines.push('')
  lines.push(`- Routed \`${summary.sourceId || SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID}\` from existing Missive source-backed evidence into the internal Action Route Review layer.`)
  lines.push(`- Created an approval-required pending route: \`${summary.routeId || 'pending route'}\`.`)
  lines.push('- The route uses the existing Missive source-health fact, Atlassian Goals/Projects atom, and retrieval chunk evidence only.')
  lines.push('- No action route was applied; no destination backlog/decision/question record was written.')
  lines.push('')
  lines.push('## Proof')
  lines.push('')
  lines.push(`- Before next gap on this proof run: \`${summary.beforeNextGap || 'unknown'}\`.`)
  lines.push(`- After next gap on this proof run: \`${summary.afterNextGap || 'unknown'}\`.`)
  lines.push(`- Route signals on this proof run: ${summary.beforeRouteSignals ?? 0} -> ${summary.afterRouteSignals ?? 0}.`)
  lines.push('- Building-now proof created the transition from `routed` to `complete`; later closeout reruns are idempotent and may show `complete` before and after.')
  lines.push('- Focused proof dogfoods missing source-health fact, missing evidence chunk, verified synthesized item/route metadata, pending approval gate, no destination apply, and no external write posture.')
  lines.push('- Full `process:foundation-ship` is required before push.')
  lines.push('')
  lines.push('## Boundaries')
  lines.push('')
  for (const boundary of SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_NOT_NEXT_BOUNDARIES) {
    lines.push(`- ${boundary}`)
  }
  lines.push('')
  lines.push('## Next')
  lines.push('')
  lines.push('Continue the safe source maturity queue from live source coverage truth. Prefer another internal route repair only when the source already has a source-health fact, atom, and retrieval chunk; otherwise leave it visibly blocked.')
  lines.push('')
  return `${lines.join('\n')}\n`
}
