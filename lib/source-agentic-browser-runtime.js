import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import {
  DEFAULT_LLM_ROUTES,
  LLM_WORKLOADS,
} from './llm-router.js'
import {
  buildSourceBrowserSessionPolicy,
  evaluateSourceBrowserPageHealth,
} from './source-god-mode-extractor-runtime.js'

export const SOURCE_AGENTIC_BROWSER_CARD_ID = 'SOURCE-BROWSER-AGENTIC-RUNTIME-001'
export const SOURCE_AGENTIC_BROWSER_ROOT = '.openclaw/source-agentic-browser'
export const SOURCE_AGENTIC_BROWSER_ROUTE_KEY = process.env.SOURCE_AGENTIC_BROWSER_ROUTE_KEY || 'foundation-agent-codex-direct'
export const SOURCE_AGENTIC_BROWSER_DEFAULT_ENV = normalizeBrowserEnv(process.env.SOURCE_AGENTIC_BROWSER_ENV || 'LOCAL')
export const SOURCE_AGENTIC_BROWSER_BROWSERBASE_ALLOWED = process.env.SOURCE_AGENTIC_BROWSER_ALLOW_BROWSERBASE === 'true'
export const SOURCE_AGENTIC_BROWSER_MAX_PROOF_STEPS = 5
export const SOURCE_AGENTIC_BROWSER_MAX_PROOF_BROWSER_MINUTES = 5
export const SOURCE_AGENTIC_BROWSER_MAX_PROOF_MODEL_CALLS = 12
export const SOURCE_AGENTIC_BROWSER_STAGEHAND_PROOF_ROUTE_KEY = process.env.SOURCE_AGENTIC_BROWSER_STAGEHAND_PROOF_ROUTE_KEY || 'foundation-agent-stagehand-openai-proof'

function defaultSourceAgenticBrowserRoute() {
  return DEFAULT_LLM_ROUTES.find(route => route.routeKey === SOURCE_AGENTIC_BROWSER_ROUTE_KEY) ||
    DEFAULT_LLM_ROUTES.find(route => route.workload === LLM_WORKLOADS.AGENT) ||
    null
}

function sourceAgenticBrowserModelFromRoute(route = null) {
  if (!route?.model) return ''
  return route.provider ? `${route.provider}/${route.model}` : String(route.model)
}

export const SOURCE_AGENTIC_BROWSER_DEFAULT_MODEL = process.env.SOURCE_AGENTIC_BROWSER_MODEL ||
  sourceAgenticBrowserModelFromRoute(defaultSourceAgenticBrowserRoute())
export const SOURCE_AGENTIC_BROWSER_STAGEHAND_PROOF_MODEL = process.env.SOURCE_AGENTIC_BROWSER_STAGEHAND_PROOF_MODEL ||
  sourceAgenticBrowserModelFromRoute(DEFAULT_LLM_ROUTES.find(route => route.routeKey === SOURCE_AGENTIC_BROWSER_STAGEHAND_PROOF_ROUTE_KEY))
export const SOURCE_AGENTIC_BROWSER_UNSUPPORTED_SUBSCRIPTION_ROUTE_MODEL =
  sourceAgenticBrowserModelFromRoute(DEFAULT_LLM_ROUTES.find(route => route.routeKey === 'foundation-agent-codex-direct'))

const RISKY_ACTION_RE = /\b(log ?in|sign ?in|sign ?up|join|subscribe|checkout|payment|billing|buy|purchase|cart|download|upload|post|comment|message|dm|send|submit|delete|settings|profile|account|password|credential|mfa|2fa|captcha)\b/i
const BLOCKER_RE = /\b(captcha|cloudflare|verify you are human|checking your browser|access denied|blocked|log in to continue|sign in to continue|members only|private community|join to view|request to join|restore pages|session restore|chrome didn't shut down correctly)\b/i
const STAGEHAND_MODEL_PROVIDER_RE = /^(openai|anthropic|google|browserbase)\/[a-z0-9][a-z0-9._:-]*/i
const UNSUPPORTED_SUBSCRIPTION_MODEL_RE = /^(codex|claude(?:-code)?|cursor|openclaw|gemini-cli)(?:\/|$)|^gpt-5\.5(?:\/|$)/i
const SOURCE_BROWSER_ARGS = [
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-session-crashed-bubble',
  '--disable-restore-session-state',
  '--disable-features=Translate,ChromeWhatsNewUI',
]

function text(value) {
  return String(value || '').trim()
}

function normalizeBrowserEnv(value = '') {
  return String(value || '').trim().toUpperCase() === 'BROWSERBASE' ? 'BROWSERBASE' : 'LOCAL'
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function slug(value = '') {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'source'
}

function stableHash(value = '') {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex')
}

function nowStamp(date = new Date()) {
  return date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
}

function normalizeUrl(value = '') {
  try {
    const url = new URL(value)
    url.hash = ''
    return url.toString()
  } catch {
    return text(value)
  }
}

function hostOf(value = '') {
  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return ''
  }
}

async function ensureDir(dirPath = '') {
  await fs.mkdir(dirPath, { recursive: true })
}

async function writeJson(filePath = '', value = {}) {
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function writeText(filePath = '', value = '') {
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, value, 'utf8')
}

function modelCredentialStatus(model = SOURCE_AGENTIC_BROWSER_DEFAULT_MODEL) {
  const normalized = String(model || '').toLowerCase()
  if (normalized.startsWith('openai/')) return { ok: Boolean(process.env.OPENAI_API_KEY), provider: 'openai', envKey: 'OPENAI_API_KEY' }
  if (normalized.startsWith('google/')) return { ok: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY), provider: 'google', envKey: process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' : 'GOOGLE_GENERATIVE_AI_API_KEY' }
  if (normalized.startsWith('anthropic/')) return { ok: Boolean(process.env.ANTHROPIC_API_KEY), provider: 'anthropic', envKey: 'ANTHROPIC_API_KEY' }
  if (normalized.startsWith('browserbase/')) return { ok: Boolean(process.env.BROWSERBASE_API_KEY), provider: 'browserbase', envKey: 'BROWSERBASE_API_KEY' }
  return { ok: true, provider: 'unknown_or_local', envKey: '' }
}

export function evaluateSourceAgenticBrowserModelRoute(model = SOURCE_AGENTIC_BROWSER_DEFAULT_MODEL) {
  const normalized = text(model)
  if (!normalized) {
    return {
      ok: false,
      status: 'blocked_missing_stagehand_model_route',
      provider: '',
      reason: 'Stagehand needs an explicit provider/model route from the Foundation LLM router/config owner.',
    }
  }
  if (UNSUPPORTED_SUBSCRIPTION_MODEL_RE.test(normalized) || !STAGEHAND_MODEL_PROVIDER_RE.test(normalized)) {
    return {
      ok: false,
      status: 'blocked_unsupported_stagehand_model_route',
      provider: normalized.split('/')[0] || '',
      reason: 'Stagehand cannot spend Codex/Claude subscription capacity directly; use an explicit API/provider route or the local no-model hands runtime.',
      requiredFormat: 'openai/<model>, anthropic/<model>, google/<model>, or browserbase/<model>',
    }
  }
  return {
    ok: true,
    status: 'stagehand_model_route_supported',
    provider: normalized.split('/')[0],
    reason: 'Explicit provider/model route is supported by Stagehand-style adapters.',
  }
}

export function buildSourceAgenticBrowserCostPolicy({
  env = SOURCE_AGENTIC_BROWSER_DEFAULT_ENV,
  model = SOURCE_AGENTIC_BROWSER_DEFAULT_MODEL,
  maxSteps = 8,
  runAgent = true,
  clickFirstSafeObservedAction = true,
  allowBrowserbase = false,
  budgetApproved = false,
  maxBrowserMinutes = SOURCE_AGENTIC_BROWSER_MAX_PROOF_BROWSER_MINUTES,
  maxEstimatedModelCalls = SOURCE_AGENTIC_BROWSER_MAX_PROOF_MODEL_CALLS,
} = {}) {
  const browserEnv = normalizeBrowserEnv(env)
  const steps = Math.max(0, Number(maxSteps || 0))
  const modelRoute = evaluateSourceAgenticBrowserModelRoute(model)
  const estimatedModelCalls = 1 + 1 + (clickFirstSafeObservedAction ? 1 : 0) + (runAgent ? steps : 0)
  const browserbaseAllowed = Boolean(allowBrowserbase || SOURCE_AGENTIC_BROWSER_BROWSERBASE_ALLOWED)
  const findings = []
  if (modelRoute.ok !== true) {
    findings.push({
      check: 'stagehand_model_route_supported',
      reason: modelRoute.reason,
      status: modelRoute.status,
      requiredFormat: modelRoute.requiredFormat,
    })
  }
  if (browserEnv === 'BROWSERBASE' && !browserbaseAllowed) {
    findings.push({
      check: 'browserbase_requires_explicit_allow_flag',
      reason: 'Browserbase is paid infrastructure and cannot become default just because API keys exist.',
      nextAction: 'Use LOCAL or pass --allowBrowserbase with explicit proof-sized caps.',
    })
  }
  if (browserEnv === 'BROWSERBASE' && !budgetApproved && steps > SOURCE_AGENTIC_BROWSER_MAX_PROOF_STEPS) {
    findings.push({
      check: 'browserbase_proof_step_cap',
      reason: `Browserbase proof runs are capped at ${SOURCE_AGENTIC_BROWSER_MAX_PROOF_STEPS} agent steps unless an explicit budget approval is provided.`,
      maxProofSteps: SOURCE_AGENTIC_BROWSER_MAX_PROOF_STEPS,
      requestedSteps: steps,
    })
  }
  if (browserEnv === 'BROWSERBASE' && !budgetApproved && Number(maxBrowserMinutes || 0) > SOURCE_AGENTIC_BROWSER_MAX_PROOF_BROWSER_MINUTES) {
    findings.push({
      check: 'browserbase_browser_minutes_cap',
      reason: `Browserbase proof runs are capped at ${SOURCE_AGENTIC_BROWSER_MAX_PROOF_BROWSER_MINUTES} browser minutes unless an explicit budget approval is provided.`,
      maxProofBrowserMinutes: SOURCE_AGENTIC_BROWSER_MAX_PROOF_BROWSER_MINUTES,
      requestedBrowserMinutes: Number(maxBrowserMinutes || 0),
    })
  }
  if (estimatedModelCalls > Number(maxEstimatedModelCalls || 0)) {
    findings.push({
      check: 'agentic_browser_model_call_cap',
      reason: 'Observe/extract/agent loops can make paid model calls; this run exceeds the configured cap.',
      estimatedModelCalls,
      maxEstimatedModelCalls: Number(maxEstimatedModelCalls || 0),
    })
  }
  return {
    ok: findings.length === 0,
    status: findings.length ? 'blocked_by_source_agentic_browser_cost_policy' : 'source_agentic_browser_cost_policy_ready',
    env: browserEnv,
    model,
    modelRoute,
    browserHoursMetered: browserEnv === 'BROWSERBASE',
    modelCallsMetered: true,
    browserbaseFallbackOnly: true,
    browserbaseAllowed,
    budgetApproved: Boolean(budgetApproved),
    maxSteps: steps,
    maxBrowserMinutes: Number(maxBrowserMinutes || 0),
    estimatedModelCalls,
    maxEstimatedModelCalls: Number(maxEstimatedModelCalls || 0),
    broadRunAllowed: false,
    findings,
  }
}

export function buildSourceAgenticBrowserCostGuardrailDogfood() {
  const withKeysDefault = buildSourceAgenticBrowserCostPolicy({
    env: '',
    model: SOURCE_AGENTIC_BROWSER_STAGEHAND_PROOF_MODEL,
    maxSteps: 2,
    runAgent: false,
  })
  const browserbaseNoAllow = buildSourceAgenticBrowserCostPolicy({
    env: 'BROWSERBASE',
    model: SOURCE_AGENTIC_BROWSER_STAGEHAND_PROOF_MODEL,
    maxSteps: 2,
    runAgent: false,
  })
  const unsupportedCodex = buildSourceAgenticBrowserCostPolicy({
    env: 'LOCAL',
    model: SOURCE_AGENTIC_BROWSER_UNSUPPORTED_SUBSCRIPTION_ROUTE_MODEL,
    maxSteps: 2,
    runAgent: false,
  })
  const tooBroadBrowserbase = buildSourceAgenticBrowserCostPolicy({
    env: 'BROWSERBASE',
    model: SOURCE_AGENTIC_BROWSER_STAGEHAND_PROOF_MODEL,
    maxSteps: 25,
    allowBrowserbase: true,
  })
  const proofBrowserbase = buildSourceAgenticBrowserCostPolicy({
    env: 'BROWSERBASE',
    model: SOURCE_AGENTIC_BROWSER_STAGEHAND_PROOF_MODEL,
    maxSteps: 2,
    runAgent: false,
    allowBrowserbase: true,
    maxBrowserMinutes: 2,
  })
  const cases = [
    {
      name: 'default_runtime_stays_local_even_when_keys_exist',
      ok: withKeysDefault.env === 'LOCAL' && withKeysDefault.ok === true,
      status: withKeysDefault.status,
    },
    {
      name: 'browserbase_requires_explicit_allow',
      ok: browserbaseNoAllow.ok === false &&
        browserbaseNoAllow.findings.some(finding => finding.check === 'browserbase_requires_explicit_allow_flag'),
      status: browserbaseNoAllow.status,
    },
    {
      name: 'codex_subscription_route_blocks_before_stagehand',
      ok: unsupportedCodex.ok === false &&
        unsupportedCodex.findings.some(finding => finding.status === 'blocked_unsupported_stagehand_model_route'),
      status: unsupportedCodex.status,
    },
    {
      name: 'broad_browserbase_loop_blocks_without_budget_approval',
      ok: tooBroadBrowserbase.ok === false &&
        tooBroadBrowserbase.findings.some(finding => finding.check === 'browserbase_proof_step_cap'),
      status: tooBroadBrowserbase.status,
    },
    {
      name: 'tiny_browserbase_bakeoff_can_be_enabled_explicitly',
      ok: proofBrowserbase.ok === true && proofBrowserbase.browserHoursMetered === true,
      status: proofBrowserbase.status,
    },
  ]
  return {
    ok: cases.every(testCase => testCase.ok),
    cardId: SOURCE_AGENTIC_BROWSER_CARD_ID,
    cases,
    policies: {
      withKeysDefault,
      browserbaseNoAllow,
      unsupportedCodex,
      tooBroadBrowserbase,
      proofBrowserbase,
    },
  }
}

function safeObservedAction(action = {}) {
  const surface = `${action.description || ''} ${action.method || ''} ${list(action.arguments).join(' ')} ${action.selector || ''}`
  return {
    safe: !RISKY_ACTION_RE.test(surface),
    reason: RISKY_ACTION_RE.test(surface) ? 'risky_auth_write_purchase_download_or_mutation_action' : 'safe_navigation_or_read_action',
  }
}

async function captureAgenticSnapshot(page, artifactDir, index = 1) {
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(1000).catch(() => {})
  const snapshot = await page.evaluate(() => {
    const clean = value => String(value || '').replace(/\s+/g, ' ').trim()
    const bodyText = clean(document.body?.innerText || document.body?.textContent || '')
    return {
      url: location.href,
      title: document.title || '',
      bodyText,
      bodyTextPreview: bodyText.slice(0, 2400),
      textChars: bodyText.length,
      headings: [...document.querySelectorAll('h1,h2,h3')].map(heading => ({
        level: Number(heading.tagName.slice(1)),
        text: clean(heading.innerText || heading.textContent).slice(0, 220),
      })).filter(row => row.text).slice(0, 60),
      anchors: [...document.querySelectorAll('a[href]')].map(anchor => ({
        text: clean(anchor.innerText || anchor.textContent).slice(0, 180),
        href: anchor.href,
      })).slice(0, 120),
      buttons: [...document.querySelectorAll('button,[role="button"],input[type="submit"],input[type="button"]')].map(button => ({
        text: clean(button.innerText || button.value || button.textContent || button.getAttribute('aria-label')).slice(0, 180),
        role: button.getAttribute('role') || '',
        type: button.getAttribute('type') || '',
      })).filter(row => row.text).slice(0, 80),
      hasPasswordInput: document.querySelectorAll('input[type="password"]').length > 0,
      hasEmailInput: document.querySelectorAll('input[type="email"],input[name*="email" i]').length > 0,
    }
  }).catch(error => ({
    url: page.url(),
    title: '',
    bodyText: '',
    bodyTextPreview: '',
    textChars: 0,
    headings: [],
    anchors: [],
    buttons: [],
    hasPasswordInput: false,
    hasEmailInput: false,
    error: error instanceof Error ? error.message : String(error),
  }))
  const key = `page-${String(index).padStart(2, '0')}-${slug(snapshot.title || hostOf(snapshot.url) || 'page')}`
  const screenshotPath = path.join(artifactDir, `${key}.png`)
  const screenshot = await page.screenshot({ path: screenshotPath, type: 'png', fullPage: false }).catch(() => null)
  const textPath = path.join(artifactDir, `${key}.txt`)
  await writeText(textPath, snapshot.bodyText || '')
  return {
    ...snapshot,
    browserHealth: evaluateSourceBrowserPageHealth(snapshot),
    blockerDetected: BLOCKER_RE.test(`${snapshot.title || ''} ${snapshot.bodyTextPreview || ''}`),
    credentialInputVisible: Boolean(snapshot.hasEmailInput || snapshot.hasPasswordInput),
    screenshotPath: screenshot ? screenshotPath : '',
    screenshotHash: screenshot ? stableHash(screenshot) : '',
    textPath,
    textHash: stableHash(snapshot.bodyText || ''),
  }
}

function defaultSourceInstruction(sourceType = 'public_or_free_source') {
  if (sourceType === 'free_skool_community') {
    return [
      'You are browsing a free Skool community source for AIOS Build Intel.',
      'Goal: find visible public/free value without signing in, joining, posting, commenting, messaging, downloading, buying, submitting forms, or changing account/profile/credential state.',
      'Inspect what is visible. Look for community/about/classroom/course/resource tabs, recent activity clues, pinned resources, external resource links, paid gates, and blockers.',
      'Use safe navigation clicks only. If login, join, paid, private, CAPTCHA, or form submission is required, stop and report the blocker.',
      'Return a concise structured summary with visible value, useful links/resources, blockers, and next safe action.',
    ].join(' ')
  }
  return [
    'Browse this source like an AIOS source extractor.',
    'Read visible content, inspect safe links/actions, and extract useful source value.',
    'Do not log in, sign up, purchase, submit forms, download files, post, comment, message, or mutate account/profile/credential state.',
    'Stop and report any blocker.',
  ].join(' ')
}

export async function runSourceAgenticBrowserProbe({
  url = '',
  sourceType = 'public_or_free_source',
  instruction = '',
  model = SOURCE_AGENTIC_BROWSER_DEFAULT_MODEL,
  env = SOURCE_AGENTIC_BROWSER_DEFAULT_ENV,
  headed = false,
  maxSteps = 8,
  clickFirstSafeObservedAction = true,
  runAgent = true,
  allowBrowserbase = false,
  budgetApproved = false,
  maxBrowserMinutes = SOURCE_AGENTIC_BROWSER_MAX_PROOF_BROWSER_MINUTES,
  maxEstimatedModelCalls = SOURCE_AGENTIC_BROWSER_MAX_PROOF_MODEL_CALLS,
  rootDir = SOURCE_AGENTIC_BROWSER_ROOT,
  now = new Date().toISOString(),
} = {}) {
  const targetUrl = normalizeUrl(url)
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) throw new Error(`A valid http(s) URL is required: ${url}`)
  const browserEnv = normalizeBrowserEnv(env)
  const costPolicy = buildSourceAgenticBrowserCostPolicy({
    env: browserEnv,
    model,
    maxSteps,
    runAgent,
    clickFirstSafeObservedAction,
    allowBrowserbase,
    budgetApproved,
    maxBrowserMinutes,
    maxEstimatedModelCalls,
  })
  const credential = modelCredentialStatus(model)
  const runId = `source-agentic-browser-${nowStamp(new Date(now))}-${stableHash(targetUrl).slice(0, 8)}`
  const runDir = path.resolve(rootDir, 'runs', runId)
  const artifactDir = path.join(runDir, 'artifacts')
  await ensureDir(artifactDir)

  if (costPolicy.ok !== true) {
    const report = {
      schemaVersion: 1,
      cardId: SOURCE_AGENTIC_BROWSER_CARD_ID,
      runId,
      status: costPolicy.status,
      ok: false,
      targetUrl,
      sourceType,
      model,
      runtime: {
        adapter: 'stagehand',
        env: browserEnv,
        costPolicy,
      },
      sideEffects: {
        systemRunner: true,
        manualClicks: false,
        modelDrivenObserve: false,
        modelDrivenExtract: false,
        modelDrivenAgent: false,
        clickedOrActed: false,
        submittedForm: false,
        downloadedFile: false,
        purchased: false,
        postedOrMessaged: false,
        mutatedCredentials: false,
        normalChromeProfileUsed: false,
        isolatedBrowserProfileUsed: false,
        browserbaseUsed: false,
      },
      artifacts: { runDir, reportPath: path.join(runDir, 'report.json'), localOnly: true },
      next: 'Use the local no-model hands runtime for local proof, or rerun Stagehand with an explicit provider/model route and proof-sized Browserbase budget approval.',
    }
    await writeJson(report.artifacts.reportPath, report)
    return report
  }

  if (!credential.ok) {
    const report = {
      schemaVersion: 1,
      cardId: SOURCE_AGENTIC_BROWSER_CARD_ID,
      runId,
      status: 'blocked_missing_model_credential',
      ok: false,
      targetUrl,
      sourceType,
      model,
      runtime: {
        adapter: 'stagehand',
        env: browserEnv,
        costPolicy,
      },
      credential: { provider: credential.provider, requiredEnvKey: credential.envKey, present: false },
      artifacts: { runDir, reportPath: path.join(runDir, 'report.json'), localOnly: true },
      next: `Set ${credential.envKey} or choose a model/provider with credentials, then rerun.`,
    }
    await writeJson(report.artifacts.reportPath, report)
    return report
  }

  const { Stagehand } = await import('@browserbasehq/stagehand')
  const stagehand = new Stagehand({
    env: browserEnv,
    model,
    experimental: true,
    verbose: 0,
    cacheDir: path.join(rootDir, 'stagehand-cache'),
    localBrowserLaunchOptions: {
      headless: !headed,
      viewport: { width: 1440, height: 1000 },
      args: SOURCE_BROWSER_ARGS,
    },
  })

  const observations = []
  const safeActions = []
  const blockedActions = []
  const actionsRun = []
  const snapshots = []
  let extraction = null
  let agentResult = null
  let status = 'started'
  const sourceBrowserSession = buildSourceBrowserSessionPolicy({
    targetUrl,
    sourceType,
    profileMode: 'ephemeral_isolated',
  })
  try {
    await stagehand.init()
    const page = stagehand.context.pages()[0]
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 })
    const firstSnapshot = await captureAgenticSnapshot(page, artifactDir, snapshots.length + 1)
    snapshots.push(firstSnapshot)

    if (firstSnapshot.browserHealth?.ok === false) {
      status = 'agentic_browser_blocked_browser_state'
      agentResult = {
        error: 'browser_state_blocked_before_agent_steps',
        findings: firstSnapshot.browserHealth.findings,
        recovery: 'retry clean source-browser session or route to hosted browser fallback before extraction',
      }
    } else {
      const observePrompt = [
        'List concrete clickable/navigation actions visible on this source page.',
        'Include community/about/classroom/course/resource/navigation actions if present.',
        'Exclude login, signup, join, subscribe, buy, purchase, download, post, comment, message, settings, profile, account, and form-submit actions.',
      ].join(' ')
      const observed = await stagehand.observe(observePrompt).catch(error => ({
        __error: error instanceof Error ? error.message : String(error),
      }))
      if (Array.isArray(observed)) {
        for (const action of observed) {
          const safety = safeObservedAction(action)
          const row = { ...action, safety }
          observations.push(row)
          if (safety.safe) safeActions.push(row)
          else blockedActions.push(row)
        }
      } else {
        observations.push({ error: observed.__error || 'observe_returned_non_array' })
      }

      if (clickFirstSafeObservedAction && safeActions.length && !snapshots.at(-1)?.blockerDetected && !snapshots.at(-1)?.credentialInputVisible) {
        const action = safeActions[0]
        const result = await stagehand.act(action).catch(error => ({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }))
        actionsRun.push({ action, result })
        snapshots.push(await captureAgenticSnapshot(page, artifactDir, snapshots.length + 1))
      }

      const extractionPrompt = [
        'Extract what is visible on this source page for AIOS source evaluation.',
        'Return structured JSON-like text with: sourceName, pageType, visiblePublicValue, recentActivityEvidence, classroomsOrCoursesVisible, resourcesVisible, safeLinksVisible, paidOrPrivateGates, blockers, recommendedNextAction.',
        'Do not invent hidden content. If something requires login/join/payment/CAPTCHA/forms, say that clearly.',
      ].join(' ')
      extraction = await stagehand.extract(extractionPrompt).catch(error => ({
        error: error instanceof Error ? error.message : String(error),
      }))

      if (runAgent) {
        const agent = stagehand.agent({
          model,
          instructions: [
            'You are the AIOS agentic source browser.',
            'You may inspect and navigate safe visible source pages.',
            'Forbidden actions: login, signup, join, subscribe, purchase, checkout, download, upload, post, comment, message, submit forms, edit settings/profile/account, reveal or mutate credentials.',
            'If a blocker appears, stop and report it.',
          ].join(' '),
        })
        agentResult = await agent.execute({
          instruction: instruction || defaultSourceInstruction(sourceType),
          maxSteps: Number(maxSteps || 8),
        }).catch(error => ({
          error: error instanceof Error ? error.message : String(error),
        }))
        snapshots.push(await captureAgenticSnapshot(page, artifactDir, snapshots.length + 1))
      }

      status = snapshots.some(snapshot => snapshot.blockerDetected || snapshot.credentialInputVisible)
        ? 'agentic_browser_completed_with_blocker'
        : 'agentic_browser_completed'
    }
  } catch (error) {
    status = 'agentic_browser_failed'
    agentResult = { error: error instanceof Error ? error.stack || error.message : String(error) }
  } finally {
    await stagehand.close().catch(() => {})
  }

  const report = {
    schemaVersion: 1,
    cardId: SOURCE_AGENTIC_BROWSER_CARD_ID,
    runId,
    status,
    ok: status !== 'agentic_browser_failed',
    targetUrl,
    finalUrl: snapshots.at(-1)?.url || targetUrl,
    sourceType,
    capturedAt: now,
    runtime: {
      adapter: 'stagehand',
      env: browserEnv,
      model,
      modelCredential: { provider: credential.provider, envKey: credential.envKey, present: true },
      costPolicy,
      localBrowserLaunchArgs: browserEnv === 'LOCAL' ? SOURCE_BROWSER_ARGS : [],
      normalChromeProfileUsed: false,
      restoreSessionBlockedByDesign: browserEnv === 'LOCAL',
      browserbaseReady: browserEnv === 'BROWSERBASE',
      sourceBrowserSession,
    },
    observations,
    safeActions,
    blockedActions,
    actionsRun,
    extraction,
    agentResult,
    snapshots: snapshots.map(snapshot => ({
      url: snapshot.url,
      title: snapshot.title,
      textChars: snapshot.textChars,
      bodyTextPreview: snapshot.bodyTextPreview,
      headings: snapshot.headings,
      anchors: snapshot.anchors,
      buttons: snapshot.buttons,
      blockerDetected: snapshot.blockerDetected,
      credentialInputVisible: snapshot.credentialInputVisible,
      browserHealth: snapshot.browserHealth,
      artifacts: {
        screenshotPath: snapshot.screenshotPath,
        screenshotHash: snapshot.screenshotHash,
        textPath: snapshot.textPath,
        textHash: snapshot.textHash,
      },
    })),
    sideEffects: {
      systemRunner: true,
      manualClicks: false,
      modelDrivenObserve: true,
      modelDrivenExtract: true,
      modelDrivenAgent: Boolean(runAgent),
      clickedOrActed: actionsRun.length > 0,
      submittedForm: false,
      downloadedFile: false,
      purchased: false,
      postedOrMessaged: false,
      mutatedCredentials: false,
      normalChromeProfileUsed: false,
      isolatedBrowserProfileUsed: true,
      browserbaseUsed: browserEnv === 'BROWSERBASE',
      browserStateHealthy: snapshots.every(snapshot => snapshot.browserHealth?.ok !== false),
    },
    artifacts: {
      runDir,
      reportPath: path.join(runDir, 'report.json'),
      localOnly: true,
      trackedRepoContent: false,
    },
    next: status === 'agentic_browser_blocked_browser_state'
      ? 'Retry with a clean isolated source session or hosted browser fallback before extracting; do not reason from a blank/restore browser page.'
      : status === 'agentic_browser_completed_with_blocker'
      ? 'If the blocker is auth/private/CAPTCHA, route to source session broker or Browserbase Agent Identity instead of manual browser babysitting.'
      : 'Wire this adapter behind source-specific SOP runners and Dev source-stack readback.',
  }
  await writeJson(report.artifacts.reportPath, report)
  await writeText(path.join(runDir, 'README.txt'), [
    `Run: ${runId}`,
    `Target: ${targetUrl}`,
    `Status: ${status}`,
    `Adapter: Stagehand ${browserEnv}`,
    `Report: ${report.artifacts.reportPath}`,
    '',
    'Local-only source browser proof artifacts. Do not commit screenshots/page text.',
  ].join('\n'))
  return report
}
