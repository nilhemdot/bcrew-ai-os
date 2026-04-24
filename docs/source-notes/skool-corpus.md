# Skool Corpus Source Note

Source ID: `SRC-SKOOL-001`
Last updated: 2026-04-24
Status: Gap / blocked until access path and content-use boundary are approved

## Purpose

Skool may become a high-value Foundation corpus source for trainings, course structures, posts, comments, links, docs, and embedded video lessons. It should not be treated as a generic scrape target.

## Current Access Research

- Skool Help Center documents a Zapier integration with a group API key, but the listed use cases are membership/CRM workflows, not full course/content export.
- Skool Help Center says Classroom videos may be hosted by YouTube, Vimeo, Wistia, or Loom. The crawler must therefore record external video links and route them to the right extractor only where access and use are allowed.
- Skool platform policy prohibits bots, scraping data, and automation requests. Browser crawling Skool pages is blocked unless Steve explicitly approves a compliant, account-authorized workflow and the target community/content owner permits it.
- Third-party Skool API products exist, but they are not first-party Skool infrastructure. They must be treated as experimental until auth, policy, coverage, and security are reviewed.

Sources checked on 2026-04-24:

- `https://help.skool.com/article/56-zapier-integration`
- `https://help.skool.com/article/178-how-to-troubleshoot-video-issues`
- `https://help.skool.com/article/179-platform-policy`
- `https://docs.skoolapi.com/security`

## Allowed First Step

Do not crawl Skool blindly.

The first Skool slice is an access-path audit:

- list which Skool communities/accounts Steve owns or pays for
- identify whether each community offers export, admin download, Zapier data, or direct links to source videos/docs
- record content owner, permitted use, and whether the material is Steve-owned, customer-owned, purchased training, or third-party creator IP
- classify the route as `allowed`, `manual_export_only`, `link_inventory_only`, `blocked`, or `needs_permission`

## Future Crawl Shape

If a compliant path exists, the Skool crawler should record:

- community URL/name
- course/classroom/module/lesson hierarchy
- post/comment URL
- title/body/author/date
- embedded URLs
- video host (`youtube`, `loom`, `vimeo`, `wistia`, `unknown`)
- file/doc links
- access method
- content-use class
- extraction status
- value route
- evidence link

## Value Routes

- `course_material`
- `training_pattern`
- `youtube_source`
- `loom_source`
- `sales_training`
- `agent_coaching`
- `platform_strategy`
- `community_growth`
- `recruiting_proof`
- `steve_owned_ip`
- `third_party_reference_only`
- `blocked_by_policy`

## Boundary

Foundation may inventory and classify authorized content. Hubs may later turn allowed source material into training, scripts, courses, or strategy packets. Foundation must preserve owner/source/use boundaries before any content is reused.
