# Foundation Hub Performance Baseline - 2026-05-14

## Prior Finding

The 2026-05-13 deep audit measured `/api/foundation-hub` at about 70.244 seconds and 4.63 MB. That made the Foundation UI feel broken and proved the green checks were not enough.

## New Measurement

Measured from local runtime on 2026-05-14 after the summary-route hardening:

| Route | Status | Time | Bytes | Result |
| --- | ---: | ---: | ---: | --- |
| `/api/foundation-hub` | 200 | 0.073341s | 891,236 | Passes default budget under 5s and 1 MB |
| `/api/foundation-hub?view=full` | 200 | 62.386321s | 4,799,862 | Heavy diagnostic route; visible follow-up |

Live proof recheck during the sprint measured the default route at 0.102089s / 891,235 bytes and the full diagnostic route at 74.840358s / 4,799,826 bytes. The conclusion is unchanged: default is fixed, full diagnostics is still heavy.

## Verdict

The default operator route is no longer the 70-second route. The full diagnostics route is still too slow for routine use and should stay out of the default UI path.

Follow-up to keep queued: full diagnostics payload/performance cleanup. Do not call this fully solved until the full diagnostic route is split or paged into smaller detail endpoints.
