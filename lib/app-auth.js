import {
  createHmac,
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'

export const AUTH_COOKIE_NAME = 'aios_session'
export const AUTH_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
const MIN_SESSION_SECRET_LENGTH = 32

const PASSWORD_HASH_PREFIX = 'pbkdf2-sha256'
const PASSWORD_HASH_ITERATIONS = 210000
const PASSWORD_HASH_BYTES = 32

const defaultAuthUsers = [
  { email: 'steve.zahnd@bensoncrew.ca', name: 'Steve', role: 'owner' },
  { email: 'carson.campbell@bensoncrew.ca', name: 'Carson', role: 'ops' },
  { email: 'carsonc@bensoncrew.ca', name: 'Carson', role: 'ops' },
  { email: 'clare.manalo@bensoncrew.ca', name: 'Clare', role: 'ops' },
  { email: 'georgia.huntley@bensoncrew.ca', name: 'Georgia', role: 'ops' },
  { email: 'nick.bergmann@bensoncrew.ca', name: 'Nick', role: 'sales' },
  { email: 'blake.berfelz@bensoncrew.ca', name: 'Blake', role: 'sales' },
  { email: 'ryanc@bensoncrew.ca', name: 'Ryan', role: 'sales' },
  { email: 'john@johnkitchens.coach', name: 'John Kitchens', role: 'sales' },
]

function base64UrlEncode(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function base64UrlDecode(value) {
  var normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/')
  while (normalized.length % 4) normalized += '='
  return Buffer.from(normalized, 'base64')
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeRole(value) {
  if (value === 'owner') return 'owner'
  if (value === 'sales') return 'sales'
  return 'ops'
}

function safeEqualBuffers(left, right) {
  const leftBuffer = Buffer.from(left || '')
  const rightBuffer = Buffer.from(right || '')
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

function parseAuthUsersJson(raw) {
  if (!raw || !String(raw).trim()) return getDefaultAuthUsers().map(user => ({ ...user, active: true }))
  const parsed = JSON.parse(raw)
  const rows = Array.isArray(parsed)
    ? parsed
    : Object.entries(parsed).map(([email, value]) => ({
      email,
      ...(typeof value === 'object' && value ? value : { password: value }),
    }))

  return rows
    .map(item => ({
      email: normalizeEmail(item.email),
      name: String(item.name || item.email || '').trim(),
      role: normalizeRole(item.role),
      password: item.password ? String(item.password) : '',
      passwordHash: item.passwordHash ? String(item.passwordHash) : '',
      active: item.active !== false,
    }))
    .filter(item => item.email && item.name && item.active)
}

export function getDefaultAuthUsers() {
  return defaultAuthUsers.map(user => ({ ...user }))
}

export function getAuthUsers() {
  const raw = process.env.AIOS_AUTH_USERS_JSON || process.env.AIOS_AUTH_USERS || ''
  return parseAuthUsersJson(raw)
}

export function isAuthConfigured() {
  return Boolean(getSessionSecret() && getAuthUsers().length)
}

export function getGoogleClientId() {
  return String(
    process.env.AIOS_GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_OAUTH_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    process.env.MCP_GOOGLE_CLIENT_ID ||
    ''
  ).trim()
}

export function getSessionSecret() {
  return String(process.env.AIOS_SESSION_SECRET || '').trim()
}

export function assertSessionSecretConfigured() {
  const secret = getSessionSecret()
  if (!secret) {
    throw new Error('AIOS_SESSION_SECRET is required before AIOS can sign or verify sessions.')
  }
  if (secret.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error(`AIOS_SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters.`)
  }
  return secret
}

export function hashPassword(password, salt = randomBytes(16)) {
  const saltBuffer = Buffer.isBuffer(salt) ? salt : Buffer.from(String(salt))
  const hash = pbkdf2Sync(
    String(password || ''),
    saltBuffer,
    PASSWORD_HASH_ITERATIONS,
    PASSWORD_HASH_BYTES,
    'sha256'
  )
  return [
    PASSWORD_HASH_PREFIX,
    PASSWORD_HASH_ITERATIONS,
    base64UrlEncode(saltBuffer),
    base64UrlEncode(hash),
  ].join('$')
}

function verifyPasswordHash(password, passwordHash) {
  const parts = String(passwordHash || '').split('$')
  if (parts.length !== 4 || parts[0] !== PASSWORD_HASH_PREFIX) return false
  const iterations = Number(parts[1])
  if (!Number.isFinite(iterations) || iterations < 100000) return false
  const salt = base64UrlDecode(parts[2])
  const expected = base64UrlDecode(parts[3])
  const actual = pbkdf2Sync(String(password || ''), salt, iterations, expected.length, 'sha256')
  return safeEqualBuffers(actual, expected)
}

function verifyPlainPassword(password, expected) {
  const left = createHmac('sha256', 'aios-plain-password-compare').update(String(password || '')).digest()
  const right = createHmac('sha256', 'aios-plain-password-compare').update(String(expected || '')).digest()
  return safeEqualBuffers(left, right)
}

export function authenticateAuthUser(email, password) {
  const normalizedEmail = normalizeEmail(email)
  const user = getAuthUsers().find(item => item.email === normalizedEmail)
  if (!user) return null
  if (!user.password && !user.passwordHash) return null
  const ok = user.passwordHash
    ? verifyPasswordHash(password, user.passwordHash)
    : verifyPlainPassword(password, user.password)
  if (!ok) return null
  return {
    email: user.email,
    name: user.name,
    role: user.role,
  }
}

export function getAllowedAuthUser(email) {
  const normalizedEmail = normalizeEmail(email)
  const user = getAuthUsers().find(item => item.email === normalizedEmail)
  if (!user) return null
  return {
    email: user.email,
    name: user.name,
    role: user.role,
  }
}

function signPayload(payload) {
  return base64UrlEncode(createHmac('sha256', assertSessionSecretConfigured()).update(payload).digest())
}

export function createSessionToken(user, nowMs = Date.now()) {
  const payload = base64UrlEncode(JSON.stringify({
    email: normalizeEmail(user.email),
    iat: nowMs,
    exp: nowMs + (AUTH_SESSION_TTL_SECONDS * 1000),
  }))
  return payload + '.' + signPayload(payload)
}

function parseCookieHeader(headerValue) {
  const cookies = {}
  String(headerValue || '').split(';').forEach(part => {
    const index = part.indexOf('=')
    if (index === -1) return
    const key = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    if (key) cookies[key] = decodeURIComponent(value)
  })
  return cookies
}

export function getAuthUserFromRequest(req) {
  if (!isAuthConfigured()) return null
  const token = parseCookieHeader(req.headers.cookie || '')[AUTH_COOKIE_NAME]
  if (!token || !token.includes('.')) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature || !safeEqualBuffers(signature, signPayload(payload))) return null

  let session
  try {
    session = JSON.parse(base64UrlDecode(payload).toString('utf8'))
  } catch {
    return null
  }

  if (!session?.email || !session?.exp || Number(session.exp) < Date.now()) return null

  const currentUser = getAuthUsers().find(user => user.email === normalizeEmail(session.email))
  if (!currentUser) return null

  return {
    email: currentUser.email,
    name: currentUser.name,
    role: currentUser.role,
  }
}

function requestIsHttps(req) {
  return req.secure || String(req.get('x-forwarded-proto') || '').split(',')[0].trim() === 'https'
}

export function setAuthCookie(req, res, user) {
  const token = createSessionToken(user)
  const parts = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${AUTH_SESSION_TTL_SECONDS}`,
  ]
  if (requestIsHttps(req)) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

export function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
}

export function getDefaultRouteForUser(user) {
  if (user?.role === 'owner') return '/'
  if (user?.role === 'sales') return '/'
  return '/ops'
}

export function getSafeRedirectPath(value, user) {
  const fallback = getDefaultRouteForUser(user)
  const candidate = String(value || '').trim()
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) return fallback
  if (/^\/(?:login|api\/auth)/.test(candidate)) return fallback
  if (user?.role === 'ops' && !candidate.startsWith('/ops')) return '/ops'
  if (user?.role === 'sales' && !(candidate === '/' || candidate.startsWith('/sales'))) return '/'
  return candidate
}
