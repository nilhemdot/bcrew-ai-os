export const intelligenceCloseoutRecords = [
  {
    key: 'intelligence-synthesis-single-evidence-gate-repair-v1',
    backlogIds: [
      'INTELLIGENCE-SYNTHESIS-SINGLE-EVIDENCE-GATE-REPAIR-001',
    ],
    match: {
      subjectIncludes: [
        'INTELLIGENCE-SYNTHESIS-SINGLE-EVIDENCE-GATE-REPAIR-001',
        'Intelligence Synthesis Single Evidence Gate Repair',
        'intelligence-synthesis-single-evidence-gate-repair-v1',
      ],
    },
    operatorCloseout: true,
    mentionedBacklogIds: [
      'SYNTHESIS-ENGINE-001',
      'SYNTHESIS-VERIFY-001',
      'SYSTEM-HEALTH-NIGHTLY-AUDIT-001',
      'FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001',
    ],
    systemArea: 'Foundation intelligence synthesis reliability',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Repaired synthesis classification so under-supported Strategy-looking clusters stay operational unless they have multi-evidence and multi-chunk support.',
    whatItDoes: 'Prevents `runGovernedSynthesis()` from generating a Strategy-grade item that `SYNTHESIS-VERIFY-001` must block as `single_evidence_strategy_claim`.',
    whyItMatters: 'The scheduled intelligence synthesis refresh should fail closed on weak strategy claims without making a P0 job red from a preventable classifier mismatch.',
    whereItLives: [
      'lib/intelligence-synthesis.js Strategy eligibility support gate and dogfood proof',
      'lib/foundation-verify-coverage-card-ids.js done-card coverage',
      'scripts/process-intelligence-synthesis-single-evidence-gate-repair-check.mjs focused proof and live card scaffold',
      'docs/process/intelligence-synthesis-single-evidence-gate-repair-001-plan.md',
      'docs/process/approvals/INTELLIGENCE-SYNTHESIS-SINGLE-EVIDENCE-GATE-REPAIR-001.json',
      'docs/handoffs/2026-05-18-intelligence-synthesis-single-evidence-gate-repair-closeout.md',
    ],
    proofCommands: [
      'node --check lib/intelligence-synthesis.js scripts/process-intelligence-synthesis-single-evidence-gate-repair-check.mjs',
      'npm run process:intelligence-synthesis-single-evidence-gate-repair-check -- --close-card --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
      'npm run process:ship-check -- --card=INTELLIGENCE-SYNTHESIS-SINGLE-EVIDENCE-GATE-REPAIR-001 --planApprovalRef=docs/process/approvals/INTELLIGENCE-SYNTHESIS-SINGLE-EVIDENCE-GATE-REPAIR-001.json --closeoutKey=intelligence-synthesis-single-evidence-gate-repair-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
      'npm run process:fanout-check -- --card=INTELLIGENCE-SYNTHESIS-SINGLE-EVIDENCE-GATE-REPAIR-001 --closeoutKey=intelligence-synthesis-single-evidence-gate-repair-v1',
      'npm run process:foundation-ship -- --card=INTELLIGENCE-SYNTHESIS-SINGLE-EVIDENCE-GATE-REPAIR-001 --planApprovalRef=docs/process/approvals/INTELLIGENCE-SYNTHESIS-SINGLE-EVIDENCE-GATE-REPAIR-001.json --closeoutKey=intelligence-synthesis-single-evidence-gate-repair-v1 --commitRef=HEAD',
    ],
    proofStatus: 'Focused proof validates approval, Plan Critic, live backlog/current sprint truth, single-evidence Strategy downgrade, multi-evidence Strategy eligibility, strict SYNTHESIS-VERIFY-001 behavior, fresh read-only foundation-verify job success, package script, closeout registry, and side-effect boundaries.',
    reviewNext: 'Remaining Slack operational-write red rows are approval-bound. Continue next safe Foundation-up work from repo truth.',
    knownLimits: [
      'This does not run Slack sync, Slack extraction, live extraction, external sends, Drive mutation, Gmail/ClickUp sends, or Agent Feedback auto-send.',
      'This does not weaken SYNTHESIS-VERIFY-001.',
      'This does not hide remaining operational-write red rows.',
      'This does not build agent gates, Harlan, Fal, voice, Canva, OpenHuman, or UI redesign.',
    ],
  },
]
