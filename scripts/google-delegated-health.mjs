#!/usr/bin/env node

import process from 'node:process';
import {
  GOOGLE_SA_KEY_FILE,
  getDriveFileMetadata,
  getServiceAccountSummary,
  getSheetValues,
} from '../lib/google-delegated.js';

function parseArgs(argv) {
  const result = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split('=');
    result[key] = value ?? true;
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const userEmail = args.user || process.env.GOOGLE_IMPERSONATE_EMAIL || 'ai@bensoncrew.ca';
  const spreadsheetId = args.sheet || '1fyPB-g_B08okE01G3L0tzUTaJiuivrSBo1RqMYHt2Dw';
  const range = args.range || "'Benson Crew Bhag Builder'!I17:M29";

  console.log('Google delegated health check');
  console.log(`  Service account file: ${GOOGLE_SA_KEY_FILE}`);
  console.log(`  Access mode: ${userEmail === 'service-account' ? 'service account direct' : `impersonate ${userEmail}`}`);
  console.log(`  Spreadsheet: ${spreadsheetId}`);
  console.log(`  Range: ${range}`);

  const summary = getServiceAccountSummary();
  console.log(`  Service account: ${summary.clientEmail}`);
  console.log(`  Project: ${summary.projectId}`);

  const metadata = await getDriveFileMetadata(userEmail, spreadsheetId);
  console.log(`  Drive access: OK -> ${metadata.name} (${metadata.mimeType})`);

  const values = await getSheetValues(userEmail, spreadsheetId, range);
  const rowCount = values.values?.length ?? 0;
  const sample = values.values?.[0] ?? [];
  console.log(`  Sheets read: OK -> ${rowCount} rows`);
  console.log(`  First row sample: ${JSON.stringify(sample)}`);
  console.log('Delegated access is ready for sheet reads and writes.');
}

main().catch((error) => {
  console.error('Delegated health check failed.');
  console.error(error.message);
  process.exit(1);
});
