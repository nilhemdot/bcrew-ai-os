#!/usr/bin/env node

import crypto from 'node:crypto'
import http from 'node:http'
import process from 'node:process'
import { spawn } from 'node:child_process'

import {
  buildKeychainSecretRef,
  keychainItemExists,
  readKeychainPassword,
  storeKeychainPassword,
} from '../lib/credential-vault.js'

const MCP_URL = 'https://mcp.myicor.com/mcp'
const OLD_SSE_URL = 'https://mcp.myicor.com/sse'
const AUTH_METADATA_URL = 'https://app.myicor.com/.well-known/oauth-authorization-server'
const DEFAULT_CALLBACK = 'http://127.0.0.1:7777/callback'
const DEFAULT_ACCOUNT = 'myicor-authorized-member'
const KEYCHAIN_SOURCE = 'myicor-mcp-oauth'
const DEFAULT_SCOPE = 'mcp:read mcp:tools mcp:progress mcp:inner-circle'
const EXISTING_GOOGLE_SSO_ACCOUNT = 'steve.zahnd@bensoncrew.ca'
const WRONG_BRANCH_STOP_TEXT = 'If myICOR asks you to Start Free, create a profile, onboard, or sign up, stop. Use Log in / Sign in with Google for the existing paid account.'

function parseArgs(argv = process.argv.slice(2)) {
  const [command = 'preflight', ...rest] = argv
  const flags = {
    command,
    json: rest.includes('--json'),
    open: !rest.includes('--no-open'),
    account: DEFAULT_ACCOUNT,
    callback: DEFAULT_CALLBACK,
    scope: DEFAULT_SCOPE,
    tool: '',
    paramsJson: '{}',
    timeoutMs: 10 * 60 * 1000,
  }
  for (const arg of rest) {
    if (arg.startsWith('--account=')) flags.account = arg.slice('--account='.length).trim()
    if (arg.startsWith('--callback=')) flags.callback = arg.slice('--callback='.length).trim()
    if (arg.startsWith('--scope=')) flags.scope = arg.slice('--scope='.length).trim()
    if (arg.startsWith('--tool=')) flags.tool = arg.slice('--tool='.length).trim()
    if (arg.startsWith('--paramsJson=')) flags.paramsJson = arg.slice('--paramsJson='.length).trim()
    if (arg.startsWith('--params=')) flags.paramsJson = arg.slice('--params='.length).trim()
    if (arg.startsWith('--timeoutMs=')) flags.timeoutMs = Number(arg.slice('--timeoutMs='.length))
  }
  return flags
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2))
}

function b64url(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function makePkce() {
  const verifier = b64url(crypto.randomBytes(48))
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest())
  return { verifier, challenge, method: 'S256' }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(options.timeoutMs || 15000),
  })
  const text = await response.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    // Keep json null; caller can still inspect status/text.
  }
  return {
    ok: response.ok,
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    json,
    text,
  }
}

async function callMcp(method, {
  token = '',
  id = 1,
  params = {},
} = {}) {
  return fetchJson(MCP_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  })
}

async function registerClient({ callback, scope }) {
  const response = await fetchJson('https://app.myicor.com/api/oauth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      redirect_uris: [callback],
      client_name: 'BCrew AIOS MyICOR Readonly Connector',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope,
      token_endpoint_auth_method: 'none',
    }),
  })
  if (!response.ok || !response.json?.client_id) {
    throw new Error(`myICOR OAuth client registration failed: ${response.status}`)
  }
  return response.json
}

function buildAuthUrl({
  authorizationEndpoint,
  clientId,
  callback,
  scope,
  challenge,
  state,
}) {
  const url = new URL(authorizationEndpoint)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', callback)
  url.searchParams.set('scope', scope)
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

function openBrowser(url) {
  if (process.platform !== 'darwin') return false
  const child = spawn('open', [url], { stdio: 'ignore', detached: true })
  child.unref()
  return true
}

function waitForCode({ callback, expectedState, timeoutMs }) {
  const callbackUrl = new URL(callback)
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const requestUrl = new URL(req.url || '/', callbackUrl.origin)
        if (requestUrl.pathname !== callbackUrl.pathname) {
          res.writeHead(404)
          res.end('Not found')
          return
        }
        const code = requestUrl.searchParams.get('code') || ''
        const state = requestUrl.searchParams.get('state') || ''
        const error = requestUrl.searchParams.get('error') || ''
        if (error) throw new Error(error)
        if (!code) throw new Error('OAuth callback did not include code.')
        if (state !== expectedState) throw new Error('OAuth callback state mismatch.')
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end('<html><body><h1>myICOR connected</h1><p>You can close this tab and return to Codex.</p></body></html>')
        server.close()
        resolve(code)
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end(error instanceof Error ? error.message : String(error))
        server.close()
        reject(error)
      }
    })
    server.on('error', reject)
    server.listen(Number(callbackUrl.port || 80), callbackUrl.hostname, () => {})
    setTimeout(() => {
      server.close()
      reject(new Error('Timed out waiting for myICOR OAuth callback.'))
    }, timeoutMs).unref()
  })
}

async function exchangeToken({
  tokenEndpoint,
  clientId,
  code,
  callback,
  verifier,
}) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    code,
    redirect_uri: callback,
    code_verifier: verifier,
  })
  const response = await fetchJson(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!response.ok || !response.json?.access_token) {
    throw new Error(`myICOR token exchange failed: ${response.status}`)
  }
  return response.json
}

async function refreshToken({
  tokenEndpoint,
  clientId,
  refreshToken,
}) {
  if (!refreshToken) throw new Error('No myICOR refresh token is stored.')
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: refreshToken,
  })
  const response = await fetchJson(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!response.ok || !response.json?.access_token) {
    throw new Error(`myICOR token refresh failed: ${response.status}`)
  }
  return response.json
}

async function storeOAuthToken({
  account,
  token,
  clientId,
  scope,
}) {
  return storeKeychainPassword({
    source: KEYCHAIN_SOURCE,
    account,
    secret: JSON.stringify({
      token_type: token.token_type || 'Bearer',
      access_token: token.access_token,
      refresh_token: token.refresh_token || '',
      expires_in: token.expires_in || null,
      scope: token.scope || scope,
      client_id: clientId,
      mcp_url: MCP_URL,
      updated_at: new Date().toISOString(),
    }),
    label: 'BCrew AI OS myICOR MCP OAuth token',
    comment: 'Read-only myICOR MCP OAuth token for the local source session broker.',
  })
}

function summarizeMcpResponse(response) {
  const result = response.json?.result || null
  const error = response.json?.error || null
  return {
    ok: response.ok && !error,
    status: response.status,
    result,
    error,
    authenticate: response.headers?.['www-authenticate'] || '',
  }
}

async function readStoredToken({ account }) {
  const present = await keychainItemExists({ source: KEYCHAIN_SOURCE, account })
  if (!present) return { ok: false, present: false, token: null }
  const raw = await readKeychainPassword({ source: KEYCHAIN_SOURCE, account })
  return { ok: true, present: true, token: JSON.parse(raw) }
}

async function callWithStoredToken({
  account,
  method,
  params,
  id = 10,
}) {
  const stored = await readStoredToken({ account })
  if (!stored.present) {
    return {
      ok: false,
      missingToken: true,
      response: null,
      tokenRefreshed: false,
    }
  }
  let activeToken = stored.token
  let response = await callMcp(method, { token: activeToken.access_token, id, params })
  let tokenRefreshed = false
  if (response.status === 401 && activeToken.refresh_token && activeToken.client_id) {
    const metadata = await fetchJson(AUTH_METADATA_URL)
    const nextToken = await refreshToken({
      tokenEndpoint: metadata.json.token_endpoint,
      clientId: activeToken.client_id,
      refreshToken: activeToken.refresh_token,
    })
    await storeOAuthToken({
      account,
      token: {
        ...nextToken,
        refresh_token: nextToken.refresh_token || activeToken.refresh_token,
      },
      clientId: activeToken.client_id,
      scope: nextToken.scope || activeToken.scope || DEFAULT_SCOPE,
    })
    activeToken = {
      ...activeToken,
      ...nextToken,
      refresh_token: nextToken.refresh_token || activeToken.refresh_token,
    }
    tokenRefreshed = true
    response = await callMcp(method, { token: activeToken.access_token, id: id + 1, params })
  }
  return {
    ok: response.ok && !response.json?.error,
    missingToken: false,
    response,
    tokenRefreshed,
  }
}

async function preflight({ json = false } = {}) {
  const [metadata, initialize, oldSse, toolsList] = await Promise.all([
    fetchJson(AUTH_METADATA_URL),
    callMcp('initialize', {
      id: 1,
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'bcrew-ai-os-preflight', version: '0.1.0' },
      },
    }),
    fetchJson(OLD_SSE_URL, { method: 'GET', headers: { Accept: 'text/event-stream' } }),
    callMcp('tools/list', { id: 2 }),
  ])
  const result = {
    ok: Boolean(
      metadata.ok &&
      metadata.json?.authorization_endpoint &&
      metadata.json?.token_endpoint &&
      initialize.ok &&
      initialize.json?.result?.serverInfo?.name === 'myicor-mcp' &&
      toolsList.status === 401
    ),
    endpoints: {
      mcp: MCP_URL,
      oldSse: OLD_SSE_URL,
      authorizationMetadata: AUTH_METADATA_URL,
      authorizationEndpoint: metadata.json?.authorization_endpoint || '',
      tokenEndpoint: metadata.json?.token_endpoint || '',
      registrationEndpoint: metadata.json?.registration_endpoint || '',
    },
    scopesSupported: metadata.json?.scopes_supported || [],
    mcpServer: initialize.json?.result?.serverInfo || null,
    protocolVersion: initialize.json?.result?.protocolVersion || '',
    toolCapabilityAdvertised: Boolean(initialize.json?.result?.capabilities?.tools),
    unauthenticatedToolsList: summarizeMcpResponse(toolsList),
    oldSseStatus: oldSse.status,
    conclusion: toolsList.status === 401
      ? 'OAuth token required before tools/list or extraction.'
      : 'Unexpected unauthenticated tools/list behavior; inspect before extraction.',
    rawSecretPrinted: false,
  }
  if (json) printJson(result)
  else {
    console.log(`myICOR MCP preflight: ${result.ok ? 'ready_for_oauth' : 'blocked'}`)
    console.log(`mcp: ${MCP_URL}`)
    console.log(`server: ${result.mcpServer?.name || 'unknown'} ${result.mcpServer?.version || ''}`.trim())
    console.log(`tools/list without token: HTTP ${result.unauthenticatedToolsList.status}`)
    console.log(`old /sse endpoint: HTTP ${result.oldSseStatus}`)
    console.log('raw secret: never printed')
  }
  return result
}

async function authorize({
  account,
  callback,
  scope,
  timeoutMs,
  open,
  json = false,
} = {}) {
  const metadata = await fetchJson(AUTH_METADATA_URL)
  if (!metadata.ok) throw new Error(`OAuth metadata fetch failed: ${metadata.status}`)
  const pkce = makePkce()
  const state = b64url(crypto.randomBytes(24))
  const client = await registerClient({ callback, scope })
  const authorizationUrl = buildAuthUrl({
    authorizationEndpoint: metadata.json.authorization_endpoint,
    clientId: client.client_id,
    callback,
    scope,
    challenge: pkce.challenge,
    state,
  })
  const browserOpened = open ? openBrowser(authorizationUrl) : false
  if (!json) {
    console.log('myICOR account rule:')
    console.log(`- Existing paid access uses Google SSO: ${EXISTING_GOOGLE_SSO_ACCOUNT}`)
    console.log(`- ${WRONG_BRANCH_STOP_TEXT}`)
    console.log('- If Google asks for 2FA/passkey/number match, complete that human verification, then return here.')
    console.log('')
    console.log('Open this myICOR authorization URL and approve read-only access:')
    console.log(authorizationUrl)
    console.log('')
    console.log('Waiting for the local callback...')
  }
  const code = await waitForCode({ callback, expectedState: state, timeoutMs })
  const token = await exchangeToken({
    tokenEndpoint: metadata.json.token_endpoint,
    clientId: client.client_id,
    code,
    callback,
    verifier: pkce.verifier,
  })
  const stored = await storeOAuthToken({
    account,
    token,
    clientId: client.client_id,
    scope,
  })
  const toolsList = await callMcp('tools/list', { token: token.access_token, id: 3 })
  const tools = toolsList.json?.result?.tools || []
  const result = {
    ok: Boolean(stored.secretRef && toolsList.ok && !toolsList.json?.error),
    account,
    secretRef: stored.secretRef,
    mcpUrl: MCP_URL,
    browserOpened,
    clientId: client.client_id,
    scope: token.scope || scope,
    existingGoogleSsoAccount: EXISTING_GOOGLE_SSO_ACCOUNT,
    signupOrProfileCreationAllowed: false,
    wrongBranchStopCondition: WRONG_BRANCH_STOP_TEXT,
    tokenStoredInKeychain: true,
    rawSecretPrinted: false,
    toolsListStatus: toolsList.status,
    toolCount: tools.length,
    toolNames: tools.map(tool => tool.name).slice(0, 50),
  }
  if (json) printJson(result)
  else {
    console.log(`myICOR MCP authorization: ${result.ok ? 'stored_and_verified' : 'stored_but_unverified'}`)
    console.log(`secretRef: ${result.secretRef}`)
    console.log(`tools: ${result.toolCount}`)
    console.log('raw secret: never printed')
  }
  return result
}

async function tools({ account, json = false } = {}) {
  const present = await keychainItemExists({ source: KEYCHAIN_SOURCE, account })
  if (!present) {
    const result = {
      ok: false,
      account,
      secretRef: buildKeychainSecretRef({ source: KEYCHAIN_SOURCE, account }),
      keychainPresent: false,
      next: 'Run npm run myicor:mcp-authorize -- --account=myicor-authorized-member',
      rawSecretPrinted: false,
    }
    if (json) printJson(result)
    else {
      console.log('myICOR MCP token missing.')
      console.log(`secretRef: ${result.secretRef}`)
      console.log(result.next)
    }
    process.exitCode = 1
    return result
  }
  const call = await callWithStoredToken({ account, method: 'tools/list', params: {}, id: 4 })
  const toolsList = call.response
  const toolRows = toolsList.json?.result?.tools || []
  const result = {
    ok: toolsList.ok && !toolsList.json?.error,
    account,
    secretRef: buildKeychainSecretRef({ source: KEYCHAIN_SOURCE, account }),
    keychainPresent: true,
    mcpUrl: MCP_URL,
    tokenRefreshed: call.tokenRefreshed,
    toolsListStatus: toolsList.status,
    toolCount: toolRows.length,
    tools: toolRows.map(tool => ({
      name: tool.name,
      description: tool.description || '',
      inputSchemaKeys: Object.keys(tool.inputSchema?.properties || {}),
    })),
    rawSecretPrinted: false,
  }
  if (json) printJson(result)
  else {
    console.log(`myICOR MCP tools: ${result.ok ? result.toolCount : 'blocked'}`)
    for (const tool of result.tools) console.log(`- ${tool.name}: ${tool.description}`)
    console.log('raw secret: never printed')
  }
  return result
}

async function callTool({ account, tool, paramsJson = '{}', json = false } = {}) {
  if (!tool) throw new Error('--tool is required.')
  let parsedParams = {}
  try {
    parsedParams = paramsJson ? JSON.parse(paramsJson) : {}
  } catch (error) {
    throw new Error(`--paramsJson must be valid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
  const present = await keychainItemExists({ source: KEYCHAIN_SOURCE, account })
  if (!present) {
    const result = {
      ok: false,
      account,
      secretRef: buildKeychainSecretRef({ source: KEYCHAIN_SOURCE, account }),
      keychainPresent: false,
      next: 'Run npm run myicor:mcp-authorize -- --account=myicor-authorized-member',
      rawSecretPrinted: false,
    }
    if (json) printJson(result)
    else {
      console.log('myICOR MCP token missing.')
      console.log(`secretRef: ${result.secretRef}`)
      console.log(result.next)
    }
    process.exitCode = 1
    return result
  }
  const call = await callWithStoredToken({
    account,
    method: 'tools/call',
    params: { name: tool, arguments: parsedParams },
    id: 20,
  })
  const result = {
    ok: call.ok,
    account,
    secretRef: buildKeychainSecretRef({ source: KEYCHAIN_SOURCE, account }),
    keychainPresent: true,
    mcpUrl: MCP_URL,
    tokenRefreshed: call.tokenRefreshed,
    tool,
    status: call.response?.status || 0,
    response: call.response?.json || null,
    rawSecretPrinted: false,
  }
  if (json) printJson(result)
  else {
    console.log(`myICOR MCP call ${tool}: ${result.ok ? 'ok' : 'blocked'}`)
    console.log(JSON.stringify(result.response, null, 2))
    console.log('raw secret: never printed')
  }
  process.exitCode = result.ok ? 0 : 1
  return result
}

async function main() {
  const args = parseArgs()
  if (args.command === 'preflight') {
    const result = await preflight(args)
    process.exitCode = result.ok ? 0 : 1
    return
  }
  if (args.command === 'authorize') {
    const result = await authorize(args)
    process.exitCode = result.ok ? 0 : 1
    return
  }
  if (args.command === 'tools') {
    const result = await tools(args)
    process.exitCode = result.ok ? 0 : 1
    return
  }
  if (args.command === 'call') {
    await callTool(args)
    return
  }
  console.error('Usage: node scripts/myicor-mcp-oauth.mjs <preflight|authorize|tools|call> [--account=myicor-authorized-member] [--tool=name] [--paramsJson={}] [--json]')
  process.exitCode = 2
}

main().catch(error => {
  console.error('myICOR MCP OAuth command failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
