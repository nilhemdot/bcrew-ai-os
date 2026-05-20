import { Pool } from 'pg'
import { getAuthUsers, getGoogleClientId, hashPassword } from './app-auth.js'

export const FOUNDATION_USERS_CARD_ID = 'FOUNDATION-USERS-001'
export const FOUNDATION_USERS_CLOSEOUT_KEY = 'foundation-users-v1'
export const FOUNDATION_USERS_PLAN_PATH = 'docs/process/foundation-users-001-plan.md'
export const FOUNDATION_USERS_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-USERS-001.json'
export const FOUNDATION_USERS_HANDOFF_PATH = 'docs/handoffs/2026-05-20-foundation-users-closeout.md'
export const FOUNDATION_USERS_SCRIPT_PATH = 'scripts/process-foundation-users-check.mjs'
export const FOUNDATION_USER_ACCESS_EVENT_TYPE = 'foundation_user_access_updated'
export const FOUNDATION_USER_ROLES = ['owner', 'ops', 'sales']
export const FOUNDATION_USER_TYPES = ['human', 'system']
export const FOUNDATION_USER_TIERS = [1, 2, 3]
export const FOUNDATION_USERS_PROOF_EMAIL = 'foundation-users-001-proof@bensoncrew.local'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

export function normalizeFoundationUserEmail(value) {
  return String(value || '').trim().toLowerCase()
}

export function normalizeFoundationUserRole(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return FOUNDATION_USER_ROLES.includes(normalized) ? normalized : ''
}

function inferRoleFromKnownAuthUsers(email) {
  const normalizedEmail = normalizeFoundationUserEmail(email)
  const known = getAuthUsers().find(user => normalizeFoundationUserEmail(user.email) === normalizedEmail)
  return normalizeFoundationUserRole(known?.role)
}

export function getFoundationUserRole(user = {}) {
  return normalizeFoundationUserRole(user.role || user.metadata?.role) ||
    inferRoleFromKnownAuthUsers(user.email) ||
    'ops'
}

export function normalizeFoundationUserTier(value, role = '') {
  const numeric = Number(value)
  if (FOUNDATION_USER_TIERS.includes(numeric)) return numeric
  if (role === 'owner') return 1
  if (role === 'sales' || role === 'ops') return 3
  return null
}

export function getFoundationUserPasswordHash(user = {}) {
  return String(user.metadata?.auth?.passwordHash || user.metadata?.passwordHash || '').trim()
}

export function buildRuntimeAuthUsersFromFoundationUsers(users = []) {
  return (users || [])
    .filter(user => user && user.active !== false && user.userType !== 'system')
    .map(user => {
      const role = getFoundationUserRole(user)
      return {
        email: normalizeFoundationUserEmail(user.email),
        name: String(user.name || user.email || '').trim(),
        role,
        passwordHash: getFoundationUserPasswordHash(user),
        active: true,
      }
    })
    .filter(user => user.email && user.name && user.role)
}

export function buildFoundationUserAdminSnapshot({
  users = [],
  changeEvents = [],
  authUsers = getAuthUsers(),
  googleConfigured = Boolean(getGoogleClientId()),
  generatedAt = new Date().toISOString(),
} = {}) {
  const authByEmail = new Map((authUsers || []).map(user => [normalizeFoundationUserEmail(user.email), user]))
  const rows = (users || []).map(user => {
    const email = normalizeFoundationUserEmail(user.email)
    const role = getFoundationUserRole(user)
    const authUser = authByEmail.get(email) || null
    const passwordFallbackEnabled = Boolean(getFoundationUserPasswordHash(user) || authUser?.passwordHash || authUser?.password)
    const googleLoginEnabled = user.active !== false && user.userType !== 'system' && Boolean(role)
    return {
      email,
      name: user.name || email,
      role,
      tier: normalizeFoundationUserTier(user.tier, role),
      userType: user.userType || user.user_type || 'human',
      active: user.active !== false,
      meetingSyncEnabled: Boolean(user.meetingSyncEnabled || user.meeting_sync_enabled),
      loginMethods: {
        google: {
          enabled: googleLoginEnabled,
          configured: googleConfigured,
          status: googleConfigured && googleLoginEnabled ? 'ready' : googleLoginEnabled ? 'not_configured' : 'disabled',
        },
        passwordFallback: {
          enabled: passwordFallbackEnabled,
          status: passwordFallbackEnabled ? 'ready' : 'not_set',
        },
      },
      createdAt: user.createdAt || user.created_at || null,
      updatedAt: user.updatedAt || user.updated_at || null,
      metadata: {
        accessReason: user.metadata?.accessReason || '',
        proof: user.metadata?.proof === true,
      },
    }
  })

  const auditTrail = (changeEvents || [])
    .filter(event => event && event.entityTable === 'users')
    .map(event => ({
      id: event.id || null,
      eventType: event.eventType || event.event_type || '',
      entityId: event.entityId || event.entity_id || '',
      actor: event.actor || '',
      summary: event.summary || '',
      createdAt: event.createdAt || event.created_at || null,
      metadata: {
        action: event.metadata?.action || '',
        role: event.metadata?.role || '',
        active: event.metadata?.active,
        passwordFallbackChanged: event.metadata?.passwordFallbackChanged === true,
      },
    }))

  const activeHumans = rows.filter(row => row.active && row.userType === 'human')
  return {
    status: 'healthy',
    generatedAt,
    cardId: FOUNDATION_USERS_CARD_ID,
    summary: {
      userCount: rows.length,
      activeHumanCount: activeHumans.length,
      disabledCount: rows.filter(row => !row.active).length,
      systemUserCount: rows.filter(row => row.userType === 'system').length,
      googleLoginReadyCount: rows.filter(row => row.loginMethods.google.status === 'ready').length,
      passwordFallbackCount: rows.filter(row => row.loginMethods.passwordFallback.enabled).length,
      auditEventCount: auditTrail.length,
    },
    users: rows,
    auditTrail,
    policies: [
      'Owner-only route access is required for listing or mutating Foundation users.',
      'Password hashes and secret material are never returned to the browser.',
      'Google login is allow-list based: active DB users with a role are eligible once Google login is configured.',
      'Disable is soft-delete only; audit trail stays in change_events.',
    ],
  }
}

export function validateFoundationUserInput(input = {}, { partial = false } = {}) {
  const errors = {}
  const email = normalizeFoundationUserEmail(input.email)
  if (!partial || email) {
    if (!email || !EMAIL_PATTERN.test(email)) errors.email = 'Valid email is required.'
  }

  const name = String(input.name || '').trim()
  if (!partial || name) {
    if (!name) errors.name = 'Name is required.'
    else if (name.length > 120) errors.name = 'Name must be 120 characters or fewer.'
  }

  const role = normalizeFoundationUserRole(input.role)
  if (!partial || input.role !== undefined) {
    if (!role) errors.role = `Role must be one of ${FOUNDATION_USER_ROLES.join(', ')}.`
  }

  const userType = String(input.userType || input.user_type || 'human').trim().toLowerCase()
  if (!FOUNDATION_USER_TYPES.includes(userType)) errors.userType = `User type must be one of ${FOUNDATION_USER_TYPES.join(', ')}.`

  const tier = input.tier === null || input.tier === undefined || input.tier === ''
    ? normalizeFoundationUserTier(null, role)
    : Number(input.tier)
  if (tier !== null && !FOUNDATION_USER_TIERS.includes(tier)) errors.tier = 'Tier must be 1, 2, or 3.'

  const password = String(input.password || input.newPassword || '').trim()
  if (password && password.length < 12) errors.password = 'Password fallback must be at least 12 characters.'

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: {
      email,
      name,
      role,
      tier,
      userType,
      active: input.active === undefined ? true : input.active !== false,
      meetingSyncEnabled: input.meetingSyncEnabled === true || input.meeting_sync_enabled === true,
      password,
      accessReason: String(input.accessReason || '').trim(),
    },
  }
}

async function recordFoundationUserChange(client, {
  email,
  actor,
  action,
  role,
  active,
  passwordFallbackChanged = false,
}) {
  await client.query(
    `
      INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
      VALUES ($1, 'users', $2, $3, $4, $5::jsonb)
    `,
    [
      FOUNDATION_USER_ACCESS_EVENT_TYPE,
      email,
      actor,
      `Foundation user ${action}: ${email}`,
      JSON.stringify({ action, role, active, passwordFallbackChanged }),
    ],
  )
}

export async function upsertFoundationUserAccess(input = {}, actor = 'system') {
  const validation = validateFoundationUserInput(input)
  if (!validation.ok) {
    const error = new Error('Foundation user input is invalid.')
    error.details = validation.errors
    throw error
  }
  const value = validation.value
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const existingResult = await client.query('SELECT metadata FROM users WHERE email = $1', [value.email])
    const existingMetadata = existingResult.rows[0]?.metadata || {}
    const authMetadata = {
      ...(existingMetadata.auth || {}),
    }
    if (value.password) authMetadata.passwordHash = hashPassword(value.password)
    const metadata = {
      ...existingMetadata,
      role: value.role,
      accessReason: value.accessReason || existingMetadata.accessReason || '',
      auth: authMetadata,
    }
    const result = await client.query(
      `
        INSERT INTO users (email, name, tier, user_type, active, meeting_sync_enabled, metadata)
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
        ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name,
            tier = EXCLUDED.tier,
            user_type = EXCLUDED.user_type,
            active = EXCLUDED.active,
            meeting_sync_enabled = EXCLUDED.meeting_sync_enabled,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
        RETURNING email, name, tier, user_type, active, meeting_sync_enabled, metadata, created_at, updated_at
      `,
      [
        value.email,
        value.name,
        value.tier,
        value.userType,
        value.active,
        value.meetingSyncEnabled,
        JSON.stringify(metadata),
      ],
    )
    await recordFoundationUserChange(client, {
      email: value.email,
      actor,
      action: existingResult.rows[0] ? 'updated' : 'created',
      role: value.role,
      active: value.active,
      passwordFallbackChanged: Boolean(value.password),
    })
    await client.query('COMMIT')
    return result.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

export async function updateFoundationUserAccess(email, input = {}, actor = 'system') {
  const normalizedEmail = normalizeFoundationUserEmail(email || input.email)
  if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
    const error = new Error('Valid email is required.')
    error.details = { email: 'Valid email is required.' }
    throw error
  }
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const existing = await client.query('SELECT * FROM users WHERE email = $1 FOR UPDATE', [normalizedEmail])
    if (!existing.rows[0]) {
      const error = new Error(`Foundation user not found: ${normalizedEmail}`)
      error.code = 'foundation_user_not_found'
      throw error
    }
    const row = existing.rows[0]
    const current = {
      email: row.email,
      name: row.name,
      role: row.metadata?.role,
      tier: row.tier,
      userType: row.user_type,
      active: row.active,
      meetingSyncEnabled: row.meeting_sync_enabled,
      metadata: row.metadata || {},
    }
    const merged = {
      ...current,
      ...input,
      email: normalizedEmail,
      role: input.role === undefined ? getFoundationUserRole(current) : input.role,
      userType: input.userType === undefined ? current.userType : input.userType,
    }
    const validation = validateFoundationUserInput(merged)
    if (!validation.ok) {
      const error = new Error('Foundation user input is invalid.')
      error.details = validation.errors
      throw error
    }
    const value = validation.value
    const metadata = {
      ...(row.metadata || {}),
      role: value.role,
      accessReason: value.accessReason || row.metadata?.accessReason || '',
      auth: {
        ...(row.metadata?.auth || {}),
      },
    }
    if (value.password) metadata.auth.passwordHash = hashPassword(value.password)
    const result = await client.query(
      `
        UPDATE users
        SET name = $2,
            tier = $3,
            user_type = $4,
            active = $5,
            meeting_sync_enabled = $6,
            metadata = $7::jsonb,
            updated_at = NOW()
        WHERE email = $1
        RETURNING email, name, tier, user_type, active, meeting_sync_enabled, metadata, created_at, updated_at
      `,
      [normalizedEmail, value.name, value.tier, value.userType, value.active, value.meetingSyncEnabled, JSON.stringify(metadata)],
    )
    await recordFoundationUserChange(client, {
      email: normalizedEmail,
      actor,
      action: value.active ? 'updated' : 'disabled',
      role: value.role,
      active: value.active,
      passwordFallbackChanged: Boolean(value.password),
    })
    await client.query('COMMIT')
    return result.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

export function buildFoundationUsersDogfoodProof() {
  const users = [
    {
      email: 'steve.zahnd@bensoncrew.ca',
      name: 'Steve',
      tier: 1,
      userType: 'human',
      active: true,
      meetingSyncEnabled: true,
      metadata: { role: 'owner', auth: { passwordHash: 'secret-hash' } },
    },
    {
      email: 'disabled@example.com',
      name: 'Disabled',
      tier: 3,
      userType: 'human',
      active: false,
      metadata: { role: 'sales', auth: { passwordHash: 'hidden' } },
    },
  ]
  const snapshot = buildFoundationUserAdminSnapshot({
    users,
    changeEvents: [
      {
        id: 1,
        eventType: FOUNDATION_USER_ACCESS_EVENT_TYPE,
        entityTable: 'users',
        entityId: 'steve.zahnd@bensoncrew.ca',
        actor: 'proof',
        summary: 'Foundation user updated: steve.zahnd@bensoncrew.ca',
        metadata: { action: 'updated', role: 'owner', active: true, passwordFallbackChanged: true },
        createdAt: '2026-05-20T00:00:00.000Z',
      },
    ],
    googleConfigured: true,
  })
  const serialized = JSON.stringify(snapshot)
  const validInput = validateFoundationUserInput({
    email: 'new.user@example.com',
    name: 'New User',
    role: 'ops',
    password: 'long-enough-password',
  })
  const invalidRole = validateFoundationUserInput({
    email: 'new.user@example.com',
    name: 'New User',
    role: 'admin',
  })
  return {
    ok: snapshot.summary.userCount === 2 &&
      snapshot.summary.passwordFallbackCount === 2 &&
      snapshot.auditTrail.length === 1 &&
      !serialized.includes('secret-hash') &&
      !serialized.includes('hidden') &&
      validInput.ok &&
      !invalidRole.ok,
    hashHidden: !serialized.includes('secret-hash') && !serialized.includes('hidden'),
    invalidRoleRejected: !invalidRole.ok,
    validInputAccepted: validInput.ok,
    summary: snapshot.summary,
  }
}
