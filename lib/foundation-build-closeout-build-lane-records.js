export const buildLaneCloseoutRecords = [
  {
    key: 'build-lane-served-code-fanout-sync-repair-v1',
    backlogIds: [
      'BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001',
    ],
    match: {
      subjectIncludes: [
        'BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001',
        'Build Lane Served-Code Fanout Sync Repair',
        'build-lane-served-code-fanout-sync-repair-v1',
      ],
    },
    operatorCloseout: true,
    mentionedBacklogIds: [
      'BUILD-LANE-FAILURE-TELEMETRY-001',
      'SHIP-GATE-WORKER-LIVE-JOB-PAUSE-001',
      'PARALLEL-BUILDER-OPERATING-SYSTEM-001',
    ],
    systemArea: 'Foundation build lane reliability',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Repaired fanout failure classification for stale served dashboard code.',
    whatItDoes: 'Keeps stale served code as a hard fanout failure while skipping dependent Recent Builds checks until the dashboard serves repo HEAD, preventing false build-log closeout/proof/where-it-lives telemetry.',
    whyItMatters: 'Builders should fix the real root cause. Stale served code needs a runtime restart, not a misleading build-log registry repair.',
    whereItLives: [
      'scripts/process-fanout-check.mjs SKIP behavior for dependent Recent Builds checks',
      'scripts/process-build-lane-served-code-fanout-sync-repair-check.mjs focused proof and live card scaffold',
      'docs/process/build-lane-served-code-fanout-sync-repair-001-plan.md',
      'docs/process/approvals/BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001.json',
      'docs/handoffs/2026-05-18-build-lane-served-code-fanout-sync-repair-closeout.md',
      'lib/foundation-verify-coverage-card-ids.js done-card coverage',
    ],
    proofCommands: [
      'node --check scripts/process-fanout-check.mjs scripts/process-build-lane-served-code-fanout-sync-repair-check.mjs',
      'npm run process:build-lane-served-code-fanout-sync-repair-check -- --close-card --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify',
      'npm run process:ship-check -- --card=BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001 --planApprovalRef=docs/process/approvals/BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001.json --closeoutKey=build-lane-served-code-fanout-sync-repair-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
      'npm run process:fanout-check -- --card=BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001 --closeoutKey=build-lane-served-code-fanout-sync-repair-v1',
      'npm run process:foundation-ship -- --card=BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001 --planApprovalRef=docs/process/approvals/BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001.json --closeoutKey=build-lane-served-code-fanout-sync-repair-v1 --commitRef=HEAD',
    ],
    proofStatus: 'Focused proof validates approval, Plan Critic, live backlog/current sprint truth, fanout skip behavior, skipped-check telemetry dogfood, dashboard and worker served-code HEAD proof, representative served build-log closeout visibility, package script, closeout registry, verifier coverage, and no hidden subagent usage.',
    reviewNext: 'Continue BUILD-LANE-VERIFIER-RESULT-PARSER-REPAIR-001 from repo truth unless a fresher Foundation blocker appears.',
    knownLimits: [
      'This does not install auto-restart-on-push.',
      'This does not launch parallel builders or hidden subagents.',
      'This does not run live extraction, auth-required or paid jobs, provider/model probes, external writes, Drive permission mutation, or Agent Feedback auto-send.',
      'This does not build Harlan/Fal/voice/Canva/OpenHuman feature work.',
    ],
  },
]
