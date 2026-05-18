# MYICOR-EXTRACTION-PREFLIGHT-001 Packet

Card: `MYICOR-EXTRACTION-PREFLIGHT-001`  
Source ID: `SRC-MYICRO-001`  
Closeout key: `myicor-extraction-preflight-v1`  
Mode: metadata-only preflight

## Source Identity

| Field | Value |
| --- | --- |
| Source name | Mycro / myICOR Training |
| Source class | paid_course |
| Source type | paid_course_app |
| Access owner | Steve |
| Source contract status | Scoped, not connected |
| Source validation | Not Signed Off |
| Connector key | myicro-access |
| Connector posture | blocked |
| Preflight status | metadata_only_allowed |
| Extraction status | blocked_pending_source_auth_approval |

## Course Map

The course map is not inspected by this card.

| Field | Value |
| --- | --- |
| Course count | unknown_until_approved |
| Lesson count | unknown_until_approved |
| Resource count | unknown_until_approved |
| Inspected by Codex | false |
| Inspected lessons | 0 |
| Allowed source for this packet | repo truth and Steve-provided skeleton only |

## Expected Content Types

| Content type | Current status |
| --- | --- |
| course_structure | planned_not_read |
| lesson_text | blocked_pending_source_auth_approval |
| resources | blocked_pending_source_auth_approval |
| transcripts_or_audio_notes | blocked_pending_source_auth_approval |
| screenshots_or_keyframes | blocked_pending_source_auth_approval |
| workflow_observations | blocked_pending_source_auth_approval |

## Artifact Policy

| Artifact | Policy |
| --- | --- |
| Metadata packet | repo doc allowed |
| Raw private course content | blocked pending source-auth approval |
| Lesson text | blocked pending source-auth approval |
| Transcript/audio notes | blocked pending source-auth approval |
| Screenshots/keyframes | blocked pending source-auth approval |
| Summaries/observations | blocked pending source-auth approval |
| KB/atom/action routing | blocked until source-specific approval and extraction-to-KB/atom gates |

## Approval Packet Draft

This is a draft field list, not approval.

| Required field | Status |
| --- | --- |
| sourceId | present: `SRC-MYICRO-001` |
| sourceClass | present: `paid_course` |
| accessOwner | present: Steve |
| approvedActor | pending approval |
| approvedAccessMethod | pending approval |
| permittedContentTypes | pending approval |
| maxScope | pending approval |
| artifactStoragePolicy | pending approval |
| privacyRedactionPolicy | pending approval |
| contentUseBoundary | pending approval |
| downstreamUsePolicy | pending approval |
| operatorReviewCadence | pending approval |
| rollbackOrDeletePlan | pending approval |
| proofCommand | present: focused preflight proof only |
| expiresAtOrReviewBy | pending approval |

## Do Not Start

- Do not open MyICOR.
- Do not use paid/private auth.
- Do not use an authorized browser session.
- Do not crawl, navigate lessons, fetch transcripts, capture screenshots/keyframes, download files, summarize course content, call models, or write downstream outputs.
- Do not copy course content, lesson text, transcript text, screenshots, resource links, or summaries into repo docs.

## Next

Continue `MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001` as source-auth preflight only.
