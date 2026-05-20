export const BUILD_LOG_API_CACHE_AND_SLIM_CARD_ID = 'BUILD-LOG-API-CACHE-AND-SLIM-001'
export const BUILD_LOG_API_CACHE_AND_SLIM_CLOSEOUT_KEY = 'build-log-api-cache-and-slim-v1'
export const BUILD_LOG_API_CACHE_AND_SLIM_PLAN_PATH = 'docs/process/build-log-api-cache-and-slim-001-plan.md'
export const BUILD_LOG_API_CACHE_AND_SLIM_APPROVAL_PATH = 'docs/process/approvals/BUILD-LOG-API-CACHE-AND-SLIM-001.json'
export const BUILD_LOG_API_CACHE_AND_SLIM_SCRIPT_PATH = 'scripts/process-build-log-api-cache-and-slim-check.mjs'
export const BUILD_LOG_API_CACHE_AND_SLIM_NEXT_CARD_ID = 'ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001'
export const BUILD_LOG_API_CACHE_TTL_MS = 60_000
export const BUILD_LOG_API_DEFAULT_LIMIT = 30
export const BUILD_LOG_API_MAX_LIMIT = 500
export const BUILD_LOG_API_PAYLOAD_BUDGET_BYTES = 700_000

export const BUILD_LOG_API_CACHE_AND_SLIM_PROOF_COMMANDS = [
  'node --check lib/foundation-build-log-api-cache.js scripts/process-build-log-api-cache-and-slim-check.mjs',
  'npm run process:build-log-api-cache-and-slim-check -- --close-card --json',
  'curl -fsS "http://localhost:3000/api/foundation/build-log?limit=60" -o /tmp/build-log-api-cache-and-slim.json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=BUILD-LOG-API-CACHE-AND-SLIM-001 --planApprovalRef=docs/process/approvals/BUILD-LOG-API-CACHE-AND-SLIM-001.json --closeoutKey=build-log-api-cache-and-slim-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=BUILD-LOG-API-CACHE-AND-SLIM-001 --closeoutKey=build-log-api-cache-and-slim-v1',
  'npm run process:foundation-ship -- --card=BUILD-LOG-API-CACHE-AND-SLIM-001 --planApprovalRef=docs/process/approvals/BUILD-LOG-API-CACHE-AND-SLIM-001.json --closeoutKey=build-log-api-cache-and-slim-v1 --commitRef=HEAD',
]

function nowMs() {
  return Date.now()
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

export function normalizeFoundationBuildLogLimit(value) {
  return Math.min(BUILD_LOG_API_MAX_LIMIT, Math.max(1, Number(value) || BUILD_LOG_API_DEFAULT_LIMIT))
}

export function buildFoundationBuildLogKey(build = {}, index = 0) {
  return [
    build.sha || build.shortSha || 'unknown',
    build.closeoutKey || build.subject || 'commit',
    index,
  ].join(':')
}

export function addFoundationBuildLogKeys(builds = []) {
  return normalizeList(builds).map((build, index) => ({
    ...build,
    buildKey: build.buildKey || buildFoundationBuildLogKey(build, index),
  }))
}

export function slimFoundationBuildLogGroups(groups = []) {
  return normalizeList(groups).map(dayGroup => ({
    day: dayGroup.day,
    systemGroups: normalizeList(dayGroup.systemGroups).map(systemGroup => ({
      systemArea: systemGroup.systemArea,
      buildRefs: normalizeList(systemGroup.builds).map(build => build.buildKey || buildFoundationBuildLogKey(build)),
      buildCount: normalizeList(systemGroup.builds).length,
    })),
  }))
}

export function evaluateFoundationBuildLogApiCacheAndSlimSource({
  operatorRoutesSource = '',
  frontendOperationsSource = '',
  cacheModuleSource = '',
} = {}) {
  const operator = String(operatorRoutesSource || '')
  const frontend = String(frontendOperationsSource || '')
  const helper = String(cacheModuleSource || '')
  const checks = [
    {
      ok: operator.includes('createFoundationBuildLogApiCache') &&
        operator.includes('readFoundationBuildLogApiPayload') &&
        operator.includes('normalizeFoundationBuildLogLimit'),
      check: 'operator route uses build-log cache/slim helper',
    },
    {
      ok: operator.includes('const buildLogApiCache = createFoundationBuildLogApiCache()'),
      check: 'operator route owns one process-local bounded cache',
    },
    {
      ok: operator.includes('readFoundationBuildLogApiPayload({') &&
        !operator.includes("source: 'git log on main'"),
      check: 'operator route delegates payload construction instead of inlining duplicated shape',
    },
    {
      ok: helper.includes('BUILD_LOG_API_CACHE_TTL_MS') &&
        helper.includes('BUILD_LOG_API_PAYLOAD_BUDGET_BYTES') &&
        helper.includes('slimFoundationBuildLogGroups'),
      check: 'cache module declares ttl, payload budget, and slim group builder',
    },
    {
      ok: helper.includes('cache?.get(cacheKey)') &&
        helper.includes('cache?.set(cacheKey, payload)'),
      check: 'cache module reuses loader output within ttl',
    },
    {
      ok: frontend.includes('buildRefs') &&
        frontend.includes('resolveBuildLogGroupBuilds') &&
        frontend.includes('indexBuildLogBuilds'),
      check: 'frontend resolves slim build refs through top-level build index',
    },
  ]
  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
  }
}

export function createFoundationBuildLogApiCache({
  ttlMs = BUILD_LOG_API_CACHE_TTL_MS,
  now = nowMs,
} = {}) {
  const entries = new Map()
  return {
    ttlMs,
    get(key) {
      const entry = entries.get(key)
      const current = now()
      if (!entry) return null
      if (entry.expiresAt <= current) {
        entries.delete(key)
        return null
      }
      return {
        ...entry.payload,
        cache: {
          ...(entry.payload.cache || {}),
          hit: true,
          ageMs: Math.max(0, current - entry.createdAt),
          ttlMs,
        },
      }
    },
    set(key, payload) {
      const current = now()
      entries.set(key, {
        payload: {
          ...payload,
          cache: {
            ...(payload.cache || {}),
            hit: false,
            ageMs: 0,
            ttlMs,
          },
        },
        createdAt: current,
        expiresAt: current + ttlMs,
      })
    },
    clear() {
      entries.clear()
    },
    size() {
      return entries.size
    },
  }
}

export function buildFoundationBuildLogApiPayload({
  builds = [],
  recentChanges = [],
  schemaVersion = 2,
  summarizeFoundationBuildLog,
  groupFoundationBuildLog,
  generatedAt = new Date().toISOString(),
} = {}) {
  const keyedBuilds = addFoundationBuildLogKeys(builds)
  const fullGroups = typeof groupFoundationBuildLog === 'function'
    ? groupFoundationBuildLog(keyedBuilds)
    : []
  return {
    generatedAt,
    source: 'git log on main via bounded in-memory cache',
    schemaVersion,
    summary: typeof summarizeFoundationBuildLog === 'function'
      ? summarizeFoundationBuildLog(keyedBuilds)
      : {},
    groups: slimFoundationBuildLogGroups(fullGroups),
    recentChanges: normalizeList(recentChanges),
    builds: keyedBuilds,
    cache: {
      hit: false,
      ageMs: 0,
      ttlMs: BUILD_LOG_API_CACHE_TTL_MS,
    },
  }
}

export async function readFoundationBuildLogApiPayload({
  limit,
  cache,
  getRecentBuildLog,
  getRecentChangeEvents,
  summarizeFoundationBuildLog,
  groupFoundationBuildLog,
  schemaVersion = 2,
  now = () => new Date().toISOString(),
} = {}) {
  const boundedLimit = normalizeFoundationBuildLogLimit(limit)
  const cacheKey = `build-log:${boundedLimit}:schema:${schemaVersion}`
  const cached = cache?.get(cacheKey)
  if (cached) return cached
  const [builds, recentChanges] = await Promise.all([
    getRecentBuildLog(boundedLimit),
    getRecentChangeEvents(5),
  ])
  const payload = buildFoundationBuildLogApiPayload({
    builds,
    recentChanges,
    schemaVersion,
    summarizeFoundationBuildLog,
    groupFoundationBuildLog,
    generatedAt: now(),
  })
  cache?.set(cacheKey, payload)
  return payload
}

export async function buildFoundationBuildLogApiCacheDogfoodProof() {
  let buildLogCalls = 0
  let changeCalls = 0
  let clock = 1_000
  const cache = createFoundationBuildLogApiCache({
    ttlMs: 1_000,
    now: () => clock,
  })
  const builds = [
    {
      sha: 'a'.repeat(40),
      shortSha: 'aaaaaaa',
      committedAt: '2026-05-19T00:00:00.000Z',
      subject: 'Synthetic build',
      systemArea: 'Synthetic',
      backlogIds: ['SYNTHETIC-001'],
      proofCommands: ['npm run synthetic'],
    },
  ]
  const loader = {
    getRecentBuildLog: async () => {
      buildLogCalls += 1
      return builds
    },
    getRecentChangeEvents: async () => {
      changeCalls += 1
      return [{ id: 'change-1' }]
    },
  }
  const summarize = input => ({ totalBuilds: input.length, closeoutBuilds: input.length, backlogLinkedBuilds: input.length, proofLinkedBuilds: input.length })
  const group = input => [{ day: '2026-05-19', systemGroups: [{ systemArea: 'Synthetic', builds: input }] }]
  const first = await readFoundationBuildLogApiPayload({
    limit: 60,
    cache,
    ...loader,
    summarizeFoundationBuildLog: summarize,
    groupFoundationBuildLog: group,
  })
  const second = await readFoundationBuildLogApiPayload({
    limit: 60,
    cache,
    ...loader,
    summarizeFoundationBuildLog: summarize,
    groupFoundationBuildLog: group,
  })
  clock += 1_001
  const third = await readFoundationBuildLogApiPayload({
    limit: 60,
    cache,
    ...loader,
    summarizeFoundationBuildLog: summarize,
    groupFoundationBuildLog: group,
  })
  const groupPayload = second.groups?.[0]?.systemGroups?.[0]
  return {
    ok: Boolean(first.cache?.hit === false &&
      second.cache?.hit === true &&
      third.cache?.hit === false &&
      buildLogCalls === 2 &&
      changeCalls === 2 &&
      Array.isArray(groupPayload?.buildRefs) &&
      !Array.isArray(groupPayload?.builds) &&
      second.builds?.[0]?.buildKey),
    calls: { buildLogCalls, changeCalls },
    firstCache: first.cache,
    secondCache: second.cache,
    thirdCache: third.cache,
    groupPayload,
    dogfoodInvariant: 'Repeated reads within TTL reuse cached build-log data and groups contain refs instead of duplicated build objects.',
  }
}

export function buildFoundationBuildLogApiCacheAndSlimDogfoodProof() {
  const healthy = evaluateFoundationBuildLogApiCacheAndSlimSource({
    operatorRoutesSource: `
      import { createFoundationBuildLogApiCache, normalizeFoundationBuildLogLimit, readFoundationBuildLogApiPayload } from './foundation-build-log-api-cache.js'
      const buildLogApiCache = createFoundationBuildLogApiCache()
      app.get('/api/foundation/build-log', async (req, res) => {
        const limit = normalizeFoundationBuildLogLimit(req.query.limit)
        const payload = await readFoundationBuildLogApiPayload({ limit, cache: buildLogApiCache })
        res.json(payload)
      })
    `,
    frontendOperationsSource: `
      function indexBuildLogBuilds() {}
      function resolveBuildLogGroupBuilds(systemGroup, buildMap) { return (systemGroup.buildRefs || []).map(function(ref) { return buildMap[ref] }) }
    `,
    cacheModuleSource: `
      export const BUILD_LOG_API_CACHE_TTL_MS = 60000
      export const BUILD_LOG_API_PAYLOAD_BUDGET_BYTES = 700000
      function slimFoundationBuildLogGroups() {}
      async function readFoundationBuildLogApiPayload({ cache, cacheKey, payload }) { cache?.get(cacheKey); cache?.set(cacheKey, payload) }
    `,
  })
  const missingCache = evaluateFoundationBuildLogApiCacheAndSlimSource({
    operatorRoutesSource: `
      app.get('/api/foundation/build-log', async (req, res) => {
        const builds = await getRecentBuildLog(60)
        res.json({ source: 'git log on main', groups: groupFoundationBuildLog(builds), builds })
      })
    `,
    frontendOperationsSource: `
      function renderBuildGroups(group) { return group.builds }
    `,
    cacheModuleSource: 'export const BUILD_LOG_API_CACHE_TTL_MS = 60000',
  })
  return {
    ok: healthy.ok && !missingCache.ok,
    healthy,
    missingCache,
  }
}
