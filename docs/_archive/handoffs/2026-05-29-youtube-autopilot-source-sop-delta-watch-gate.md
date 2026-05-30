# YouTube Autopilot Source SOP Delta Watch Gate

Date: 2026-05-29
Card: `YOUTUBE-GOD-MODE-AUTONOMOUS-WATCH-SCHEDULER-001`
Closeout: `youtube-autopilot-source-sop-delta-watch-gate-v1`

## Why This Exists

The live Dev Hub showed the YouTube baseline was complete, but the autopilot had public standard candidates and still selected zero videos. The rejection reason was `source_sop_next_action_blocks_video_watch`.

That was the wrong boundary. Downstream source SOP work should block full God Mode claims and major build promotion, not safe public/no-auth daily YouTube video watching.

## What Changed

- `nextWatchActionForRow()` now checks safe public video work before returning `complete_youtube_source_sop_before_god_mode_claim`.
- `baseline_met_keep_daily_delta_current` is now a runnable scheduler action.
- The scheduler dogfood now proves both sides:
  - a source-SOP-incomplete row with a new public video is selected;
  - a claim-only source-SOP-incomplete row without a new public video stays rejected.

## Live Readback

After the repair:

- YouTube baseline remains complete: 36/36 creators.
- Full source SOP remains incomplete: 36/36 incomplete.
- Build promotion remains blocked: `blocked_source_sop_incomplete`.
- Autopilot dry-run now selects 7 eligible public videos out of 13 candidates.
- Proof mode starts no provider call and writes no external system.

## Proof Run

```bash
node --check lib/youtube-creator-god-mode-catchup.js lib/youtube-god-mode-autonomous-watch-scheduler.js scripts/process-youtube-god-mode-autonomous-watch-scheduler-check.mjs scripts/process-youtube-creator-god-mode-catchup-check.mjs scripts/process-dev-team-hub-v0-check.mjs
npm run process:youtube-god-mode-autonomous-watch-scheduler-check -- --json
npm run process:youtube-creator-god-mode-catchup-check -- --json
npm run process:dev-team-hub-v0-check -- --json
```

## Not Done

- This did not run Gemini live.
- This did not approve or crawl Skool, MyICOR, paid/auth, newsletters, or downloads.
- This did not promote Director ideas to Scoper.
- The next live watcher run still needs the normal live-bounded job/approval/budget path.
