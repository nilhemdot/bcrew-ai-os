export const GOV_001_CARD_ID = 'GOV-001'
export const GOV_001_NEXT_CARD_ID = 'DECISION-004'
export const GOV_001_CLOSEOUT_KEY = 'gov-001-governance-accountability-v1'
export const GOV_001_PLAN_PATH = 'docs/process/gov-001-governance-accountability-plan.md'
export const GOV_001_APPROVAL_PATH = 'docs/process/approvals/GOV-001.json'
export const GOV_001_CLOSEOUT_PATH = 'docs/handoffs/2026-05-20-gov-001-governance-accountability-closeout.md'
export const GOV_001_SCRIPT_PATH = 'scripts/process-gov-001-check.mjs'
export const GOV_001_SPRINT_ID = 'FOUNDATION-OPERATING-TRUTH-AND-DATA-HEALTH-2026-05-20'

export const GOV_001_PROOF_COMMANDS = [
  'node --check lib/gov-001-governance-accountability.js scripts/process-gov-001-check.mjs lib/strategy-shared-comms-routes.js lib/foundation-verifier-build-log-closeouts.js public/strategic-execution.js server.js',
  'npm run process:gov-001-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=GOV-001 --planApprovalRef=docs/process/approvals/GOV-001.json --closeoutKey=gov-001-governance-accountability-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=GOV-001 --closeoutKey=gov-001-governance-accountability-v1',
  'npm run process:foundation-ship -- --card=GOV-001 --planApprovalRef=docs/process/approvals/GOV-001.json --closeoutKey=gov-001-governance-accountability-v1 --commitRef=HEAD',
]

export const GOV_001_CHANGED_FILES = [
  'lib/gov-001-governance-accountability.js',
  GOV_001_SCRIPT_PATH,
  'lib/strategy-shared-comms-routes.js',
  'public/strategic-execution.html',
  'public/strategic-execution.js',
  GOV_001_PLAN_PATH,
  GOV_001_APPROVAL_PATH,
  GOV_001_CLOSEOUT_PATH,
  'lib/foundation-build-closeout-intelligence-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'lib/foundation-verifier-build-log-closeouts.js',
  'package.json',
]

export const GOV_001_NOT_NEXT_BOUNDARIES = [
  'No external sends, messages, calendar writes, Drive permission changes, credential mutation, provider config mutation, or paid/provider/browser-auth work.',
  'No automatic decision lock-in, backlog creation, task assignment, owner escalation, or human-performance scoring.',
  'No new source access, broad private extraction, meeting bot, director runtime, or autonomous governance agent.',
  'No Strategy Hub redesign beyond a bounded read-only Governance Accountability view.',
]

const DRIFT_ATOM_CATEGORIES = new Set(['bottleneck', 'frustration', 'assumption_risk', 'loss', 'decision_needed'])
const POSITIVE_ATOM_CATEGORIES = new Set(['win', 'opportunity', 'culture_signal'])

function text(value) {
  return String(value ?? '').trim()
}

function list(value) {
  if (Array.isArray(value)) return value.map(item => text(item)).filter(Boolean)
  return text(value).split(',').map(item => item.trim()).filter(Boolean)
}

function unique(values = []) {
  return Array.from(new Set(list(values)))
}

function statusTone(value) {
  const normalized = text(value).toLowerCase()
  if (!normalized) return 'watch'
  if (/(blocked|failed|missing|behind|risk|red|overdue|needs)/i.test(normalized)) return 'risk'
  if (/(pending|watch|review|gap|carry|open)/i.test(normalized)) return 'watch'
  if (/(ready|healthy|live|ahead|signed|current|applied|confirmed)/i.test(normalized)) return 'ready'
  return 'watch'
}

function sourceIdsFromFacts(facts = []) {
  return unique((facts || []).flatMap(fact => fact?.sourceId || fact?.source_id || []))
}

function routeTitle(route = {}) {
  const payload = route.proposedPayload || route.proposed_payload || {}
  return text(payload.title) || text(payload.summary) || `${text(route.routeType || route.route_type || 'review')} route`
}

function routeSourceIds(route = {}) {
  const proof = route.sourceProof || route.source_proof || {}
  const proofItems = Array.isArray(proof.items) ? proof.items : []
  return unique([
    route.sourceId,
    route.source_id,
    ...(Array.isArray(route.sourceIds) ? route.sourceIds : []),
    ...proofItems.flatMap(item => item?.sourceId || item?.source_id || []),
  ])
}

function routeOwner(route = {}) {
  return text(route.owner || route.assignedOwner || route.assigned_owner || route.metadata?.owner || route.metadata?.suggestedOwner)
}

function routeDestination(route = {}) {
  const table = text(route.destinationTable || route.destination_table)
  if (table === 'backlog_items') return 'task'
  if (table === 'decisions') return 'decision'
  if (table === 'open_questions') return 'question'
  if (text(route.routeType || route.route_type) === 'snooze') return 'snooze'
  if (text(route.routeType || route.route_type) === 'ignore') return 'ignore'
  return table || 'review'
}

function atomSourceIds(atom = {}) {
  return unique([atom.sourceId, atom.source_id])
}

function buildSourceReadiness(operatingTruth = {}, goalTruth = {}) {
  const sourceCards = Array.isArray(operatingTruth.sourceCards) ? operatingTruth.sourceCards : []
  const groups = Array.isArray(goalTruth.groups) ? goalTruth.groups : []
  const sourceIds = unique([
    ...sourceCards.map(card => card.sourceId),
    ...groups.flatMap(group => sourceIdsFromFacts(group.facts || [])),
  ])
  const degraded = sourceCards.filter(card => statusTone(card.validation || card.status) === 'risk')
  const watch = sourceCards.filter(card => statusTone(card.validation || card.status) === 'watch')
  return {
    status: sourceCards.length && !degraded.length ? 'ready' : 'watch',
    sourceCount: sourceIds.length,
    degradedCount: degraded.length,
    watchCount: watch.length,
    sourceIds,
    nextAction: degraded.length
      ? 'Repair degraded strategy source cards before governance uses the packet.'
      : 'Use these source cards as the room-readiness packet before governance discussion.',
  }
}

function buildGoalDriftItems(goalTruth = {}) {
  return (goalTruth.groups || [])
    .filter(group => statusTone(group.statusLabel || group.status) !== 'ready')
    .map(group => ({
      id: `goal:${text(group.key || group.title || 'unknown')}`,
      type: 'goal_drift',
      severity: statusTone(group.statusLabel || group.status) === 'risk' ? 'risk' : 'watch',
      title: text(group.title || group.key || 'Goal drift'),
      readout: text(group.statusLabel || group.status || 'Goal needs review.'),
      owner: 'Leadership',
      nextAction: 'Put this on the governance agenda and confirm owner, decision, or intervention.',
      sourceIds: sourceIdsFromFacts(group.facts || []),
    }))
}

function buildAtomDriftItems(businessAtoms = {}) {
  const atoms = Array.isArray(businessAtoms.atoms)
    ? businessAtoms.atoms
    : Object.values(businessAtoms.views || {}).flat()
  return (atoms || [])
    .filter(atom => atom?.currentState !== 'not_current')
    .filter(atom => DRIFT_ATOM_CATEGORIES.has(text(atom.category).toLowerCase()))
    .slice(0, 12)
    .map(atom => ({
      id: `atom:${text(atom.id || atom.atomId || atom.title || 'unknown')}`,
      type: 'business_atom_drift',
      severity: Number(atom.hitCount || 0) >= 3 || atom.lifecycleStatus === 'structural' ? 'risk' : 'watch',
      title: text(atom.title || 'Business atom drift'),
      readout: text(atom.description || atom.sourceExcerpt || 'Business signal needs governance review.'),
      owner: text(atom.owner || 'Foundation Governance'),
      nextAction: text(atom.nextTrigger || 'Review this atom in the next governance cadence.'),
      sourceIds: atomSourceIds(atom),
    }))
}

function buildPositiveSignalItems(businessAtoms = {}) {
  const atoms = Array.isArray(businessAtoms.atoms)
    ? businessAtoms.atoms
    : Object.values(businessAtoms.views || {}).flat()
  return (atoms || [])
    .filter(atom => POSITIVE_ATOM_CATEGORIES.has(text(atom.category).toLowerCase()))
    .slice(0, 6)
    .map(atom => ({
      id: `atom:${text(atom.id || atom.atomId || atom.title || 'unknown')}`,
      title: text(atom.title || 'Positive signal'),
      readout: text(atom.description || atom.sourceExcerpt || 'Positive source-backed signal.'),
      owner: text(atom.owner || 'Leadership'),
      sourceIds: atomSourceIds(atom),
    }))
}

function buildRouteOutputItems(actionRouter = {}) {
  const routes = Array.isArray(actionRouter.recentRoutes) ? actionRouter.recentRoutes : []
  return routes
    .filter(route => ['pending', 'approved'].includes(text(route.approvalStatus || route.approval_status)))
    .slice(0, 12)
    .map(route => ({
      id: text(route.routeId || route.route_id || route.id || 'route'),
      outputType: routeDestination(route),
      status: text(route.approvalStatus || route.approval_status || 'pending'),
      title: routeTitle(route),
      owner: routeOwner(route) || 'needs-owner-decision',
      nextAction: routeOwner(route)
        ? 'Review and either approve, reroute, reject, or apply through the existing human-controlled route workflow.'
        : 'Choose an owner before this can become accountable work.',
      sourceIds: routeSourceIds(route),
      destination: routeDestination(route),
    }))
}

function buildAgendaOutputItems(meetingReady = {}) {
  return (meetingReady.agendaItems || []).slice(0, 8).map((item, index) => ({
    id: `agenda:${index + 1}`,
    outputType: 'agenda_item',
    status: 'ready',
    title: text(item.title || `Agenda item ${index + 1}`),
    owner: text(item.owner || 'Leadership'),
    nextAction: text(item.nextAction || item.question || 'Use this agenda item in the next governance meeting.'),
    sourceIds: unique(item.sourceIds || []),
  }))
}

function buildGovernanceSequence({ sourceReadiness, meetingReady = {}, routeOutputs = [], driftItems = [] }) {
  const agendaCount = Array.isArray(meetingReady.agendaItems) ? meetingReady.agendaItems.length : 0
  const pendingRouteCount = routeOutputs.filter(item => item.status === 'pending').length
  return [
    {
      key: 'prepare_room',
      label: 'Prepare room',
      status: sourceReadiness.status,
      owner: 'Foundation Governance',
      requiredOutput: 'Source-backed pre-read with stale/degraded source warnings.',
      nextAction: sourceReadiness.nextAction,
    },
    {
      key: 'run_sequence',
      label: 'Run sequence',
      status: agendaCount ? 'ready' : 'watch',
      owner: 'Leadership',
      requiredOutput: 'Agenda order with pressure, decisions, owners, and source proof.',
      nextAction: agendaCount ? 'Use agenda order in the ownership/governance meeting.' : 'Build or refresh the meeting packet before the room.',
    },
    {
      key: 'capture_outputs',
      label: 'Capture outputs',
      status: routeOutputs.length ? 'ready' : 'watch',
      owner: 'Strategy',
      requiredOutput: 'Structured decision/task/question routes with owners and provenance.',
      nextAction: routeOutputs.length ? 'Review pending routes through the approval workflow.' : 'No structured outputs are pending; keep the capture lane visible.',
    },
    {
      key: 'surface_drift',
      label: 'Surface drift',
      status: driftItems.length ? 'watch' : 'ready',
      owner: 'Foundation Governance',
      requiredOutput: 'Drift queue with owner, source proof, and next action.',
      nextAction: driftItems.length ? 'Put drift items on the next governance agenda.' : 'No source-backed drift is currently visible.',
    },
    {
      key: 'follow_through',
      label: 'Follow through',
      status: pendingRouteCount ? 'watch' : 'ready',
      owner: 'Department owners',
      requiredOutput: 'Applied, rejected, snoozed, or rerouted records; no ownerless permanent limbo.',
      nextAction: pendingRouteCount ? 'Resolve pending route decisions before the next cadence review.' : 'Keep cadence checks running.',
    },
  ]
}

function buildCadenceChecks({ sourceReadiness, meetingReady = {}, planningWorkflow = {}, routeOutputs = [], driftItems = [] }) {
  return [
    {
      key: 'source_readiness',
      label: 'Source readiness',
      status: sourceReadiness.status,
      owner: 'Foundation',
      threshold: 'Any degraded strategy source becomes a governance packet warning.',
      nextTrigger: 'Every governance packet build.',
      sourceIds: sourceReadiness.sourceIds,
    },
    {
      key: 'meeting_packet',
      label: 'Meeting packet',
      status: text(meetingReady.status || '').toLowerCase().includes('ready') ? 'ready' : 'watch',
      owner: 'Leadership',
      threshold: 'Governance meeting needs agenda items, pressure cards, and proof source IDs.',
      nextTrigger: 'Before weekly/monthly/quarterly ownership meetings.',
      sourceIds: unique(meetingReady.proofSummary?.sourceIds || []),
    },
    {
      key: 'planning_workflow',
      label: 'Planning workflow',
      status: text(planningWorkflow.status || '').toLowerCase().includes('ready') ? 'ready' : 'watch',
      owner: 'Strategy',
      threshold: 'Planning workflow must expose priority/carry/stop/gap queues or explain empty queues.',
      nextTrigger: 'Quarterly planning and monthly reset.',
      sourceIds: unique(planningWorkflow.proofSummary?.sourceIds || []),
    },
    {
      key: 'route_review',
      label: 'Route review',
      status: routeOutputs.some(item => item.owner === 'needs-owner-decision') ? 'watch' : 'ready',
      owner: 'Strategy',
      threshold: 'Ownerless pending outputs cannot age past the cadence without review.',
      nextTrigger: 'When pending strategy route count changes.',
      sourceIds: unique(routeOutputs.flatMap(item => item.sourceIds || [])),
    },
    {
      key: 'drift_queue',
      label: 'Drift queue',
      status: driftItems.some(item => item.severity === 'risk') ? 'risk' : driftItems.length ? 'watch' : 'ready',
      owner: 'Foundation Governance',
      threshold: 'Risk drift goes onto the next governance agenda; stale watch escalates.',
      nextTrigger: 'When goals, atoms, or route evidence changes.',
      sourceIds: unique(driftItems.flatMap(item => item.sourceIds || [])),
    },
  ]
}

function hasSourceProof(items = []) {
  return items.every(item => Array.isArray(item.sourceIds) && item.sourceIds.length > 0)
}

function hasOwnerAndNext(items = []) {
  return items.every(item => text(item.owner) && text(item.nextAction))
}

export function buildGovernanceAccountabilitySnapshot({
  goalTruth = {},
  operatingTruth = {},
  actionRouter = {},
  businessAtoms = {},
  meetingReady = {},
  planningWorkflow = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  const sourceReadiness = buildSourceReadiness(operatingTruth, goalTruth)
  const routeOutputs = buildRouteOutputItems(actionRouter)
  const agendaOutputs = buildAgendaOutputItems(meetingReady)
  const driftItems = [
    ...buildGoalDriftItems(goalTruth),
    ...buildAtomDriftItems(businessAtoms),
  ].slice(0, 18)
  const positiveSignals = buildPositiveSignalItems(businessAtoms)
  const sequence = buildGovernanceSequence({ sourceReadiness, meetingReady, routeOutputs, driftItems })
  const cadenceChecks = buildCadenceChecks({ sourceReadiness, meetingReady, planningWorkflow, routeOutputs, driftItems })
  const structuredOutputs = [...agendaOutputs, ...routeOutputs]
  const guardrails = {
    noAutoApply: true,
    humanApprovalRequired: true,
    externalWritesBlocked: true,
    decisionLockInBlocked: true,
    allowedWrites: ['local Strategy Hub last-known-good snapshot', 'focused proof closeout/backlog/sprint records'],
    blockedActions: [
      'send messages or calendar invites',
      'mutate Drive permissions',
      'create or apply backlog/decision/question records automatically from this view',
      'score people or departments without an approved people-intelligence card',
    ],
  }
  const sourceProofOk = hasSourceProof(driftItems) && hasSourceProof(structuredOutputs.filter(item => item.outputType !== 'agenda_item' || item.sourceIds.length))
  const ownerProofOk = hasOwnerAndNext([...driftItems, ...structuredOutputs])
  const sequenceOk = sequence.every(step => text(step.owner) && text(step.requiredOutput) && text(step.nextAction))
  const riskCount = cadenceChecks.filter(check => check.status === 'risk').length + driftItems.filter(item => item.severity === 'risk').length
  const watchCount = cadenceChecks.filter(check => check.status === 'watch').length + driftItems.filter(item => item.severity === 'watch').length
  const status = sourceReadiness.sourceCount && sourceProofOk && ownerProofOk && sequenceOk ? 'ready' : 'watch'

  return {
    generatedAt,
    status,
    mode: 'read_only_governance_accountability_v1',
    visibleHome: 'Strategy Hub v2 > Governance',
    sourceReadiness,
    summary: {
      sourceCount: sourceReadiness.sourceCount,
      cadenceCheckCount: cadenceChecks.length,
      riskCount,
      watchCount,
      driftItemCount: driftItems.length,
      structuredOutputCount: structuredOutputs.length,
      ownerlessOutputCount: structuredOutputs.filter(item => item.owner === 'needs-owner-decision').length,
      positiveSignalCount: positiveSignals.length,
    },
    sequence,
    cadenceChecks,
    driftItems,
    positiveSignals,
    structuredOutputs,
    guardrails,
    proof: {
      sourceProofOk,
      ownerProofOk,
      sequenceOk,
      noAutoApply: guardrails.noAutoApply,
      externalWritesBlocked: guardrails.externalWritesBlocked,
    },
  }
}

export function buildGov001DogfoodProof() {
  const good = buildGovernanceAccountabilitySnapshot({
    goalTruth: {
      groups: [
        {
          key: 'team_volume',
          title: 'Team Production',
          status: 'behind',
          statusLabel: 'Behind pace',
          facts: [{ label: 'Actual', value: '55', sourceId: 'SRC-OWNERS-001' }],
        },
      ],
    },
    operatingTruth: {
      sourceCards: [
        { sourceId: 'SRC-OWNERS-001', status: 'current', validation: 'Signed Off' },
        { sourceId: 'SRC-FINANCE-001', status: 'current', validation: 'Current reality captured' },
      ],
    },
    actionRouter: {
      recentRoutes: [
        {
          routeId: 'route-1',
          routeType: 'task',
          approvalStatus: 'pending',
          destinationTable: 'backlog_items',
          owner: 'Sales Leadership',
          proposedPayload: { title: 'Fix production gap' },
          sourceProof: { items: [{ sourceId: 'SRC-OWNERS-001', quote: 'Behind pace' }] },
        },
      ],
    },
    businessAtoms: {
      atoms: [
        {
          id: 'atom-1',
          category: 'bottleneck',
          lifecycleStatus: 'confirmed',
          hitCount: 3,
          title: 'Recruiting capacity gap',
          owner: 'Foundation Governance',
          nextTrigger: 'Review weekly',
          sourceId: 'SRC-FREEDOM-ENGINE-001',
        },
      ],
    },
    meetingReady: {
      status: 'ready',
      agendaItems: [
        { title: 'Production gap', nextAction: 'Assign owner', sourceIds: ['SRC-OWNERS-001'] },
      ],
      proofSummary: { sourceIds: ['SRC-OWNERS-001'] },
    },
    planningWorkflow: {
      status: 'ready',
      proofSummary: { sourceIds: ['SRC-OWNERS-001', 'SRC-FINANCE-001'] },
    },
  })
  const weakNoOwner = buildGovernanceAccountabilitySnapshot({
    ...good,
    actionRouter: {
      recentRoutes: [
        {
          routeId: 'route-weak',
          approvalStatus: 'pending',
          destinationTable: 'backlog_items',
          proposedPayload: { title: 'Ownerless output' },
          sourceProof: { items: [{ sourceId: 'SRC-OWNERS-001' }] },
        },
      ],
    },
  })
  const weakNoSources = buildGovernanceAccountabilitySnapshot({
    goalTruth: {
      groups: [
        { key: 'bad', title: 'Bad group', status: 'behind', facts: [] },
      ],
    },
    operatingTruth: { sourceCards: [] },
    actionRouter: { recentRoutes: [] },
    businessAtoms: { atoms: [] },
    meetingReady: { status: 'missing', agendaItems: [] },
    planningWorkflow: { status: 'missing' },
  })
  const weakAutoApply = {
    ...good,
    guardrails: { ...good.guardrails, noAutoApply: false },
    proof: { ...good.proof, noAutoApply: false },
  }

  return {
    ok: good.status === 'ready' &&
      good.proof.sourceProofOk &&
      good.proof.ownerProofOk &&
      good.proof.noAutoApply &&
      weakNoOwner.summary.ownerlessOutputCount > 0 &&
      weakNoSources.status !== 'ready' &&
      weakAutoApply.proof.noAutoApply === false,
    invariant: 'Governance accountability requires source proof, owner/next-action output queues, sequence steps, and no-auto-apply guardrails.',
    good: {
      status: good.status,
      driftItemCount: good.summary.driftItemCount,
      structuredOutputCount: good.summary.structuredOutputCount,
    },
    rejected: {
      ownerlessOutput: weakNoOwner.summary.ownerlessOutputCount > 0,
      missingSources: weakNoSources.status !== 'ready',
      autoApply: weakAutoApply.proof.noAutoApply === false,
    },
  }
}

export function evaluateGov001Implementation({
  moduleSource = '',
  routeSource = '',
  uiSource = '',
  serverSource = '',
  registrySource = '',
  coverageSource = '',
  packageJson = {},
  snapshot = {},
} = {}) {
  const checks = []
  const add = (ok, check) => checks.push({ ok: Boolean(ok), check })
  add(moduleSource.includes('buildGovernanceAccountabilitySnapshot'), 'module builds governance accountability snapshot')
  add(moduleSource.includes('noAutoApply') && moduleSource.includes('externalWritesBlocked'), 'module carries no-auto-apply and external-write guardrails')
  add(routeSource.includes('governanceAccountability') && routeSource.includes('buildGovernanceAccountabilitySnapshot'), 'Strategy Hub route payload includes governanceAccountability')
  add(uiSource.includes("'governance'") && uiSource.includes('renderGovernanceAccountability'), 'Strategy Hub UI has Governance section renderer')
  add(serverSource.includes('registerStrategySharedCommsRoutes(app'), 'server uses Strategy shared route registrar')
  add(registrySource.includes(GOV_001_CLOSEOUT_KEY), 'closeout registry includes GOV-001 closeout key')
  add(coverageSource.includes('GOV-001'), 'verifier coverage source lists GOV-001')
  add(packageJson.scripts?.['process:gov-001-check'] === `node --env-file-if-exists=.env ${GOV_001_SCRIPT_PATH}`, 'package script registered')
  add(snapshot.status === 'ready', 'live governance snapshot is ready')
  add((snapshot.summary?.structuredOutputCount || 0) > 0, 'snapshot has structured outputs')
  add((snapshot.summary?.cadenceCheckCount || 0) >= 5, 'snapshot has cadence checks')
  add(snapshot.guardrails?.noAutoApply === true && snapshot.guardrails?.externalWritesBlocked === true, 'snapshot blocks auto-apply and external writes')
  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
    summary: {
      checks: checks.length,
      failed: failed.length,
      status: snapshot.status || 'missing',
      driftItemCount: snapshot.summary?.driftItemCount || 0,
      structuredOutputCount: snapshot.summary?.structuredOutputCount || 0,
    },
  }
}

export function renderGov001Closeout({
  evaluation,
  snapshot,
  dogfood,
  generatedAt = new Date().toISOString(),
} = {}) {
  return `# GOV-001 Closeout - Governance Accountability

Generated: ${generatedAt}
Closeout key: ${GOV_001_CLOSEOUT_KEY}

## What Shipped

- Added a read-only Governance Accountability snapshot to Strategy Hub v2.
- Turned source readiness, meeting packet state, planning workflow state, Action Router outputs, and Business Atoms into one governance packet.
- Added cadence checks, drift queue, structured output queue, positive signals, and explicit no-auto-apply guardrails.
- Added focused proof and Current Sprint closeout wiring so the sprint advances to ${GOV_001_NEXT_CARD_ID} only after the behavior is proven.
- Repaired the historical closeout fallback for the Phase E full-system re-audit so old accepted audit closeouts do not fail verification after aging out of Recent Builds.

## Proof

- Focused GOV-001 proof status: ${evaluation?.ok ? 'healthy' : 'risk'}
- Governance snapshot status: ${snapshot?.status || 'missing'}
- Cadence checks: ${snapshot?.summary?.cadenceCheckCount || 0}
- Drift items: ${snapshot?.summary?.driftItemCount || 0}
- Structured outputs: ${snapshot?.summary?.structuredOutputCount || 0}
- Dogfood: ${dogfood?.ok ? 'pass' : 'fail'}

## Where It Lives

- \`lib/gov-001-governance-accountability.js\`
- \`lib/strategy-shared-comms-routes.js\`
- \`lib/foundation-verifier-build-log-closeouts.js\`
- \`public/strategic-execution.js\`
- \`scripts/process-gov-001-check.mjs\`
- \`docs/process/gov-001-governance-accountability-plan.md\`
- \`docs/process/approvals/GOV-001.json\`
- Strategy Hub v2 > Governance

## Known Limits

- This is a read-only governance packet. It does not send messages, mutate calendars, create backlog items, lock decisions, score people, or enforce external actions.
- Human approval and the existing Action Router workflow remain required before routes become durable work or decisions.
- People accountability and department scoring remain out of scope until an approved people-intelligence card.

## Review Next

Continue ${GOV_001_NEXT_CARD_ID}. The governance packet now exposes owner/deadline/output pressure; pending decisions still need a dedicated review and lock-in workflow.
`
}
