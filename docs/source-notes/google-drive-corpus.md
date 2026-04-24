# Google Drive Corpus Source Note

Source ID: `SRC-GDRIVE-001`
Last updated: 2026-04-24
Status: Pending Revalidation

## Purpose

Google Drive is a Foundation corpus source. The first job is not to reorganize everything. The first job is to inventory one bounded folder bite at a time, preserve evidence links, classify value, and only propose copies/derived outputs after the system knows what it reviewed.

The original shared drives should not be moved, deleted, or ACL-stripped in this phase.

## Shared Drive Roots

| Root | Folder ID | Initial value hypothesis | Sensitivity |
| --- | --- | --- | --- |
| Zahnd TEAM OG Folder | `0AJ4EQ018BaWwUk9PVA` | Older Zahnd Team systems, scripts, presentations, sales/training IP, historical operations material. | internal |
| Zahnd Team 2023+ | `0AE5bQZviXUrhUk9PVA` | More recent Zahnd Team operating assets and training material. | internal |
| MarketMasters training folder | `0AJZun9Ce_rOnUk9PVA` | Buyer/seller presentation work, newer training videos, course-building source material. | Steve / MarketMasters |
| Zahnd Team 2025 | `0ADIecWc1lshCUk9PVA` | Current Zahnd Team assets and possible live operating material. | internal |
| Houseable | `0AHpyJsfILw2DUk9PVA` | High-value old CRM/product/IP corpus. Likely contains course ideas, systems, and reusable software/training material. | Steve-owned / sensitive |
| BCrew Marketing Folder | `0AA5XKa6_SqTuUk9PVA` | Marketing assets, campaigns, possible brand/content source material. | marketing |
| BensonCrew Owners Private | `0ACJxbgdxfgESUk9PVA` | Owner-private material that may be useful for strategy but must not leak to hubs or public content. | owners-private |
| Benson Crew Zahnd Folder | `0AMaaJPwT3l80Uk9PVA` | Mixed Benson Crew / Zahnd Team working corpus. | internal |

## Crawl Doctrine

- Start read-only.
- Crawl one root/folder bite at a time.
- Record every inspected folder/file in `source_crawl_items` or a Drive-specific crawl table before extracting content.
- Do not review the same unchanged file twice; key by `drive_file_id:modified_time` for v1.
- Do not move originals.
- Copy or create derivative course/content outputs only after a review step approves it.
- Keep source links attached to every extracted atom, course outline, SOP idea, recruiting proof point, or strategy signal.

## Initial Value Routes

Use these `value_route` tags while classifying Drive items:

- `strategy_evidence`
- `ops_sop`
- `sales_training`
- `agent_coaching`
- `buyer_course`
- `seller_course`
- `presentation_system`
- `content_script`
- `youtube_source`
- `recruiting_proof`
- `marketmasters_training`
- `steve_personal_brand`
- `unchained_monetization`
- `software_product_ip`
- `archive_only`
- `sensitive_skip`

## First Crawler Bite

The first safe Drive crawler should:

- accept a root folder ID and a crawl target key
- list direct children only
- store folder/file metadata, MIME type, modified time, owner, URL, parent, and skip reason
- export Google Docs as text only where the delegated reader has access
- skip Sheets, Slides, PDFs, videos, audio, shortcuts, and unknown binary files in v1 with explicit skip reasons
- avoid LLM calls until inventory and evidence links are captured
- produce a review report instead of moving/copying anything

## Course-Building Note

Presentations are likely one of the highest-value first corpora. Buyer, seller, and buy-sell presentation assets should eventually become end-to-end training/course outlines. Foundation should extract and classify the material; course production belongs to the right hub after Foundation preserves source links and sensitivity boundaries.
