# System Health - 2026-05-16

Status: risk

Foundation has red system-health findings. Do not treat every surface as green.

## Summary

- Risk findings: 5
- Watch findings: 3
- Scheduled job red: 5
- Scheduled job yellow: 0
- Connector down/degraded: 0/2
- Endpoint risk/review: 0/0
- Source contracts: 36

## Red / Yellow Scheduled Jobs

| Status | Job | Last success | Due | Detail |
| --- | --- | --- | --- | --- |
| red | Foundation Verifier | none | no | Foundation Verifier latest run is running. |
| red | Meeting Notes Current Sync | none | no | Meeting Notes Current Sync latest run is failed. |
| red | Missive Current Sync | none | no | Missive Current Sync latest run is failed. |
| red | Video Content Extraction Bite | none | no | Video Content Extraction Bite latest run is failed. |
| red | Slack Candidate Extraction | none | no | Slack Candidate Extraction latest run is failed. |

## Findings

- P0 Foundation Verifier is risk: Foundation Verifier latest run is running. Next: Open the job run and fix the failure before trusting this surface.
- P0 Meeting Notes Current Sync is risk: Meeting Notes Current Sync latest run is failed. Next: Marked failed by stale active-run reaper.
- P0 Missive Current Sync is risk: Missive Current Sync latest run is failed. Next: Marked failed by stale active-run reaper.
- P0 Video Content Extraction Bite is risk: Video Content Extraction Bite latest run is failed. Next: Video content extraction failed: https://link.skool.com/ls/click?upn=u001.wK6x93jhdVos-2F3TofGJCJv2x-2FXYKi-2F266Yv7HF2lGr31swLLfZxKNd-2FNoSn1ZcqVIXRflkGqwYw6U9Oc91Xzbe3wnw-2FX2lZzx4HSNmQjOrvP3K94Mk-2B8exAVKEsGJueSp3WE5gC9GanZBQ-2FWLQRFRaS-2Fvu02iyIatNsqzQOb-2B8-2BssA30r-2Fb61If31Ttb8XPfWAivpfSzP-2BDW8CTbuW6SdAP37zksD3sM1JeZXw484s4-3Dbgzc_TLemHALZ0J6TBNk36YNMqp3nZvdCIynFw4dXqE-2FCJHhV-2By54Z65wNku8DWK09-2FvHSzzdEUVre8sYRXXiQxs6Py1J75eUqT9liaw4-2BMWeEBqGnf-2FATCHQOunIGdQ7ze2gtRqml8dhDXp3BdHP2JUAGX0EYVpZBnGjYcqxR-2B4xnNntf0V1tFaV9BGGVoOEQldjNNiv259p5vyePZgufiKnyO9Yf8Av-2B0JmBuAkdCnrLAUuMpNFXuzsSRULqT-2BU7xJOVj9ZnUZmrMKk8sp5PGW2IO3x2Xo8pIpvXq-2F63eeI8-2B5hIXU5NbToJpWmqcwgRNF8TYaV8x0r7ziiCVvBbGO1qtV3TZWD6bahsS2EW-2Fo97Ucql16zt63NBMM5fXDXAUqFazPzlQeanjTAqRLVQaXLUBlv2-2BUmCNovFk6U7wI7FpKpJ73JffntHK-2BCRL75kuKvVH9-2FJHp25CJqEi2KRd5CZiGO8OKA3YJcbmcZOA3yl1Z8f33ykV0ACHHefaMu1iDHyGEF0rIct9Cwjh9eET6xzg-3D-3D duplicate key value violates unique constraint "source_crawl_items_pkey"
Video content extraction failed.
duplicate key value violates unique constraint "source_crawl_items_pkey"
- P1 Slack Candidate Extraction is risk: Slack Candidate Extraction latest run is failed. Next: Marked failed by stale active-run reaper.
- P1 One or more connectors are degraded: Slack, Missive Next: Use source-health details before changing hub behavior.
- P1 Scheduled jobs are blocked by runtime posture: verification-runs Next: Split mutating checks into read-only proof plus explicit apply lane before scheduling.
- P1 Foundation jobs have recent failures: missive-sync-current, meeting-notes-sync-current, slack-extract-latest, video-content-extract-bite, shared-comms-intelligence-bite, shared-comms-synthesis-v1 Next: Review latest run error before treating the system as green.

## Posture

- Report only: true
- Auto-fixes: false
- Backlog mutation: false
- Source-system mutation: false
