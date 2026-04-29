# Sheets Quota Hardening

## What This Does

Foundation reads the same Google Sheets ranges many times during verifier and ship-check loops. That can hit the Google Sheets user quota during active build sessions.

This hardening adds a short read-through cache for Google Sheets read calls only:

- `getSheetValues`
- `getSheetValuesBatch`
- `getSpreadsheetMetadata`
- `getSheetGridData`

Plain English: if the same process asks for the same Sheet range again inside the cache window, AIOS uses the recent answer instead of spending another Google Sheets API request.

## Safety Rules

- Writes are never cached.
- Failed Google API reads are never cached as healthy data.
- The cache is short-lived by default: 30 seconds.
- The cache can be disabled immediately with an environment flag.
- Runtime Health can read cache hit/miss and recent quota-risk stats through the exported cache-status function.
- The cache file can contain recent Sheet read data. It lives under `store/` by default, which is local-only and ignored by git.

## Environment Flags

- `GOOGLE_SHEETS_CACHE_DISABLED=true`
  - Turns the Sheets read cache off.
- `GOOGLE_SHEETS_CACHE_TTL_SECONDS=30`
  - Sets the cache window in seconds.
- `GOOGLE_SHEETS_CACHE_TTL_MS=30000`
  - Sets the cache window in milliseconds. `GOOGLE_SHEETS_CACHE_TTL_SECONDS` wins when both are set.
- `GOOGLE_SHEETS_CACHE_FILE=store/google-sheets-cache.json`
  - Overrides where cache state is stored.
- `GOOGLE_SHEETS_USER_QUOTA_PER_MINUTE=60`
  - Sets the quota-risk threshold used by stats. Default matches the common per-user Sheets quota.

## Runtime Health Integration

Parent integration can import:

```js
import { getGoogleSheetsCacheStats } from './lib/google-delegated.js'
```

That returns:

- whether cache is enabled
- TTL
- cache file path
- hit/miss/write/bypass counts
- recent 429 count
- live reads in the last minute
- quota risk: `healthy`, `watch`, or `high`
- recent quota events

## Google Cloud Quota Request Checklist

Codex cannot request Google Cloud quota changes for Steve. An owner/admin should do this in Google Cloud Console.

1. Open Google Cloud Console.
2. Select the project that owns the delegated Google service account.
3. Go to APIs & Services -> Enabled APIs & services.
4. Open Google Sheets API.
5. Open Quotas.
6. Request increases for:
   - per-user requests per minute: 600
   - per-project requests per minute: 3000
7. Reason: Foundation verifier and ship-check loops run several read-only Sheets checks during active development; short cache is already in place, and the increase prevents false failures during parallel build waves.
8. Save the request outcome in Foundation once the parent surface is wired.

## Known Limits

- This does not replace the quota increase. It reduces repeated reads during active loops.
- The cache is file-backed and simple. If the file cannot be read, AIOS falls back to live reads and reports the cache file problem in stats.
- Cache stats are for Sheets read calls routed through `lib/google-delegated.js`.
