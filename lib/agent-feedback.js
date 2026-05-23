import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

const TOKEN_VERSION = 1
const VALID_MILESTONES = new Set([30, 60, 90])
const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 21
const MIN_FEEDBACK_SECRET_LENGTH = 32
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url')
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function getFeedbackSecret() {
  return String(process.env.AGENT_FEEDBACK_SECRET || '').trim()
}

export function assertAgentFeedbackSecretConfigured() {
  const secret = getFeedbackSecret()
  if (!secret) {
    throw new Error('AGENT_FEEDBACK_SECRET is required before AIOS can sign or verify agent feedback links.')
  }
  if (secret.length < MIN_FEEDBACK_SECRET_LENGTH) {
    throw new Error(`AGENT_FEEDBACK_SECRET must be at least ${MIN_FEEDBACK_SECRET_LENGTH} characters.`)
  }
  return secret
}

function signPayload(encodedPayload) {
  return createHmac('sha256', assertAgentFeedbackSecretConfigured()).update(encodedPayload).digest('base64url')
}

export function hashAgentFeedbackToken(token) {
  return createHash('sha256').update(String(token || '')).digest('hex')
}

function getTokenTtlMs() {
  const configured = Number(process.env.AGENT_FEEDBACK_TOKEN_TTL_SECONDS || DEFAULT_TOKEN_TTL_SECONDS)
  const seconds = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TOKEN_TTL_SECONDS
  return seconds * 1000
}

export function createAgentFeedbackToken(input, nowMs = Date.now()) {
  const milestoneDay = Number(input.milestoneDay)
  if (!VALID_MILESTONES.has(milestoneDay)) throw new Error('Invalid feedback milestone.')
  const issuedAt = Number(nowMs)
  if (!Number.isFinite(issuedAt)) throw new Error('Feedback token requires a valid issue time.')
  const payload = {
    v: TOKEN_VERSION,
    taskId: String(input.taskId || '').trim(),
    agentName: String(input.agentName || '').trim(),
    milestoneDay,
    iat: issuedAt,
    exp: issuedAt + getTokenTtlMs(),
  }
  if (!payload.taskId || !payload.agentName) throw new Error('Feedback token requires taskId and agentName.')

  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  return encodedPayload + '.' + signPayload(encodedPayload)
}

export function verifyAgentFeedbackToken(token, nowMs = Date.now(), options = {}) {
  const text = String(token || '').trim()
  const parts = text.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Invalid feedback link.')
  }

  const expected = signPayload(parts[0])
  const actualBuffer = Buffer.from(parts[1])
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new Error('Invalid feedback link.')
  }

  const payload = JSON.parse(base64UrlDecode(parts[0]))
  if (payload.v !== TOKEN_VERSION) throw new Error('Unsupported feedback link.')
  const milestoneDay = Number(payload.milestoneDay)
  if (!VALID_MILESTONES.has(milestoneDay)) throw new Error('Invalid feedback milestone.')
  if (!payload.taskId || !payload.agentName) throw new Error('Invalid feedback link.')
  const issuedAt = Number(payload.iat)
  const expiresAt = Number(payload.exp)
  const now = Number(nowMs)
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || !Number.isFinite(now)) {
    throw new Error('Invalid feedback link.')
  }
  if (issuedAt > now + MAX_CLOCK_SKEW_MS || expiresAt <= issuedAt) {
    throw new Error('Invalid feedback link.')
  }
  const expired = expiresAt < now
  if (expired && options.allowExpired !== true) throw new Error('Feedback link has expired.')

  return {
    taskId: String(payload.taskId),
    agentName: String(payload.agentName),
    milestoneDay,
    tokenHash: hashAgentFeedbackToken(text),
    expired,
  }
}

export function buildAgentFeedbackUrl(input) {
  const baseUrl = String(process.env.AIOS_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
  return baseUrl + '/agent-feedback?token=' + encodeURIComponent(createAgentFeedbackToken(input))
}
