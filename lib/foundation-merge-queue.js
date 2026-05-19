export const FOUNDATION_MERGE_QUEUE_CARD_ID = 'FOUNDATION-MERGE-QUEUE-001'
export const FOUNDATION_MERGE_QUEUE_CLOSEOUT_KEY = 'foundation-merge-queue-v1'
export const FOUNDATION_MERGE_QUEUE_PLAN_PATH = 'docs/process/foundation-merge-queue-001-plan.md'
export const FOUNDATION_MERGE_QUEUE_PROTOCOL_PATH = 'docs/process/foundation-merge-queue-protocol.md'
export const FOUNDATION_MERGE_QUEUE_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-MERGE-QUEUE-001.json'
export const FOUNDATION_MERGE_QUEUE_CLOSEOUT_PATH = 'docs/handoffs/2026-05-19-foundation-merge-queue-closeout.md'
export const FOUNDATION_MERGE_QUEUE_SCRIPT_PATH = 'scripts/process-foundation-merge-queue-check.mjs'

export const FOUNDATION_MERGE_QUEUE_PROOF_COMMANDS = [
  'node --check lib/foundation-merge-queue.js scripts/process-foundation-merge-queue-check.mjs',
  'npm run process:foundation-merge-queue-check -- --apply --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=FOUNDATION-MERGE-QUEUE-001 --planApprovalRef=docs/process/approvals/FOUNDATION-MERGE-QUEUE-001.json --closeoutKey=foundation-merge-queue-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=FOUNDATION-MERGE-QUEUE-001 --closeoutKey=foundation-merge-queue-v1',
  'npm run process:post-ship-fanout -- --card=FOUNDATION-MERGE-QUEUE-001 --closeoutKey=foundation-merge-queue-v1 --commitRef=HEAD',
  'npm run process:foundation-ship -- --card=FOUNDATION-MERGE-QUEUE-001 --planApprovalRef=docs/process/approvals/FOUNDATION-MERGE-QUEUE-001.json --closeoutKey=foundation-merge-queue-v1 --commitRef=HEAD',
]

export const FOUNDATION_MERGE_QUEUE_NOT_NEXT = [
  'Do not launch parallel builders in this card.',
  'Do not merge main from an unverified, dirty, or conflict-risk branch.',
  'Do not treat approval-bound provider work, live extraction, or external writes as done.',
  'Do not use hidden delegated workers as the default integration path.',
  'Do not keep adding finished cards to a long-lived branch without an explicit release-train approval.',
]

export function parseAheadCount(mainDelta = '') {
  const [, right = '0'] = String(mainDelta || '').trim().split(/\s+/)
  const value = Number(right)
  return Number.isFinite(value) ? value : 0
}

export function evaluateFoundationMergeQueueEntry(entry = {}) {
  const findings = []
  const aheadCount = Number(entry.aheadCount ?? parseAheadCount(entry.mainDelta))
  const releaseTrainApproved = Boolean(entry.releaseTrainApproved)

  const add = (key, ok, severity, detail) => {
    if (!ok) findings.push({ key, severity, detail })
  }

  add('branch_synced', entry.branchSynced !== false, 'blocker', 'Branch must be synced with its origin tracking ref before entering the merge lane.')
  add('worktree_clean', entry.worktreeClean === true, 'blocker', 'Worktree must be clean before merge.')
  add('closeout_exists', entry.closeoutExists === true, 'blocker', 'Card or bundle closeout must exist before merge.')
  add('focused_proof_passed', entry.focusedProofPassed === true, 'blocker', 'Focused proof must pass before merge.')
  add('full_ship_gate_passed', entry.fullShipGatePassed === true, 'blocker', 'Full ship/process gate must pass before merge.')
  add('approval_bound_not_false_done', entry.approvalBoundFalseDone !== true, 'blocker', 'Approval-required live work must not be falsely marked done.')
  add('blocked_card_not_hostage', entry.blockedCardHoldingSprint !== true, 'blocker', 'Blocked/returned cards must not hold the active sprint hostage.')
  add('merge_conflict_check_passed', entry.mergeConflictCheckPassed === true, 'blocker', 'Merge conflict or fast-forward check must pass before main is touched.')
  add('hidden_worker_explicit', !(entry.hiddenWorkerSpawned === true && entry.hiddenWorkerApproved !== true), 'blocker', 'Hidden delegated workers require explicit approval and ownership.')
  add('main_post_merge_healthy', !(entry.mainPostMergeHealthy === false && entry.mainFailureRepairRouted !== true), 'pause', 'If main fails after merge, the queue pauses and routes a repair before any further merge.')

  if (aheadCount > 20 && !releaseTrainApproved) {
    findings.push({
      key: 'long_branch_release_train_risk',
      severity: 'risk',
      detail: `${aheadCount} commits ahead of main without explicit release-train approval; stop stacking and resolve integration.`,
    })
  }

  const blockingFindings = findings.filter(finding => finding.severity === 'blocker')
  const queuePause = findings.some(finding => finding.severity === 'pause')
  const integrationRisk = findings.some(finding => finding.severity === 'risk')

  return {
    status: queuePause ? 'paused' : blockingFindings.length ? 'blocked' : integrationRisk ? 'integration_required' : 'ready',
    canMerge: !queuePause && blockingFindings.length === 0,
    canContinueStacking: !queuePause && blockingFindings.length === 0 && !integrationRisk,
    queuePause,
    integrationRisk,
    aheadCount,
    findings,
  }
}

export function buildFoundationMergeQueueDogfoodProof() {
  const healthyInput = {
    aheadCount: 3,
    branchSynced: true,
    worktreeClean: true,
    closeoutExists: true,
    focusedProofPassed: true,
    fullShipGatePassed: true,
    approvalBoundFalseDone: false,
    blockedCardHoldingSprint: false,
    mergeConflictCheckPassed: true,
  }
  const healthy = evaluateFoundationMergeQueueEntry(healthyInput)
  const dirty = evaluateFoundationMergeQueueEntry({ ...healthyInput, worktreeClean: false })
  const missingShip = evaluateFoundationMergeQueueEntry({ ...healthyInput, fullShipGatePassed: false })
  const approvalFalseDone = evaluateFoundationMergeQueueEntry({ ...healthyInput, approvalBoundFalseDone: true })
  const sprintHostage = evaluateFoundationMergeQueueEntry({ ...healthyInput, blockedCardHoldingSprint: true })
  const conflict = evaluateFoundationMergeQueueEntry({ ...healthyInput, mergeConflictCheckPassed: false })
  const hiddenWorker = evaluateFoundationMergeQueueEntry({ ...healthyInput, hiddenWorkerSpawned: true, hiddenWorkerApproved: false })
  const mainFailed = evaluateFoundationMergeQueueEntry({ ...healthyInput, mainPostMergeHealthy: false, mainFailureRepairRouted: false })
  const longBranch = evaluateFoundationMergeQueueEntry({ ...healthyInput, aheadCount: 108, releaseTrainApproved: false })

  return {
    ok: healthy.status === 'ready' &&
      dirty.status === 'blocked' &&
      missingShip.status === 'blocked' &&
      approvalFalseDone.status === 'blocked' &&
      sprintHostage.status === 'blocked' &&
      conflict.status === 'blocked' &&
      hiddenWorker.status === 'blocked' &&
      mainFailed.status === 'paused' &&
      longBranch.status === 'integration_required' &&
      longBranch.canContinueStacking === false,
    healthy,
    dirty,
    missingShip,
    approvalFalseDone,
    sprintHostage,
    conflict,
    hiddenWorker,
    mainFailed,
    longBranch,
    invariant: 'Completed cards enter a serialized merge lane; dirty worktrees, missing proof, false-done approval work, hidden workers, conflicts, and failing main stop the queue.',
  }
}
