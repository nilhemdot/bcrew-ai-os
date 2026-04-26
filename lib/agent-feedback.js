import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

const TOKEN_VERSION = 1
const VALID_MILESTONES = new Set([30, 60, 90])

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url')
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function getFeedbackSecret() {
  return process.env.AGENT_FEEDBACK_SECRET ||
    process.env.ADMIN_TOKEN ||
    process.env.DASHBOARD_API_KEY ||
    'local-agent-feedback-dev-secret'
}

function signPayload(encodedPayload) {
  return createHmac('sha256', getFeedbackSecret()).update(encodedPayload).digest('base64url')
}

export function hashAgentFeedbackToken(token) {
  return createHash('sha256').update(String(token || '')).digest('hex')
}

export function createAgentFeedbackToken(input) {
  const milestoneDay = Number(input.milestoneDay)
  if (!VALID_MILESTONES.has(milestoneDay)) throw new Error('Invalid feedback milestone.')
  const payload = {
    v: TOKEN_VERSION,
    taskId: String(input.taskId || '').trim(),
    agentName: String(input.agentName || '').trim(),
    milestoneDay,
  }
  if (!payload.taskId || !payload.agentName) throw new Error('Feedback token requires taskId and agentName.')

  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  return encodedPayload + '.' + signPayload(encodedPayload)
}

export function verifyAgentFeedbackToken(token) {
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

  return {
    taskId: String(payload.taskId),
    agentName: String(payload.agentName),
    milestoneDay,
    tokenHash: hashAgentFeedbackToken(text),
  }
}

export function buildAgentFeedbackUrl(input) {
  const baseUrl = String(process.env.AIOS_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
  return baseUrl + '/agent-feedback?token=' + encodeURIComponent(createAgentFeedbackToken(input))
}
