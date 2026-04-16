const FUB_API_BASE = 'https://api.followupboss.com/v1'

const FUB_CONTEXT_DEFS = [
  {
    key: 'owner',
    label: 'Support / Owner account',
    envName: 'FUB_OWNER_API_KEY',
    description: 'Primary owner/support Follow Up Boss account with broad read scope.',
  },
  {
    key: 'steve',
    label: 'Steve account',
    envName: 'FUB_STEVE_API_KEY',
    description: 'Steve personal Follow Up Boss account for assistant and user-scoped work.',
  },
  {
    key: 'system',
    label: 'System fallback',
    envName: 'FUB_API_KEY',
    description: 'Legacy generic Follow Up Boss key used as a fallback when account-specific keys are absent.',
  },
]

function normalizeFubEndpoint(endpoint) {
  if (typeof endpoint !== 'string' || !endpoint.trim()) {
    throw new Error('FUB endpoint is required.')
  }

  const trimmed = endpoint.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    if (!trimmed.startsWith(FUB_API_BASE)) {
      throw new Error('FUB endpoint must stay inside the Follow Up Boss API.')
    }
    return trimmed
  }

  return FUB_API_BASE + (trimmed.startsWith('/') ? trimmed : '/' + trimmed)
}

function toBasicAuthHeader(apiKey) {
  return 'Basic ' + Buffer.from(apiKey + ':').toString('base64')
}

export function getFubContextsSummary() {
  return FUB_CONTEXT_DEFS.map(function(def) {
    return {
      key: def.key,
      label: def.label,
      envName: def.envName,
      description: def.description,
      configured: Boolean(process.env[def.envName]),
    }
  })
}

export function resolveFubContext(contextKey) {
  if (contextKey) {
    const exact = FUB_CONTEXT_DEFS.find(function(def) {
      return def.key === contextKey
    })
    if (!exact) {
      throw new Error('Unknown FUB context: ' + contextKey)
    }
    if (!process.env[exact.envName]) {
      throw new Error('FUB context is not configured: ' + contextKey)
    }
    return {
      key: exact.key,
      label: exact.label,
      envName: exact.envName,
      description: exact.description,
      apiKey: process.env[exact.envName],
    }
  }

  for (const def of FUB_CONTEXT_DEFS) {
    if (process.env[def.envName]) {
      return {
        key: def.key,
        label: def.label,
        envName: def.envName,
        description: def.description,
        apiKey: process.env[def.envName],
      }
    }
  }

  throw new Error('No Follow Up Boss API key configured.')
}

export async function fubJsonFetch(contextKey, endpoint, options) {
  const context = resolveFubContext(contextKey)
  const method = ((options && options.method) || 'GET').toUpperCase()
  const headers = {
    Authorization: toBasicAuthHeader(context.apiKey),
    Accept: 'application/json',
    ...(options && options.headers ? options.headers : {}),
  }
  delete headers.authorization

  let body = options && 'body' in options ? options.body : undefined
  if (body != null && typeof body === 'object' && !(body instanceof Buffer) && !(body instanceof ArrayBuffer) && !(body instanceof Uint8Array)) {
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json'
    }
    body = JSON.stringify(body)
  }

  const response = await fetch(normalizeFubEndpoint(endpoint), {
    method,
    headers,
    body,
  })

  const text = await response.text()
  let payload = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = { raw: text }
    }
  }

  if (!response.ok) {
    const message =
      (payload && (payload.message || payload.error)) ||
      'Follow Up Boss request failed with status ' + response.status
    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload || {}
}

export function extractFubPersonId(input) {
  if (input == null) return ''
  const raw = String(input).trim()
  if (!raw) return ''
  if (/^\d+$/.test(raw)) return raw

  const viewMatch = raw.match(/\/people\/view\/(\d+)/i)
  if (viewMatch) return viewMatch[1]

  const peopleMatch = raw.match(/\/people\/(\d+)(?:[/?#]|$)/i)
  if (peopleMatch) return peopleMatch[1]

  return ''
}

export async function getFubPerson(contextKey, personIdOrUrl) {
  const personId = extractFubPersonId(personIdOrUrl)
  if (!personId) {
    throw new Error('A valid Follow Up Boss person ID or person URL is required.')
  }
  return fubJsonFetch(contextKey, '/people/' + encodeURIComponent(personId))
}

export async function getFubUsers(contextKey, limit) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 5))
  return fubJsonFetch(contextKey, '/users?limit=' + safeLimit)
}

export async function getFubHealth(contextKey) {
  const context = resolveFubContext(contextKey)
  const usersPayload = await getFubUsers(context.key, 3)
  const users = Array.isArray(usersPayload.users) ? usersPayload.users : []

  return {
    context: {
      key: context.key,
      label: context.label,
      envName: context.envName,
      description: context.description,
    },
    status: 'ok',
    usersReturned: users.length,
    sampleUsers: users.slice(0, 3).map(function(user) {
      return {
        id: user.id,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.name || '',
        email: user.email || '',
      }
    }),
  }
}
