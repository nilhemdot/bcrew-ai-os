export const FOUNDATION_DONE_TEST_CARD_ID = 'FOUNDATION-DONE-TEST-001'
export const FOUNDATION_DONE_TEST_CLOSEOUT_KEY = 'foundation-done-test-v1'
export const FOUNDATION_DONE_TEST_PLAN_PATH = 'docs/process/foundation-done-test-001-plan.md'
export const FOUNDATION_DONE_TEST_DOC_PATH = 'docs/process/foundation-done-test.md'
export const FOUNDATION_DONE_TEST_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-DONE-TEST-001.json'
export const FOUNDATION_DONE_TEST_SCRIPT_PATH = 'scripts/process-foundation-done-test.mjs'
export const FOUNDATION_DONE_TEST_REGISTRY_PATH = 'lib/foundation-readiness-gates.js'
export const FOUNDATION_DONE_TEST_SUMMARY_MARKER = 'FOUNDATION_DONE_TEST_SUMMARY'

export const FOUNDATION_READINESS_REQUIRED_LEG_KEYS = [
  'source_verifiable_answer',
  'tier_redaction_safety',
  'p0_structural_coverage',
  'runtime_process_control',
  'extraction_retry_ledger_backfill',
  'meeting_raw_drive_acl_vault',
  'clear_pass_fail_output',
]

export const FOUNDATION_READINESS_GATE_CARDS = [
  {
    cardId: 'SECURITY-002',
    label: 'App auth, tier, and redaction',
    requiredForStrategy: true,
    closeoutKey: 'security-002-auth-tier-redaction-v1',
    proofCommands: ['npm run process:security-002-check'],
  },
  {
    cardId: 'MEETING-VAULT-ACL-001',
    label: 'Raw meeting-note Drive/vault ACL safety',
    requiredForStrategy: true,
    proofCommands: ['npm run process:meeting-vault-acl-check'],
  },
  {
    cardId: 'DRIVE-ACCESS-REQUEST-001',
    label: 'Delegated Drive access-request and ACL repair preflight',
    requiredForStrategy: true,
    proofCommands: ['npm run process:drive-access-request-check'],
  },
  {
    cardId: 'SECURITY-FILTERED-COMMS-ACCESS-001',
    label: 'Real-data filtered shared-comms access',
    requiredForStrategy: false,
    condition: 'Blocks non-Tier-1 shared-comms or intelligence access; owner-only Strategy can stay Tier 1-only until this closes.',
    proofCommands: ['npm run process:security-filtered-comms-access-check'],
  },
  {
    cardId: 'SECURITY-EDGE-001',
    label: 'Public edge auth and tunnel hardening',
    requiredForStrategy: false,
    condition: 'Blocks public or broader external exposure, not local owner-only Foundation review.',
    proofCommands: ['npm run process:security-edge-check'],
  },
  {
    cardId: 'SECURITY-PROVIDER-ROTATION-PROOF-001',
    label: 'Provider-side credential rotation or retirement proof',
    requiredForStrategy: false,
    condition: 'Blocks treating exposed credential incidents as fully closed and blocks broader exposure claims.',
    proofCommands: ['npm run process:security-provider-rotation-proof-check'],
  },
  {
    cardId: FOUNDATION_DONE_TEST_CARD_ID,
    label: 'Foundation readiness exit test',
    requiredForStrategy: true,
    closeoutKey: FOUNDATION_DONE_TEST_CLOSEOUT_KEY,
    proofCommands: ['npm run process:foundation-done-test -- --report-only'],
  },
  {
    cardId: 'SYSTEM-010-GHOST-CLOSEOUT-001',
    label: 'Runtime dead-man, decommission, and cost/process controls',
    requiredForStrategy: true,
    closeoutKey: 'system-010-ghost-closeout-v1',
    proofCommands: ['npm run process:system-010-ghost-closeout-check'],
  },
  {
    cardId: 'SOURCE-LIFECYCLE-COMPLETION-001',
    label: 'Source lifecycle completion and revalidation',
    requiredForStrategy: true,
    closeoutKey: 'source-lifecycle-completion-v1',
    proofCommands: ['npm run process:source-lifecycle-completion-check'],
  },
  {
    cardId: 'EXTRACT-RUN-HARDENING-001',
    label: 'Extraction retry, ledger, partial-failure, and bounded-backfill hardening',
    requiredForStrategy: true,
    closeoutKey: 'extract-run-hardening-v1',
    proofCommands: ['npm run process:extract-run-hardening-check'],
  },
  {
    cardId: 'SYNTHESIS-VERIFY-001',
    label: 'Synthesized claim verification before Strategy/scout consumption',
    requiredForStrategy: true,
    closeoutKey: 'synthesis-verify-v1',
    proofCommands: ['npm run process:synthesis-verify-check', 'npm run intelligence:retrieval-eval'],
  },
  {
    cardId: 'MEETING-FORWARD-TRANSCRIPT-ENFORCEMENT-001',
    label: 'Future meeting transcript capture and gap handling',
    requiredForStrategy: false,
    condition: 'Advisory until the readiness claim includes future-meeting capture completeness.',
    proofCommands: ['npm run meeting-notes:verify-recent-gaps'],
  },
  {
    cardId: 'PROCESS-ACK-STATES-001',
    label: 'Governed acknowledged-state handling',
    requiredForStrategy: false,
    condition: 'Advisory for known gaps and intentional pauses unless a blocker needs an acknowledged exception.',
    proofCommands: ['npm run process:ack-states-check'],
  },
  {
    cardId: 'VERIFIER-INCREMENTAL-COVERAGE-001',
    label: 'Incremental verifier coverage',
    requiredForStrategy: false,
    condition: 'Advisory speed/control improvement; full foundation:verify remains the release gate.',
    proofCommands: ['npm run process:verifier-incremental-coverage-check'],
  },
]

export const FOUNDATION_READINESS_GATE_CARD_IDS = FOUNDATION_READINESS_GATE_CARDS.map(gate => gate.cardId)
export const FOUNDATION_READINESS_REQUIRED_GATE_CARD_IDS = FOUNDATION_READINESS_GATE_CARDS
  .filter(gate => gate.requiredForStrategy)
  .map(gate => gate.cardId)

export const FOUNDATION_READINESS_LEGS = [
  {
    key: 'source_verifiable_answer',
    label: 'Source-verifiable answer',
    required: true,
    blockerCards: ['SOURCE-LIFECYCLE-COMPLETION-001', 'SYNTHESIS-VERIFY-001'],
    proofCommands: ['npm run intelligence:retrieval-eval'],
    passDescription: 'Answers carry source IDs, evidence refs, freshness, and no ungrounded claim.',
    failClosedBehavior: 'Return not_ready and name the first source or synthesis blocker.',
  },
  {
    key: 'tier_redaction_safety',
    label: 'Tier/redaction safety',
    required: true,
    blockerCards: ['SECURITY-002'],
    conditionalCards: ['SECURITY-FILTERED-COMMS-ACCESS-001', 'SECURITY-EDGE-001', 'SECURITY-PROVIDER-ROTATION-PROOF-001'],
    proofCommands: ['npm run process:security-002-check'],
    passDescription: 'Server-derived auth/tier/redaction remains fail-closed and broad shared-comms routes stay Tier 1-only.',
    failClosedBehavior: 'Return not_ready if SECURITY-002 regresses or a broader access claim lacks its blocker closeout.',
  },
  {
    key: 'p0_structural_coverage',
    label: 'Structural verifier coverage for every P0 gate',
    required: true,
    blockerCards: FOUNDATION_READINESS_GATE_CARD_IDS,
    proofCommands: ['npm run foundation:verify'],
    passDescription: 'Every P0 gate is done with verifier proof or named as a blocking/conditional card.',
    failClosedBehavior: 'Return not_ready if any P0 gate disappears from the registry or live backlog.',
  },
  {
    key: 'runtime_process_control',
    label: 'Runtime/process control health',
    required: true,
    blockerCards: ['SYSTEM-010-GHOST-CLOSEOUT-001'],
    proofCommands: ['npm run foundation:verify'],
    passDescription: 'Dashboard/worker code trust, job controls, stale-run handling, and ship gates are healthy.',
    failClosedBehavior: 'Return not_ready on stale served code, worker drift, stale runs, or missing SYSTEM-010 controls.',
  },
  {
    key: 'extraction_retry_ledger_backfill',
    label: 'Extraction retry/ledger/backfill health',
    required: true,
    blockerCards: ['EXTRACT-RUN-HARDENING-001'],
    proofCommands: ['npm run foundation:verify'],
    passDescription: 'Extraction has run IDs, item ledgers, retry/backoff, partial-failure visibility, stale lease handling, and bounded backfill.',
    failClosedBehavior: 'Return not_ready when extraction can hide failed items, stale leases, or unbounded backfill.',
  },
  {
    key: 'meeting_raw_drive_acl_vault',
    label: 'Meeting raw Drive ACL/vault status',
    required: true,
    blockerCards: ['MEETING-VAULT-ACL-001', 'DRIVE-ACCESS-REQUEST-001'],
    conditionalCards: ['MEETING-FORWARD-TRANSCRIPT-ENFORCEMENT-001'],
    proofCommands: ['npm run process:meeting-vault-acl-check'],
    passDescription: 'Original Google Drive meeting notes have owner-preserving ACL/vault proof, not only AIOS-side redaction.',
    failClosedBehavior: 'Return not_ready when raw file owners, permissions, dry-run diffs, approval, or rollback are unproven.',
  },
  {
    key: 'clear_pass_fail_output',
    label: 'Clear pass/fail output',
    required: true,
    blockerCards: [FOUNDATION_DONE_TEST_CARD_ID],
    proofCommands: ['npm run process:foundation-done-test -- --report-only'],
    passDescription: 'The gate prints clear human output and a stable FOUNDATION_DONE_TEST_SUMMARY JSON line.',
    failClosedBehavior: 'Return process/configuration failure if the test cannot evaluate readiness safely.',
  },
]

function normalizeText(value) {
  return String(value || '').trim()
}

function includesText(value, pattern) {
  return normalizeText(value).includes(pattern)
}

function getBacklogItems(foundationHub = {}) {
  return Array.isArray(foundationHub.backlogItems)
    ? foundationHub.backlogItems
    : Array.isArray(foundationHub.backlog)
      ? foundationHub.backlog
      : []
}

function findBacklogItem(foundationHub, cardId) {
  return getBacklogItems(foundationHub).find(item => item?.id === cardId) || null
}

function cardLane(foundationHub, cardId) {
  return normalizeText(findBacklogItem(foundationHub, cardId)?.lane)
}

function cardStatusNote(foundationHub, cardId) {
  return normalizeText(findBacklogItem(foundationHub, cardId)?.statusNote)
}

function closeoutExists(closeouts, cardId, closeoutKey) {
  if (!closeoutKey) return true
  return (closeouts || []).some(closeout =>
    closeout?.key === closeoutKey &&
      Array.isArray(closeout.backlogIds) &&
      closeout.backlogIds.includes(cardId)
  )
}

function isDoneWithCloseout(foundationHub, closeouts, cardId, closeoutKey) {
  return cardLane(foundationHub, cardId) === 'done' &&
    (!closeoutKey || includesText(cardStatusNote(foundationHub, cardId), closeoutKey)) &&
    closeoutExists(closeouts, cardId, closeoutKey)
}

function firstMissingRequiredCommand(packageScripts = {}, command) {
  const match = String(command || '').match(/^npm run ([^ ]+)/)
  const scriptName = match?.[1]
  return scriptName && !packageScripts[scriptName] ? scriptName : null
}

function buildLeg(status, fields) {
  return {
    key: fields.key,
    label: fields.label,
    status,
    blockerCard: fields.blockerCard || null,
    blockerCards: fields.blockerCards || [],
    proofCommand: fields.proofCommand || null,
    proofCommands: fields.proofCommands || [],
    why: fields.why || '',
    nextAction: fields.nextAction || '',
  }
}

function failedLeg(definition, blockerCards, why, nextAction) {
  return buildLeg('fail', {
    ...definition,
    blockerCard: blockerCards[0] || null,
    blockerCards,
    proofCommand: definition.proofCommands?.[0] || null,
    why,
    nextAction,
  })
}

function passedLeg(definition, why = definition.passDescription) {
  return buildLeg('pass', {
    ...definition,
    blockerCards: [],
    proofCommand: definition.proofCommands?.[0] || null,
    why,
  })
}

function getDefinition(key) {
  return FOUNDATION_READINESS_LEGS.find(leg => leg.key === key)
}

function missingCardsFromBacklog(foundationHub, cardIds) {
  return cardIds.filter(cardId => !findBacklogItem(foundationHub, cardId))
}

function openRequiredCards(foundationHub, closeouts, cardIds) {
  return cardIds.filter(cardId => {
    const gate = FOUNDATION_READINESS_GATE_CARDS.find(item => item.cardId === cardId)
    return !isDoneWithCloseout(foundationHub, closeouts, cardId, gate?.closeoutKey)
  })
}

export function buildFoundationReadinessStatus({
  foundationHub = {},
  closeouts = [],
  repo = {},
  generatedAt = new Date().toISOString(),
  repoHead = null,
} = {}) {
  const packageScripts = repo.packageJson?.scripts || {}
  const readinessScriptRegistered = packageScripts['process:foundation-done-test'] ===
    'node --env-file-if-exists=.env scripts/process-foundation-done-test.mjs'
  const requiredLegKeysPresent = FOUNDATION_READINESS_REQUIRED_LEG_KEYS.every(key =>
    FOUNDATION_READINESS_LEGS.some(leg => leg.key === key)
  )
  const requiredGateCardsPresent = FOUNDATION_READINESS_GATE_CARD_IDS.every(cardId =>
    FOUNDATION_READINESS_GATE_CARDS.some(gate => gate.cardId === cardId)
  )
  const missingBacklogCards = missingCardsFromBacklog(foundationHub, FOUNDATION_READINESS_GATE_CARD_IDS)
  const missingPackageCommands = FOUNDATION_READINESS_LEGS
    .flatMap(leg => leg.proofCommands || [])
    .map(command => firstMissingRequiredCommand(packageScripts, command))
    .filter(Boolean)
    .filter(scriptName => {
      if (scriptName.startsWith('process:meeting-vault-acl-check')) return false
      if (scriptName.startsWith('process:drive-access-request-check')) return false
      if (scriptName.startsWith('process:security-filtered-comms-access-check')) return false
      if (scriptName.startsWith('process:security-edge-check')) return false
      if (scriptName.startsWith('process:security-provider-rotation-proof-check')) return false
      if (scriptName.startsWith('process:synthesis-verify-check')) return false
      if (scriptName.startsWith('process:ack-states-check')) return false
      if (scriptName.startsWith('process:verifier-incremental-coverage-check')) return false
      return true
    })

  const legs = []

  const sourceBlockers = openRequiredCards(foundationHub, closeouts, [
    'SOURCE-LIFECYCLE-COMPLETION-001',
    'SYNTHESIS-VERIFY-001',
  ])
  legs.push(sourceBlockers.length
    ? failedLeg(
      getDefinition('source_verifiable_answer'),
      sourceBlockers,
      `Source-backed retrieval exists, but ${sourceBlockers.join(', ')} remains open.`,
      'Close the named source/synthesis blocker before claiming Strategy-grade source-verifiable answers.',
    )
    : passedLeg(getDefinition('source_verifiable_answer')))

  const securityDone = isDoneWithCloseout(foundationHub, closeouts, 'SECURITY-002', 'security-002-auth-tier-redaction-v1')
  legs.push(securityDone && repo.securityAccessHasRegistry && repo.securityScriptHasExternalDenials
    ? passedLeg(
      getDefinition('tier_redaction_safety'),
      'SECURITY-002 is closed and shared-comms/intelligence routes remain fail-closed or Tier 1-only where real-data filtering is unproven.',
    )
    : failedLeg(
      getDefinition('tier_redaction_safety'),
      ['SECURITY-002'],
      'SECURITY-002 closeout or process proof is missing/regressed.',
      'Run npm run process:security-002-check and do not broaden access until the regression is resolved.',
    ))

  legs.push(
    requiredLegKeysPresent && requiredGateCardsPresent && missingBacklogCards.length === 0 && missingPackageCommands.length === 0
      ? passedLeg(
        getDefinition('p0_structural_coverage'),
        'Every required readiness leg and captured P0 gate is registered; open P0 gates remain visible as blockers or conditional blockers.',
      )
      : failedLeg(
        getDefinition('p0_structural_coverage'),
        [FOUNDATION_DONE_TEST_CARD_ID],
        `Readiness registry is incomplete: missing backlog cards=${missingBacklogCards.join(',') || 'none'} missing package commands=${missingPackageCommands.join(',') || 'none'}.`,
        'Repair the central readiness registry or package wiring before using the exit test.',
      )
  )

  const runtimeBlockers = openRequiredCards(foundationHub, closeouts, ['SYSTEM-010-GHOST-CLOSEOUT-001'])
  legs.push(runtimeBlockers.length
    ? failedLeg(
      getDefinition('runtime_process_control'),
      runtimeBlockers,
      'Dashboard/worker code trust exists, but dead-man, decommission, active-process, and cost/process controls are still open.',
      'Close SYSTEM-010-GHOST-CLOSEOUT-001 before calling runtime/process control ready.',
    )
    : passedLeg(getDefinition('runtime_process_control')))

  const extractionBlockers = openRequiredCards(foundationHub, closeouts, ['EXTRACT-RUN-HARDENING-001'])
  legs.push(extractionBlockers.length
    ? failedLeg(
      getDefinition('extraction_retry_ledger_backfill'),
      extractionBlockers,
      'Extraction target/item ledgers exist, but retry/backoff, partial-failure, stale-lease, cursor, and bounded-backfill hardening is still open.',
      'Close EXTRACT-RUN-HARDENING-001 before calling extraction supply-chain health ready.',
    )
    : passedLeg(getDefinition('extraction_retry_ledger_backfill')))

  const meetingBlockers = openRequiredCards(foundationHub, closeouts, ['MEETING-VAULT-ACL-001', 'DRIVE-ACCESS-REQUEST-001'])
  legs.push(meetingBlockers.length
    ? failedLeg(
      getDefinition('meeting_raw_drive_acl_vault'),
      meetingBlockers,
      'SECURITY-002 protects AIOS responses, but raw Google Drive meeting-note ACL/vault proof is still open.',
      'Close MEETING-VAULT-ACL-001 and its Drive access preflight before claiming raw meeting notes are protected.',
    )
    : passedLeg(getDefinition('meeting_raw_drive_acl_vault')))

  legs.push(readinessScriptRegistered && repo.scriptHasSummaryMarker && repo.scriptSupportsReportOnly
    ? passedLeg(
      getDefinition('clear_pass_fail_output'),
      'The readiness command emits stable human output plus FOUNDATION_DONE_TEST_SUMMARY and supports --report-only for honest not_ready closeout proof.',
    )
    : failedLeg(
      getDefinition('clear_pass_fail_output'),
      [FOUNDATION_DONE_TEST_CARD_ID],
      'Readiness output script or package command is missing the required stable output behavior.',
      'Repair process:foundation-done-test before closing the card.',
    ))

  const failedRequiredLegs = legs.filter(leg => leg.status !== 'pass')
  const blockingCards = [...new Set(failedRequiredLegs.flatMap(leg => leg.blockerCards || []))]
  const conditionalCards = FOUNDATION_READINESS_GATE_CARDS
    .filter(gate => !gate.requiredForStrategy)
    .map(gate => ({
      cardId: gate.cardId,
      lane: cardLane(foundationHub, gate.cardId) || 'missing',
      condition: gate.condition,
    }))

  return {
    status: failedRequiredLegs.length ? 'not_ready' : 'ready',
    readyForStrategy: failedRequiredLegs.length === 0,
    generatedAt,
    repoHead,
    cardId: FOUNDATION_DONE_TEST_CARD_ID,
    closeoutKey: FOUNDATION_DONE_TEST_CLOSEOUT_KEY,
    legs,
    failedLegs: failedRequiredLegs,
    blockingCards,
    conditionalCards,
    summary: {
      totalLegs: legs.length,
      passedLegs: legs.filter(leg => leg.status === 'pass').length,
      failedLegs: failedRequiredLegs.length,
      blockingCardCount: blockingCards.length,
      registeredGateCards: FOUNDATION_READINESS_GATE_CARD_IDS.length,
      requiredGateCards: FOUNDATION_READINESS_REQUIRED_GATE_CARD_IDS.length,
    },
  }
}
