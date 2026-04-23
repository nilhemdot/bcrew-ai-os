const MISSIVE_BASE_URL = 'https://public.missiveapp.com/v1';
const MISSIVE_MIN_REQUEST_GAP_MS = 200;

let lastMissiveRequestAt = 0;

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
  await rateLimitMissive();

  const token = getMissiveToken();
  const url = new URL(`${MISSIVE_BASE_URL}${pathname}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Missive API ${pathname} failed: ${response.status} ${response.statusText} -- ${body.slice(0, 300)}`);
  }

  if (response.status === 204) return {};
  return response.json();
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
    lastActivityAt: formatMissiveTimestamp(record.last_activity_at || record.created_at),
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

export async function listMissiveInbox(limit = 20) {
  const data = await missiveRequest('/conversations', { inbox: true, limit });
  return (data.conversations || []).map(normalizeConversation);
}

export async function searchMissiveConversations(query, limit = 20) {
  const data = await missiveRequest('/conversations', { search: query, all: true, limit });
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
  const [conversation, messages, comments] = await Promise.all([
    getMissiveConversation(conversationId),
    listMissiveMessages(conversationId),
    listMissiveComments(conversationId),
  ]);

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
