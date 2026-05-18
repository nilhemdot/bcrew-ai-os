# MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001 Packet

Card: `MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001`  
Source ID: `SRC-SKOOL-001`  
Closeout key: `mark-m-skool-extraction-preflight-v1`  
Mode: metadata-only preflight

## Source Identity

| Field | Value |
| --- | --- |
| Source name | Skool courses and communities |
| Source class | private_community |
| Source type | paid_or_private_community |
| Access owner | Steve |
| Source contract status | Gap |
| Source validation | Not Signed Off |
| Connector key | skool-access |
| Connector posture | blocked |
| Preflight status | metadata_only_allowed |
| Extraction status | blocked_pending_source_auth_approval |
| Known public URL | https://www.skool.com/earlyaidopters |

## Community/Course Map

The Skool community/course map is not inspected by this card.

| Field | Value |
| --- | --- |
| Community count | unknown_until_approved |
| Course/classroom count | unknown_until_approved |
| Post count | unknown_until_approved |
| Member count | unknown_until_approved |
| Inspected by Codex | false |
| Inspected courses/posts/members | 0 / 0 / 0 |
| Allowed source for this packet | repo truth and Steve-provided skeleton only |

## Expected Content Types

| Content type | Current status |
| --- | --- |
| community_identity | metadata_only |
| course_or_classroom_map | blocked_pending_source_auth_approval |
| posts | blocked_pending_source_auth_approval |
| comments | blocked_pending_source_auth_approval |
| member_data | blocked_pending_source_auth_approval |
| embedded_videos | blocked_pending_source_auth_approval |
| docs_or_resources | blocked_pending_source_auth_approval |

## Artifact Policy

| Artifact | Policy |
| --- | --- |
| Metadata packet | repo doc allowed |
| Raw private/community content | blocked pending source-auth approval |
| Posts/comments | blocked pending source-auth approval |
| Member data | blocked pending source-auth approval |
| Lesson text | blocked pending source-auth approval |
| Embedded video transcripts/audio notes | blocked pending source-auth approval |
| Screenshots/keyframes | blocked pending source-auth approval |
| Summaries/observations | blocked pending source-auth approval |
| KB/atom/action routing | blocked until source-specific approval and extraction-to-KB/atom gates |

## Approval Packet Draft

This is a draft field list, not approval.

| Required field | Status |
| --- | --- |
| sourceId | present: `SRC-SKOOL-001` |
| sourceClass | present: `private_community` |
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

- Do not open Skool.
- Do not use paid/private auth.
- Do not use an authorized browser session.
- Do not crawl, navigate communities/courses, extract posts/comments/member data, fetch transcripts, capture screenshots/keyframes, download files, summarize content, call models, or write downstream outputs.
- Do not copy posts, comments, member data, course content, transcript text, screenshots, resource links, or summaries into repo docs.

## Next

Continue `MARK-KASHEF-GOAL-BUILD-INTEL-PACKET-001` from repo truth.
