# System Capabilities

Generated artifact. Do not hand-edit capability truth here; regenerate through `process:pillar-4-system-capabilities-check`.

Generated at: 2026-05-20T00:34:17.859Z
Card: PILLAR-4-SYSTEM-CAPABILITIES-001
Closeout: pillar-4-system-capabilities-v1

## Summary

- Capability rows: 13
- Source contracts: 42
- Source connectors: 16
- Foundation surfaces: 96
- Backing APIs: 22
- Governed jobs: 40
- Runtime skills: 6
- Runtime plugins: 9
- Provider/tool capabilities registered but blocked: 4

## Boundaries

- Generated from source contracts, surface map, job definitions, `/api/system-inventory`, provider/tool registry, and agent capability registry.
- Provider/tool registration does not approve runtime use.
- Agent capability declaration does not approve live agent runtime.
- Runtime plugins are capabilities, not source-truth signoff.
- Private local memory remains metadata-only and is not copied into this artifact.

## Capability Rows

| Capability | Category | Status | Owner | Source Refs | Next Action |
| --- | --- | --- | --- | --- | --- |
| Source contract registry | source_truth | generated_from_source_contracts | Foundation Source Truth | lib/source-contracts.js:getSourceContracts | Use source contract IDs as capability provenance; do not treat docs or plugins as source signoff. |
| Source connector registry | source_connectors | generated_from_source_contracts | Foundation Source Truth | lib/source-contracts.js:getSourceConnectors | Keep connector status separate from source contract trust and extraction freshness. |
| System service area map | source_truth | generated_from_grouped_source_systems | Foundation Source Truth | lib/source-contracts.js:getGroupedSourceSystems | Use grouped source systems to show which service areas have source, connector, and job coverage. |
| Foundation surface and route inventory | operator_surface | generated_from_surface_map | Foundation UI / Control Plane | lib/foundation-surface-map.js:getFoundationSurfaceMap | Capabilities must stay tied to served surfaces and backing APIs instead of stale markdown claims. |
| Foundation governed job definitions | runtime_jobs | generated_from_job_definitions | Foundation Runtime | lib/foundation-jobs.js:getFoundationJobDefinitions | Use governed job definitions and ledgers for runtime capability truth; do not infer from chat. |
| Runtime skills inventory | runtime_capabilities | generated_from_system_inventory_api | Foundation Runtime | /api/system-inventory:skills | Keep skill inventory generated from local runtime discovery. |
| Runtime plugins and MCP inventory | runtime_capabilities | generated_from_system_inventory_api | Foundation Runtime | /api/system-inventory:plugins | Keep plugin state separated from source-truth and external-write approval. |
| Workspace identity and private-memory boundary | privacy_boundary | healthy | Foundation Privacy | /api/system-inventory:identity<br>lib/foundation-identity-surface.js | Preserve metadata-only private boundary while generating operator capability truth. |
| Fal media_generation_provider | provider_tool_capability | registered_blocked | Foundation / Steve approval required | lib/foundation-up-capability-registry.js:buildFoundationUpCapabilityRegistry<br>FOUNDATION-UP-CAPABILITY-REGISTRY-001 | Do not call provider/tool capability until a separate approval card grants runtime use. |
| ElevenLabs voice_generation_provider | provider_tool_capability | registered_blocked | Foundation / Steve approval required | lib/foundation-up-capability-registry.js:buildFoundationUpCapabilityRegistry<br>FOUNDATION-UP-CAPABILITY-REGISTRY-001 | Do not call provider/tool capability until a separate approval card grants runtime use. |
| Canva design_platform_api | provider_tool_capability | registered_blocked | Foundation / Marketing source owner | lib/foundation-up-capability-registry.js:buildFoundationUpCapabilityRegistry<br>FOUNDATION-UP-CAPABILITY-REGISTRY-001 | Do not call provider/tool capability until a separate approval card grants runtime use. |
| Local terminal local_shell_worker | provider_tool_capability | registered_blocked | Foundation builder/orchestrator | lib/foundation-up-capability-registry.js:buildFoundationUpCapabilityRegistry<br>FOUNDATION-UP-CAPABILITY-REGISTRY-001 | Do not call provider/tool capability until a separate approval card grants runtime use. |
| Agent capability registry | agent_capability | read_only_declared | Foundation Agent Runtime | lib/agent-capability-registry.js:buildAgentCapabilityRegistry<br>AGENT-CAPABILITY-REGISTRY-001 | Use PILLAR-5 to generate the detailed agent inventory from this registry and old-system audit truth. |

## Not Next

- Do not hand-maintain capability truth outside the generated artifact.
- Do not approve runtime/provider/agent capability use in this card.
- Do not call providers, spend credits, launch workers, start live extraction, or mutate external systems.
- Do not copy private local memory, secret values, raw credentials, or token values into generated outputs.
- Do not build the agent inventory detail surface; that is PILLAR-5.
- Do not start Value Builder split.
