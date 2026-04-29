import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_CACHE_FILE = path.join(PROJECT_ROOT, 'store', 'google-sheets-cache.json');
const DEFAULT_TTL_MS = 30_000;
const DEFAULT_USER_QUOTA_PER_MINUTE = 60;
const MAX_RECENT_EVENTS = 50;

let loadedState = null;

function envFlagEnabled(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function numberFromEnv(value, fallback) {
  if (String(value || '').trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function getConfig() {
  const ttlSeconds = numberFromEnv(process.env.GOOGLE_SHEETS_CACHE_TTL_SECONDS, null);
  const ttlMs =
    ttlSeconds === null
      ? numberFromEnv(process.env.GOOGLE_SHEETS_CACHE_TTL_MS, DEFAULT_TTL_MS)
      : Math.round(ttlSeconds * 1000);

  return {
    enabled: !envFlagEnabled(process.env.GOOGLE_SHEETS_CACHE_DISABLED),
    ttlMs,
    cacheFile: process.env.GOOGLE_SHEETS_CACHE_FILE || DEFAULT_CACHE_FILE,
    userQuotaPerMinute: numberFromEnv(
      process.env.GOOGLE_SHEETS_USER_QUOTA_PER_MINUTE,
      DEFAULT_USER_QUOTA_PER_MINUTE,
    ),
  };
}

function emptyState() {
  return {
    version: 1,
    updatedAt: new Date(0).toISOString(),
    stats: {
      hits: 0,
      misses: 0,
      writes: 0,
      bypasses: 0,
      errors: 0,
      quota429Count: 0,
      last429At: null,
      recentLiveReads: [],
      recentQuotaEvents: [],
    },
    entries: {},
  };
}

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function pruneRecent(events) {
  return (Array.isArray(events) ? events : []).slice(-MAX_RECENT_EVENTS);
}

function normalizeState(state) {
  const normalized = {
    ...emptyState(),
    ...(state && typeof state === 'object' ? state : {}),
  };
  normalized.stats = {
    ...emptyState().stats,
    ...(normalized.stats && typeof normalized.stats === 'object' ? normalized.stats : {}),
  };
  normalized.stats.recentLiveReads = pruneRecent(normalized.stats.recentLiveReads);
  normalized.stats.recentQuotaEvents = pruneRecent(normalized.stats.recentQuotaEvents);
  normalized.entries =
    normalized.entries && typeof normalized.entries === 'object' && !Array.isArray(normalized.entries)
      ? normalized.entries
      : {};
  return normalized;
}

async function loadState({ force = false } = {}) {
  if (loadedState && !force) return loadedState;

  const { cacheFile } = getConfig();
  try {
    loadedState = normalizeState(JSON.parse(await readFile(cacheFile, 'utf8')));
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      loadedState = emptyState();
      loadedState.stats.errors += 1;
      loadedState.stats.recentQuotaEvents.push({
        at: new Date().toISOString(),
        type: 'cache_file_read_error',
        message: `Sheets cache file could not be read: ${error.message}`,
      });
      return loadedState;
    }
    loadedState = emptyState();
  }

  return loadedState;
}

async function persistState(state) {
  const { cacheFile } = getConfig();
  pruneExpiredEntries(state);
  state.updatedAt = new Date().toISOString();
  await mkdir(path.dirname(cacheFile), { recursive: true });
  const tempFile = `${cacheFile}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  await rename(tempFile, cacheFile);
}

async function safePersistState(state) {
  try {
    await persistState(state);
  } catch (error) {
    state.stats.errors += 1;
    state.stats.recentQuotaEvents = pruneRecent([
      ...state.stats.recentQuotaEvents,
      {
        at: new Date().toISOString(),
        type: 'cache_file_write_error',
        message: `Sheets cache file could not be written: ${error.message}`,
      },
    ]);
  }
}

function pruneExpiredEntries(state) {
  const now = Date.now();
  for (const [key, entry] of Object.entries(state.entries || {})) {
    const expiresAt = Date.parse(entry?.expiresAt || '');
    if (Number.isFinite(expiresAt) && expiresAt <= now) delete state.entries[key];
  }
}

function recordLiveRead(state, { operation, userEmail, spreadsheetId, ranges = [] }) {
  state.stats.recentLiveReads = pruneRecent([
    ...state.stats.recentLiveReads,
    {
      at: new Date().toISOString(),
      operation,
      userEmail: userEmail || 'service-account',
      spreadsheetId,
      ranges,
    },
  ]);
}

function recordQuotaEvent(state, { operation, userEmail, spreadsheetId, ranges = [], error }) {
  const message = String(error?.message || error || '');
  const is429 = /\b429\b/.test(message);

  state.stats.errors += 1;
  if (is429) {
    state.stats.quota429Count += 1;
    state.stats.last429At = new Date().toISOString();
  }

  state.stats.recentQuotaEvents = pruneRecent([
    ...state.stats.recentQuotaEvents,
    {
      at: new Date().toISOString(),
      type: is429 ? 'google_sheets_429' : 'google_sheets_read_error',
      operation,
      userEmail: userEmail || 'service-account',
      spreadsheetId,
      ranges,
      message: message.slice(0, 300),
    },
  ]);
}

function liveReadsLastMinute(state) {
  const now = Date.now();
  return (state.stats.recentLiveReads || []).filter(event => {
    const at = Date.parse(event.at);
    return Number.isFinite(at) && now - at <= 60_000;
  }).length;
}

function quotaRiskFor(state, config) {
  const reads = liveReadsLastMinute(state);
  const limit = Math.max(1, Number(config.userQuotaPerMinute) || DEFAULT_USER_QUOTA_PER_MINUTE);
  if (reads >= Math.floor(limit * 0.9)) return 'high';
  if (reads >= Math.floor(limit * 0.75)) return 'watch';
  return 'healthy';
}

export function buildGoogleSheetsCacheKey(parts) {
  return JSON.stringify({
    userEmail: parts.userEmail || 'service-account',
    operation: parts.operation,
    spreadsheetId: parts.spreadsheetId,
    ranges: parts.ranges || [],
    fields: parts.fields || '',
    params: parts.params || {},
  });
}

export async function readGoogleSheetsCachedJson({
  cacheKey,
  operation,
  userEmail,
  spreadsheetId,
  ranges = [],
  fetcher,
}) {
  const config = getConfig();
  const state = await loadState();
  const now = Date.now();

  if (!config.enabled || config.ttlMs === 0) {
    state.stats.bypasses += 1;
    recordLiveRead(state, { operation, userEmail, spreadsheetId, ranges });
    await safePersistState(state);
    try {
      return await fetcher();
    } catch (error) {
      recordQuotaEvent(state, { operation, userEmail, spreadsheetId, ranges, error });
      await safePersistState(state);
      throw error;
    }
  }

  const existing = state.entries[cacheKey];
  if (existing?.expiresAt && Date.parse(existing.expiresAt) > now) {
    state.stats.hits += 1;
    await safePersistState(state);
    return cloneJson(existing.value);
  }

  state.stats.misses += 1;
  recordLiveRead(state, { operation, userEmail, spreadsheetId, ranges });
  await safePersistState(state);

  let value;
  try {
    value = await fetcher();
  } catch (error) {
    recordQuotaEvent(state, { operation, userEmail, spreadsheetId, ranges, error });
    await safePersistState(state);
    throw error;
  }

  state.entries[cacheKey] = {
    operation,
    spreadsheetId,
    ranges,
    storedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + config.ttlMs).toISOString(),
    value: cloneJson(value),
  };
  state.stats.writes += 1;
  await safePersistState(state);

  return cloneJson(value);
}

export async function getGoogleSheetsCacheStats() {
  const config = getConfig();
  const state = await loadState({ force: true });
  const entryCount = Object.keys(state.entries || {}).length;
  const now = Date.now();
  const expiredEntryCount = Object.values(state.entries || {}).filter(entry => {
    const expiresAt = Date.parse(entry?.expiresAt || '');
    return Number.isFinite(expiresAt) && expiresAt <= now;
  }).length;

  return {
    enabled: config.enabled && config.ttlMs > 0,
    ttlMs: config.ttlMs,
    cacheFile: config.cacheFile,
    userQuotaPerMinute: config.userQuotaPerMinute,
    entryCount,
    expiredEntryCount,
    hits: state.stats.hits,
    misses: state.stats.misses,
    writes: state.stats.writes,
    bypasses: state.stats.bypasses,
    errors: state.stats.errors,
    quota429Count: state.stats.quota429Count,
    last429At: state.stats.last429At,
    liveReadsLastMinute: liveReadsLastMinute(state),
    quotaRisk: quotaRiskFor(state, config),
    recentQuotaEvents: pruneRecent(state.stats.recentQuotaEvents).slice(-10),
  };
}
