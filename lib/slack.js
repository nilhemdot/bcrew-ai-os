const SLACK_API_BASE_URL = 'https://slack.com/api';
const SLACK_MIN_REQUEST_GAP_MS = 250;

let lastSlackRequestAt = 0;
let cachedUserDirectory = null;

function getSlackToken() {
  const token = process.env.SLACK_BOT_TOKEN || '';
  if (!token) {
    throw new Error('SLACK_BOT_TOKEN is not configured.');
  }
  return token;
}

async function rateLimitSlack() {
  const now = Date.now();
  const elapsed = now - lastSlackRequestAt;
  if (elapsed < SLACK_MIN_REQUEST_GAP_MS) {
    await new Promise(resolve => setTimeout(resolve, SLACK_MIN_REQUEST_GAP_MS - elapsed));
  }
  lastSlackRequestAt = Date.now();
}

function formatSlackTimestamp(value) {
  const epochSeconds = Number.parseFloat(String(value || ''));
  if (!Number.isFinite(epochSeconds)) return '';
  return new Date(epochSeconds * 1000).toISOString();
}

async function slackRequest(pathname, params = {}) {
  await rateLimitSlack();

  const token = getSlackToken();
  const url = new URL(`${SLACK_API_BASE_URL}${pathname}`);
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
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Slack API ${pathname} failed: ${response.status} ${response.statusText} -- ${body.slice(0, 300)}`);
  }

  const json = await response.json();
  if (!json.ok) {
    throw new Error(`Slack API ${pathname} error: ${json.error || 'unknown_error'}`);
  }
  return json;
}

function normalizeChannel(record) {
  return {
    id: record.id || '',
    name: record.name || '',
    isPrivate: Boolean(record.is_private),
    isArchived: Boolean(record.is_archived),
    isMember: Boolean(record.is_member),
    memberCount: Number(record.num_members || 0),
    topic: String(record.topic?.value || '').trim(),
    purpose: String(record.purpose?.value || '').trim(),
  };
}

function normalizeUser(record) {
  const profile = record.profile || {};
  return {
    id: record.id || '',
    email: String(profile.email || '').trim().toLowerCase(),
    name: String(record.real_name || profile.real_name || record.name || '').trim(),
    displayName: String(profile.display_name || '').trim(),
    isBot: Boolean(record.is_bot),
    deleted: Boolean(record.deleted),
  };
}

function resolveSlackActor(message, userDirectory) {
  if (message.user && userDirectory.byId.has(message.user)) {
    const user = userDirectory.byId.get(message.user);
    return {
      userId: message.user,
      name: user.name || user.displayName || message.username || user.email || 'Unknown',
      email: user.email || '',
    };
  }

  const botName = String(message.bot_profile?.name || message.username || '').trim();
  return {
    userId: String(message.user || message.bot_id || '').trim(),
    name: botName || 'Unknown',
    email: '',
  };
}

function normalizeMessage(message, userDirectory) {
  const actor = resolveSlackActor(message, userDirectory);
  return {
    ts: String(message.ts || ''),
    threadTs: String(message.thread_ts || message.ts || ''),
    createdAt: formatSlackTimestamp(message.ts),
    text: String(message.text || '').trim(),
    userId: actor.userId,
    userName: actor.name,
    userEmail: actor.email,
    subtype: String(message.subtype || '').trim(),
    replyCount: Number(message.reply_count || 0),
  };
}

function isArchivableMessage(message) {
  if (!message) return false;
  if (!message.ts) return false;
  if (message.subtype && !['thread_broadcast', 'bot_message'].includes(message.subtype)) {
    return false;
  }
  return Boolean(String(message.text || '').trim());
}

export async function getSlackHealth() {
  const auth = await slackRequest('/auth.test');
  return {
    team: auth.team || '',
    teamId: auth.team_id || '',
    user: auth.user || '',
    userId: auth.user_id || '',
    botId: auth.bot_id || '',
  };
}

export async function listSlackChannels(limit = 200, types = 'public_channel,private_channel') {
  let cursor = '';
  const channels = [];

  do {
    const data = await slackRequest('/conversations.list', {
      limit,
      types,
      exclude_archived: true,
      cursor,
    });
    channels.push(...(data.channels || []).map(normalizeChannel));
    cursor = String(data.response_metadata?.next_cursor || '').trim();
  } while (cursor);

  return channels;
}

export async function listSlackUsers(limit = 200) {
  let cursor = '';
  const users = [];

  do {
    const data = await slackRequest('/users.list', {
      limit,
      cursor,
    });
    users.push(...(data.members || []).map(normalizeUser));
    cursor = String(data.response_metadata?.next_cursor || '').trim();
  } while (cursor);

  return users;
}

export async function getSlackUserDirectory() {
  if (cachedUserDirectory) return cachedUserDirectory;

  const users = await listSlackUsers();
  const byId = new Map();
  const byEmail = new Map();

  for (const user of users) {
    if (user.id) byId.set(user.id, user);
    if (user.email) byEmail.set(user.email, user);
  }

  cachedUserDirectory = { users, byId, byEmail };
  return cachedUserDirectory;
}

export async function getSlackChannelHistory(channelId, limit = 50) {
  const userDirectory = await getSlackUserDirectory();
  const data = await slackRequest('/conversations.history', {
    channel: channelId,
    limit,
  });
  return (data.messages || [])
    .filter(isArchivableMessage)
    .map(message => normalizeMessage(message, userDirectory));
}

export async function getSlackThreadReplies(channelId, threadTs, limit = 200) {
  const userDirectory = await getSlackUserDirectory();
  const data = await slackRequest('/conversations.replies', {
    channel: channelId,
    ts: threadTs,
    limit,
  });
  return (data.messages || [])
    .filter(isArchivableMessage)
    .map(message => normalizeMessage(message, userDirectory))
    .sort((left, right) => String(left.ts).localeCompare(String(right.ts)));
}

export async function getSlackPermalink(channelId, messageTs) {
  const data = await slackRequest('/chat.getPermalink', {
    channel: channelId,
    message_ts: messageTs,
  });
  return String(data.permalink || '').trim();
}
