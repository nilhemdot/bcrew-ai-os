#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { closeFoundationDb } from '../lib/foundation-db-session.js'
import { getBacklogItemsByIds } from '../lib/foundation-backlog-sprint-db.js'
import {
  HARLAN_AUTH_LIVE_DELIVERY_APPROVAL_PATH as APPROVAL_PATH,
  HARLAN_AUTH_LIVE_DELIVERY_CARD_ID as CARD_ID,
  HARLAN_AUTH_LIVE_DELIVERY_CLOSEOUT_KEY as CLOSEOUT_KEY,
  HARLAN_AUTH_LIVE_DELIVERY_CONTINUATION_CARD_ID as CONTINUATION_CARD_ID,
  HARLAN_AUTH_LIVE_DELIVERY_HANDOFF_PATH as HANDOFF_PATH,
  HARLAN_AUTH_LIVE_DELIVERY_PLAN_PATH as PLAN_PATH,
  HARLAN_AUTH_LIVE_DELIVERY_PROOF_COMMANDS as PROOF_COMMANDS,
  HARLAN_AUTH_LIVE_DELIVERY_SCRIPT_PATH as SCRIPT_PATH,
  HARLAN_AUTH_LIVE_DELIVERY_APPROVED_MODE,
  HARLAN_APPROVED_STEVE_CHAT_ID,
  HARLAN_APPROVED_TELEGRAM_BOT_USERNAME,
  HARLAN_OPENCLAW_TELEGRAM_BOT_TOKEN_REF,
  buildHarlanAuthLiveDeliveryContract,
  buildHarlanAuthLiveDeliveryDogfoodProof,
  evaluateHarlanAuthLiveDeliveryContract,
  sendHarlanBuilderEventNotification,
} from '../lib/harlan-auth-live-delivery.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  buildPlanCriticResultSummary,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const CHANGED_FILES = [
  'lib/harlan-auth-live-delivery.js',
  'scripts/harlan-builder-event.mjs',
  SCRIPT_PATH,
  PLAN_PATH,
  APPROVAL_PATH,
  HANDOFF_PATH,
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'data/foundation-build-closeouts/agent-runtime-records.json',
  'package.json',
]

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function normalizeText(value = '') {
  return String(value || '').trim()
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath, { json = false } = {}) {
  const source = await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  return json ? JSON.parse(source) : source
}

async function fileExists(relativePath) {
  try {
    return (await fs.stat(path.join(repoRoot, relativePath))).isFile()
  } catch {
    return false
  }
}

function containsRawTelegramToken(text = '') {
  return /\b\d{7,}:[A-Za-z0-9_-]{20,}\b/.test(String(text || ''))
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    approval,
    packageJson,
    planSource,
    moduleSource,
    scriptSource,
    closeoutRecordsSource,
    builderEventScriptSource,
    handoffSource,
    currentPlanSource,
    currentStateSource,
    cards,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile('package.json', { json: true }),
    readRepoFile(PLAN_PATH),
    readRepoFile('lib/harlan-auth-live-delivery.js'),
    readRepoFile(SCRIPT_PATH),
    Promise.resolve(JSON.stringify(getFoundationBuildCloseouts())),
    readRepoFile('scripts/harlan-builder-event.mjs'),
    readRepoFile(HANDOFF_PATH),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    getBacklogItemsByIds([CARD_ID, CONTINUATION_CARD_ID]),
  ])
  await closeFoundationDb()

  const card = cards.find(item => item.id === CARD_ID) || null
  const continuation = cards.find(item => item.id === CONTINUATION_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const contractStatus = evaluateHarlanAuthLiveDeliveryContract(buildHarlanAuthLiveDeliveryContract())
  const dogfood = buildHarlanAuthLiveDeliveryDogfoodProof()
  const liveSendDogfood = await sendHarlanBuilderEventNotification({
    env: {
      HARLAN_AUTH_LIVE_DELIVERY_MODE: HARLAN_AUTH_LIVE_DELIVERY_APPROVED_MODE,
      HARLAN_TELEGRAM_TARGET_OWNER: 'Steve',
      HARLAN_TELEGRAM_BOT_USERNAME: HARLAN_APPROVED_TELEGRAM_BOT_USERNAME,
      HARLAN_TELEGRAM_BOT_TOKEN_REF: HARLAN_OPENCLAW_TELEGRAM_BOT_TOKEN_REF,
      HARLAN_TELEGRAM_STEVE_CHAT_ID_REF: HARLAN_APPROVED_STEVE_CHAT_ID,
      HARLAN_TELEGRAM_LIVE_SEND_APPROVAL_REF: `${APPROVAL_PATH}#${HARLAN_AUTH_LIVE_DELIVERY_APPROVED_MODE}`,
    },
    event: {
      eventType: 'foundation_ship_passed',
      cardId: CARD_ID,
      status: 'dogfood_sent',
      summary: 'Synthetic Harlan live delivery dogfood through injected Telegram sender.',
      runId: 'process-harlan-auth-live-delivery-check',
    },
    resolveSecrets: async config => ({
      botToken: 'synthetic-openclaw-token',
      chatId: HARLAN_APPROVED_STEVE_CHAT_ID,
      botTokenRef: config.botTokenRef,
      chatIdRef: config.steveChatIdRef,
    }),
    telegramSender: async () => ({ ok: true, messageId: 4242 }),
    dedupeLedgerPath: false,
  })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: {
      id: CARD_ID,
      title: 'Prove live Harlan auth notification and resume loop',
      priority: 'P0',
      lane: card?.lane || 'scoped',
      nextAction: card?.nextAction || 'Proof live Harlan auth notification and resume loop.',
      statusNote: card?.statusNote || 'Continuation card. Dry-run auth escalation is not live Harlan auth resolution.',
    },
    changedFiles: CHANGED_FILES,
    declaredRisk: 'Harlan Telegram operator delivery can accidentally become a live sender or leak raw messaging secrets if not gate-kept.',
    repoRoot,
  })
  const proofSource = `${scriptSource}\n${builderEventScriptSource}`
  const forbiddenNetworkPatterns = [
    /\bawait\s+fetch\s*\(/,
    /\breturn\s+fetch\s*\(/,
    /\bhttps\.request\s*\(/,
    /\bhttp\.request\s*\(/,
    /\baxios\.\w+\s*\(/,
    /\bnew\s+Telegraf\s*\(/,
    /\bnew\s+TelegramBot\s*\(/,
  ]

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(planReview))
  addCheck(checks, card?.priority === 'P0' && ['scoped', 'executing', 'done'].includes(card?.lane), 'live Harlan delivery continuation card exists', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, continuation && continuation.lane !== 'done', 'open Harlan runtime continuation remains available', continuation ? `${continuation.id}/${continuation.lane}` : 'missing')
  addCheck(checks, contractStatus.ok && contractStatus.status === 'ready_live', 'Harlan Telegram live-delivery contract passes', `${contractStatus.status}/${contractStatus.summary.violationCount} violations`)
  addCheck(checks, dogfood.ok, 'dogfood proves live-approved config, dedupe, DONE/resume, timeout, and fail-closed behavior', dogfood.invariant)
  addCheck(checks, liveSendDogfood.ok && liveSendDogfood.status === 'sent' && liveSendDogfood.sendsMessageNow === true, 'live runner dogfood sends only through injected Telegram sender', `${liveSendDogfood.status}/${liveSendDogfood.messageId}`)
  addCheck(checks, dogfood.missingConfigBlocksLiveSend, 'missing Telegram config blocks live send', 'blocked-preflight')
  addCheck(checks, dogfood.approvedConfigPreparesButDoesNotSend, 'approved config prepares request preview without proof-path sending', 'sendsMessageNow=false')
  addCheck(checks, dogfood.rawSecretRejected, 'raw Telegram secret env is rejected and not printed', 'metadata keys only')
  addCheck(checks, dogfood.duplicateNoSpam, 'duplicate auth issue is deduped', 'one packet per issue')
  addCheck(checks, dogfood.doneReverifyResume && dogfood.timeoutFailClosed, 'DONE/reverify/resume and timeout/fail-closed branches work', JSON.stringify({ done: dogfood.doneReverifyResume, timeout: dogfood.timeoutFailClosed }))
  addCheck(checks, dogfood.unsafeSendRejected && dogfood.wrongTargetRejected && dogfood.weakContractRejected, 'unsafe live send, wrong target, and weak contract are rejected', JSON.stringify({ send: dogfood.unsafeSendRejected, target: dogfood.wrongTargetRejected, weak: dogfood.weakContractRejected }))
  addCheck(checks, packageJson.scripts?.['process:harlan-auth-live-delivery-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:harlan-auth-live-delivery-check'] || 'missing')
  addCheck(checks, packageJson.scripts?.['harlan:builder-event'] === 'node --env-file-if-exists=.env scripts/harlan-builder-event.mjs', 'package exposes reusable Harlan builder-event sender', packageJson.scripts?.['harlan:builder-event'] || 'missing')
  addCheck(checks, !forbiddenNetworkPatterns.some(pattern => pattern.test(proofSource)), 'focused proof scripts do not open Telegram network sends directly', forbiddenNetworkPatterns.filter(pattern => pattern.test(proofSource)).map(pattern => pattern.source).join(', ') || 'no proof-script network sender tokens')
  addCheck(checks, moduleSource.includes('https.request') && moduleSource.includes('sendHarlanBuilderEventNotification'), 'module owns the approved live Telegram sender path', 'sender is centralized in lib/harlan-auth-live-delivery.js')
  addCheck(checks, !containsRawTelegramToken(`${moduleSource}\n${proofSource}`), 'module/scripts contain no raw Telegram token-looking secret', 'raw token regex absent')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry record is registered', closeout?.key || 'missing')
  addCheck(checks, closeout?.status === 'accepted' && /live/i.test(String(closeout.acceptanceState || '')), 'closeout is honest live-accepted delivery, not preflight-only', closeout?.acceptanceState || 'missing')
  addCheck(checks, (closeout?.mentionedBacklogIds || []).includes(CONTINUATION_CARD_ID), 'closeout points at open Harlan runtime continuation', (closeout?.mentionedBacklogIds || []).join(', ') || 'missing')
  addCheck(checks, PROOF_COMMANDS.every(command => (closeout?.proofCommands || []).includes(command)), 'closeout includes canonical proof commands', `${(closeout?.proofCommands || []).length} commands`)
  addCheck(checks, closeoutRecordsSource.includes(CLOSEOUT_KEY) && closeoutRecordsSource.includes(CARD_ID), 'closeout source contains key and card', CLOSEOUT_KEY)
  addCheck(checks, await fileExists(HANDOFF_PATH), 'handoff file exists', HANDOFF_PATH)
  addCheck(checks, handoffSource.includes(HARLAN_APPROVED_TELEGRAM_BOT_USERNAME) && handoffSource.includes(HARLAN_APPROVED_STEVE_CHAT_ID) && handoffSource.includes('notifications only'), 'handoff captures live Steve-only notification boundary', HANDOFF_PATH)
  addCheck(checks, currentPlanSource.includes(CLOSEOUT_KEY) && currentPlanSource.includes(CARD_ID), 'current plan mentions Harlan live delivery', CLOSEOUT_KEY)
  addCheck(checks, currentStateSource.includes(CLOSEOUT_KEY) && currentStateSource.includes(CARD_ID), 'current state mentions Harlan live delivery', CLOSEOUT_KEY)
  addCheck(checks, moduleSource.split('\n').length < 900, 'new module stays under preferred module budget', `${moduleSource.split('\n').length} lines`)
  addCheck(checks, scriptSource.split('\n').length < 500, 'focused proof script stays under preferred module budget', `${scriptSource.split('\n').length} lines`)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'fail' : 'pass',
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    checkCount: checks.length,
    failedCount: failed.length,
    contractStatus: contractStatus.status,
    dogfoodOk: dogfood.ok,
    checks,
    failed,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`${CARD_ID} check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }

  if (failed.length) process.exitCode = 1
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error(error?.stack || error?.message || String(error))
  process.exitCode = 1
})
