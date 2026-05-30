# Source Lifecycle Expansion Baseline

Baseline source: 6fb1781
Captured: 2026-04-30
Card: SOURCE-LIFECYCLE-EXPANSION-001
Closeout key: source-lifecycle-expansion-v1

## Live Counts Before Build

- Source contracts: 35
- Connectors: 13
- Grouped source systems: 12
- Extraction targets: 12
- Active extraction targets: 8
- Paused extraction targets: 2
- Scheduled extraction targets: 8
- Blocked extraction targets: 1
- Recent item failures: 0
- Recent run failures: 0
- Targets with skipped-item visibility: 7

No extraction target, schedule, or quota changed in the baseline.

## Included Lanes

- Shared communications: Gmail, Missive, meetings, Slack.
- Drive/corpus text: Google Drive inventory and text extraction.
- Video manifest/transcripts: video link inventory and YouTube subtitle transcript extraction.
- Parked/blocked visibility: Skool, Loom, Mycro, creator watchlist, Zoom recovery, and other gaps already present in source truth.

## Extraction Target Baseline

- drive-content-extract-backfill: active, scheduled, daily quota 5, max items 5.
- email-attachments-backfill: active, scheduled, daily quota 5, max items 5.
- video-content-extract-backfill: active, scheduled, daily quota 5, max items 5.
- gmail-current-day: active, scheduled, max items 25.
- meetings-current-day: active, scheduled, max items 50.
- missive-current-day: active, scheduled, max items 100.
- drive-corpus-backfill: active, scheduled, daily quota 1, max folders 1.
- old-system-report-mining: planned, manual, daily quota 10.
- video-link-inventory: planned, manual, max artifacts 1000.
- slack-current-day: active, scheduled, max items 100.
- skool-corpus-backfill: blocked, paused, daily quota 5 after access.
- zoom-audio-recovery-backfill: paused, paused, daily quota 5.

## Privacy Boundary

The baseline uses metadata only: source IDs, target keys, statuses, counts, budget caps, schedule modes, skip reasons, and artifact classes. It does not copy source content, email/message bodies, transcripts, attachment text, row data, screenshots, private local file content, or raw tokens.

## Scope Boundary

This baseline proves the starting state for a visibility/control build only. It does not approve Strategy Hub activation, Scoper, Agent Factory, corpus expansion, research cleanup, Action Review applying, source crawler activation, or new extraction quotas.
