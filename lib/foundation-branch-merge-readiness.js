export const FOUNDATION_BRANCH_MERGE_READINESS_CARD_ID = 'FOUNDATION-BRANCH-MERGE-READINESS-AND-HEALTH-GREEN-001'
export const FOUNDATION_BRANCH_MERGE_READINESS_CLOSEOUT_KEY = 'foundation-branch-merge-readiness-health-green-v1'
export const FOUNDATION_BRANCH_MERGE_READINESS_PLAN_PATH = 'docs/process/foundation-branch-merge-readiness-and-health-green-001-plan.md'
export const FOUNDATION_BRANCH_MERGE_READINESS_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-BRANCH-MERGE-READINESS-AND-HEALTH-GREEN-001.json'
export const FOUNDATION_BRANCH_MERGE_READINESS_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-foundation-branch-merge-readiness-closeout.md'
export const FOUNDATION_BRANCH_MERGE_READINESS_SCRIPT_PATH = 'scripts/process-foundation-branch-merge-readiness-check.mjs'
export const FOUNDATION_BRANCH_MERGE_READINESS_SPRINT_ID = 'foundation-branch-merge-readiness-2026-05-19'

export const FOUNDATION_BRANCH_MERGE_READINESS_PROOF_COMMANDS = [
  'node --check lib/foundation-branch-merge-readiness.js scripts/process-foundation-branch-merge-readiness-check.mjs lib/foundation-merge-queue.js scripts/process-foundation-merge-queue-check.mjs lib/foundation-system-health.js scripts/foundation-verify.mjs scripts/process-verification-runs-check.mjs',
  'npm run process:foundation-merge-queue-check -- --apply --close-card --json',
  'npm run process:foundation-branch-merge-readiness-check -- --apply --close-card --json',
  'npm run process:verification-runs-check -- --json=true',
  'npm run process:build-lane-failure-telemetry-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=FOUNDATION-BRANCH-MERGE-READINESS-AND-HEALTH-GREEN-001 --planApprovalRef=docs/process/approvals/FOUNDATION-BRANCH-MERGE-READINESS-AND-HEALTH-GREEN-001.json --closeoutKey=foundation-branch-merge-readiness-health-green-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=FOUNDATION-BRANCH-MERGE-READINESS-AND-HEALTH-GREEN-001 --closeoutKey=foundation-branch-merge-readiness-health-green-v1',
  'npm run process:post-ship-fanout -- --card=FOUNDATION-BRANCH-MERGE-READINESS-AND-HEALTH-GREEN-001 --closeoutKey=foundation-branch-merge-readiness-health-green-v1 --commitRef=HEAD',
  'npm run process:foundation-ship -- --card=FOUNDATION-BRANCH-MERGE-READINESS-AND-HEALTH-GREEN-001 --planApprovalRef=docs/process/approvals/FOUNDATION-BRANCH-MERGE-READINESS-AND-HEALTH-GREEN-001.json --closeoutKey=foundation-branch-merge-readiness-health-green-v1 --commitRef=HEAD',
]

export const FOUNDATION_BRANCH_MERGE_READINESS_NOT_NEXT = [
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'Do not mutate Drive permissions.',
  'Do not rotate, revoke, retire, validate, or probe provider credentials.',
  'Do not run live extraction, paid/private source access, or external write jobs.',
  'Do not mutate Google Drive permissions, Gmail, ClickUp, Slack, Agent Feedback, or provider systems.',
  'Do not spawn hidden subagents or launch parallel builders.',
  'Do not merge to main unless branch gates pass and the merge decision is explicit.',
]

export function buildFoundationBranchMergeReadinessDogfoodProof({
  currentSprint = {},
  securityCard = {},
  mergeReadinessCard = {},
  meetingRun = null,
  verifierLineCount = 0,
} = {}) {
  const activeBlocker = currentSprint?.sprint?.activeBlockerCardId || null
  const sprintItems = Array.isArray(currentSprint?.items) ? currentSprint.items : []
  const mergeItem = sprintItems.find(item => item.cardId === FOUNDATION_BRANCH_MERGE_READINESS_CARD_ID) || null
  const securityReturned = sprintItems.some(item =>
    item.cardId === 'SECURITY-PROVIDER-ROTATION-PROOF-001' &&
      item.stage === 'returned' &&
      /provider-side/i.test(item.returnedReason || ''),
  )
  const securityRouted = securityReturned || (activeBlocker === null && mergeItem?.stage === 'done_this_sprint')
  return {
    ok: activeBlocker !== 'SECURITY-PROVIDER-ROTATION-PROOF-001' &&
      mergeItem &&
      ['building_now', 'done_this_sprint'].includes(mergeItem.stage) &&
      securityRouted &&
      securityCard?.lane === 'scoped' &&
      /provider-side/i.test(securityCard?.nextAction || '') &&
      /security-provider-rotation-proof-preflight-v1/.test(securityCard?.statusNote || '') &&
      mergeReadinessCard?.id === FOUNDATION_BRANCH_MERGE_READINESS_CARD_ID &&
      Number(verifierLineCount) < 5000 &&
      meetingRun?.metadata?.systemHealthRouting?.status === 'blocked_by_approval',
    activeBlocker,
    mergeStage: mergeItem?.stage || null,
    securityReturned,
    securityRouted,
    securityLane: securityCard?.lane || null,
    verifierLineCount,
    meetingRouting: meetingRun?.metadata?.systemHealthRouting || null,
    invariant: 'Returned approval-bound security and live-extraction failures are visible, but neither remains the active build blocker.',
  }
}
