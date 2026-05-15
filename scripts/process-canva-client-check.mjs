#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  CANVA_CLIENT_APPROVAL_PATH,
  CANVA_CLIENT_CARD_ID,
  CANVA_CLIENT_CLOSEOUT_KEY,
  CANVA_CLIENT_PLAN_PATH,
  CANVA_CLIENT_SCRIPT_PATH,
  CANVA_CLIENT_SPRINT_ID,
  buildCanvaEnvStatus,
  buildSyntheticCanvaClientProof,
  createCanvaClientFromEnv,
  evaluateCanvaClientSource,
  persistCanvaRefreshToken,
  sanitizeCanvaLogValue,
} from '../lib/canva-client.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
} from '../lib/process-write-guard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, live: false, updateRefreshToken: false, limit: 5 }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    if (arg === '--live' || arg === '--live=true') args.live = true
    if (arg === '--update-refresh-token' || arg === '--update-refresh-token=true') args.updateRefreshToken = true
    if (arg.startsWith('--limit=')) {
      const value = Number(arg.split('=').slice(1).join('='))
      if (Number.isFinite(value) && value > 0) args.limit = Math.min(Math.floor(value), 20)
    }
  }
  return args
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function repoFileExists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

function summarizeItems(response) {
  const items = Array.isArray(response?.items)
    ? response.items
    : Array.isArray(response?.data)
      ? response.data
      : []
  return {
    count: items.length,
    sample: items.slice(0, 5).map(item => ({
      id: item?.id || item?.folder?.id || item?.design?.id || item?.image?.id || null,
      type: item?.type || item?.folder?.type || item?.design?.type || item?.image?.type || null,
      title: item?.title || item?.name || item?.folder?.name || item?.design?.title || item?.image?.name || null,
    })),
  }
}

async function runLiveSmoke(limit, { updateRefreshToken = false } = {}) {
  let refreshTokenPersistence = null
  const client = createCanvaClientFromEnv(process.env, {
    envPath: path.join(repoRoot, '.env'),
    onRefreshTokenRotated: updateRefreshToken
      ? async token => {
          refreshTokenPersistence = await persistCanvaRefreshToken({
            envPath: path.join(repoRoot, '.env'),
            refreshToken: token.nextRefreshToken,
          })
        }
      : null,
  })
  const result = {
    providerSpendUsd: 0,
    env: buildCanvaEnvStatus(process.env),
    tokenMinted: false,
    refreshTokenRotated: false,
    refreshTokenPersisted: false,
    refreshTokenPersistence: null,
    profile: null,
    rootFolder: null,
    uploadsFolder: null,
    designs: null,
    brandTemplates: null,
    degraded: [],
  }

  const token = await client.getAccessToken()
  result.tokenMinted = Boolean(token.accessToken)
  result.refreshTokenRotated = Boolean(token.refreshTokenRotated)
  result.refreshTokenPersisted = Boolean(refreshTokenPersistence?.ok)
  result.refreshTokenPersistence = refreshTokenPersistence ? sanitizeCanvaLogValue(refreshTokenPersistence) : null

  try {
    const profile = await client.getCurrentUser()
    result.profile = {
      present: Boolean(profile?.profile || profile),
      keys: Object.keys(profile || {}).sort(),
    }
  } catch (error) {
    result.degraded.push({ endpoint: 'profile', error: sanitizeCanvaLogValue(error?.metadata || error?.message || error) })
  }

  try {
    result.rootFolder = summarizeItems(await client.listFolderItems('root', { limit }))
  } catch (error) {
    result.degraded.push({ endpoint: 'folders/root/items', error: sanitizeCanvaLogValue(error?.metadata || error?.message || error) })
  }

  try {
    result.uploadsFolder = summarizeItems(await client.listFolderItems('uploads', { limit }))
  } catch (error) {
    result.degraded.push({ endpoint: 'folders/uploads/items', error: sanitizeCanvaLogValue(error?.metadata || error?.message || error) })
  }

  try {
    result.designs = summarizeItems(await client.listDesigns({ limit }))
  } catch (error) {
    result.degraded.push({ endpoint: 'designs', error: sanitizeCanvaLogValue(error?.metadata || error?.message || error) })
  }

  try {
    result.brandTemplates = summarizeItems(await client.listBrandTemplates({ limit }))
  } catch (error) {
    result.degraded.push({ endpoint: 'brand-templates', error: sanitizeCanvaLogValue(error?.metadata || error?.message || error) })
  }

  return result
}

async function main() {
  const args = parseArgs()
  const checks = []
  if (args.live && args.updateRefreshToken) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: 'scripts/process-canva-client-check.mjs',
      operation: 'replace rotated CANVA_REFRESH_TOKEN in .env',
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
    })
  }

  const [
    clientSource,
    scriptSource,
    bootstrapSource,
    planSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile('lib/canva-client.js'),
    readRepoFile(CANVA_CLIENT_SCRIPT_PATH),
    readRepoFile('scripts/canva-oauth-bootstrap.mjs'),
    readRepoFile(CANVA_CLIENT_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const sourceEvaluation = evaluateCanvaClientSource({ clientSource, scriptSource, planSource, packageJson })
  const syntheticProof = await buildSyntheticCanvaClientProof()
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: CANVA_CLIENT_APPROVAL_PATH,
    cardId: CANVA_CLIENT_CARD_ID,
  })
  const [card] = await getBacklogItemsByIds([CANVA_CLIENT_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const activeItem = (activeSprint.items || []).find(item => item.cardId === CANVA_CLIENT_CARD_ID) || null
  const planCriticRuns = await getPlanCriticRunsByCardIds([CANVA_CLIENT_CARD_ID])
  await closeFoundationDb()

  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null
  const envStatus = buildCanvaEnvStatus(process.env)

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'approval file validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || CANVA_CLIENT_APPROVAL_PATH)
  addCheck(checks, card && ['scoped', 'executing', 'done'].includes(card.lane), 'live backlog card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, activeSprint.sprint?.sprintId === CANVA_CLIENT_SPRINT_ID, 'Current Sprint is Canva client sprint', activeSprint.sprint?.sprintId || 'missing')
  addCheck(checks, activeItem && ['scoping', 'sprint_ready', 'building_now', 'done_this_sprint'].includes(activeItem.stage), 'Current Sprint contains Canva card', activeItem ? `${activeItem.cardId}:${activeItem.stage}` : 'missing')
  addCheck(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  addCheck(checks, sourceEvaluation.ok, 'source evaluation passes', sourceEvaluation.checks.filter(check => !check.ok).map(check => check.check).join(', ') || 'ok')
  for (const check of sourceEvaluation.checks) addCheck(checks, check.ok, `source: ${check.check}`, check.detail || '')
  addCheck(checks, syntheticProof.ok, 'synthetic dogfood proof passes', syntheticProof.checks.filter(check => !check.ok).map(check => check.check).join(', ') || JSON.stringify(syntheticProof.callSummary))
  for (const check of syntheticProof.checks) addCheck(checks, check.ok, `dogfood: ${check.check}`, check.detail || '')
  addCheck(checks, envStatus.CANVA_CLIENT_ID && envStatus.CANVA_CLIENT_SECRET && envStatus.CANVA_REFRESH_TOKEN, 'Canva env values are present', JSON.stringify(envStatus))
  addCheck(
    checks,
    bootstrapSource.includes('replaceEnvValueLine') &&
      bootstrapSource.includes('code_challenge_method') &&
      bootstrapSource.includes('S256') &&
      bootstrapSource.includes('refusing_to_write_env_without_apply') &&
      bootstrapSource.includes('CANVA_REFRESH_TOKEN') &&
      !bootstrapSource.includes('console.log(token.refresh_token') &&
      packageJson.scripts?.['canva:oauth-bootstrap'] === 'node --env-file-if-exists=.env scripts/canva-oauth-bootstrap.mjs',
    'OAuth bootstrap helper is guarded and registered',
    'scripts/canva-oauth-bootstrap.mjs',
  )
  addCheck(checks, await repoFileExists('lib/canva-client.js'), 'client module exists', 'lib/canva-client.js')
  addCheck(checks, await repoFileExists(CANVA_CLIENT_APPROVAL_PATH), 'approval exists', CANVA_CLIENT_APPROVAL_PATH)
  addCheck(checks, await repoFileExists(CANVA_CLIENT_PLAN_PATH), 'plan exists', CANVA_CLIENT_PLAN_PATH)
  addCheck(checks, planSource.includes('official Canva Connect API docs') && planSource.includes('/folders/{folderId}/items') && planSource.includes('/brand-templates'), 'plan cites official Canva endpoint boundaries', CANVA_CLIENT_PLAN_PATH)
  addCheck(checks, CANVA_CLIENT_CLOSEOUT_KEY === 'canva-client-v1', 'closeout key is stable', CANVA_CLIENT_CLOSEOUT_KEY)

  if (args.live) {
    addCheck(
      checks,
      args.updateRefreshToken,
      'live Canva smoke requires refresh-token replacement posture',
      args.updateRefreshToken
        ? 'will replace CANVA_REFRESH_TOKEN line if Canva rotates it'
        : 'rerun with --live --update-refresh-token --apply; Canva refresh tokens are single-use',
    )
  }
  const liveSmoke = args.live && args.updateRefreshToken ? await runLiveSmoke(args.limit, { updateRefreshToken: args.updateRefreshToken }) : null
  if (args.live) {
    addCheck(checks, liveSmoke?.tokenMinted === true, 'live smoke mints Canva access token', liveSmoke?.tokenMinted ? 'token present in memory only' : 'missing token')
    addCheck(checks, liveSmoke?.providerSpendUsd === 0, 'live smoke has zero provider spend', String(liveSmoke?.providerSpendUsd ?? 'not-run'))
    addCheck(
      checks,
      liveSmoke?.refreshTokenRotated === false || liveSmoke?.refreshTokenPersisted === true,
      'live smoke persists rotated Canva refresh token',
      liveSmoke
        ? `rotated=${liveSmoke.refreshTokenRotated} persisted=${liveSmoke.refreshTokenPersisted}`
        : 'not run',
    )
    addCheck(
      checks,
      Boolean(liveSmoke?.rootFolder || liveSmoke?.uploadsFolder || liveSmoke?.designs || liveSmoke?.brandTemplates),
      'live smoke reaches at least one read-only Canva surface',
      JSON.stringify({
        root: liveSmoke?.rootFolder?.count ?? null,
        uploads: liveSmoke?.uploadsFolder?.count ?? null,
        designs: liveSmoke?.designs?.count ?? null,
        brandTemplates: liveSmoke?.brandTemplates?.count ?? null,
        degraded: liveSmoke?.degraded?.length ?? null,
      }),
    )
  }

  const failures = checks.filter(check => !check.ok)
  const summary = {
    ok: failures.length === 0,
    cardId: CANVA_CLIENT_CARD_ID,
    closeoutKey: CANVA_CLIENT_CLOSEOUT_KEY,
    providerSpendUsd: 0,
    envStatus,
    syntheticProof,
    liveSmoke: liveSmoke ? sanitizeCanvaLogValue(liveSmoke) : null,
    checks,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`Canva client check: ${summary.ok ? 'PASS' : 'FAIL'}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  if (!summary.ok) process.exit(1)
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error(error instanceof Error ? error.stack : String(error))
  process.exit(1)
})
