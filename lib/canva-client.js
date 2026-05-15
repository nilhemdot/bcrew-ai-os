import fs from 'node:fs/promises'

export const CANVA_CLIENT_CARD_ID = 'CANVA-CLIENT-001'
export const CANVA_CLIENT_SPRINT_ID = 'canva-client-foundation-2026-05-15'
export const CANVA_CLIENT_CLOSEOUT_KEY = 'canva-client-v1'
export const CANVA_CLIENT_PLAN_PATH = 'docs/process/canva-client-001-plan.md'
export const CANVA_CLIENT_APPROVAL_PATH = 'docs/process/approvals/CANVA-CLIENT-001.json'
export const CANVA_CLIENT_SCRIPT_PATH = 'scripts/process-canva-client-check.mjs'
export const CANVA_CLIENT_HANDOFF_PATH = 'docs/handoffs/2026-05-15-canva-client-closeout.md'

export const CANVA_API_BASE_URL = 'https://api.canva.com/rest/v1'
export const CANVA_TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token'

const DEFAULT_USER_AGENT = 'bcrew-ai-os-canva-client/1.0'
const REDACTED = '[redacted]'
const REFRESH_TOKEN_ENV_KEY = 'CANVA_REFRESH_TOKEN'

export class CanvaConfigError extends Error {
  constructor(message, metadata = {}) {
    super(message)
    this.name = 'CanvaConfigError'
    this.metadata = metadata
  }
}

export class CanvaApiError extends Error {
  constructor(message, metadata = {}) {
    super(message)
    this.name = 'CanvaApiError'
    this.status = metadata.status || null
    this.endpoint = metadata.endpoint || null
    this.code = metadata.code || null
    this.metadata = sanitizeCanvaLogValue(metadata)
  }
}

function normalizeString(value) {
  return String(value || '').trim()
}

function normalizeBaseUrl(value, fallback) {
  return normalizeString(value || fallback).replace(/\/+$/, '')
}

function assertFunction(value, label) {
  if (typeof value !== 'function') throw new CanvaConfigError(`${label} must be a function`)
}

export function buildCanvaEnvStatus(env = process.env) {
  return {
    CANVA_CLIENT_ID: Boolean(normalizeString(env.CANVA_CLIENT_ID)),
    CANVA_CLIENT_SECRET: Boolean(normalizeString(env.CANVA_CLIENT_SECRET)),
    CANVA_REFRESH_TOKEN: Boolean(normalizeString(env.CANVA_REFRESH_TOKEN)),
  }
}

export function validateCanvaEnv(env = process.env) {
  const status = buildCanvaEnvStatus(env)
  const missing = Object.entries(status)
    .filter(([, present]) => !present)
    .map(([key]) => key)
  if (missing.length) {
    throw new CanvaConfigError('Missing Canva Connect API credentials', {
      missing,
      status,
    })
  }
  return status
}

export function sanitizeCanvaLogValue(value) {
  if (Array.isArray(value)) return value.map(sanitizeCanvaLogValue)
  if (!value || typeof value !== 'object') {
    if (typeof value !== 'string') return value
    return value
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, `Bearer ${REDACTED}`)
      .replace(/Basic\s+[A-Za-z0-9._~+/=-]+/g, `Basic ${REDACTED}`)
      .replace(/(access_token|refresh_token|client_secret)["'=:\s]+[A-Za-z0-9._~+/=-]+/gi, `$1=${REDACTED}`)
  }
  return Object.entries(value).reduce((acc, [key, item]) => {
    if (/token|secret|authorization/i.test(key)) {
      acc[key] = REDACTED
    } else {
      acc[key] = sanitizeCanvaLogValue(item)
    }
    return acc
  }, {})
}

function encodePathPart(value) {
  return encodeURIComponent(normalizeString(value))
}

function buildQuery(params = {}) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

function buildBasicAuthorization(clientId, clientSecret) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64')}`
}

function normalizeTokenResponse(body = {}, refreshToken = '') {
  const accessToken = normalizeString(body.access_token)
  if (!accessToken) {
    throw new CanvaApiError('Canva token endpoint did not return an access token', {
      endpoint: '/oauth/token',
      body,
    })
  }
  const nextRefreshToken = normalizeString(body.refresh_token)
  return {
    accessToken,
    nextRefreshToken,
    expiresIn: Number(body.expires_in || 0) || null,
    tokenType: normalizeString(body.token_type || 'Bearer') || 'Bearer',
    scope: normalizeString(body.scope),
    refreshTokenRotated: Boolean(nextRefreshToken && nextRefreshToken !== refreshToken),
    nextRefreshTokenPresent: Boolean(nextRefreshToken),
  }
}

export function replaceEnvValueLine(envContent = '', key = REFRESH_TOKEN_ENV_KEY, value = '') {
  const normalizedKey = normalizeString(key)
  const normalizedValue = normalizeString(value)
  if (!normalizedKey || !normalizedValue) {
    throw new CanvaConfigError('replaceEnvValueLine requires a key and value')
  }

  const lines = String(envContent || '').split(/\r?\n/)
  let replaced = false
  const nextLines = []
  for (const line of lines) {
    if (line.startsWith(`${normalizedKey}=`)) {
      if (!replaced) {
        nextLines.push(`${normalizedKey}=${normalizedValue}`)
        replaced = true
      }
      continue
    }
    nextLines.push(line)
  }
  if (!replaced) {
    if (nextLines.length && nextLines[nextLines.length - 1] !== '') nextLines.push('')
    nextLines.push(`${normalizedKey}=${normalizedValue}`)
  }
  const joined = nextLines.join('\n').replace(/\n*$/, '\n')
  return joined
}

export async function persistCanvaRefreshToken({
  envPath = '.env',
  refreshToken,
  fsImpl = fs,
} = {}) {
  const normalizedRefreshToken = normalizeString(refreshToken)
  if (!normalizedRefreshToken) {
    throw new CanvaConfigError('Cannot persist empty Canva refresh token')
  }
  const before = await fsImpl.readFile(envPath, 'utf8').catch(error => {
    if (error?.code === 'ENOENT') return ''
    throw error
  })
  const after = replaceEnvValueLine(before, REFRESH_TOKEN_ENV_KEY, normalizedRefreshToken)
  await fsImpl.writeFile(envPath, after)
  return {
    ok: true,
    envPath,
    replacedExisting: new RegExp(`^${REFRESH_TOKEN_ENV_KEY}=`, 'm').test(before),
    tokenLineCountBefore: (before.match(new RegExp(`^${REFRESH_TOKEN_ENV_KEY}=.*$`, 'gm')) || []).length,
    tokenLineCountAfter: (after.match(new RegExp(`^${REFRESH_TOKEN_ENV_KEY}=.*$`, 'gm')) || []).length,
  }
}

async function parseJsonResponse(response) {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    throw new CanvaApiError('Canva API returned non-JSON response', {
      status: response.status,
      body: text.slice(0, 500),
    })
  }
}

export async function mintCanvaAccessToken({
  clientId,
  clientSecret,
  refreshToken,
  fetchImpl = globalThis.fetch,
  tokenUrl = CANVA_TOKEN_URL,
  userAgent = DEFAULT_USER_AGENT,
} = {}) {
  assertFunction(fetchImpl, 'fetchImpl')
  const normalizedClientId = normalizeString(clientId)
  const normalizedClientSecret = normalizeString(clientSecret)
  const normalizedRefreshToken = normalizeString(refreshToken)
  if (!normalizedClientId || !normalizedClientSecret || !normalizedRefreshToken) {
    throw new CanvaConfigError('Canva token refresh requires clientId, clientSecret, and refreshToken', {
      clientId: Boolean(normalizedClientId),
      clientSecret: Boolean(normalizedClientSecret),
      refreshToken: Boolean(normalizedRefreshToken),
    })
  }

  const body = new URLSearchParams()
  body.set('grant_type', 'refresh_token')
  body.set('refresh_token', normalizedRefreshToken)

  const response = await fetchImpl(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: buildBasicAuthorization(normalizedClientId, normalizedClientSecret),
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': userAgent,
    },
    body,
  })
  const json = await parseJsonResponse(response)
  if (!response.ok) {
    throw new CanvaApiError('Canva token refresh failed', {
      status: response.status,
      endpoint: '/oauth/token',
      body: json,
    })
  }
  return normalizeTokenResponse(json, normalizedRefreshToken)
}

export function createCanvaClient({
  clientId,
  clientSecret,
  refreshToken,
  fetchImpl = globalThis.fetch,
  apiBaseUrl = CANVA_API_BASE_URL,
  tokenUrl = CANVA_TOKEN_URL,
  userAgent = DEFAULT_USER_AGENT,
  onRefreshTokenRotated = null,
} = {}) {
  assertFunction(fetchImpl, 'fetchImpl')
  const config = {
    clientId: normalizeString(clientId),
    clientSecret: normalizeString(clientSecret),
    refreshToken: normalizeString(refreshToken),
    apiBaseUrl: normalizeBaseUrl(apiBaseUrl, CANVA_API_BASE_URL),
    tokenUrl: normalizeString(tokenUrl || CANVA_TOKEN_URL),
    userAgent,
  }

  let accessTokenCache = null
  let accessTokenExpiresAt = 0

  async function getAccessToken({ forceRefresh = false } = {}) {
    const now = Date.now()
    if (!forceRefresh && accessTokenCache && now < accessTokenExpiresAt - 60000) {
      return accessTokenCache
    }
    const token = await mintCanvaAccessToken({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      refreshToken: config.refreshToken,
      fetchImpl,
      tokenUrl: config.tokenUrl,
      userAgent: config.userAgent,
    })
    if (token.refreshTokenRotated && token.nextRefreshToken) {
      config.refreshToken = token.nextRefreshToken
      if (typeof onRefreshTokenRotated === 'function') {
        await onRefreshTokenRotated(token)
      }
    }
    accessTokenCache = token
    accessTokenExpiresAt = token.expiresIn ? now + token.expiresIn * 1000 : now + 15 * 60 * 1000
    return token
  }

  async function request(endpoint, { method = 'GET', query, body, headers = {}, forceRefresh = false } = {}) {
    const token = await getAccessToken({ forceRefresh })
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const url = `${config.apiBaseUrl}${path}${buildQuery(query)}`
    const response = await fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        Accept: 'application/json',
        'User-Agent': config.userAgent,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = await parseJsonResponse(response)
    if (!response.ok) {
      throw new CanvaApiError('Canva API request failed', {
        status: response.status,
        endpoint: path,
        body: json,
      })
    }
    return json
  }

  return {
    getAccessToken,
    request,
    getCurrentUser() {
      return request('/users/me/profile')
    },
    listFolderItems(folderId = 'root', options = {}) {
      return request(`/folders/${encodePathPart(folderId)}/items`, {
        query: {
          limit: options.limit,
          continuation: options.continuation,
        },
      })
    },
    getFolder(folderId) {
      return request(`/folders/${encodePathPart(folderId)}`)
    },
    listDesigns(options = {}) {
      return request('/designs', {
        query: {
          query: options.query,
          ownership: options.ownership,
          sort_by: options.sortBy,
          limit: options.limit,
          continuation: options.continuation,
        },
      })
    },
    getDesign(designId) {
      return request(`/designs/${encodePathPart(designId)}`)
    },
    getDesignPages(designId, options = {}) {
      return request(`/designs/${encodePathPart(designId)}/pages`, {
        query: {
          limit: options.limit,
          continuation: options.continuation,
        },
      })
    },
    getAsset(assetId) {
      return request(`/assets/${encodePathPart(assetId)}`)
    },
    listBrandTemplates(options = {}) {
      return request('/brand-templates', {
        query: {
          query: options.query,
          sort_by: options.sortBy,
          limit: options.limit,
          continuation: options.continuation,
        },
      })
    },
    getBrandTemplate(brandTemplateId) {
      return request(`/brand-templates/${encodePathPart(brandTemplateId)}`)
    },
    getBrandTemplateDataset(brandTemplateId) {
      return request(`/brand-templates/${encodePathPart(brandTemplateId)}/dataset`)
    },
  }
}

export function createCanvaClientFromEnv(env = process.env, options = {}) {
  validateCanvaEnv(env)
  const persistRotatedRefreshToken = options.persistRotatedRefreshToken === true
  const envPath = options.envPath || '.env'
  return createCanvaClient({
    clientId: env.CANVA_CLIENT_ID,
    clientSecret: env.CANVA_CLIENT_SECRET,
    refreshToken: env.CANVA_REFRESH_TOKEN,
    fetchImpl: options.fetchImpl,
    apiBaseUrl: options.apiBaseUrl || env.CANVA_API_BASE_URL || CANVA_API_BASE_URL,
    tokenUrl: options.tokenUrl || env.CANVA_TOKEN_URL || CANVA_TOKEN_URL,
    userAgent: options.userAgent || DEFAULT_USER_AGENT,
    onRefreshTokenRotated: persistRotatedRefreshToken
      ? token => persistCanvaRefreshToken({ envPath, refreshToken: token.nextRefreshToken })
      : options.onRefreshTokenRotated,
  })
}

function createSyntheticFetchRecorder() {
  const calls = []
  const responseFor = (body, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  })
  const fetchImpl = async (url, options = {}) => {
    calls.push({
      url,
      method: options.method || 'GET',
      headers: { ...(options.headers || {}) },
      body: String(options.body || ''),
    })
    if (String(url).endsWith('/oauth/token')) {
      return responseFor({
        access_token: 'synthetic-access-token',
        refresh_token: 'synthetic-next-refresh-token',
        expires_in: 14400,
        token_type: 'Bearer',
        scope: 'folder:read design:meta:read asset:read brandtemplate:meta:read',
      })
    }
    if (String(url).includes('/folders/root/items')) {
      return responseFor({
        items: [
          { type: 'folder', folder: { id: 'folder-1', name: 'Brand Assets' } },
          { type: 'design', design: { id: 'design-1', title: 'Listing Sold Sign' } },
          { type: 'image', image: { id: 'asset-1', name: 'Mascot PNG' } },
        ],
      })
    }
    if (String(url).includes('/designs/design-1')) return responseFor({ design: { id: 'design-1', title: 'Listing Sold Sign' } })
    if (String(url).includes('/designs')) return responseFor({ items: [{ id: 'design-1', title: 'Listing Sold Sign' }] })
    if (String(url).includes('/assets/asset-1')) return responseFor({ asset: { id: 'asset-1', name: 'Mascot PNG' } })
    if (String(url).includes('/brand-templates/template-1/dataset')) return responseFor({ dataset: { fields: [] } })
    if (String(url).includes('/brand-templates/template-1')) return responseFor({ brand_template: { id: 'template-1', title: 'Brand Listing Video' } })
    if (String(url).includes('/brand-templates')) return responseFor({ items: [{ id: 'template-1', title: 'Brand Listing Video' }] })
    if (String(url).includes('/users/me/profile')) return responseFor({ profile: { display_name: 'Synthetic User' } })
    return responseFor({ error: { message: 'unexpected synthetic endpoint' } }, 404)
  }
  return { fetchImpl, calls }
}

export async function buildSyntheticCanvaClientProof() {
  const recorder = createSyntheticFetchRecorder()
  const client = createCanvaClient({
    clientId: 'synthetic-client',
    clientSecret: 'synthetic-secret',
    refreshToken: 'synthetic-refresh-token',
    fetchImpl: recorder.fetchImpl,
  })

  const token = await client.getAccessToken()
  const [profile, folder, designs, design, asset, templates, template, dataset] = await Promise.all([
    client.getCurrentUser(),
    client.listFolderItems('root', { limit: 3 }),
    client.listDesigns({ limit: 2 }),
    client.getDesign('design-1'),
    client.getAsset('asset-1'),
    client.listBrandTemplates({ limit: 2 }),
    client.getBrandTemplate('template-1'),
    client.getBrandTemplateDataset('template-1'),
  ])

  const apiCalls = recorder.calls.filter(call => !String(call.url).endsWith('/oauth/token'))
  const tokenCalls = recorder.calls.filter(call => String(call.url).endsWith('/oauth/token'))
  const tokenCall = tokenCalls[0] || {}
  const secretsInSanitizedLog = JSON.stringify(sanitizeCanvaLogValue({
    authorization: tokenCall.headers?.Authorization,
    body: tokenCall.body,
    access_token: token.accessToken,
    refreshToken: 'synthetic-refresh-token',
    clientSecret: 'synthetic-secret',
  }))
  const replacedEnv = replaceEnvValueLine(
    'CANVA_CLIENT_ID=synthetic-client\nCANVA_REFRESH_TOKEN=old-token\nOTHER=value\nCANVA_REFRESH_TOKEN=duplicate-stale-token\n',
    REFRESH_TOKEN_ENV_KEY,
    'synthetic-next-refresh-token',
  )
  const replacedTokenLines = replacedEnv.match(new RegExp(`^${REFRESH_TOKEN_ENV_KEY}=.*$`, 'gm')) || []

  const checks = [
    {
      ok: tokenCalls.length === 1,
      check: 'refresh token flow mints one access token and caches it',
      detail: `tokenCalls=${tokenCalls.length}`,
    },
    {
      ok: token.refreshTokenRotated === true && token.nextRefreshTokenPresent === true,
      check: 'refresh-token rotation is detected from token response',
      detail: `rotated=${token.refreshTokenRotated}`,
    },
    {
      ok: replacedTokenLines.length === 1 &&
        replacedTokenLines[0] === `${REFRESH_TOKEN_ENV_KEY}=synthetic-next-refresh-token` &&
        !replacedEnv.includes('duplicate-stale-token'),
      check: 'rotated refresh token replacement overwrites existing line instead of appending',
      detail: `tokenLines=${replacedTokenLines.length}`,
    },
    {
      ok: tokenCall.headers?.Authorization?.startsWith('Basic '),
      check: 'token endpoint uses Basic client authentication',
      detail: tokenCall.headers?.Authorization ? 'present' : 'missing',
    },
    {
      ok: tokenCall.body.includes('grant_type=refresh_token') && tokenCall.body.includes('refresh_token=synthetic-refresh-token'),
      check: 'token request uses refresh_token grant',
      detail: tokenCall.body.includes('refresh_token') ? 'grant present' : 'grant missing',
    },
    {
      ok: apiCalls.length === 8 && apiCalls.every(call => call.headers?.Authorization === 'Bearer synthetic-access-token'),
      check: 'read-only wrappers attach Bearer token in memory',
      detail: `apiCalls=${apiCalls.length}`,
    },
    {
      ok: apiCalls.every(call => call.method === 'GET'),
      check: 'V1 wrappers are read-only GET requests',
      detail: apiCalls.map(call => call.method).join(','),
    },
    {
      ok: folder.items?.length === 3 && designs.items?.length === 1 && templates.items?.length === 1,
      check: 'folder, design, and brand-template list wrappers parse responses',
      detail: `folder=${folder.items?.length || 0} designs=${designs.items?.length || 0} templates=${templates.items?.length || 0}`,
    },
    {
      ok: Boolean(profile.profile) && Boolean(design.design) && Boolean(asset.asset) && Boolean(template.brand_template) && Boolean(dataset.dataset),
      check: 'profile/design/asset/template/dataset getters parse responses',
      detail: 'all synthetic getter responses present',
    },
    {
      ok: !secretsInSanitizedLog.includes('synthetic-access-token') &&
        !secretsInSanitizedLog.includes('synthetic-next-refresh-token') &&
        !secretsInSanitizedLog.includes('synthetic-refresh-token') &&
        !secretsInSanitizedLog.includes('synthetic-secret'),
      check: 'sanitized logs redact tokens and secrets',
      detail: secretsInSanitizedLog,
    },
  ]

  return {
    ok: checks.every(check => check.ok),
    checks,
    callSummary: {
      tokenCalls: tokenCalls.length,
      apiCalls: apiCalls.length,
      paths: apiCalls.map(call => new URL(call.url).pathname),
    },
  }
}

export function evaluateCanvaClientSource({
  clientSource = '',
  scriptSource = '',
  planSource = '',
  packageJson = {},
} = {}) {
  const blockedWriteWrappers = [
    'createAsset' + 'UploadJob',
    'create' + 'Design',
    'delete' + 'Asset',
    'update' + 'Asset',
    'export' + 'Design',
  ]
  const tokenLogNeedles = [
    'console.' + 'log(token',
    'console.' + 'log(accessToken',
  ]
  const checks = [
    {
      ok: clientSource.includes('mintCanvaAccessToken') &&
        clientSource.includes('createCanvaClientFromEnv') &&
        clientSource.includes('buildSyntheticCanvaClientProof') &&
        clientSource.includes('persistCanvaRefreshToken') &&
        clientSource.includes('replaceEnvValueLine'),
      check: 'client exports token, env, and dogfood helpers',
    },
    {
      ok: clientSource.includes('/folders/${encodePathPart(folderId)}/items') &&
        clientSource.includes("request('/designs'") &&
        clientSource.includes('/assets/${encodePathPart(assetId)}') &&
        clientSource.includes("request('/brand-templates'"),
      check: 'client owns read wrappers for folders, designs, assets, and brand templates',
    },
    {
      ok: blockedWriteWrappers.every(needle => !clientSource.includes(needle)),
      check: 'client v1 does not expose write/export/upload wrappers',
    },
    {
      ok: clientSource.includes('sanitizeCanvaLogValue') &&
        clientSource.includes('refreshTokenRotated') &&
        clientSource.includes('onRefreshTokenRotated') &&
        tokenLogNeedles.every(needle => !clientSource.includes(needle)),
      check: 'client includes redaction, rotation handling, and avoids token logging',
    },
    {
      ok: scriptSource.includes('--live') &&
        scriptSource.includes('--update-refresh-token') &&
        scriptSource.includes('providerSpendUsd: 0') &&
        scriptSource.includes('buildSyntheticCanvaClientProof') &&
        !scriptSource.includes('createBacklogItem') &&
        !scriptSource.includes('updateBacklogItem') &&
        !scriptSource.includes('upsertFoundationCurrentSprintOverlay'),
      check: 'focused proof is read-only and has optional live smoke',
    },
    {
      ok: planSource.includes('no uploads') &&
        planSource.includes('no exports') &&
        planSource.includes('no design creation') &&
        planSource.includes('Google Flow') &&
        planSource.includes('Canva Connect API'),
      check: 'plan records V1 boundaries and official API basis',
    },
    {
      ok: packageJson.scripts?.['process:canva-client-check'] === `node --env-file-if-exists=.env ${CANVA_CLIENT_SCRIPT_PATH}`,
      check: 'package script is registered',
    },
  ]
  return {
    ok: checks.every(check => check.ok),
    checks,
  }
}
