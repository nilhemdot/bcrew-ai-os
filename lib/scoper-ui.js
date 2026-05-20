export const SCOPER_UI_CARD_ID = 'SCOPER-UI-001'
export const SCOPER_UI_CLOSEOUT_KEY = 'scoper-ui-v1'
export const SCOPER_UI_PLAN_PATH = 'docs/process/scoper-ui-001-plan.md'
export const SCOPER_UI_APPROVAL_PATH = 'docs/process/approvals/SCOPER-UI-001.json'
export const SCOPER_UI_SCRIPT_PATH = 'scripts/process-scoper-ui-check.mjs'
export const SCOPER_UI_CLOSEOUT_PATH = 'docs/handoffs/2026-05-20-scoper-ui-closeout.md'
export const SCOPER_UI_NEXT_CARD_ID = 'SOURCE-001'
export const SCOPER_UI_SPRINT_ID = 'FOUNDATION-TRUSTED-LOOP-AND-SAFE-SURFACES-2026-05-20'

export const SCOPER_UI_PROOF_COMMANDS = [
  'node --check lib/scoper-ui.js lib/strategy-planning-workflow.js public/strategic-execution.js scripts/process-scoper-ui-check.mjs',
  'npm run process:scoper-ui-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${SCOPER_UI_CARD_ID} --planApprovalRef=${SCOPER_UI_APPROVAL_PATH} --closeoutKey=${SCOPER_UI_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${SCOPER_UI_CARD_ID} --closeoutKey=${SCOPER_UI_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${SCOPER_UI_CARD_ID} --planApprovalRef=${SCOPER_UI_APPROVAL_PATH} --closeoutKey=${SCOPER_UI_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const SCOPER_UI_CHANGED_FILES = [
  'lib/scoper-ui.js',
  'lib/strategy-planning-workflow.js',
  'public/strategic-execution.js',
  'public/styles-strategy-sales.css',
  SCOPER_UI_SCRIPT_PATH,
  SCOPER_UI_PLAN_PATH,
  SCOPER_UI_APPROVAL_PATH,
  SCOPER_UI_CLOSEOUT_PATH,
  'lib/foundation-build-closeout-intelligence-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
]

export const SCOPER_UI_NOT_NEXT_BOUNDARIES = [
  'Do not auto-create backlog cards from Scoper output.',
  'Do not approve, apply, send, message, or write to external systems.',
  'Do not call LLM/provider/browser/auth/private extraction lanes.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'Do not mutate Drive permissions.',
  'Do not build SOURCE-001, SOURCE-002, or SOURCE-003 inside this card.',
  'Do not change the Action Router apply workflow; this card only links Scoper output to existing review paths.',
]

function text(value, fallback = '') {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim()
  return normalized || fallback
}

function list(value) {
  if (Array.isArray(value)) return value.map(item => text(item)).filter(Boolean)
  if (!value) return []
  if (typeof value === 'string') {
    return value
      .replace(/^{|}$/g, '')
      .split(',')
      .map(item => text(item))
      .filter(Boolean)
  }
  return []
}

function unique(values = []) {
  return Array.from(new Set(values.map(item => text(item)).filter(Boolean)))
}

function parseObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

function normalizeScoperOutput(row = {}) {
  const sourceIds = list(row.source_ids || row.sourceIds)
  const factRefs = list(row.fact_refs || row.factRefs)
  const atomRefs = list(row.atom_refs || row.atomRefs)
  const chunkRefs = list(row.chunk_refs || row.chunkRefs)
  const routeRefs = list(row.route_refs || row.routeRefs)
  const decisionRefs = list(row.decision_refs || row.decisionRefs)
  const openQuestionRefs = list(row.open_question_refs || row.openQuestionRefs)
  const existingAnswerRefs = list(row.existing_answer_refs || row.existingAnswerRefs)
  const gapStatements = list(row.gap_statements || row.gapStatements)
  const smallestNextSteps = list(row.smallest_next_steps || row.smallestNextSteps)
  const blockedActions = list(row.blocked_actions || row.blockedActions)
  const proofRefs = unique([
    ...list(row.proof_refs || row.proofRefs),
    ...sourceIds,
    ...factRefs,
    ...atomRefs,
    ...chunkRefs,
    ...routeRefs,
    ...decisionRefs,
    ...openQuestionRefs,
  ])
  return {
    scoperOutputId: text(row.scoper_output_id || row.scoperOutputId),
    issueId: text(row.issue_id || row.issueId),
    status: text(row.status),
    proposedCardId: text(row.proposed_card_id || row.proposedCardId),
    title: text(row.title),
    summary: text(row.summary),
    owner: text(row.owner, 'Foundation'),
    confidence: text(row.confidence, 'medium'),
    sourceIds,
    factRefs,
    atomRefs,
    chunkRefs,
    routeRefs,
    decisionRefs,
    openQuestionRefs,
    existingAnswerRefs,
    gapStatements,
    smallestNextSteps,
    blockedActions,
    proofRefs,
    proposal: parseObject(row.proposal),
    metadata: parseObject(row.metadata),
    createdAt: row.created_at || row.createdAt || null,
    updatedAt: row.updated_at || row.updatedAt || null,
  }
}

function evidenceType(ref = '') {
  if (ref.startsWith('SRC-')) return 'source'
  if (ref.startsWith('fact:')) return 'fact'
  if (ref.startsWith('atom:')) return 'atom'
  if (ref.startsWith('chunk:')) return 'chunk'
  if (ref.startsWith('action-route:')) return 'route'
  if (ref.startsWith('DECISION-')) return 'decision'
  if (ref.startsWith('OPEN-')) return 'open_question'
  if (ref.startsWith('strategic-issue:')) return 'issue'
  return 'proof'
}

function evidenceHref(ref = '') {
  const type = evidenceType(ref)
  if (type === 'source') return `/source-of-truth#${encodeURIComponent(ref)}`
  if (type === 'route') return `#route-${ref}`
  if (type === 'decision') return `/decisions#${encodeURIComponent(ref)}`
  if (type === 'open_question') return `/questions#${encodeURIComponent(ref)}`
  return '#planning'
}

function evidencePointer(ref = '') {
  return {
    ref,
    type: evidenceType(ref),
    label: ref,
    href: evidenceHref(ref),
  }
}

function buildSections(output = {}) {
  return [
    {
      key: 'verified',
      title: 'Verified / Already Answered',
      empty: 'No verified answer refs yet.',
      items: output.existingAnswerRefs.map(evidencePointer),
    },
    {
      key: 'partial',
      title: 'Partial Evidence',
      empty: 'No partial evidence refs attached.',
      items: unique([
        ...output.sourceIds,
        ...output.factRefs,
        ...output.atomRefs,
        ...output.chunkRefs,
        ...output.routeRefs,
      ]).map(evidencePointer),
    },
    {
      key: 'gaps',
      title: 'Actual Gaps',
      empty: 'No gap statements recorded.',
      items: output.gapStatements.map(statement => ({ label: statement, type: 'gap', ref: statement, href: '#planning' })),
    },
    {
      key: 'owner',
      title: 'Owner Suggestion',
      empty: 'No owner suggestion recorded.',
      items: [{
        label: `${output.owner} | ${output.confidence} confidence | ${output.status}`,
        type: 'owner',
        ref: output.owner,
        href: '#planning',
      }],
    },
    {
      key: 'next_steps',
      title: 'Next Steps',
      empty: 'No next steps recorded.',
      items: output.smallestNextSteps.map(step => ({
        label: step,
        type: 'draft_task',
        ref: output.proposedCardId || output.scoperOutputId,
        href: output.routeRefs[0] ? `#route-${output.routeRefs[0]}` : '#route-review',
      })),
    },
  ]
}

function routeActionFor(output = {}) {
  const routeRef = output.routeRefs[0] || ''
  return {
    label: routeRef ? 'Open review route' : 'Open review queue',
    href: routeRef ? `#route-${routeRef}` : '#route-review',
    routeRef,
    mode: 'review_existing_route_only',
  }
}

export function buildScoperUiSnapshot({ scoperOutputs = [], generatedAt = new Date().toISOString() } = {}) {
  const rows = Array.isArray(scoperOutputs) ? scoperOutputs : []
  const outputs = rows
    .map(row => normalizeScoperOutput(row))
    .filter(output => output.scoperOutputId)
    .map(output => ({
      ...output,
      sections: buildSections(output),
      evidencePointers: output.proofRefs.map(evidencePointer),
      draftTaskAction: routeActionFor(output),
      noAutoMutation: output.metadata.proposalOnly !== false &&
        output.metadata.autoApproved !== true &&
        output.metadata.writesBacklog !== true &&
        output.metadata.noExternalWrite !== false,
    }))
  const statusCounts = outputs.reduce((counts, output) => {
    counts[output.status] = (counts[output.status] || 0) + 1
    return counts
  }, {})
  const missingProofOutputs = outputs.filter(output => !output.evidencePointers.length)
  const mutatingOutputs = outputs.filter(output => !output.noAutoMutation)
  return {
    generatedAt,
    mode: 'scoper_output_review_ui',
    status: missingProofOutputs.length || mutatingOutputs.length ? 'needs_repair' : 'ready',
    outputCount: outputs.length,
    statusCounts,
    sourceIds: unique(outputs.flatMap(output => output.sourceIds)),
    routeRefs: unique(outputs.flatMap(output => output.routeRefs)),
    outputs,
    summary: outputs.length
      ? `${outputs.length} Scoper outputs ready for structured review.`
      : 'No Scoper outputs are ready for structured review.',
    noAutoCreatesBacklog: true,
    noExternalWrites: true,
    missingProofOutputIds: missingProofOutputs.map(output => output.scoperOutputId),
    mutatingOutputIds: mutatingOutputs.map(output => output.scoperOutputId),
  }
}

export function evaluateScoperUiSnapshot(snapshot = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const outputs = Array.isArray(snapshot.outputs) ? snapshot.outputs : []
  const sectionKeys = outputs.flatMap(output => (output.sections || []).map(section => section.key))
  const outputWithAllSections = outputs.filter(output => {
    const keys = new Set((output.sections || []).map(section => section.key))
    return ['verified', 'partial', 'gaps', 'owner', 'next_steps'].every(key => keys.has(key))
  })

  add(snapshot.mode === 'scoper_output_review_ui', 'snapshot mode is Scoper output review UI', snapshot.mode || 'missing')
  add(outputs.length >= 1, 'Scoper outputs are present', String(outputs.length))
  add(outputWithAllSections.length === outputs.length, 'every output has all collapsible sections', `${outputWithAllSections.length}/${outputs.length}`)
  add(outputs.every(output => output.title && output.summary && output.owner), 'every output has meeting-readable title, summary, and owner', `${outputs.length} outputs`)
  add(outputs.every(output => output.evidencePointers?.length), 'every output has clickable evidence pointers', outputs.map(output => `${output.scoperOutputId}:${output.evidencePointers?.length || 0}`).join(', '))
  add(outputs.every(output => output.draftTaskAction?.href), 'every output has a draft task/review action', `${outputs.length} outputs`)
  add(snapshot.noAutoCreatesBacklog === true && snapshot.noExternalWrites === true, 'Scoper UI is non-mutating', 'review-only')
  add(!snapshot.missingProofOutputIds?.length && !snapshot.mutatingOutputIds?.length, 'no outputs are proofless or mutating', JSON.stringify({ missing: snapshot.missingProofOutputIds || [], mutating: snapshot.mutatingOutputIds || [] }))
  add(sectionKeys.includes('verified') && sectionKeys.includes('partial') && sectionKeys.includes('gaps') && sectionKeys.includes('owner') && sectionKeys.includes('next_steps'), 'required section keys are represented', sectionKeys.join(', '))

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    summary: {
      outputCount: outputs.length,
      sourceIdCount: (snapshot.sourceIds || []).length,
      routeRefCount: (snapshot.routeRefs || []).length,
      statusCounts: snapshot.statusCounts || {},
    },
    checks,
    failed,
  }
}

export function buildScoperUiDogfoodProof() {
  const snapshot = buildScoperUiSnapshot({
    generatedAt: '2026-05-20T03:20:00.000-04:00',
    scoperOutputs: [
      {
        scoper_output_id: 'scoper-output:dogfood',
        issue_id: 'strategic-issue:dogfood',
        status: 'real_gap',
        proposed_card_id: 'SCOPED-DOGFOOD',
        title: 'Scope capacity gap',
        summary: 'Capacity issue needs an owner decision with source proof.',
        owner: 'Strategy',
        confidence: 'high',
        source_ids: ['SRC-FREEDOM-ENGINE-001'],
        fact_refs: ['fact:capacity'],
        atom_refs: ['atom:capacity'],
        chunk_refs: ['chunk:capacity'],
        route_refs: ['action-route:capacity'],
        existing_answer_refs: ['DECISION-008-CAPACITY'],
        gap_statements: ['Owner must choose recruiting vs productivity emphasis.'],
        smallest_next_steps: ['Promote a source-backed capacity decision draft through the existing review route.'],
        blocked_actions: ['No backlog card auto-created.'],
        proof_refs: ['SRC-FREEDOM-ENGINE-001', 'fact:capacity', 'action-route:capacity'],
        metadata: { proposalOnly: true, autoApproved: false, writesBacklog: false, noExternalWrite: true },
      },
    ],
  })
  const weak = buildScoperUiSnapshot({
    scoperOutputs: [
      {
        scoper_output_id: 'scoper-output:weak',
        title: 'Weak output',
        summary: 'No proof.',
        owner: 'Foundation',
        metadata: { proposalOnly: false, autoApproved: true, writesBacklog: true },
      },
    ],
  })
  const evaluation = evaluateScoperUiSnapshot(snapshot)
  const weakEvaluation = evaluateScoperUiSnapshot(weak)
  return {
    ok: evaluation.ok && !weakEvaluation.ok,
    status: evaluation.ok && !weakEvaluation.ok ? 'healthy' : 'risk',
    evaluation,
    weakRejected: !weakEvaluation.ok,
    sample: snapshot.outputs[0],
  }
}
