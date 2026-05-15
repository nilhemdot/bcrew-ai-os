#!/usr/bin/env node

import crypto from 'node:crypto'
import http from 'node:http'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { URL, URLSearchParams } from 'node:url'

import {
  CANVA_TOKEN_URL,
  replaceEnvValueLine,
  sanitizeCanvaLogValue,
} from '../lib/canva-client.js'

const DEFAULT_PORT = 3001
const DEFAULT_PATH = '/oauth/redirect'
const DEFAULT_SCOPES = [
  'app:read',
  'asset:read',
  'brandtemplate:meta:read',
  'brandtemplate:content:read',
  'design:meta:read',
  'design:content:read',
  'folder:read',
  'profile:read',
].join(' ')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    apply: false,
    open: false,
    port: DEFAULT_PORT,
    callbackPath: DEFAULT_PATH,
    envPath: path.resolve(process.cwd(), '.env'),
    scopes: DEFAULT_SCOPES,
  }
  for (const arg of argv) {
    if (arg === '--apply' || arg === '--apply=true' || arg === '--write-env' || arg === '--write-env=true') args.apply = true
    if (arg === '--open' || arg === '--open=true') args.open = true
    if (arg.startsWith('--port=')) args.port = Number(arg.split('=').slice(1).join('=')) || DEFAULT_PORT
    if (arg.startsWith('--callback-path=')) args.callbackPath = String(arg.split('=').slice(1).join('=') || DEFAULT_PATH)
    if (arg.startsWith('--env-path=')) args.envPath = path.resolve(String(arg.split('=').slice(1).join('=')))
    if (arg.startsWith('--scopes=')) args.scopes = String(arg.split('=').slice(1).join('=')).replace(/,/g, ' ')
  }
  return args
}

function fail(message, metadata = {}) {
  console.error(`CANVA_OAUTH_BOOTSTRAP_FAILED ${message}`)
  if (Object.keys(metadata).length) console.error(JSON.stringify(sanitizeCanvaLogValue(metadata), null, 2))
  process.exit(1)
}

function base64Url(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function readEnv(envPath) {
  const source = await fs.readFile(envPath, 'utf8')
  const clientId = source.match(/^CANVA_CLIENT_ID=(.+)$/m)?.[1]?.trim()
  const clientSecret = source.match(/^CANVA_CLIENT_SECRET=(.+)$/m)?.[1]?.trim()
  if (!clientId || !clientSecret) fail('CANVA_CLIENT_ID and CANVA_CLIENT_SECRET must exist in .env')
  return { source, clientId, clientSecret }
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]))
}

function respondHtml(res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(html)
}

async function exchangeCodeForToken({ clientId, clientSecret, code, redirectUri, codeVerifier }) {
  const response = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  })
  const text = await response.text()
  let body = {}
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    body = { raw: text.slice(0, 500) }
  }
  if (!response.ok) {
    fail(`token_exchange_${response.status}`, { body })
  }
  if (!body.refresh_token) {
    fail('token_exchange_missing_refresh_token', { body })
  }
  return body
}

function maybeOpenBrowser(url) {
  const command = process.platform === 'darwin'
    ? 'open'
    : process.platform === 'win32'
      ? 'cmd'
      : 'xdg-open'
  const args = process.platform === 'win32'
    ? ['/c', 'start', '', url]
    : [url]
  execFile(command, args, () => {})
}

async function main() {
  const args = parseArgs()
  if (!args.apply) {
    fail('refusing_to_write_env_without_apply', {
      next: 'rerun with --apply after confirming you are logged into the admin@ Canva account',
    })
  }

  const { source: envSource, clientId, clientSecret } = await readEnv(args.envPath)
  const redirectUri = `http://127.0.0.1:${args.port}${args.callbackPath}`
  const codeVerifier = base64Url(crypto.randomBytes(96))
  const codeChallenge = base64Url(crypto.createHash('sha256').update(codeVerifier).digest())
  const state = base64Url(crypto.randomBytes(48))
  const authorizeUrl = `https://www.canva.com/api/oauth/authorize?${new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: args.scopes,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  })}`

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, redirectUri)
    if (url.pathname !== args.callbackPath) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('not found')
      return
    }

    if (url.searchParams.get('state') !== state) {
      respondHtml(res, 400, '<h1>State mismatch.</h1>')
      return
    }

    const canvaError = url.searchParams.get('error')
    if (canvaError) {
      respondHtml(res, 400, `<h1>Canva error</h1><pre>${escapeHtml(canvaError)} ${escapeHtml(url.searchParams.get('error_description') || '')}</pre>`)
      return
    }

    const code = url.searchParams.get('code')
    if (!code) {
      respondHtml(res, 400, '<h1>Missing authorization code.</h1>')
      return
    }

    try {
      const token = await exchangeCodeForToken({ clientId, clientSecret, code, redirectUri, codeVerifier })
      const nextEnv = replaceEnvValueLine(envSource, 'CANVA_REFRESH_TOKEN', token.refresh_token)
      await fs.writeFile(args.envPath, nextEnv)
      respondHtml(res, 200, `
        <body style="font-family: system-ui; padding: 40px; max-width: 680px; margin: 0 auto;">
          <h1 style="color: #0084C9; font-weight: 900;">Canva OAuth complete</h1>
          <p>Refresh token replaced in <code>.env</code>. You can close this tab.</p>
          <p>Access token expires in ${Number(token.expires_in || 0) || 'unknown'} seconds. Scopes: ${escapeHtml(token.scope || args.scopes)}</p>
        </body>
      `)
      console.log(JSON.stringify({
        ok: true,
        envPath: args.envPath,
        redirectUri,
        refreshTokenLineReplaced: true,
        tokenLineCount: (nextEnv.match(/^CANVA_REFRESH_TOKEN=.*$/gm) || []).length,
        scopes: token.scope || args.scopes,
        expiresIn: Number(token.expires_in || 0) || null,
      }, null, 2))
      setTimeout(() => server.close(() => process.exit(0)), 500)
    } catch (error) {
      respondHtml(res, 500, `<h1>Token exchange failed.</h1><pre>${escapeHtml(error?.message || error)}</pre>`)
      console.error(error instanceof Error ? error.message : String(error))
    }
  })

  server.listen(args.port, '127.0.0.1', () => {
    console.log('CANVA_OAUTH_BOOTSTRAP_READY')
    console.log(`Redirect URI required in Canva app: ${redirectUri}`)
    console.log('Log into Canva as the admin account, then open this URL:')
    console.log(authorizeUrl)
    if (args.open) maybeOpenBrowser(authorizeUrl)
  })

  server.on('error', error => {
    fail(`server_${error.code || 'error'}`, { message: error.message, port: args.port })
  })
}

main().catch(error => {
  fail('unexpected_error', { message: error instanceof Error ? error.message : String(error) })
})
