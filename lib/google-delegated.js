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
  gmailSend: 'https://www.googleapis.com/auth/gmail.send',
  calendar: 'https://www.googleapis.com/auth/calendar',
  sheets: 'https://www.googleapis.com/auth/spreadsheets',
};

let cachedServiceAccount = null;
const jwtClients = new Map();
const GOOGLE_RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

const OWNERS_DASHBOARD_SHEET_ID = '18FZ6lzS17mzKk9_45naSlCNXgTJu3CEotYLuYz_xLSk';
const OWNERS_DASHBOARD_LISTS_GID = 1609537489;

const IMPORTED_SHEET_RANGE_GUARDS = [
  {
    label: 'Owners Dashboard Lists IMPORTRANGE mirror',
    spreadsheetId: OWNERS_DASHBOARD_SHEET_ID,
    sheetTitle: 'Lists',
    sheetId: OWNERS_DASHBOARD_LISTS_GID,
    startColumnIndex: 0,
    endColumnIndex: 35, // A:AI is imported from the upstream KPI/BHAG sheet.
    source: '1A0FeVXwwpgSmkqEfZlKRC9tU6YlEqQSTSfmWdVCdrRE!Lists!A1:AI',
  },
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function columnLettersToIndex(letters) {
  let index = 0;
  for (const ch of String(letters || '').toUpperCase()) {
    index = index * 26 + (ch.charCodeAt(0) - 64);
  }
  return index - 1;
}

function parseA1Part(part) {
  const match = /^([A-Za-z]+)?(\d+)?$/.exec(String(part || '').trim());
  if (!match || (!match[1] && !match[2])) return null;
  return {
    col: match[1] ? columnLettersToIndex(match[1]) : null,
    row: match[2] ? Number(match[2]) - 1 : null,
  };
}

function unquoteSheetTitle(title) {
  const raw = String(title || '').trim();
  if (raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1).replace(/''/g, "'");
  }
  return raw;
}

function parseA1Range(range) {
  const bang = String(range || '').lastIndexOf('!');
  if (bang === -1) return null;

  const sheetTitle = unquoteSheetTitle(String(range).slice(0, bang));
  const ref = String(range).slice(bang + 1).replace(/\$/g, '').trim();
  if (!sheetTitle || !ref) return null;

  const [startRaw, endRaw] = ref.split(':');
  const start = parseA1Part(startRaw);
  const end = parseA1Part(endRaw || startRaw);
  if (!start || !end) return null;

  const startColumnIndex = start.col ?? 0;
  const endColumnIndex = end.col === null ? Number.POSITIVE_INFINITY : end.col + 1;
  const startRowIndex = start.row ?? 0;
  const endRowIndex = end.row === null ? Number.POSITIVE_INFINITY : end.row + 1;

  return {
    sheetTitle,
    startColumnIndex,
    endColumnIndex,
    startRowIndex,
    endRowIndex,
  };
}

function rangesOverlap(left, right) {
  return (
    left.startColumnIndex < right.endColumnIndex &&
    left.endColumnIndex > right.startColumnIndex &&
    left.startRowIndex < (right.endRowIndex ?? Number.POSITIVE_INFINITY) &&
    left.endRowIndex > (right.startRowIndex ?? 0)
  );
}

function assertA1WriteAllowed(spreadsheetId, range, context) {
  const parsed = parseA1Range(range);
  if (!parsed) return;

  for (const guard of IMPORTED_SHEET_RANGE_GUARDS) {
    if (spreadsheetId !== guard.spreadsheetId) continue;
    if (parsed.sheetTitle !== guard.sheetTitle) continue;
    if (!rangesOverlap(parsed, guard)) continue;

    throw new Error(
      `${context} blocked: ${guard.label} is imported from ${guard.source}. ` +
        `Do not write to ${guard.sheetTitle}!A:AI in spreadsheet ${guard.spreadsheetId}; ` +
        'write to the upstream source or use a dedicated non-imported range instead.',
    );
  }
}

function gridRangeOverlapsGuard(spreadsheetId, range) {
  if (!range) return null;
  for (const guard of IMPORTED_SHEET_RANGE_GUARDS) {
    if (spreadsheetId !== guard.spreadsheetId) continue;
    if (range.sheetId !== guard.sheetId) continue;

    const candidate = {
      startColumnIndex: range.startColumnIndex ?? 0,
      endColumnIndex: range.endColumnIndex ?? Number.POSITIVE_INFINITY,
      startRowIndex: range.startRowIndex ?? 0,
      endRowIndex: range.endRowIndex ?? Number.POSITIVE_INFINITY,
    };

    if (rangesOverlap(candidate, guard)) return guard;
  }
  return null;
}

function assertBatchRequestAllowed(spreadsheetId, request, index) {
  const ranges = [];
  if (request.updateCells?.range) ranges.push(request.updateCells.range);
  if (request.repeatCell?.range) ranges.push(request.repeatCell.range);
  if (request.setDataValidation?.range) ranges.push(request.setDataValidation.range);
  if (request.copyPaste?.destination) ranges.push(request.copyPaste.destination);
  if (request.deleteRange?.range) ranges.push(request.deleteRange.range);
  if (request.autoFill?.range) ranges.push(request.autoFill.range);
  if (request.cutPaste?.source) ranges.push(request.cutPaste.source);
  if (request.appendCells?.sheetId) ranges.push({ sheetId: request.appendCells.sheetId });
  if (request.pasteData?.coordinate) {
    ranges.push({
      sheetId: request.pasteData.coordinate.sheetId,
      startRowIndex: request.pasteData.coordinate.rowIndex ?? 0,
      endRowIndex: (request.pasteData.coordinate.rowIndex ?? 0) + 1,
      startColumnIndex: request.pasteData.coordinate.columnIndex ?? 0,
      endColumnIndex: Number.POSITIVE_INFINITY,
    });
  }

  for (const range of ranges) {
    const guard = gridRangeOverlapsGuard(spreadsheetId, range);
    if (!guard) continue;
    throw new Error(
      `Sheets batchUpdate request ${index} blocked: ${guard.label} is imported from ${guard.source}. ` +
        'Use the upstream source workbook or an explicit repair override.',
    );
  }
}

function extractSheetsWrite(spreadsheetUrl, method, body) {
  const normalizedMethod = String(method || 'GET').toUpperCase();
  if (normalizedMethod === 'GET') return null;

  let parsedUrl;
  try {
    parsedUrl = new URL(spreadsheetUrl);
  } catch {
    return null;
  }

  const parts = parsedUrl.pathname.split('/').filter(Boolean);
  const spreadsheetsIndex = parts.findIndex((part, index) => part === 'spreadsheets' && parts[index - 1] === 'v4');
  if (spreadsheetsIndex === -1) return null;

  const idPart = parts[spreadsheetsIndex + 1] || '';
  const isDirectBatchUpdate = idPart.endsWith(':batchUpdate');
  const spreadsheetId = decodeURIComponent(isDirectBatchUpdate ? idPart.replace(/:batchUpdate$/, '') : idPart);
  if (!spreadsheetId) return null;

  const valuesPart = parts[spreadsheetsIndex + 2] || '';
  const pathRange =
    valuesPart === 'values' && parts[spreadsheetsIndex + 3]
      ? decodeURIComponent(parts[spreadsheetsIndex + 3].replace(/:clear$|:append$/, ''))
      : null;

  return {
    spreadsheetId,
    pathRange,
    isBatchUpdate: isDirectBatchUpdate || valuesPart === 'values:batchUpdate',
    body,
  };
}

function assertImportedSheetWriteAllowed(url, method, body, allowImportedRangeWrite) {
  if (allowImportedRangeWrite) return;

  const write = extractSheetsWrite(url, method, body);
  if (!write) return;

  if (write.pathRange) assertA1WriteAllowed(write.spreadsheetId, write.pathRange, 'Sheets write');
  if (write.body?.range) assertA1WriteAllowed(write.spreadsheetId, write.body.range, 'Sheets write body');

  for (const entry of write.body?.data || []) {
    if (entry?.range) assertA1WriteAllowed(write.spreadsheetId, entry.range, 'Sheets batch values write');
  }

  if (write.isBatchUpdate) {
    (write.body?.requests || []).forEach((request, index) => {
      assertBatchRequestAllowed(write.spreadsheetId, request, index);
    });
  }
}

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
  {
    method = 'GET',
    scopes = [],
    body,
    rawBody,
    accept = 'application/json',
    contentType = null,
    extraHeaders = {},
    allowImportedRangeWrite = false,
  } = {},
) {
  assertImportedSheetWriteAllowed(url, method, body, allowImportedRangeWrite);

  const client = getJwtClient(userEmail, scopes);
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse?.token;

  if (!token) {
    throw new Error(`No Google access token returned for ${userEmail || 'service-account'}.`);
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: accept,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(rawBody && contentType ? { 'Content-Type': contentType } : {}),
        ...extraHeaders,
      },
      body: rawBody ?? (body ? JSON.stringify(body) : undefined),
    });

    if (response.ok) {
      return response;
    }

    const errorBody = await response.text();
    const retryable = GOOGLE_RETRYABLE_STATUS_CODES.has(response.status);
    if (!retryable || attempt === 3) {
      throw new Error(`Google API ${method} ${response.status}: ${errorBody.slice(0, 500)}`);
    }

    await sleep(250 * attempt);
  }

  throw new Error(`Google API ${method} retry loop exhausted for ${url}`);
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

export async function googleBufferFetch(userEmail, url, options = {}) {
  const response = await googleFetch(userEmail, url, {
    ...options,
    accept: options.accept || 'application/octet-stream',
  });
  return Buffer.from(await response.arrayBuffer());
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
  limit = 100,
  options = {},
) {
  const normalizedLimit = Math.min(1000, Math.max(1, Number(limit) || 100));
  const normalizedPageSize = Math.min(
    100,
    Math.max(1, Number(options.pageSize || normalizedLimit) || normalizedLimit),
  );
  const orderBy = String(options.orderBy || '').trim();

  let pageToken = '';
  const files = [];

  do {
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('pageSize', String(Math.min(normalizedPageSize, normalizedLimit - files.length)));
    params.set('fields', fields);
    params.set('supportsAllDrives', 'true');
    params.set('includeItemsFromAllDrives', 'true');
    if (orderBy) params.set('orderBy', orderBy);
    if (pageToken) params.set('pageToken', pageToken);

    const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
    const data = await googleJsonFetch(userEmail, url, { scopes: [GOOGLE_SCOPES.drive] });
    const pageFiles = Array.isArray(data.files) ? data.files : [];
    files.push(...pageFiles);
    pageToken = String(data.nextPageToken || '').trim();
    if (!pageFiles.length) break;
  } while (pageToken && files.length < normalizedLimit);

  return files.slice(0, normalizedLimit);
}

export async function driveListFolder(userEmail, folderId, limit = 100, options = {}) {
  return driveSearch(
    userEmail,
    `'${folderId}' in parents and trashed = false`,
    options.fields || 'files(id,name,mimeType,modifiedTime,parents,webViewLink),nextPageToken',
    limit,
    options,
  );
}

function escapeDriveQueryLiteral(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export async function findDriveFolder(userEmail, parentFolderId, folderName) {
  const normalizedParentId = String(parentFolderId || '').trim();
  const normalizedFolderName = String(folderName || '').trim();
  if (!normalizedParentId || !normalizedFolderName) return null;

  const query = [
    `'${normalizedParentId}' in parents`,
    "mimeType = 'application/vnd.google-apps.folder'",
    `name = '${escapeDriveQueryLiteral(normalizedFolderName)}'`,
    'trashed = false',
  ].join(' and ');

  const files = await driveSearch(
    userEmail,
    query,
    'files(id,name,mimeType,modifiedTime,parents,webViewLink),nextPageToken',
    10,
  );

  return files[0] || null;
}

export async function findDriveFile(userEmail, parentFolderId, fileName) {
  const normalizedParentId = String(parentFolderId || '').trim();
  const normalizedFileName = String(fileName || '').trim();
  if (!normalizedParentId || !normalizedFileName) return null;

  const query = [
    `'${normalizedParentId}' in parents`,
    `name = '${escapeDriveQueryLiteral(normalizedFileName)}'`,
    'trashed = false',
  ].join(' and ');

  const files = await driveSearch(
    userEmail,
    query,
    'files(id,name,mimeType,modifiedTime,parents,webViewLink),nextPageToken',
    10,
  );

  return files[0] || null;
}

export async function createDriveFolder(userEmail, { name, parentFolderId = null } = {}) {
  const normalizedName = String(name || '').trim();
  if (!normalizedName) {
    throw new Error('createDriveFolder requires a folder name.');
  }

  const metadata = {
    name: normalizedName,
    mimeType: 'application/vnd.google-apps.folder',
    ...(parentFolderId ? { parents: [String(parentFolderId).trim()] } : {}),
  };

  const url =
    'https://www.googleapis.com/drive/v3/files?supportsAllDrives=true' +
    '&fields=id,name,mimeType,modifiedTime,parents,webViewLink';

  return googleJsonFetch(userEmail, url, {
    method: 'POST',
    scopes: [GOOGLE_SCOPES.drive],
    body: metadata,
  });
}

export async function ensureDriveFolder(userEmail, parentFolderId, folderName) {
  const existing = await findDriveFolder(userEmail, parentFolderId, folderName);
  if (existing?.id) return existing;
  return createDriveFolder(userEmail, { name: folderName, parentFolderId });
}

function buildMultipartBody(boundary, metadata, content, mimeType) {
  return [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${mimeType}; charset=UTF-8`,
    '',
    content,
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

export async function createDriveTextFile(
  userEmail,
  { name, parentFolderId = null, content = '', mimeType = 'text/plain' } = {},
) {
  const normalizedName = String(name || '').trim();
  if (!normalizedName) {
    throw new Error('createDriveTextFile requires a file name.');
  }

  const metadata = {
    name: normalizedName,
    ...(parentFolderId ? { parents: [String(parentFolderId).trim()] } : {}),
  };

  const boundary = `drive_boundary_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const body = buildMultipartBody(boundary, metadata, String(content || ''), mimeType);
  const url =
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true' +
    '&fields=id,name,mimeType,modifiedTime,parents,webViewLink';

  return googleJsonFetch(userEmail, url, {
    method: 'POST',
    scopes: [GOOGLE_SCOPES.drive],
    rawBody: body,
    contentType: `multipart/related; boundary=${boundary}`,
  });
}

export async function listDrivePermissions(userEmail, fileId) {
  const url =
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions` +
    '?supportsAllDrives=true&fields=permissions(id,type,role,emailAddress,displayName,deleted,pendingOwner)';
  const data = await googleJsonFetch(userEmail, url, { scopes: [GOOGLE_SCOPES.drive] });
  return Array.isArray(data.permissions) ? data.permissions : [];
}

export async function createDrivePermission(
  userEmail,
  fileId,
  { emailAddress, role = 'reader', type = 'user', sendNotificationEmail = false } = {},
) {
  const normalizedEmail = String(emailAddress || '').trim();
  if (!normalizedEmail) {
    throw new Error('createDrivePermission requires an email address.');
  }

  const params = new URLSearchParams({
    supportsAllDrives: 'true',
    sendNotificationEmail: sendNotificationEmail ? 'true' : 'false',
    fields: 'id,type,role,emailAddress,displayName,deleted,pendingOwner',
  });

  const url =
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?${params.toString()}`;

  return googleJsonFetch(userEmail, url, {
    method: 'POST',
    scopes: [GOOGLE_SCOPES.drive],
    body: {
      type,
      role,
      emailAddress: normalizedEmail,
    },
  });
}

export async function deleteDrivePermission(userEmail, fileId, permissionId) {
  const normalizedPermissionId = String(permissionId || '').trim();
  if (!normalizedPermissionId) {
    throw new Error('deleteDrivePermission requires a permission id.');
  }

  const url =
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions/${encodeURIComponent(normalizedPermissionId)}` +
    '?supportsAllDrives=true';

  await googleJsonFetch(userEmail, url, {
    method: 'DELETE',
    scopes: [GOOGLE_SCOPES.drive],
  });

  return { ok: true };
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
  const normalizedLimit = Math.min(500, Math.max(1, Number(maxResults) || 10));
  const messages = [];
  let pageToken = '';

  while (messages.length < normalizedLimit) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    params.set('maxResults', String(Math.min(500, normalizedLimit - messages.length)));
    if (pageToken) params.set('pageToken', pageToken);

    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`;
    const list = await googleJsonFetch(userEmail, listUrl, { scopes: [GOOGLE_SCOPES.gmail] });
    const pageMessages = Array.isArray(list.messages) ? list.messages : [];
    messages.push(...pageMessages);
    pageToken = String(list.nextPageToken || '').trim();

    if (!pageMessages.length || !pageToken) break;
  }

  const results = [];

  for (const message of messages.slice(0, normalizedLimit)) {
    const detail = await googleJsonFetch(
      userEmail,
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(message.id)}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject`,
      { scopes: [GOOGLE_SCOPES.gmail] },
    );

    results.push({
      id: detail.id || message.id,
      threadId: detail.threadId || '',
      historyId: detail.historyId || '',
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
    historyId: detail.historyId || '',
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
    historyId: message.historyId || '',
    subject: getGmailHeader(message.payload?.headers, 'Subject') || '(no subject)',
    from: getGmailHeader(message.payload?.headers, 'From') || 'unknown',
    to: getGmailHeader(message.payload?.headers, 'To') || '',
    snippet: message.snippet || '',
    body: extractGmailBody(message.payload),
    date: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : '',
  }));
}

function sanitizeEmailHeader(value) {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim();
}

function encodeMimePart(value) {
  return Buffer.from(String(value || ''), 'utf8').toString('base64');
}

function encodeRawMessage(message) {
  return Buffer.from(message, 'utf8').toString('base64url');
}

function buildHtmlEmailRaw({ from, to, subject, text, html, fromName = '' }) {
  const cleanFrom = sanitizeEmailHeader(from);
  const cleanTo = sanitizeEmailHeader(to);
  const cleanSubject = sanitizeEmailHeader(subject);
  const cleanFromName = sanitizeEmailHeader(fromName);
  if (!cleanFrom || !cleanTo || !cleanSubject) throw new Error('Email requires from, to, and subject.');
  if (!text && !html) throw new Error('Email requires text or html body.');

  const fromHeader = cleanFromName ? `"${cleanFromName.replace(/"/g, '\\"')}" <${cleanFrom}>` : cleanFrom;
  const boundary = `bcrew_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  return [
    `From: ${fromHeader}`,
    `To: ${cleanTo}`,
    `Subject: ${cleanSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    encodeMimePart(text || ''),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    encodeMimePart(html || ''),
    '',
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

export async function sendGmailMessage(userEmail, { to, subject, text, html, fromName = 'Benson Crew' } = {}) {
  const rawMessage = buildHtmlEmailRaw({
    from: userEmail,
    to,
    subject,
    text,
    html,
    fromName,
  });

  return googleJsonFetch(
    userEmail,
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      scopes: [GOOGLE_SCOPES.gmailSend],
      body: { raw: encodeRawMessage(rawMessage) },
    },
  );
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
  options = {},
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
    allowImportedRangeWrite: Boolean(options.allowImportedRangeWrite),
  });
}

export async function batchUpdateSheetValues(
  userEmail,
  spreadsheetId,
  data,
  valueInputOption = 'USER_ENTERED',
  options = {},
) {
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
    allowImportedRangeWrite: Boolean(options.allowImportedRangeWrite),
  });
}

export async function clearSheetValues(userEmail, spreadsheetId, range, options = {}) {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}` +
    `/values/${encodeURIComponent(range)}:clear`;

  return googleJsonFetch(userEmail, url, {
    method: 'POST',
    scopes: [GOOGLE_SCOPES.sheets],
    body: {},
    allowImportedRangeWrite: Boolean(options.allowImportedRangeWrite),
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
