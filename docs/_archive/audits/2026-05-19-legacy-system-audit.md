# Legacy System Audit - 2026-05-19

Card: `LEGACY-SYSTEM-AUDIT-001`
Closeout key: `legacy-system-audit-v1`

## Summary

- Roots represented: 6
- Roots present: 6
- Files scanned: 4923
- Evidence found: 44/44
- Findings classified: 18
- Promoted cards checked: 22
- Privacy boundary: sanitized metadata and classification only; no raw credentials, private messages, media, or old runtime state copied

## Boundaries

- Old code imported: no
- Old agents run: no
- Old roots mutated: no
- Private runtime content copied: no
- External writes: no
- Credential/provider mutation: no

## BCrew-Buddy old operating system

- Root: `~/bcrew-buddy-reference`
- Posture: pattern_harvest
- Present: yes
- Files scanned: 1850
- Top extensions: .md=1274, .png=190, .cjs=160, .ts=91, .otf=24, .json=22, .js=22, .pdf=14, [none]=11, .html=8, .sh=6, .tsx=5

### Evidence

- found ~/bcrew-buddy-reference/docs/agent-inventory.md (file, 22586B, sha256 baaef085f41e...)
- found ~/bcrew-buddy-reference/docs/team-reference.md (file, 6422B, sha256 b8eb2150bd77...)
- found ~/bcrew-buddy-reference/docs/architecture/intelligence-loop.md (file, 1260B, sha256 92dfc3e7d5b0...)
- found ~/bcrew-buddy-reference/docs/system-capabilities.md (file, 28224B, sha256 538a06ce0ca4...)
- found ~/bcrew-buddy-reference/archive/review-loop-architecture.md (file, 3385B, sha256 89bc34d6ed0a...)
- found ~/bcrew-buddy-reference/archive/full_audit.cjs (file, 1174B, sha256 d73414585cab...)
- found ~/bcrew-buddy-reference/archive/batch-youtube-extract.cjs (file, 5969B, sha256 0f678798d4d0...)
- found ~/bcrew-buddy-reference/archive/fire-scouts.cjs (file, 7478B, sha256 1d2cc8ab74e9...)
- found ~/bcrew-buddy-reference/scripts/atom-extractor.cjs (file, 6124B, sha256 e44143223c57...)
- found ~/bcrew-buddy-reference/src/web-extractor.ts (file, 21474B, sha256 7531ad459223...)

### Salvage Disposition

- **promote**: source scan -> scored finding -> director synthesis -> action/backlog loop -> `STRATEGIC-INTEL-001`, `INTEL-SCOPER-001`, `DECISION-008`
- **backlog**: browser/page/video extraction kernel should be rebuilt under governed source posture -> `WEB-GODMODE-001`, `LOOM-001`, `SKOOL-WORKER-001`, `MYICRO-TRAINING-001`
- **reject**: free-floating agent sprawl and report piles without owner/action routing

## Old BCrew skill/team library

- Root: `~/.inspection/bcrew-skills`
- Posture: skill_contract_harvest
- Present: yes
- Files scanned: 2577
- Top extensions: .py=768, .pyc=763, .js=316, .md=308, .h=109, [none]=85, .pxi=26, .txt=23, .typed=22, .pyd=21, .pxd=16, .cpp=15

### Evidence

- found ~/.inspection/bcrew-skills/bcrew-director-intelligence/SKILL.md (file, 13137B, sha256 6f1f1f1addc6...)
- found ~/.inspection/bcrew-skills/bcrew-course-scout/SKILL.md (file, 14438B, sha256 396f7254cf57...)
- found ~/.inspection/bcrew-skills/bcrew-external-scout/SKILL.md (file, 11864B, sha256 32a3271ac4c9...)
- found ~/.inspection/bcrew-skills/bcrew-internal-email/SKILL.md (file, 13805B, sha256 ef31fbf8c579...)
- found ~/.inspection/bcrew-skills/bcrew-internal-slack/SKILL.md (file, 11741B, sha256 2dc2832828ae...)
- found ~/.inspection/bcrew-skills/bcrew-internal-meetings/SKILL.md (file, 13541B, sha256 cb60b33daf0b...)
- found ~/.inspection/bcrew-skills/bcrew-strategy/SKILL.md (file, 5816B, sha256 937be7985cad...)
- found ~/.inspection/bcrew-skills/knowledge/intelligence-sources.md (file, 5352B, sha256 0222cbff7c15...)
- found ~/.inspection/bcrew-skills/knowledge/company-meetings.md (file, 9486B, sha256 45846e446fe3...)

### Salvage Disposition

- **promote**: role/team skill contracts and evaluation assertions as reusable agent contract inputs -> `PILLAR-5-AGENT-INVENTORY-001`, `ROLE-ASSISTANT-CONTRACTS-001`
- **source_note**: internal email/slack/meeting/source scout boundaries inform shared communications contracts -> `SOURCE-019`, `SOURCE-020`
- **reject**: skill memory/state files as active truth; generated inventory must own status

## FUB/Zahnd processor and SQL schema

- Root: `~/.inspection/FUBZahnd`
- Posture: schema_pattern_harvest
- Present: yes
- Files scanned: 91
- Top extensions: .sql=55, .cs=25, .dll=3, .config=2, .pdb=2, .csproj=1, .user=1, .vspscc=1, .pfx=1

### Evidence

- found ~/.inspection/FUBZahnd/FUBProcessor.cs (file, 101299B, sha256 ee79534e9be0...)
- found ~/.inspection/FUBZahnd/Program.cs (file, 377B, sha256 3da2ce3abb4d...)
- found ~/.inspection/FUBZahnd/Models/People.cs (file, 3626B, sha256 72d8e3252d0c...)
- found ~/.inspection/FUBZahnd/Models/Deals.cs (file, 1596B, sha256 9d05f476fb0b...)
- found ~/.inspection/FUBZahnd/Models/Tasks.cs (file, 1263B, sha256 02cd26b265b1...)
- found ~/.inspection/FUBZahnd/Database/fub/Tables/Person.sql (file, 3022B, sha256 245c7ae80cf3...)
- found ~/.inspection/FUBZahnd/Database/fub/Tables/Deal.sql (file, 2513B, sha256 a0b91be166a6...)
- found ~/.inspection/FUBZahnd/Database/fub/Stored Procedures/up_GSheetRetrievePeople.sql (file, 14901B, sha256 8609dbfa5c99...)
- found ~/.inspection/FUBZahnd/Database/fub/Stored Procedures/up_RetrieveDealStageSummary.sql (file, 9211B, sha256 b0d7b47ab754...)

### Salvage Disposition

- **source_note**: FUB SQL/table/procedure shape is evidence for connector/source contracts only -> `SOURCE-012`, `SOURCE-020`
- **backlog**: deal/person/task data model mapping belongs in source trust and extraction adapter hardening -> `DATA-002`, `SOURCE-020`
- **reject**: old .NET processor/runtime code import; rebuild adapters in current governed runtime only

## Zahnd/Benson dashboard prototype

- Root: `~/.inspection/zahnd-team-dashboard`
- Posture: ui_and_kpi_pattern_harvest
- Present: yes
- Files scanned: 280
- Top extensions: .tsx=117, .sql=70, .ts=29, .txt=19, .png=12, .json=7, [none]=4, .md=4, .js=2, .avif=2, .webp=2, .py=2

### Evidence

- found ~/.inspection/zahnd-team-dashboard/ARCHITECTURE.md (file, 14031B, sha256 0dcb41adf532...)
- found ~/.inspection/zahnd-team-dashboard/index.html (file, 1072B, sha256 f57fdf9ca080...)
- found ~/.inspection/zahnd-team-dashboard/src/App.tsx (file, 11950B, sha256 cca92e6094e6...)
- found ~/.inspection/zahnd-team-dashboard/src/main.tsx (file, 158B, sha256 4ab69149fdd7...)
- found ~/.inspection/zahnd-team-dashboard/src/components (directory, 0B)
- found ~/.inspection/zahnd-team-dashboard/src/pages (directory, 0B)
- found ~/.inspection/zahnd-team-dashboard/package.json (file, 2736B, sha256 a1a6ebb22eda...)

### Salvage Disposition

- **promote**: resource-center/dashboard IA patterns can inform live source-backed operator surfaces -> `DATA-003`, `FOUNDATION-OPERATOR-PULSE-001`
- **evidence_only**: built dist assets and node_modules are evidence only, not source truth
- **reject**: static dashboard copy as current operational truth

## OpenClaw local workspace/runtime

- Root: `~/.openclaw`
- Posture: metadata_only_runtime_boundary
- Present: yes
- Files scanned: 121
- Top extensions: .jsonl=66, .json=19, .jpg=10, .md=7, .sqlite=3, .sqlite-shm=2, .sqlite-wal=2, .log=2, .html=1, .ogg=1, .bak=1, .1=1

### Evidence

- found ~/.openclaw/workspace/AGENTS.md (file, 7674B, metadata-only)
- found ~/.openclaw/workspace/SOUL.md (file, 1747B, metadata-only)
- found ~/.openclaw/workspace/TOOLS.md (file, 860B, metadata-only)
- found ~/.openclaw/workspace/HEARTBEAT.md (file, 193B, metadata-only)
- found ~/.openclaw/openclaw.json (file, 792B, metadata-only)
- found ~/.openclaw/logs/config-health.json (file, 582B, metadata-only)

### Salvage Disposition

- **promote**: local workspace doctrine around memory, heartbeat, identity, and tool boundaries -> `MEMORY-003`, `MEMORY-004`, `FOUNDATION-DEEP-AUDITOR-REAL-LOOP-001`
- **approval_bound**: runtime configs, credentials, message media, and local memory stay metadata-only unless explicitly approved
- **reject**: copying local runtime state into repo docs or treating it as shared truth

## Unchained Realtor product strategy notes

- Root: `~/unchained-realtor`
- Posture: business_strategy_harvest
- Present: yes
- Files scanned: 4
- Top extensions: .md=4

### Evidence

- found ~/unchained-realtor/ME.md (file, 3792B, sha256 05a5e8022b40...)
- found ~/unchained-realtor/STRATEGY.md (file, 15725B, sha256 2e5e353d9903...)
- found ~/unchained-realtor/BACKLOG.md (file, 13633B, sha256 65941b595a88...)

### Salvage Disposition

- **promote**: Steve-facing content/product strategy should route to source-backed strategic intelligence and content atoms -> `STRATEGIC-INTEL-001`, `DATA-003`
- **backlog**: Top Dollar / Unchained extraction belongs behind approved source scope and content rights -> `WEB-GODMODE-001`, `DRIVE-WORKER-001`
- **evidence_only**: private product notes are local evidence until promoted into source-backed product backlog truth

## Promoted Live Cards

- `OLD-SYSTEM-RESEARCH-TEAM-HARVEST-001`: done / P0 / Harvest old research and scout team patterns before rebuilding extraction intelligence
- `WEB-GODMODE-001`: done / P0 / Build governed website GOD-mode extraction worker
- `LOOM-001`: scoped / P1 / Validate authorized Loom extraction path
- `MEETING-VIDEO-001`: scoped / P0 / Review videos and recordings linked from meeting notes
- `SKOOL-WORKER-001`: scoped / P0 / Build the Skool source contract and crawler worker
- `MYICRO-TRAINING-001`: scoped / P0 / Validate Mycro paid-training app extraction lane
- `DRIVE-WORKER-001`: done / P1 / Build the Google Drive inventory and extraction worker
- `BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001`: done / P1 / Create Build Intel extraction review queue for daily learning atoms
- `SOURCE-012`: done / P0 / Make source contracts and connectors visible as separate live layers
- `SOURCE-019`: done / P1 / Build the shared communications ingestion and synthesis layer
- `SOURCE-020`: done / P1 / Port and harden the shared communications source adapters
- `DATA-002`: done / P1 / Build source trust scoring layer
- `DATA-003`: research / P0 / Render live source-backed values across the system
- `STRATEGIC-INTEL-001`: scoped / P0 / Define the continuous Strategic Intelligence loop
- `DECISION-008`: scoped / P0 / Promote atom-raised issues into accountability doctrine
- `INTEL-SCOPER-001`: scoped / P0 / Build the gap-resolving Scoper
- `FOUNDATION-DEEP-AUDITOR-REAL-LOOP-001`: done / P0 / Make nightly deep auditor execute real senior review or clearly degrade
- `FOUNDATION-OPERATOR-PULSE-001`: done / P0 / Build one Steve-facing Foundation operator pulse surface
- `PILLAR-5-AGENT-INVENTORY-001`: done / P1 / Generate live agent and job inventory with honest status
- `ROLE-ASSISTANT-CONTRACTS-001`: done / P0 / Define role-specific assistant contracts
- `MEMORY-003`: done / P1 / Capture full conversations in a browsable archive
- `MEMORY-004`: done / P1 / Turn archived conversations into lessons learned and reusable IP

## Senior Call

Keep the old-system gold as patterns, schemas, source notes, specs, and backlog truth. Do not copy old runtime code or agent sprawl. The next active card should use this salvage map to define the strategic intelligence loop, not restart broad extraction or Value Builder split.
