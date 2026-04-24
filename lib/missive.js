const MISSIVE_BASE_URL = 'https://public.missiveapp.com/v1';
const MISSIVE_MIN_REQUEST_GAP_MS = 200;
const MISSIVE_RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

let lastMissiveRequestAt = 0;
let missiveQueue = Promise.resolve();

function getMissiveToken() {
  const token = process.env.MISSIVE_API_TOKEN || '';
  if (!token) {
    throw new Error('MISSIVE_API_TOKEN is not configured.');
  }
  return token;
}

async function rateLimitMissive() {
  const now = Date.now();
  const elapsed = now - lastMissiveRequestAt;
  if (elapsed < MISSIVE_MIN_REQUEST_GAP_MS) {
    await new Promise(resolve => setTimeout(resolve, MISSIVE_MIN_REQUEST_GAP_MS - elapsed));
  }
  lastMissiveRequestAt = Date.now();
}

async function missiveRequest(pathname, params = {}) {
  const token = getMissiveToken();
  const url = new URL(`${MISSIVE_BASE_URL}${pathname}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const previousRequest = missiveQueue;
  let releaseRequest = () => {};
  missiveQueue = new Promise(resolve => {
    releaseRequest = resolve;
  });

  await previousRequest;

  try {
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await rateLimitMissive();

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (response.ok) {
        if (response.status === 204) return {};
        return response.json();
      }

      const body = await response.text().catch(() => '');
      const retryable = MISSIVE_RETRYABLE_STATUS_CODES.has(response.status);
      if (!retryable || attempt === 4) {
        throw new Error(`Missive API ${pathname} failed: ${response.status} ${response.statusText} -- ${body.slice(0, 300)}`);
      }

      await new Promise(resolve => setTimeout(resolve, 400 * attempt));
    }

    throw new Error(`Missive API ${pathname} retry loop exhausted.`);
  } finally {
    releaseRequest();
  }
}

function stripHtml(value) {
  if (!value) return '';
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatMissiveTimestamp(value) {
  if (!value) return '';
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function normalizeConversation(record) {
  return {
    id: record.id || '',
    subject: record.subject || record.latest_message_subject || '(no subject)',
    messageCount: record.messages_count || 0,
    webUrl: record.web_url || '',
    createdAtUnix: Number(record.created_at || 0) || null,
    lastActivityAt: formatMissiveTimestamp(record.last_activity_at || record.created_at),
    lastActivityAtUnix: Number(record.last_activity_at || record.created_at || 0) || null,
    authors: (record.authors || []).map(author => author.name || author.email).filter(Boolean),
  };
}

function normalizeMessage(record) {
  const from = record.from_field
    ? (record.from_field.name || record.from_field.address || 'Unknown')
    : (record.author ? (record.author.name || record.author.email || 'Unknown') : 'Unknown');

  return {
    id: record.id || '',
    type: 'message',
    from,
    to: (record.to_fields || []).map(field => field.name || field.address).filter(Boolean),
    cc: (record.cc_fields || []).map(field => field.name || field.address).filter(Boolean),
    subject: record.subject || '',
    body: stripHtml(record.body || record.preview || ''),
    createdAt: formatMissiveTimestamp(record.delivered_at || record.created_at),
  };
}

function normalizeComment(record) {
  const author = record.author
    ? [record.author.first_name, record.author.last_name].filter(Boolean).join(' ') || record.author.email || 'Unknown'
    : 'Unknown';

  return {
    id: record.id || '',
    type: 'comment',
    author,
    mentions: (record.mentions || []).map(mention => mention.name || mention.email).filter(Boolean),
    body: stripHtml(record.body || ''),
    createdAt: formatMissiveTimestamp(record.created_at),
  };
}

export async function getMissiveHealth() {
  const data = await missiveRequest('/organizations');
  return {
    organizations: (data.organizations || []).map(organization => ({
      id: organization.id || '',
      name: organization.name || 'Unknown',
    })),
  };
}

export async function listMissiveInbox(limit = 20, options = {}) {
  const {
    inbox = true,
    all = false,
    search = '',
    until = null,
  } = options;

  const data = await missiveRequest('/conversations', {
    inbox: inbox ? true : undefined,
    all: all ? true : undefined,
    search,
    limit,
    until,
  });
  return (data.conversations || []).map(normalizeConversation);
}

export async function searchMissiveConversations(query, limit = 20, options = {}) {
  const { until = null } = options;
  const data = await missiveRequest('/conversations', { search: query, all: true, limit, until });
  return (data.conversations || []).map(normalizeConversation);
}

export async function getMissiveConversation(conversationId) {
  const data = await missiveRequest(`/conversations/${conversationId}`);
  const conversation = Array.isArray(data.conversations) ? data.conversations[0] : data.conversations;
  return conversation ? normalizeConversation(conversation) : null;
}

export async function listMissiveMessages(conversationId) {
  const data = await missiveRequest(`/conversations/${conversationId}/messages`);
  return (data.messages || []).map(normalizeMessage);
}

export async function listMissiveComments(conversationId) {
  const data = await missiveRequest(`/conversations/${conversationId}/comments`);
  return (data.comments || []).map(normalizeComment);
}

export async function getMissiveThread(conversationId) {
  const conversation = await getMissiveConversation(conversationId);
  const messages = await listMissiveMessages(conversationId);
  const comments = await listMissiveComments(conversationId);

  const items = messages
    .map(message => ({
      sortKey: message.createdAt,
      ...message,
    }))
    .concat(comments.map(comment => ({
      sortKey: comment.createdAt,
      ...comment,
    })))
    .sort((a, b) => String(a.sortKey || '').localeCompare(String(b.sortKey || '')));

  return {
    conversation,
    messages,
    comments,
    items,
  };
}
