import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'

const execFile = promisify(execFileCallback)

export const POST_SHIP_FANOUT_RULES = [
  {
    id: 'backlog-state',
    filePattern: /^lib\/foundation-db\.js$/,
    plainEnglish: 'When a ship changes backlog seed/state, the closeout must say what changed in Backlog.',
    requiredText: [/backlog/i],
  },
  {
    id: 'verifier-checks',
    filePattern: /^scripts\/foundation-verify\.mjs$/,
    plainEnglish: 'When a ship changes the main verifier, the closeout must name verifier coverage and include foundation:verify proof.',
    requiredText: [/verifier|foundation:verify/i],
    requiredProof: /foundation:verify/i,
  },
  {
    id: 'foundation-ui',
    filePattern: /^public\/foundation\.js$/,
    plainEnglish: 'When a ship changes Foundation UI, the closeout must say where the visible app surface lives.',
    requiredText: [/Foundation\s*>|Runtime Health|Recent Work|Backlog|Data Sources|Systems/i],
  },
  {
    id: 'rebuild-plan-state',
    filePattern: /^docs\/rebuild\//,
    plainEnglish: 'When a ship changes rebuild plan/state docs, the closeout must reference the plan/state update.',
    requiredText: [/current-plan|current-state|plan|state|command order|Phase/i],
  },
  {
    id: 'npm-command',
    filePattern: /^package\.json$/,
    plainEnglish: 'When a ship changes npm commands, the closeout must mention the command or proof command it added.',
    requiredText: [/npm run|command|script/i],
  },
]

function normalizeText(value) {
  return String(value || '').trim()
}

function closeoutText(closeout) {
  return [
    closeout?.key,
    closeout?.whatChanged,
    closeout?.whatItDoes,
    closeout?.whyItMatters,
    ...(closeout?.whereItLives || []),
    ...(closeout?.proofCommands || []),
    closeout?.proofStatus,
    closeout?.reviewNext,
    ...(closeout?.knownLimits || []),
  ].filter(Boolean).join('\n')
}

function closeoutProofText(closeout) {
  return (closeout?.proofCommands || []).join('\n')
}

function closeoutHasField(closeout, field) {
  const value = closeout?.[field]
  if (Array.isArray(value)) return value.length > 0 && value.every(item => normalizeText(item))
  return normalizeText(value).length > 0
}

export function evaluatePostShipFanout({
  cardId,
  closeout,
  changedFiles = [],
  backlogItems = [],
  includeSynthetic = true,
} = {}) {
  const findings = []
  const text = closeoutText(closeout)
  const proofText = closeoutProofText(closeout)
  const backlogIds = new Set((backlogItems || []).map(item => item.id).filter(Boolean))
  const requiredCloseoutFields = [
    'whatChanged',
    'whatItDoes',
    'whyItMatters',
    'whereItLives',
    'proofCommands',
    'knownLimits',
    'reviewNext',
  ]

  if (!closeout) {
    findings.push({
      severity: 'critical',
      type: 'missing_closeout',
      issue: 'No closeout record was found for this ship.',
      recommendedAction: 'Add a seven-field Recent Work closeout before trusting the ship.',
    })
    return findings
  }

  for (const field of requiredCloseoutFields) {
    if (closeoutHasField(closeout, field)) continue
    findings.push({
      severity: 'critical',
      type: 'missing_closeout_field',
      issue: `Closeout is missing ${field}.`,
      recommendedAction: `Fill ${field} in the closeout record.`,
    })
  }

  if (cardId && !(closeout.backlogIds || []).includes(cardId)) {
    findings.push({
      severity: 'critical',
      type: 'missing_target_card_link',
      issue: `Closeout does not link the target backlog card ${cardId}.`,
      recommendedAction: 'Add the card ID to closeout.backlogIds.',
    })
  }

  for (const linkedCardId of closeout.backlogIds || []) {
    if (backlogIds.has(linkedCardId)) continue
    findings.push({
      severity: 'critical',
      type: 'missing_live_backlog_card',
      issue: `Closeout links ${linkedCardId}, but that card is not in the live backlog.`,
      recommendedAction: 'Create the card or remove the stale closeout link.',
    })
  }

  for (const rule of POST_SHIP_FANOUT_RULES) {
    const matchedFiles = changedFiles.filter(file => rule.filePattern.test(file))
    if (!matchedFiles.length) continue

    const textOk = (rule.requiredText || []).every(pattern => pattern.test(text))
    if (!textOk) {
      findings.push({
        severity: 'critical',
        type: 'missing_fanout_reference',
        issue: `${rule.plainEnglish} Changed files: ${matchedFiles.join(', ')}.`,
        recommendedAction: 'Update the closeout so Steve can see the affected surface and proof.',
        ruleId: rule.id,
      })
    }

    if (rule.requiredProof && !rule.requiredProof.test(proofText)) {
      findings.push({
        severity: 'critical',
        type: 'missing_fanout_proof',
        issue: `${rule.plainEnglish} The proof command is missing.`,
        recommendedAction: 'Add the proof command to closeout.proofCommands.',
        ruleId: rule.id,
      })
    }
  }

  if (includeSynthetic) {
    const syntheticFindings = evaluatePostShipFanout({
      cardId: 'SYNTHETIC-FANOUT-001',
      closeout: {
        key: 'synthetic-missing-fanout',
        backlogIds: ['SYNTHETIC-FANOUT-001'],
        whatChanged: 'Changed a file.',
        whatItDoes: 'Does work.',
        whyItMatters: 'Proves the detector.',
        whereItLives: ['Foundation'],
        proofCommands: [],
        knownLimits: ['Synthetic only.'],
        reviewNext: 'None.',
      },
      changedFiles: ['scripts/foundation-verify.mjs'],
      backlogItems: [{ id: 'SYNTHETIC-FANOUT-001' }],
      includeSynthetic: false,
    })
    if (!syntheticFindings.some(finding => finding.type === 'missing_fanout_proof')) {
      findings.push({
        severity: 'critical',
        type: 'synthetic_detector_failed',
        issue: 'The synthetic missing-fanout case was not caught.',
        recommendedAction: 'Fix the fanout detector before trusting this gate.',
      })
    }
  }

  return findings
}

async function getGitChangedFilesForCommit(commitRef = 'HEAD') {
  const { stdout } = await execFile('git', ['show', '--name-only', '--format=', commitRef], {
    maxBuffer: 1024 * 512,
  })
  return stdout.split('\n').map(line => line.trim()).filter(Boolean)
}

async function getGitSubject(commitRef = 'HEAD') {
  const { stdout } = await execFile('git', ['show', '-s', '--format=%s', commitRef], {
    maxBuffer: 1024 * 64,
  })
  return normalizeText(stdout)
}

export async function buildPostShipFanoutStatus({
  closeouts = [],
  backlogItems = [],
  cardId = '',
  closeoutKey = '',
  commitRef = 'HEAD',
} = {}) {
  const closeout = closeouts.find(record => record.key === closeoutKey) ||
    closeouts[closeouts.length - 1] ||
    null
  const changedFiles = await getGitChangedFilesForCommit(commitRef).catch(() => [])
  const commitSubject = await getGitSubject(commitRef).catch(() => '')
  const findings = evaluatePostShipFanout({
    cardId: cardId || closeout?.backlogIds?.[0] || '',
    closeout,
    changedFiles,
    backlogItems,
  })
  const critical = findings.filter(finding => finding.severity === 'critical')

  return {
    status: critical.length ? 'risk' : 'healthy',
    closeoutKey: closeout?.key || closeoutKey || '',
    cardId: cardId || closeout?.backlogIds?.[0] || '',
    commitRef,
    commitSubject,
    changedFileCount: changedFiles.length,
    changedFiles,
    summary: {
      findingCount: findings.length,
      criticalFindings: critical.length,
      ruleCount: POST_SHIP_FANOUT_RULES.length,
    },
    findings,
    rules: POST_SHIP_FANOUT_RULES.map(rule => ({
      id: rule.id,
      plainEnglish: rule.plainEnglish,
      filePattern: String(rule.filePattern),
    })),
  }
}
