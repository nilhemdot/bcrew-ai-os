import { JWT } from 'google-auth-library';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

export const GOOGLE_SA_KEY_FILE =
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE ||
  path.join(PROJECT_ROOT, 'store', 'crewbert-delegation-sa.json');

export const GOOGLE_SCOPES = {
  drive: 'https://www.googleapis.com/auth/drive',
  // Domain-wide delegation is currently authorized for these broader scopes.
  gmail: 'https://www.googleapis.com/auth/gmail.modify',
  calendar: 'https://www.googleapis.com/auth/calendar',
  sheets: 'https://www.googleapis.com/auth/spreadsheets',
};

let cachedServiceAccount = null;
const jwtClients = new Map();

function loadServiceAccountKey() {
  if (cachedServiceAccount) return cachedServiceAccount;

  if (!existsSync(GOOGLE_SA_KEY_FILE)) {
    throw new Error(
      `Google service account key not found at ${GOOGLE_SA_KEY_FILE}. ` +
        'Drop the old crewbert delegation JSON there or set GOOGLE_SERVICE_ACCOUNT_KEY_FILE.',
    );
  }

  cachedServiceAccount = JSON.parse(readFileSync(GOOGLE_SA_KEY_FILE, 'utf8'));
  return cachedServiceAccount;
}

function getJwtClient(userEmail, scopes) {
  const subject = userEmail && userEmail !== 'service-account' ? userEmail : undefined;
  const cacheKey = `${subject || 'service-account'}:${scopes.join(',')}`;
  if (jwtClients.has(cacheKey)) return jwtClients.get(cacheKey);

  const saKey = loadServiceAccountKey();
  const client = new JWT({
    email: saKey.client_email,
    key: saKey.private_key,
    scopes,
    ...(subject ? { subject } : {}),
  });

  jwtClients.set(cacheKey, client);
  return client;
}

async function googleFetch(
  userEmail,
  url,
  { method = 'GET', scopes = [], body, accept = 'application/json' } = {},
) {
  const client = getJwtClient(userEmail, scopes);
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse?.token;

  if (!token) {
    throw new Error(`No Google access token returned for ${userEmail || 'service-account'}.`);
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: accept,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google API ${method} ${response.status}: ${errorBody.slice(0, 500)}`);
  }

  return response;
}

export async function googleJsonFetch(userEmail, url, options = {}) {
  const response = await googleFetch(userEmail, url, options);
  if (response.status === 204) return {};
  return response.json();
}

export async function googleTextFetch(userEmail, url, options = {}) {
  const response = await googleFetch(userEmail, url, {
    ...options,
    accept: options.accept || 'text/plain',
  });
  return response.text();
}

export async function getDriveFileMetadata(userEmail, fileId) {
  const url =
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}` +
    '?supportsAllDrives=true&fields=id,name,mimeType,modifiedTime,webViewLink';
  return googleJsonFetch(userEmail, url, { scopes: [GOOGLE_SCOPES.drive] });
}

export async function driveSearch(
  userEmail,
  query,
  fields = 'files(id,name,mimeType,modifiedTime,parents,webViewLink),nextPageToken',
  pageSize = 100,
) {
  const params = new URLSearchParams();
  params.set('q', query);
  params.set('pageSize', String(pageSize));
  params.set('fields', fields);
  params.set('supportsAllDrives', 'true');
  params.set('includeItemsFromAllDrives', 'true');

  const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
  const data = await googleJsonFetch(userEmail, url, { scopes: [GOOGLE_SCOPES.drive] });
  return Array.isArray(data.files) ? data.files : [];
}

export async function driveListFolder(userEmail, folderId, pageSize = 100) {
  return driveSearch(
    userEmail,
    `'${folderId}' in parents and trashed = false`,
    'files(id,name,mimeType,modifiedTime,parents,webViewLink),nextPageToken',
    pageSize,
  );
}

export async function driveExportDoc(userEmail, fileId) {
  const url =
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}` +
    '/export?mimeType=text%2Fplain';
  return googleTextFetch(userEmail, url, { scopes: [GOOGLE_SCOPES.drive] });
}

export async function getSheetValues(userEmail, spreadsheetId, range) {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}` +
    `/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE`;
  return googleJsonFetch(userEmail, url, { scopes: [GOOGLE_SCOPES.sheets] });
}

export async function getSheetGridData(userEmail, spreadsheetId, ranges, fields) {
  const normalizedRanges = Array.isArray(ranges) ? ranges : [ranges];
  const params = new URLSearchParams();
  normalizedRanges.forEach(range => params.append('ranges', range));
  params.set('includeGridData', 'true');
  if (fields) params.set('fields', fields);

  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}` +
    `?${params.toString()}`;

  return googleJsonFetch(userEmail, url, { scopes: [GOOGLE_SCOPES.sheets] });
}

export async function getSheetNotes(userEmail, spreadsheetId, ranges) {
  return getSheetGridData(
    userEmail,
    spreadsheetId,
    ranges,
    'sheets(properties(title),data(startRow,startColumn,rowData(values(note,formattedValue,userEnteredValue))))',
  );
}

export async function listDriveComments(userEmail, fileId, pageSize = 100) {
  const params = new URLSearchParams({
    supportsAllDrives: 'true',
    pageSize: String(pageSize),
    fields: 'comments(id,content,quotedFileContent/value,anchor,createdTime,modifiedTime,resolved,replies/content),nextPageToken',
  });

  const url =
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/comments` +
    `?${params.toString()}`;

  return googleJsonFetch(userEmail, url, { scopes: [GOOGLE_SCOPES.drive] });
}

function getGmailHeader(headers, headerName) {
  const match = (headers || []).find(header => String(header?.name || '').toLowerCase() === headerName.toLowerCase());
  return match?.value || '';
}

function decodeBase64UrlText(value) {
  return value ? Buffer.from(value, 'base64url').toString('utf8') : '';
}

function extractGmailBody(payload) {
  if (!payload) return '';
  if (payload.body?.data) return decodeBase64UrlText(payload.body.data);

  const plainTextPart = (payload.parts || []).find(part => part?.mimeType === 'text/plain' && part?.body?.data);
  if (plainTextPart?.body?.data) return decodeBase64UrlText(plainTextPart.body.data);

  for (const part of payload.parts || []) {
    const nested = extractGmailBody(part);
    if (nested) return nested;
  }

  return '';
}

export async function listGmailMessages(userEmail, { query = '', maxResults = 10 } = {}) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  params.set('maxResults', String(maxResults));

  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`;
  const list = await googleJsonFetch(userEmail, listUrl, { scopes: [GOOGLE_SCOPES.gmail] });
  const messages = Array.isArray(list.messages) ? list.messages : [];
  const results = [];

  for (const message of messages.slice(0, maxResults)) {
    const detail = await googleJsonFetch(
      userEmail,
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(message.id)}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject`,
      { scopes: [GOOGLE_SCOPES.gmail] },
    );

    results.push({
      id: detail.id || message.id,
      threadId: detail.threadId || '',
      snippet: detail.snippet || '',
      subject: getGmailHeader(detail.payload?.headers, 'Subject') || '(no subject)',
      from: getGmailHeader(detail.payload?.headers, 'From') || 'unknown',
      to: getGmailHeader(detail.payload?.headers, 'To') || '',
      date: detail.internalDate ? new Date(Number(detail.internalDate)).toISOString() : '',
    });
  }

  return results;
}

export async function getGmailMessage(userEmail, messageId) {
  const detail = await googleJsonFetch(
    userEmail,
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=full`,
    { scopes: [GOOGLE_SCOPES.gmail] },
  );

  return {
    id: detail.id || messageId,
    threadId: detail.threadId || '',
    subject: getGmailHeader(detail.payload?.headers, 'Subject') || '(no subject)',
    from: getGmailHeader(detail.payload?.headers, 'From') || 'unknown',
    to: getGmailHeader(detail.payload?.headers, 'To') || '',
    snippet: detail.snippet || '',
    body: extractGmailBody(detail.payload),
    date: detail.internalDate ? new Date(Number(detail.internalDate)).toISOString() : '',
  };
}

export async function getGmailThread(userEmail, threadId) {
  const thread = await googleJsonFetch(
    userEmail,
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}?format=full`,
    { scopes: [GOOGLE_SCOPES.gmail] },
  );

  return (thread.messages || []).map(message => ({
    id: message.id || '',
    threadId: thread.id || threadId,
    subject: getGmailHeader(message.payload?.headers, 'Subject') || '(no subject)',
    from: getGmailHeader(message.payload?.headers, 'From') || 'unknown',
    to: getGmailHeader(message.payload?.headers, 'To') || '',
    snippet: message.snippet || '',
    body: extractGmailBody(message.payload),
    date: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : '',
  }));
}

export async function listCalendarEvents(
  userEmail,
  {
    calendarId = 'primary',
    timeMin,
    timeMax,
    maxResults = 50,
    singleEvents = true,
    orderBy = 'startTime',
  } = {},
) {
  const params = new URLSearchParams();
  if (timeMin) params.set('timeMin', timeMin);
  if (timeMax) params.set('timeMax', timeMax);
  params.set('singleEvents', singleEvents ? 'true' : 'false');
  params.set('orderBy', orderBy);
  params.set('maxResults', String(maxResults));

  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events` +
    `?${params.toString()}`;

  const data = await googleJsonFetch(userEmail, url, { scopes: [GOOGLE_SCOPES.calendar] });
  return (data.items || []).map(event => ({
    id: event.id || '',
    summary: event.summary || '(no title)',
    start: event.start?.dateTime || event.start?.date || '',
    end: event.end?.dateTime || event.end?.date || '',
    location: event.location || '',
    attendees: (event.attendees || []).map(attendee => attendee.email).filter(Boolean),
  }));
}

export async function updateSheetValues(
  userEmail,
  spreadsheetId,
  range,
  values,
  valueInputOption = 'USER_ENTERED',
) {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}` +
    `/values/${encodeURIComponent(range)}?valueInputOption=${encodeURIComponent(valueInputOption)}`;

  return googleJsonFetch(userEmail, url, {
    method: 'PUT',
    scopes: [GOOGLE_SCOPES.sheets],
    body: {
      range,
      majorDimension: 'ROWS',
      values,
    },
  });
}

export async function batchUpdateSheetValues(userEmail, spreadsheetId, data, valueInputOption = 'USER_ENTERED') {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}` +
    `/values:batchUpdate`;

  return googleJsonFetch(userEmail, url, {
    method: 'POST',
    scopes: [GOOGLE_SCOPES.sheets],
    body: {
      valueInputOption,
      data,
    },
  });
}

export function getServiceAccountSummary() {
  const saKey = loadServiceAccountKey();
  return {
    file: GOOGLE_SA_KEY_FILE,
    clientEmail: saKey.client_email,
    projectId: saKey.project_id,
  };
}
