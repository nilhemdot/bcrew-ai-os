import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')

export const CONNECTOR_CREDENTIAL_CARD_ID = 'CONNECTOR-CREDENTIAL-001'
export const CONNECTOR_CREDENTIAL_CLOSEOUT_KEY = 'connector-credential-v1'
export const CONNECTOR_CREDENTIAL_PLAN_PATH = 'docs/process/connector-credential-001-plan.md'
export const CONNECTOR_CREDENTIAL_APPROVAL_PATH = 'docs/process/approvals/CONNECTOR-CREDENTIAL-001.json'
export const CONNECTOR_CREDENTIAL_SCRIPT_PATH = 'scripts/process-connector-credential-check.mjs'

const DEFAULT_GOOGLE_SERVICE_ACCOUNT_REF = 'store/crewbert-delegation-sa.json'
const DEFAULT_OPENCLAW_CONFIG_REF = '~/.openclaw/openclaw.json'
const DEFAULT_CLAUDE_AUTH_REF = '~/.claude local auth'

function localPath(relativePath) {
  return path.join(PROJECT_ROOT, relativePath)
}

function homePath(relativePath) {
  return path.join(os.homedir(), relativePath)
}

export const CONNECTOR_CREDENTIAL_REQUIRED_KEYS = [
  'fub-api',
  'kpi-supabase',
  'google-delegated-drive',
  'google-delegated-gmail',
  'google-delegated-sheets',
  'clickup-api',
  'slack-api',
  'missive-api',
  'llm-openai-api',
  'llm-openclaw',
  'llm-claude-code',
  'apify-loom-youtube',
  'dataforseo-youtube',
  'myicro-access',
  'skool-access',
  'real-broker',
  'socialpilot',
  'ga4',
  'gsc',
  'gbp',
  'telegram-inbound',
  'whatsapp',
]

export const CONNECTOR_CREDENTIAL_DEFINITIONS = [
  {
    key: 'google-delegated-drive',
    connectorId: 'CONN-GDRIVE-001',
    sourceIds: ['SRC-GDRIVE-001', 'SRC-GDOCS-001', 'SRC-GSLIDES-001', 'SRC-MEETINGS-001'],
    provider: 'google_workspace',
    credentialClass: 'domain_delegated_service_account',
    owner: 'Benson Crew Google Workspace',
    credentialRequirements: [
      {
        key: 'service_account_key_file',
        anyOf: [
          { name: 'GOOGLE_SERVICE_ACCOUNT_KEY_FILE', kind: 'env' },
          { name: DEFAULT_GOOGLE_SERVICE_ACCOUNT_REF, kind: 'local_file', path: localPath(DEFAULT_GOOGLE_SERVICE_ACCOUNT_REF) },
        ],
      },
    ],
    unlockedWorkloads: ['Drive inventory', 'Drive Docs/PDF/text extraction', 'Meeting note archive', 'Google Docs/Slides source typing'],
    lastProbeKind: 'metadata_presence',
    blockerReason: '',
  },
  {
    key: 'google-delegated-gmail',
    connectorId: 'CONN-GMAIL-001',
    sourceIds: ['SRC-GMAIL-001'],
    provider: 'google_workspace',
    credentialClass: 'domain_delegated_service_account',
    owner: 'Benson Crew Google Workspace',
    credentialRequirements: [
      {
        key: 'service_account_key_file',
        anyOf: [
          { name: 'GOOGLE_SERVICE_ACCOUNT_KEY_FILE', kind: 'env' },
          { name: DEFAULT_GOOGLE_SERVICE_ACCOUNT_REF, kind: 'local_file', path: localPath(DEFAULT_GOOGLE_SERVICE_ACCOUNT_REF) },
        ],
      },
    ],
    unlockedWorkloads: ['Gmail shared-communications sync', 'Gmail attachment extraction', 'Agent Feedback Gmail send path'],
    lastProbeKind: 'metadata_presence',
    blockerReason: '',
  },
  {
    key: 'google-delegated-sheets',
    connectorId: 'CONN-GSHEETS-001',
    sourceIds: ['SRC-GSHEETS-001', 'SRC-OWNERS-001', 'SRC-OWNERS-LISTS-001', 'SRC-FINANCE-001'],
    provider: 'google_workspace',
    credentialClass: 'domain_delegated_service_account',
    owner: 'Benson Crew Google Workspace',
    credentialRequirements: [
      {
        key: 'service_account_key_file',
        anyOf: [
          { name: 'GOOGLE_SERVICE_ACCOUNT_KEY_FILE', kind: 'env' },
          { name: DEFAULT_GOOGLE_SERVICE_ACCOUNT_REF, kind: 'local_file', path: localPath(DEFAULT_GOOGLE_SERVICE_ACCOUNT_REF) },
        ],
      },
    ],
    unlockedWorkloads: ['Owners Dashboard reads', 'Freedom Sheet reads', 'KPI/list tab verification', 'governed Sheets repair guards'],
    lastProbeKind: 'metadata_presence',
    blockerReason: '',
  },
  {
    key: 'google-delegated-calendar',
    connectorId: 'CONN-GCAL-001',
    sourceIds: ['SRC-GCAL-001'],
    provider: 'google_workspace',
    credentialClass: 'domain_delegated_service_account',
    owner: 'Benson Crew Google Workspace',
    credentialRequirements: [
      {
        key: 'service_account_key_file',
        anyOf: [
          { name: 'GOOGLE_SERVICE_ACCOUNT_KEY_FILE', kind: 'env' },
          { name: DEFAULT_GOOGLE_SERVICE_ACCOUNT_REF, kind: 'local_file', path: localPath(DEFAULT_GOOGLE_SERVICE_ACCOUNT_REF) },
        ],
      },
    ],
    unlockedWorkloads: ['Calendar/event reads', 'meeting cadence context', 'scheduled calendar-current-day archive'],
    lastProbeKind: 'metadata_presence',
    blocksConnectorHealth: false,
    blockerReason: '',
    readinessNote: 'Calendar is scheduled through the read-only calendar-current-day source lane; Calendar writes, invites, RSVP handling, and candidate extraction remain out of scope.',
  },
  {
    key: 'fub-api',
    connectorId: 'CONN-FUB-001',
    sourceIds: ['SRC-FUB-001'],
    provider: 'follow_up_boss',
    credentialClass: 'registered_system_header_api',
    owner: 'Benson Crew / FUB admin',
    credentialRequirements: [
      { key: 'system_name', anyOf: [{ name: 'FUB_SYSTEM_NAME', kind: 'env' }] },
      { key: 'system_key', anyOf: [{ name: 'FUB_SYSTEM_KEY', kind: 'env' }] },
    ],
    unlockedWorkloads: ['FUB person reads', 'lead-source parity', 'admin-gated write path when separately approved'],
    lastProbeKind: 'env_presence',
    blockerReason: '',
  },
  {
    key: 'kpi-supabase',
    connectorId: 'CONN-SUPABASE-001',
    sourceIds: ['SRC-SUPABASE-001'],
    provider: 'supabase',
    credentialClass: 'service_role_or_anon_key',
    owner: 'Benson Crew / KPI Supabase',
    credentialRequirements: [
      { key: 'project_url', anyOf: [{ name: 'SUPABASE_URL', kind: 'env' }, { name: 'KPI_SUPABASE_URL', kind: 'env' }] },
      {
        key: 'api_key',
        anyOf: [
          { name: 'SUPABASE_SERVICE_ROLE_KEY', kind: 'env' },
          { name: 'KPI_SUPABASE_SERVICE_ROLE_KEY', kind: 'env' },
          { name: 'SUPABASE_ANON_KEY', kind: 'env' },
          { name: 'KPI_SUPABASE_ANON_KEY', kind: 'env' },
        ],
      },
    ],
    unlockedWorkloads: ['KPI health', 'sales/KPI reads', 'source-backed operating truth'],
    lastProbeKind: 'env_presence',
    blockerReason: '',
  },
  {
    key: 'clickup-api',
    connectorId: 'CONN-CLICKUP-001',
    sourceIds: ['SRC-CLICKUP-001'],
    provider: 'clickup',
    credentialClass: 'personal_token_or_mcp_env',
    owner: 'Benson Crew ClickUp admin',
    credentialRequirements: [
      {
        key: 'api_token',
        anyOf: [
          { name: 'CLICKUP_PERSONAL_TOKEN', kind: 'env' },
          { name: '.mcp.json clickup env CLICKUP_PERSONAL_TOKEN', kind: 'mcp_env', server: 'clickup', envName: 'CLICKUP_PERSONAL_TOKEN' },
        ],
      },
    ],
    unlockedWorkloads: ['Ops review tasks', 'Agent Roster reads', 'Deal Data Entry reads', 'approved writebacks'],
    lastProbeKind: 'env_or_mcp_presence',
    blockerReason: '',
  },
  {
    key: 'slack-api',
    connectorId: 'CONN-SLACK-001',
    sourceIds: ['SRC-SLACK-001'],
    provider: 'slack',
    credentialClass: 'bot_token',
    owner: 'Benson Crew Slack workspace',
    credentialRequirements: [
      { key: 'bot_token', anyOf: [{ name: 'SLACK_BOT_TOKEN', kind: 'env' }] },
    ],
    unlockedWorkloads: ['Slack archive sync', 'Slack candidate extraction', 'future governed team notifications'],
    lastProbeKind: 'env_presence',
    blockerReason: '',
  },
  {
    key: 'missive-api',
    connectorId: 'CONN-MISSIVE-001',
    sourceIds: ['SRC-MISSIVE-001'],
    provider: 'missive',
    credentialClass: 'api_token',
    owner: 'Benson Crew shared inbox',
    credentialRequirements: [
      { key: 'api_token', anyOf: [{ name: 'MISSIVE_API_TOKEN', kind: 'env' }] },
    ],
    unlockedWorkloads: ['Missive archive sync', 'Missive candidate extraction', 'future shared inbox routing'],
    lastProbeKind: 'env_presence',
    blockerReason: '',
  },
  {
    key: 'ghl-api',
    connectorId: 'CONN-GHL-001',
    sourceIds: ['SRC-GHL-001'],
    provider: 'gohighlevel',
    credentialClass: 'api_key_or_location_token',
    owner: 'Benson Crew / MarketMasters',
    credentialRequirements: [
      {
        key: 'api_key',
        anyOf: [
          { name: 'GHL_API_KEY', kind: 'env' },
          { name: 'GOHIGHLEVEL_API_KEY', kind: 'env' },
        ],
      },
    ],
    unlockedWorkloads: ['GHL contact reads', 'pipeline reads'],
    lastProbeKind: 'env_presence',
    blockerReason: 'Readable connector exists, but marketing/source boundaries are not signed off for broad extraction.',
  },
  {
    key: 'google-ads',
    connectorId: 'CONN-GADS-001',
    sourceIds: ['SRC-GADS-001'],
    provider: 'google_ads',
    credentialClass: 'oauth_refresh_token',
    owner: 'Benson Crew / MarketMasters ads account',
    credentialRequirements: [
      { key: 'developer_token', anyOf: [{ name: 'GOOGLE_ADS_DEVELOPER_TOKEN', kind: 'env' }] },
      { key: 'client_id', anyOf: [{ name: 'GOOGLE_ADS_CLIENT_ID', kind: 'env' }] },
      { key: 'client_secret_ref', anyOf: [{ name: 'GOOGLE_ADS_CLIENT_SECRET', kind: 'env' }] },
      { key: 'refresh_token_ref', anyOf: [{ name: 'GOOGLE_ADS_REFRESH_TOKEN', kind: 'env' }] },
    ],
    unlockedWorkloads: ['paid search account reads', 'MCC performance reads'],
    lastProbeKind: 'known_blocker',
    blockerReason: 'OAuth invalid_grant / re-auth required before use.',
  },
  {
    key: 'meta-api',
    connectorId: 'CONN-META-001',
    sourceIds: ['SRC-META-001'],
    provider: 'meta',
    credentialClass: 'graph_api_access_token',
    owner: 'Benson Crew / MarketMasters social accounts',
    credentialRequirements: [
      { key: 'access_token', anyOf: [{ name: 'META_ACCESS_TOKEN', kind: 'env' }] },
    ],
    unlockedWorkloads: ['Instagram/Facebook metrics reads'],
    lastProbeKind: 'env_presence',
    blockerReason: 'Readable connector exists, but marketing/source boundaries are not signed off for broad extraction.',
  },
  {
    key: 'socialpilot',
    connectorId: 'CONN-SOCIALPILOT-001',
    sourceIds: ['SRC-PUBLISH-001'],
    provider: 'socialpilot',
    credentialClass: 'enterprise_api_key_candidate',
    owner: 'Steve / SocialPilot owner account',
    credentialRequirements: [
      { key: 'api_key', anyOf: [{ name: 'SOCIALPILOT_API_KEY', kind: 'env' }] },
    ],
    unlockedWorkloads: ['publishing queue/account context after owner validation'],
    lastProbeKind: 'known_blocker',
    blockerReason: 'Enterprise API key exists as a candidate, but owner/user auth context is not validated.',
  },
  {
    key: 'ga4',
    connectorId: 'CONN-GA4-001',
    sourceIds: ['SRC-GA4-001'],
    provider: 'google_analytics',
    credentialClass: 'analytics_property_and_google_auth',
    owner: 'Benson Crew / MarketMasters analytics owner',
    credentialRequirements: [
      { key: 'property_id', anyOf: [{ name: 'GA4_PROPERTY_ID', kind: 'env' }, { name: 'GOOGLE_ANALYTICS_PROPERTY_ID', kind: 'env' }] },
      {
        key: 'google_auth_ref',
        anyOf: [
          { name: 'GOOGLE_SERVICE_ACCOUNT_KEY_FILE', kind: 'env' },
          { name: DEFAULT_GOOGLE_SERVICE_ACCOUNT_REF, kind: 'local_file', path: localPath(DEFAULT_GOOGLE_SERVICE_ACCOUNT_REF) },
        ],
      },
    ],
    unlockedWorkloads: ['GA4 traffic/conversion reads'],
    lastProbeKind: 'env_presence',
    blockerReason: 'Source contract and extraction target are not built in the new system yet.',
  },
  {
    key: 'gsc',
    connectorId: 'CONN-GSC-001',
    sourceIds: ['SRC-GSC-001'],
    provider: 'google_search_console',
    credentialClass: 'site_property_and_google_auth',
    owner: 'Benson Crew / MarketMasters SEO owner',
    credentialRequirements: [
      { key: 'site_url', anyOf: [{ name: 'GSC_SITE_URL', kind: 'env' }, { name: 'GOOGLE_SEARCH_CONSOLE_SITE_URL', kind: 'env' }] },
      {
        key: 'google_auth_ref',
        anyOf: [
          { name: 'GOOGLE_SERVICE_ACCOUNT_KEY_FILE', kind: 'env' },
          { name: DEFAULT_GOOGLE_SERVICE_ACCOUNT_REF, kind: 'local_file', path: localPath(DEFAULT_GOOGLE_SERVICE_ACCOUNT_REF) },
        ],
      },
    ],
    unlockedWorkloads: ['Search Console SEO query/page reads'],
    lastProbeKind: 'env_presence',
    blockerReason: 'Source contract and extraction target are not built in the new system yet.',
  },
  {
    key: 'gbp',
    connectorId: 'CONN-GBP-001',
    sourceIds: ['SRC-GBP-001'],
    provider: 'google_business_profile',
    credentialClass: 'business_profile_account_and_google_auth',
    owner: 'Benson Crew / Zahnd Team Ag local profile owner',
    credentialRequirements: [
      { key: 'account_or_location', anyOf: [{ name: 'GBP_ACCOUNT_ID', kind: 'env' }, { name: 'GOOGLE_BUSINESS_PROFILE_LOCATION_ID', kind: 'env' }] },
      {
        key: 'google_auth_ref',
        anyOf: [
          { name: 'GOOGLE_SERVICE_ACCOUNT_KEY_FILE', kind: 'env' },
          { name: DEFAULT_GOOGLE_SERVICE_ACCOUNT_REF, kind: 'local_file', path: localPath(DEFAULT_GOOGLE_SERVICE_ACCOUNT_REF) },
        ],
      },
    ],
    unlockedWorkloads: ['Google Business Profile reviews/local presence reads'],
    lastProbeKind: 'env_presence',
    blockerReason: 'Source contract and extraction target are not built in the new system yet.',
  },
  {
    key: 'dataforseo-youtube',
    connectorId: 'CONN-DATAFORSEO-001',
    sourceIds: ['SRC-YOUTUBE-INTEL-001'],
    provider: 'dataforseo',
    credentialClass: 'username_password_api',
    owner: 'Benson Crew / video intelligence',
    credentialRequirements: [
      { key: 'username', anyOf: [{ name: 'DATAFORSEO_USERNAME', kind: 'env' }] },
      { key: 'password_ref', anyOf: [{ name: 'DATAFORSEO_PASSWORD', kind: 'env' }] },
    ],
    unlockedWorkloads: ['YouTube subtitle transcript extraction', 'SEO reads'],
    lastProbeKind: 'env_presence',
    blockerReason: '',
  },
  {
    key: 'apify-loom-youtube',
    connectorId: 'CONN-APIFY-001',
    sourceIds: ['SRC-LOOM-001', 'SRC-YOUTUBE-INTEL-001', 'SRC-ZOOM-001'],
    provider: 'apify_browser_workers',
    credentialClass: 'api_token_candidate',
    owner: 'Benson Crew / media extraction',
    credentialRequirements: [
      { key: 'api_token', anyOf: [{ name: 'APIFY_TOKEN', kind: 'env' }] },
    ],
    unlockedWorkloads: ['candidate Loom/video/browser extraction probes after source approval'],
    lastProbeKind: 'candidate_env_presence',
    blockerReason: 'Candidate class only. Loom/Zoom/broad video extraction is not approved in this sprint.',
  },
  {
    key: 'myicro-access',
    connectorId: 'CONN-MYICRO-001',
    sourceIds: ['SRC-MYICRO-001'],
    provider: 'myicro',
    credentialClass: 'authorized_browser_session_future',
    owner: 'Steve / Mycro-myICOR paid training account',
    credentialRequirements: [
      { key: 'authorized_profile', anyOf: [{ name: 'MYICRO_AUTHORIZED_BROWSER_PROFILE', kind: 'env' }, { name: 'MYICOR_AUTHORIZED_BROWSER_PROFILE', kind: 'env' }] },
    ],
    unlockedWorkloads: ['paid training course reads after governed browser-session approval'],
    lastProbeKind: 'known_blocker',
    blockerReason: 'Logged-in paid-app extraction is not connected and is not approved in this sprint.',
  },
  {
    key: 'skool-access',
    connectorId: 'CONN-SKOOL-001',
    sourceIds: ['SRC-SKOOL-001'],
    provider: 'skool',
    credentialClass: 'authorized_browser_session_future',
    owner: 'Steve / Skool paid communities',
    credentialRequirements: [
      { key: 'authorized_profile', anyOf: [{ name: 'SKOOL_AUTHORIZED_BROWSER_PROFILE', kind: 'env' }] },
    ],
    unlockedWorkloads: ['paid community/course reads after policy matrix approval'],
    lastProbeKind: 'known_blocker',
    blockerReason: 'Access, policy, and earlyaidopters paid-community permissions need explicit matrix proof.',
  },
  {
    key: 'real-broker',
    connectorId: 'CONN-REAL-001',
    sourceIds: ['SRC-REAL-001'],
    provider: 'real_broker',
    credentialClass: 'api_or_authorized_session_future',
    owner: 'Steve / Real Broker account',
    credentialRequirements: [
      { key: 'api_or_session_ref', anyOf: [{ name: 'REAL_BROKER_API_KEY', kind: 'env' }, { name: 'REAL_BROKER_AUTHORIZED_SESSION', kind: 'env' }] },
    ],
    unlockedWorkloads: ['Real Broker network/finance reads after connection'],
    lastProbeKind: 'known_blocker',
    blockerReason: 'Never connected in the new system.',
  },
  {
    key: 'telegram-inbound',
    connectorId: 'CONN-TELEGRAM-IN-001',
    sourceIds: ['SRC-TELEGRAM-IN-001'],
    provider: 'telegram',
    credentialClass: 'bot_or_account_session_candidate',
    owner: 'Steve / Telegram account',
    credentialRequirements: [
      { key: 'bot_token_or_session', anyOf: [{ name: 'TELEGRAM_BOT_TOKEN', kind: 'env' }, { name: 'TELEGRAM_INBOUND_SESSION', kind: 'env' }] },
    ],
    unlockedWorkloads: ['Telegram inbound message capture after source approval'],
    lastProbeKind: 'candidate_env_presence',
    blockerReason: 'Inbound data source is not approved in this sprint; Telegram bots are explicitly not next.',
  },
  {
    key: 'whatsapp',
    connectorId: 'CONN-WHATSAPP-001',
    sourceIds: ['SRC-WHATSAPP-001'],
    provider: 'whatsapp',
    credentialClass: 'business_api_or_authorized_session_candidate',
    owner: 'Steve / WhatsApp account',
    credentialRequirements: [
      { key: 'api_or_session', anyOf: [{ name: 'WHATSAPP_ACCESS_TOKEN', kind: 'env' }, { name: 'WHATSAPP_SESSION', kind: 'env' }] },
    ],
    unlockedWorkloads: ['WhatsApp inbound capture after source approval'],
    lastProbeKind: 'candidate_env_presence',
    blockerReason: 'Inbound data source is not approved in this sprint.',
  },
  {
    key: 'web-external',
    connectorId: 'CONN-WEB-001',
    sourceIds: ['SRC-WEB-001', 'SRC-REDDIT-001', 'SRC-GITHUB-001', 'SRC-TWITTER-001'],
    provider: 'firecrawl_browser',
    credentialClass: 'api_key_or_browser_runtime_candidate',
    owner: 'Benson Crew / external signal research',
    credentialRequirements: [
      { key: 'crawl_api_key', anyOf: [{ name: 'FIRECRAWL_API_KEY', kind: 'env' }, { name: 'BROWSER_USE_RUNTIME', kind: 'env' }] },
    ],
    unlockedWorkloads: ['authorized/public web signal reads after source approval'],
    lastProbeKind: 'candidate_env_presence',
    blockerReason: 'Generic web/source contracts are triage only in this sprint.',
  },
  {
    key: 'llm-openai-api',
    connectorId: 'CONN-LLM-OPENAI-API-001',
    sourceIds: [],
    provider: 'openai',
    credentialClass: 'responses_api_key_fallback',
    owner: 'Benson Crew model routing',
    credentialRequirements: [
      { key: 'api_key', anyOf: [{ name: 'OPENAI_API_KEY', kind: 'env' }] },
    ],
    unlockedWorkloads: ['fallback model calls when explicitly allowed by router policy'],
    lastProbeKind: 'env_presence',
    blockerReason: 'Direct OpenAI API is fallback-only and policy-gated.',
  },
  {
    key: 'llm-openclaw',
    connectorId: 'CONN-LLM-OPENCLAW-001',
    sourceIds: [],
    provider: 'openclaw',
    credentialClass: 'chatgpt_subscription_gateway',
    owner: 'local operator subscription',
    credentialRequirements: [
      { key: 'local_config', anyOf: [{ name: DEFAULT_OPENCLAW_CONFIG_REF, kind: 'local_file', path: homePath('.openclaw/openclaw.json') }] },
    ],
    unlockedWorkloads: ['policy-gated subscription extraction/synthesis'],
    lastProbeKind: 'local_config_presence',
    blockerReason: '',
  },
  {
    key: 'llm-claude-code',
    connectorId: 'CONN-LLM-CLAUDE-CODE-001',
    sourceIds: [],
    provider: 'claude_code',
    credentialClass: 'local_subscription_cli_auth',
    owner: 'local operator subscription',
    credentialRequirements: [
      { key: 'local_auth', anyOf: [{ name: DEFAULT_CLAUDE_AUTH_REF, kind: 'local_file', path: homePath('.claude') }] },
    ],
    unlockedWorkloads: ['manual interactive/agent probes after route audit'],
    lastProbeKind: 'local_config_presence',
    blockerReason: 'Fresh route/auth probe is owned by LLM-AUTH-AUDIT-001 next.',
  },
]

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function mapById(rows = [], field) {
  return new Map(normalizeList(rows).map(row => [row?.[field], row]).filter(([id]) => Boolean(id)))
}

function envPresent(env, name) {
  return Boolean(normalizeText(env?.[name]))
}

function localFilePresent(filePath) {
  try {
    return fs.existsSync(filePath)
  } catch {
    return false
  }
}

function mcpEnvPresent(server, envName) {
  try {
    const raw = fs.readFileSync(path.join(PROJECT_ROOT, '.mcp.json'), 'utf8')
    const parsed = JSON.parse(raw)
    return Boolean(normalizeText(parsed?.mcpServers?.[server]?.env?.[envName]))
  } catch {
    return false
  }
}

function refPresent(ref, env) {
  if (ref.kind === 'env') return envPresent(env, ref.name)
  if (ref.kind === 'local_file') return localFilePresent(ref.path)
  if (ref.kind === 'mcp_env') return mcpEnvPresent(ref.server, ref.envName)
  return false
}

function evaluateRequirement(requirement, env) {
  const refNames = normalizeList(requirement.anyOf).map(ref => ref.name)
  const presentRefs = normalizeList(requirement.anyOf)
    .filter(ref => refPresent(ref, env))
    .map(ref => ref.name)
  return {
    key: requirement.key,
    refNames,
    presentRefNames: presentRefs,
    missingRefNames: refNames.filter(name => !presentRefs.includes(name)),
    present: presentRefs.length > 0,
  }
}

function blocksConnectorHealth(definition) {
  return Boolean(normalizeText(definition.blockerReason)) && definition.blocksConnectorHealth !== false
}

function statusForDefinition(definition, requirements) {
  if (blocksConnectorHealth(definition)) return 'blocked'
  if (!requirements.length) return 'candidate'
  if (requirements.every(requirement => requirement.present)) return 'available'
  return 'missing'
}

function probeStatusForStatus(status) {
  if (status === 'available') return 'passed'
  if (status === 'blocked') return 'blocked'
  if (status === 'missing') return 'missing'
  return 'candidate'
}

function classifySourceContractState(sourceIds, sourceContractMap) {
  const present = sourceIds.filter(sourceId => sourceContractMap.has(sourceId))
  const missing = sourceIds.filter(sourceId => !sourceContractMap.has(sourceId))
  return {
    presentSourceIds: present,
    missingSourceIds: missing,
    anyPresent: present.length > 0,
    allPresent: sourceIds.length > 0 && missing.length === 0,
  }
}

export function buildConnectorCredentialRegistrySnapshot({
  env = process.env,
  now = new Date(),
  sourceContracts = [],
  sourceConnectors = [],
} = {}) {
  const generatedAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString()
  const sourceContractMap = mapById(sourceContracts, 'sourceId')
  const sourceConnectorMap = mapById(sourceConnectors, 'connectorId')

  const rows = CONNECTOR_CREDENTIAL_DEFINITIONS.map(definition => {
    const requirements = normalizeList(definition.credentialRequirements).map(requirement => evaluateRequirement(requirement, env))
    const status = statusForDefinition(definition, requirements)
    const sourceState = classifySourceContractState(normalizeList(definition.sourceIds), sourceContractMap)
    const connectorPresent = sourceConnectorMap.has(definition.connectorId)
    const healthBlocking = blocksConnectorHealth(definition)
    const sourceUnlocked = status === 'available' && (sourceState.anyPresent || !definition.sourceIds?.length) && !healthBlocking
    const credentialRefNames = [...new Set(requirements.flatMap(requirement => requirement.refNames))]
    const presentCredentialRefNames = [...new Set(requirements.flatMap(requirement => requirement.presentRefNames))]
    const missingCredentialRefNames = [...new Set(requirements.flatMap(requirement => requirement.missingRefNames))]

    return {
      key: definition.key,
      connectorId: definition.connectorId,
      sourceIds: normalizeList(definition.sourceIds),
      provider: definition.provider,
      credentialClass: definition.credentialClass,
      owner: definition.owner,
      status,
      lastProbeAt: generatedAt,
      lastProbeKind: definition.lastProbeKind || 'metadata_presence',
      lastProbeStatus: probeStatusForStatus(status),
      connectorRegistryPresent: connectorPresent,
      sourceContractPresent: sourceState.anyPresent,
      presentSourceIds: sourceState.presentSourceIds,
      missingSourceIds: sourceState.missingSourceIds,
      credentialRefNames,
      presentCredentialRefNames,
      missingCredentialRefNames,
      credentialRequirements: requirements,
      sourceUnlocked,
      safeToUse: Boolean(sourceUnlocked),
      blocksConnectorHealth: healthBlocking,
      readinessNote: !healthBlocking ? normalizeText(definition.blockerReason) : '',
      blockerReason: normalizeText(definition.blockerReason),
      unlockedWorkloads: normalizeList(definition.unlockedWorkloads),
    }
  })

  const statusCounts = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1
    return acc
  }, {})
  const coveredConnectorIds = [...new Set(rows.map(row => row.connectorId).filter(Boolean))].sort()
  const coveredSourceIds = [...new Set(rows.flatMap(row => row.sourceIds).filter(Boolean))].sort()

  return {
    generatedAt,
    cardId: CONNECTOR_CREDENTIAL_CARD_ID,
    closeoutKey: CONNECTOR_CREDENTIAL_CLOSEOUT_KEY,
    summary: {
      rowCount: rows.length,
      availableCount: statusCounts.available || 0,
      missingCount: statusCounts.missing || 0,
      blockedCount: statusCounts.blocked || 0,
      candidateCount: statusCounts.candidate || 0,
      sourceUnlockedCount: rows.filter(row => row.sourceUnlocked).length,
      connectorRegistryPresentCount: rows.filter(row => row.connectorRegistryPresent).length,
      coveredConnectorCount: coveredConnectorIds.length,
      coveredSourceCount: coveredSourceIds.length,
      metadataOnly: true,
    },
    coveredConnectorIds,
    coveredSourceIds,
    rows,
  }
}

export function rowsForConnectorMatrixRow(registrySnapshot, matrixRow) {
  const rows = normalizeList(registrySnapshot?.rows)
  return rows.filter(row =>
    row.connectorId === matrixRow.connectorId ||
    normalizeList(row.sourceIds).includes(matrixRow.sourceId)
  )
}

export function summarizeConnectorCredentialsForMatrixRow(registrySnapshot, matrixRow) {
  const rows = rowsForConnectorMatrixRow(registrySnapshot, matrixRow)
  if (!rows.length) {
    return {
      credentialRegistryKeys: [],
      hasCredential: false,
      credentialStatus: 'missing_registry_row',
      credentialLastProbeStatus: 'missing',
      credentialBlockerReason: 'No connector credential registry row maps to this connector/source.',
      sourceUnlockedByCredential: false,
    }
  }

  const sourceUnlockedByCredential = rows.some(row => row.sourceUnlocked)
  const hasAvailable = rows.some(row => row.status === 'available')
  const hasCandidate = rows.some(row => row.status === 'candidate')
  const hasBlocked = rows.some(row => row.status === 'blocked')
  const hasMissing = rows.some(row => row.status === 'missing')
  const credentialStatus = hasAvailable
    ? 'available'
    : hasBlocked
      ? 'blocked'
      : hasCandidate
        ? 'candidate'
        : hasMissing
          ? 'missing'
          : 'unknown'
  const blockerReason = rows.map(row => row.blockerReason).find(Boolean) || ''
  const lastProbeStatus = rows.map(row => row.lastProbeStatus).find(status => status === 'passed') ||
    rows.map(row => row.lastProbeStatus).find(Boolean) ||
    'unknown'

  return {
    credentialRegistryKeys: rows.map(row => row.key),
    hasCredential: hasAvailable,
    credentialStatus,
    credentialLastProbeStatus: lastProbeStatus,
    credentialBlockerReason: blockerReason,
    sourceUnlockedByCredential,
  }
}

export function assertNoConnectorCredentialSecrets(snapshot, forbiddenValues = []) {
  const proofText = JSON.stringify(snapshot)
  const leakedSentinels = forbiddenValues
    .map(value => normalizeText(value))
    .filter(value => value && proofText.includes(value))
  const unsafeFieldNames = []
  const stack = [snapshot]
  while (stack.length) {
    const value = stack.pop()
    if (!value || typeof value !== 'object') continue
    for (const [key, child] of Object.entries(value)) {
      if (/^(value|rawValue|credentialValue|token|password|privateKey)$/i.test(key)) unsafeFieldNames.push(key)
      if (child && typeof child === 'object') stack.push(child)
    }
  }
  return {
    ok: leakedSentinels.length === 0 && unsafeFieldNames.length === 0,
    leakedSentinels,
    unsafeFieldNames,
  }
}
