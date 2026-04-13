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
  const cacheKey = `${userEmail}:${scopes.join(',')}`;
  if (jwtClients.has(cacheKey)) return jwtClients.get(cacheKey);

  const saKey = loadServiceAccountKey();
  const client = new JWT({
    email: saKey.client_email,
    key: saKey.private_key,
    scopes,
    subject: userEmail,
  });

  jwtClients.set(cacheKey, client);
  return client;
}

export async function googleJsonFetch(userEmail, url, { method = 'GET', scopes = [], body } = {}) {
  const client = getJwtClient(userEmail, scopes);
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse?.token;

  if (!token) {
    throw new Error(`No Google access token returned for ${userEmail}.`);
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google API ${method} ${response.status}: ${errorBody.slice(0, 500)}`);
  }

  if (response.status === 204) return {};
  return response.json();
}

export async function getDriveFileMetadata(userEmail, fileId) {
  const url =
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}` +
    '?fields=id,name,mimeType,modifiedTime,webViewLink';
  return googleJsonFetch(userEmail, url, { scopes: [GOOGLE_SCOPES.drive] });
}

export async function getSheetValues(userEmail, spreadsheetId, range) {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}` +
    `/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE`;
  return googleJsonFetch(userEmail, url, { scopes: [GOOGLE_SCOPES.sheets] });
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
