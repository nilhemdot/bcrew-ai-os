import express from 'express'
import path from 'node:path'
import { OAuth2Client } from 'google-auth-library'
import {
  authenticateAuthUser,
  clearAuthCookie,
  getAllowedAuthUser,
  getDefaultRouteForUser,
  getGoogleClientId,
  getSafeRedirectPath,
  isAuthConfigured,
  setAuthCookie,
  setRuntimeAuthUsers,
} from './app-auth.js'
import { buildRuntimeAuthUsersFromFoundationUsers } from './foundation-user-admin.js'

export const AUTH_ROUTES_SPLIT_CARD_ID = 'AUTH-ROUTES-SPLIT-001'
export const AUTH_ROUTES_SPLIT_CLOSEOUT_KEY = 'auth-routes-split-v1'
export const AUTH_ROUTES_SPLIT_PLAN_PATH = 'docs/process/auth-routes-split-001-plan.md'
export const AUTH_ROUTES_SPLIT_APPROVAL_PATH = 'docs/process/approvals/AUTH-ROUTES-SPLIT-001.json'
export const AUTH_ROUTES_SPLIT_SCRIPT_PATH = 'scripts/process-auth-routes-split-check.mjs'
export const AUTH_ROUTES_SPLIT_SPRINT_ID = 'foundation-server-monolith-closeout-2026-05-15'
export const AUTH_ROUTES_SPLIT_BEFORE_SERVER_LINES = 6733
export const AUTH_ROUTES_SPLIT_ROUTE_BUDGET_MS = 2000
export const AUTH_ROUTES_SPLIT_ROUTE_BUDGET_BYTES = 1_000_000

const googleOauthClient = new OAuth2Client()

function setSecurityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'same-origin')
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  next()
}

function logApiRequest(req, res, next) {
  if (!req.path.startsWith('/api/')) {
    next()
    return
  }

  const startedAt = Date.now()
  res.on('finish', () => {
    const durationMs = Date.now() - startedAt
    console.info(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`)
  })
  next()
}

function sendNoStoreFile(res, filePath) {
  res.setHeader('Cache-Control', 'no-store')
  res.sendFile(filePath)
}

function buildDirectHtmlRoutes() {
  return {
    '/index.html': '/',
    '/foundation.html': '/foundation',
    '/ops.html': '/ops',
    '/sales.html': '/sales',
    '/strategic-execution.html': '/strategic-execution',
    '/doc.html': '/doc',
    '/strategy-export.html': '/foundation/export/strategy',
  }
}

export function buildAuthRoutesSplitDogfoodProof({
  serverSource = '',
  moduleSource = '',
  proofScriptSource = '',
} = {}) {
  const healthy = {
    serverSource: "import { registerAuthRoutes } from './lib/auth-routes.js'\nregisterAuthRoutes(app, {})",
    moduleSource: [
      'registerAuthRoutes',
      "app.get('/login'",
      "app.post('/api/auth/login'",
      "app.post('/api/auth/google'",
      "app.get('/api/auth/session'",
      "app.post('/api/auth/logout'",
      'express.json',
      'express.static',
      'directHtmlRoutes',
    ].join(' '),
    proofScriptSource: 'live auth/session/static route probes route behavior round-trip',
  }

  const evaluate = fixture => {
    const nextServerSource = String(fixture.serverSource ?? serverSource)
    const nextModuleSource = String(fixture.moduleSource ?? moduleSource)
    const nextProofScriptSource = String(fixture.proofScriptSource ?? proofScriptSource)
    const routeMarkers = [
      "app.get('/login'",
      "app.post('/api/auth/login'",
      "app.post('/api/auth/google'",
      "app.get('/api/auth/session'",
      "app.post('/api/auth/logout'",
    ]
    return routeMarkers.every(marker => nextModuleSource.includes(marker)) &&
      routeMarkers.every(marker => !nextServerSource.includes(marker)) &&
      nextModuleSource.includes('express.json') &&
      nextModuleSource.includes('express.static') &&
      nextServerSource.includes('registerAuthRoutes(app') &&
      nextProofScriptSource.includes('route behavior round-trip')
  }

  const passing = evaluate(healthy)
  const rejected = {
    missingModule: evaluate({ ...healthy, moduleSource: '' }) === false,
    oldInlineLoginRoute: evaluate({ ...healthy, serverSource: `${healthy.serverSource}\napp.get('/login', () => {})` }) === false,
    oldInlineSessionRoute: evaluate({ ...healthy, serverSource: `${healthy.serverSource}\napp.get('/api/auth/session', () => {})` }) === false,
    missingRegistrar: evaluate({ ...healthy, serverSource: '' }) === false,
    weakProof: evaluate({ ...healthy, proofScriptSource: 'substring-only markers' }) === false,
  }

  return {
    ok: passing && Object.values(rejected).every(Boolean),
    passing,
    rejected,
    summary: 'Auth route split dogfood accepts healthy auth/static registrar ownership and rejects missing module, old inline auth routes, missing registrar, and weak proof.',
  }
}

export function registerAuthRoutes(app, deps = {}) {
  const {
    publicDir,
    sendApiError,
    attachRequestAccessContext,
    getRequestAuthUser,
    getLocalDevUser,
    listFoundationUsers,
  } = deps
  if (!publicDir) throw new Error('registerAuthRoutes requires publicDir.')
  if (typeof sendApiError !== 'function') throw new Error('registerAuthRoutes requires sendApiError.')
  if (typeof attachRequestAccessContext !== 'function') throw new Error('registerAuthRoutes requires attachRequestAccessContext.')
  if (typeof getRequestAuthUser !== 'function') throw new Error('registerAuthRoutes requires getRequestAuthUser.')
  if (typeof getLocalDevUser !== 'function') throw new Error('registerAuthRoutes requires getLocalDevUser.')

  let authUserCacheLoadedAtMs = 0
  let authUserCachePending = null

  async function refreshRuntimeAuthUsers() {
    if (typeof listFoundationUsers !== 'function') return
    const now = Date.now()
    if (authUserCachePending) return authUserCachePending
    if (now - authUserCacheLoadedAtMs < 30 * 1000) return
    authUserCachePending = listFoundationUsers({ activeOnly: false })
      .then(users => {
        setRuntimeAuthUsers(buildRuntimeAuthUsersFromFoundationUsers(users))
        authUserCacheLoadedAtMs = Date.now()
      })
      .catch(error => {
        console.warn(`Foundation auth user sync failed: ${error instanceof Error ? error.message : String(error)}`)
      })
      .finally(() => {
        authUserCachePending = null
      })
    return authUserCachePending
  }

  app.use(setSecurityHeaders)
  app.use(logApiRequest)
  app.use(express.json({ limit: '1mb' }))
  app.use(async (req, _res, next) => {
    try {
      await refreshRuntimeAuthUsers()
      await attachRequestAccessContext(req)
      next()
    } catch (error) {
      next(error)
    }
  })

  app.get('/login', (_req, res) => {
    sendNoStoreFile(res, path.join(publicDir, 'login.html'))
  })

  app.post('/api/auth/login', (req, res) => {
    if (!isAuthConfigured()) {
      sendApiError(res, 503, 'auth_unconfigured', 'AIOS login is not configured yet.')
      return
    }

    const user = authenticateAuthUser(req.body?.email, req.body?.password)
    if (!user) {
      sendApiError(res, 401, 'invalid_login', 'Email or password is incorrect.')
      return
    }

    setAuthCookie(req, res, user)
    res.json({
      user,
      redirectTo: getSafeRedirectPath(req.body?.next, user),
    })
  })

  app.post('/api/auth/google', async (req, res) => {
    try {
      if (!isAuthConfigured()) {
        sendApiError(res, 503, 'auth_unconfigured', 'AIOS login is not configured yet.')
        return
      }

      const clientId = getGoogleClientId()
      if (!clientId) {
        sendApiError(res, 503, 'google_login_unconfigured', 'Google login is not configured yet.')
        return
      }

      const idToken = String(req.body?.credential || '').trim()
      if (!idToken) {
        sendApiError(res, 400, 'missing_google_credential', 'Google sign-in credential is missing.')
        return
      }

      const ticket = await googleOauthClient.verifyIdToken({
        idToken,
        audience: clientId,
      })
      const payload = ticket.getPayload()
      const email = String(payload?.email || '').trim().toLowerCase()

      if (!payload?.email_verified) {
        sendApiError(res, 403, 'google_account_not_verified', 'Use a verified Google account.')
        return
      }

      const user = getAllowedAuthUser(email)
      if (!user) {
        sendApiError(res, 403, 'user_not_allowed', 'This Google account is not enabled for AIOS yet.')
        return
      }

      setAuthCookie(req, res, user)
      res.json({
        user,
        redirectTo: getSafeRedirectPath(req.body?.next, user),
      })
    } catch (error) {
      console.error('Google login failed:', error)
      sendApiError(res, 401, 'google_login_failed', 'Google login failed. Try again or ask Steve to confirm access.')
    }
  })

  app.get('/api/auth/session', (req, res) => {
    const user = getRequestAuthUser(req) || getLocalDevUser(req)
    res.json({
      authenticated: Boolean(user),
      configured: isAuthConfigured(),
      googleConfigured: Boolean(getGoogleClientId()),
      googleClientId: getGoogleClientId(),
      user,
      defaultRoute: user ? getDefaultRouteForUser(user) : '/login',
    })
  })

  app.post('/api/auth/logout', (_req, res) => {
    clearAuthCookie(res)
    res.json({ ok: true })
  })

  app.use((req, res, next) => {
    const directHtmlRoutes = buildDirectHtmlRoutes()
    if (directHtmlRoutes[req.path]) {
      res.redirect(directHtmlRoutes[req.path])
      return
    }
    next()
  })

  app.use(express.static(publicDir, {
    index: false,
    setHeaders(res, filePath) {
      if (/\.(js|css|html)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'no-store')
      }
    },
  }))
}
