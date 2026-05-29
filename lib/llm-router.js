import { spawn } from 'node:child_process'
import {
  createLlmCall,
  finishLlmCall,
  getLlmRuntimeSnapshot,
  upsertLlmCredential,
  upsertLlmRoute,
} from './foundation-db.js'
import { assertDirectOpenAiResponsesAllowed } from './llm-spend-policy.js'

export const LLM_AUTH_PATHS = {
  API_DIRECT: 'api_direct',
  CLAUDE_CODE_SUBSCRIPTION: 'claude_code_subscription',
  CLAUDE_CODE_OAUTH_TOKEN: 'claude_code_oauth_token',
  CLAUDE_AGENT_SDK: 'claude_agent_sdk',
  CHATGPT_SUBSCRIPTION_GATEWAY: 'chatgpt_subscription_gateway',
  CODEX_SUBSCRIPTION: 'codex_subscription',
  GEMINI_API_DIRECT: 'gemini_api_direct',
  MANUAL_INTERACTIVE: 'manual_interactive',
}

export const LLM_WORKLOADS = {
  EXTRACTION: 'extraction',
  SYNTHESIS: 'synthesis',
  EMBEDDING: 'embedding',
  DEEP_AUDIT_SENIOR_REVIEW: 'deep_audit_senior_review',
  AGENT: 'agent',
  VIDEO_VISION: 'video_vision',
}

const CLAUDE_CODE_EXECUTION_ALLOW_FLAG = 'LLM_CLAUDE_CODE_ALLOW_EXECUTION'
const DEFAULT_OPENCLAW_MODEL = process.env.LLM_OPENCLAW_MODEL || 'openai-codex/gpt-5.4'
const DEFAULT_CODEX_DIRECT_MODEL = process.env.LLM_CODEX_DIRECT_MODEL || 'gpt-5.5'
const DEFAULT_INTELLIGENCE_SPINE_MODEL = process.env.LLM_INTELLIGENCE_SPINE_MODEL ||
  process.env.LLM_DEEP_AUDIT_MODEL ||
  process.env.LLM_SYNTHESIS_MODEL ||
  DEFAULT_CODEX_DIRECT_MODEL
const DEFAULT_CLAUDE_CODE_REVIEW_MODEL = process.env.LLM_CLAUDE_CODE_REVIEW_MODEL || process.env.LLM_AGENT_MODEL || 'default-claude-code-model'
const DEFAULT_GEMINI_VIDEO_MODEL = process.env.LLM_GEMINI_VIDEO_MODEL || 'gemini-3.5-flash'
const DEFAULT_GEMINI_VIDEO_FALLBACK_MODEL = process.env.LLM_GEMINI_VIDEO_FALLBACK_MODEL || 'gemini-2.5-flash-lite'
const DEFAULT_SOURCE_AGENTIC_BROWSER_STAGEHAND_MODEL = process.env.LLM_SOURCE_AGENTIC_BROWSER_STAGEHAND_MODEL || 'gpt-4.1-mini'
const OPENCLAW_GLOBALLY_BLOCKED = true
const OPENCLAW_EXTRACTION_ALLOWED = !OPENCLAW_GLOBALLY_BLOCKED && process.env.LLM_OPENCLAW_ALLOW_EXTRACTION === 'true'
const OPENCLAW_SYNTHESIS_ALLOWED = !OPENCLAW_GLOBALLY_BLOCKED && process.env.LLM_OPENCLAW_ALLOW_SYNTHESIS === 'true'
const OPENCLAW_ALLOWED_WORKLOADS = [
  ...(OPENCLAW_EXTRACTION_ALLOWED ? [LLM_WORKLOADS.EXTRACTION] : []),
  ...(OPENCLAW_SYNTHESIS_ALLOWED ? [LLM_WORKLOADS.SYNTHESIS, LLM_WORKLOADS.DEEP_AUDIT_SENIOR_REVIEW] : []),
  'extraction_probe',
  'classification_probe',
  'synthesis_probe',
]
const OPENCLAW_ADAPTER_BOUNDARY_METADATA = {
  architectureRole: 'provider_adapter',
  architectureOwner: false,
  adapterOnly: true,
  coreDependencyAllowed: false,
  provider: 'openclaw',
  authPath: LLM_AUTH_PATHS.CHATGPT_SUBSCRIPTION_GATEWAY,
  boundary: 'Foundation OS -> Brain Fleet / LLM Router -> Provider Adapters -> Agents / Workers',
  requiredPosture: 'useful_when_proven_not_architecture_owner',
  knownLimitations: [
    'openclaw_gateway_currently_limits_model_selection',
    'chatgpt_subscription_gateway_is_local_operator_tooling_not_generic_backend_api',
    'quota_reset_state_not_proven_by_openclaw_adapter_boundary',
    'exact_source_approval_and_brain_fleet_ledger_required_before_extractor_use',
    'non_openclaw_fallback_required_for_core_workloads',
  ],
}

function buildOpenClawAdapterMetadata({ routeKey = '', workload = '', fallbackRouteKey = '', authPosture = 'probe_required' } = {}) {
  return {
    openclawAdapterBoundary: {
      ...OPENCLAW_ADAPTER_BOUNDARY_METADATA,
      routeKey,
      workload,
      fallbackRouteKey,
    },
    brainFleetCapability: {
      speedMode: 'standard',
      reasoningPosture: workload === LLM_WORKLOADS.SYNTHESIS || workload === LLM_WORKLOADS.DEEP_AUDIT_SENIOR_REVIEW ? 'high' : 'standard',
      supports: {
        video: 'unsupported',
        vision: 'unsupported',
        longContext: 'probe_required',
      },
      authPosture,
      allowedWorkloads: [workload, 'extraction_probe', 'classification_probe', 'synthesis_probe', 'deep_audit_probe'].filter(Boolean),
      knownLimitations: OPENCLAW_ADAPTER_BOUNDARY_METADATA.knownLimitations,
    },
    knownLimitations: OPENCLAW_ADAPTER_BOUNDARY_METADATA.knownLimitations,
  }
}

export const DEFAULT_LLM_CREDENTIALS = [
  {
    credentialKey: 'claude-code-local-max',
    provider: 'claude_code',
    authPath: LLM_AUTH_PATHS.CLAUDE_CODE_SUBSCRIPTION,
    displayName: 'Local Claude Code Max Login',
    accountLabel: 'local claude login',
    hubKey: 'foundation',
    workloadLane: 'agent',
    secretRef: 'local_claude_code_auth',
    status: 'unknown',
    policyClassification: 'experimental',
    allowedWorkloads: ['manual_interactive', 'synthesis_probe', 'agent_probe', 'deep_audit_probe', 'coding_review', 'code_review_probe'],
    metadata: {
      brainFleetCapability: {
        speedMode: 'standard',
        reasoningPosture: 'coding_review_agent',
        supports: {
          video: 'unsupported',
          vision: 'probe_required',
          longContext: 'probe_required',
        },
        authPosture: 'probe_required',
        allowedWorkloads: ['manual_interactive', 'synthesis_probe', 'agent_probe', 'deep_audit_probe', 'coding_review', 'code_review_probe'],
        knownLimitations: [
          'bounded_claude_code_review_route_probe_required_before_use',
          'experimental_local_tooling_route_not_generic_backend_api',
          'extractor_v1_not_blocked_on_claude_ambiguity',
          'quota_reset_state_not_exposed_by_claude_code_json_output',
        ],
      },
    },
    notes: 'Native Claude Code subscription auth for bounded local code-review route probes. Experimental; do not route through OpenClaw or scheduled automation without a later policy promotion.',
  },
  {
    credentialKey: 'claude-code-oauth-token',
    provider: 'claude_code',
    authPath: LLM_AUTH_PATHS.CLAUDE_CODE_OAUTH_TOKEN,
    displayName: 'Claude Code OAuth Token',
    accountLabel: 'setup-token route',
    hubKey: 'foundation',
    workloadLane: 'synthesis',
    secretRef: 'CLAUDE_CODE_OAUTH_TOKEN',
    status: 'unknown',
    policyClassification: 'experimental',
    allowedWorkloads: ['synthesis_probe', 'agent_probe', 'deep_audit_probe'],
    notes: 'Setup-token/OAuth route. Requires explicit policy classification before scheduled jobs use it.',
  },
  {
    credentialKey: 'openclaw-chatgpt-pro',
    provider: 'openclaw',
    authPath: LLM_AUTH_PATHS.CHATGPT_SUBSCRIPTION_GATEWAY,
    displayName: 'OpenClaw ChatGPT Pro Gateway',
    accountLabel: 'local OpenClaw gateway',
    hubKey: 'foundation',
    workloadLane: 'extraction',
    secretRef: 'OPENCLAW_GATEWAY_URL',
    status: 'blocked',
    policyClassification: 'blocked',
    allowedWorkloads: [],
    metadata: buildOpenClawAdapterMetadata({
      routeKey: 'openclaw-chatgpt-pro',
      workload: 'gateway_credential',
      authPosture: 'blocked',
    }),
    notes: 'OpenClaw is blocked as a system route. It may remain installed for manual/local experiments, but Foundation must not schedule it for extraction, synthesis, Director, or deep-review work.',
  },
  {
    credentialKey: 'codex-direct-chatgpt-local',
    provider: 'codex',
    authPath: LLM_AUTH_PATHS.CODEX_SUBSCRIPTION,
    displayName: 'Local Codex ChatGPT Login',
    accountLabel: 'local Codex ChatGPT login',
    hubKey: 'foundation',
    workloadLane: 'agent',
    secretRef: 'local_codex_chatgpt_auth',
    status: 'unknown',
    policyClassification: 'experimental',
    allowedWorkloads: [LLM_WORKLOADS.AGENT, 'agent_probe', 'coding_review', 'deep_audit_probe'],
    notes: 'Direct local Codex CLI subscription route. Bounded coding-agent/tooling route only; not a generic backend API or extraction runtime.',
  },
  {
    credentialKey: 'openai-api-default',
    provider: 'openai',
    authPath: LLM_AUTH_PATHS.API_DIRECT,
    displayName: 'OpenAI API Default',
    accountLabel: 'OPENAI_API_KEY',
    hubKey: 'foundation',
    workloadLane: 'extraction',
    secretRef: 'OPENAI_API_KEY',
    status: 'unknown',
    policyClassification: 'api_fallback',
    allowedWorkloads: [LLM_WORKLOADS.EXTRACTION, LLM_WORKLOADS.SYNTHESIS, LLM_WORKLOADS.DEEP_AUDIT_SENIOR_REVIEW, LLM_WORKLOADS.EMBEDDING, 'transcription', 'image_generation'],
    notes: 'Official API fallback. Current extraction/synthesis scripts use this path until router migration.',
  },
  {
    credentialKey: 'anthropic-api-default',
    provider: 'anthropic',
    authPath: LLM_AUTH_PATHS.API_DIRECT,
    displayName: 'Anthropic API Default',
    accountLabel: 'ANTHROPIC_API_KEY',
    hubKey: 'foundation',
    workloadLane: 'synthesis',
    secretRef: 'ANTHROPIC_API_KEY',
    status: 'unknown',
    policyClassification: 'api_fallback',
    allowedWorkloads: [LLM_WORKLOADS.SYNTHESIS, LLM_WORKLOADS.DEEP_AUDIT_SENIOR_REVIEW, LLM_WORKLOADS.AGENT, 'vision'],
    notes: 'Official production-safe Claude API fallback.',
  },
  {
    credentialKey: 'gemini-api-default',
    provider: 'gemini',
    authPath: LLM_AUTH_PATHS.GEMINI_API_DIRECT,
    displayName: 'Gemini API Default',
    accountLabel: 'GEMINI_API_KEY',
    hubKey: 'foundation',
    workloadLane: 'vision',
    secretRef: 'GEMINI_API_KEY',
    status: 'unknown',
    policyClassification: 'api_fallback',
    allowedWorkloads: [LLM_WORKLOADS.VIDEO_VISION, 'vision_probe', 'video_probe', 'long_context_probe', 'public_youtube_video_probe', 'build_intel_video_extract_probe'],
    metadata: {
      brainFleetCapability: {
        speedMode: 'vision',
        reasoningPosture: 'vision_multimodal',
        supports: {
          video: 'probe_required',
          vision: 'probe_required',
          longContext: 'probe_required',
        },
        authPosture: 'probe_required',
        allowedWorkloads: [LLM_WORKLOADS.VIDEO_VISION, 'vision_probe', 'video_probe', 'long_context_probe', 'public_youtube_video_probe', 'build_intel_video_extract_probe'],
        knownLimitations: [
          'bounded_gemini_route_probe_required_before_extraction',
          'no_private_or_paid_video_source_without_explicit_steve_approval',
          'quota_tier_may_remain_unknown_unless_provider_exposes_it',
        ],
      },
    },
    notes: 'Direct Gemini API route for video/vision and long-context workloads. Requires bounded Brain Fleet ledger proof, Harlan auth-needed handling, exact source approval, and no credential mutation.',
  },
  {
    credentialKey: 'manual-interactive-builder',
    provider: 'manual',
    authPath: LLM_AUTH_PATHS.MANUAL_INTERACTIVE,
    displayName: 'Manual Interactive Builder Session',
    accountLabel: 'builder-driven',
    hubKey: 'foundation',
    workloadLane: 'manual',
    secretRef: null,
    status: 'available',
    policyClassification: 'manual_only',
    allowedWorkloads: ['coding_review', 'manual_strategy_review'],
    notes: 'Human-driven Codex/Claude/ChatGPT work. Not a backend automation route.',
  },
]

export const DEFAULT_LLM_ROUTES = [
  {
    routeKey: 'foundation-extraction-openai-api',
    workload: 'extraction',
    hubKey: 'foundation',
    priority: 90,
    provider: 'openai',
    model: process.env.LLM_EXTRACTION_MODEL || DEFAULT_INTELLIGENCE_SPINE_MODEL,
    authPath: LLM_AUTH_PATHS.API_DIRECT,
    credentialKey: 'openai-api-default',
    fallbackRouteKey: null,
    status: 'probe_required',
    policyClassification: 'api_fallback',
    riskClass: 'low',
    metadata: {
      brainFleetCapability: {
        speedMode: 'quality',
        reasoningPosture: 'extra_high_required',
        supports: {
          video: 'unsupported',
          vision: 'unsupported',
          longContext: 'probe_required',
        },
        authPosture: 'probe_required',
        allowedWorkloads: [LLM_WORKLOADS.EXTRACTION, 'shared_comms_extraction', 'candidate_extraction', 'text_source_extraction'],
        knownLimitations: [
          'official_api_capacity_required_for_core_text_extraction',
          'video_visual_understanding_requires_foundation_video_gemini_api',
          'human_approval_required_before_routes_mutate_destination_ledgers',
        ],
      },
      intelligenceSpinePolicy: {
        lane: 'core_extraction',
        requiredPosture: 'gpt-5.5_extra_high_quality',
        openClawPrimaryAllowed: false,
      },
    },
    notes: 'Primary official high-intelligence route for text extraction. Cheap or subscription routes must be explicitly approved before scheduled use.',
  },
  {
    routeKey: 'foundation-extraction-openclaw-chatgpt',
    workload: 'extraction',
    hubKey: 'foundation',
    priority: 95,
    provider: 'openclaw',
    model: process.env.LLM_OPENCLAW_EXTRACTION_MODEL || DEFAULT_OPENCLAW_MODEL,
    authPath: LLM_AUTH_PATHS.CHATGPT_SUBSCRIPTION_GATEWAY,
    credentialKey: 'openclaw-chatgpt-pro',
    fallbackRouteKey: 'foundation-extraction-openai-api',
    status: 'blocked',
    policyClassification: 'blocked',
    riskClass: 'blocked',
    metadata: buildOpenClawAdapterMetadata({
      routeKey: 'foundation-extraction-openclaw-chatgpt',
      workload: LLM_WORKLOADS.EXTRACTION,
      fallbackRouteKey: 'foundation-extraction-openai-api',
      authPosture: 'blocked',
    }),
    notes: 'OpenClaw is blocked for extraction. Use approved API/provider routes for automated extraction and keep any OpenClaw use manual until a future approved policy changes this.',
  },
  {
    routeKey: 'foundation-synthesis-openai-api',
    workload: 'synthesis',
    hubKey: 'foundation',
    priority: 5,
    provider: 'openai',
    model: DEFAULT_INTELLIGENCE_SPINE_MODEL,
    authPath: LLM_AUTH_PATHS.API_DIRECT,
    credentialKey: 'openai-api-default',
    fallbackRouteKey: null,
    status: 'probe_required',
    policyClassification: 'api_fallback',
    riskClass: 'low',
    metadata: {
      brainFleetCapability: {
        speedMode: 'quality',
        reasoningPosture: 'extra_high_required',
        supports: {
          video: 'unsupported',
          vision: 'unsupported',
          longContext: 'probe_required',
        },
        authPosture: 'probe_required',
        allowedWorkloads: [LLM_WORKLOADS.SYNTHESIS, LLM_WORKLOADS.DEEP_AUDIT_SENIOR_REVIEW, 'director_synthesis', 'intelligence_spine'],
        knownLimitations: [
          'official_api_capacity_required_for_core_intelligence_spine',
          'openclaw_5_4_medium_is_not_allowed_as_primary_director_or_synthesis_brain',
          'human_approval_required_before_routes_mutate_destination_ledgers',
        ],
      },
      intelligenceSpinePolicy: {
        lane: 'core_intelligence',
        requiredPosture: 'gpt-5.5_extra_high_quality',
        openClawPrimaryAllowed: false,
      },
    },
    notes: 'Primary official high-intelligence route for the core Intelligence Spine. Use quality mode by default; do not use OpenClaw 5.4/medium as the Director or synthesis brain.',
  },
  {
    routeKey: 'foundation-synthesis-openclaw-chatgpt',
    workload: 'synthesis',
    hubKey: 'foundation',
    priority: 95,
    provider: 'openclaw',
    model: process.env.LLM_OPENCLAW_SYNTHESIS_MODEL || DEFAULT_OPENCLAW_MODEL,
    authPath: LLM_AUTH_PATHS.CHATGPT_SUBSCRIPTION_GATEWAY,
    credentialKey: 'openclaw-chatgpt-pro',
    fallbackRouteKey: 'foundation-synthesis-openai-api',
    status: 'blocked',
    policyClassification: 'blocked',
    riskClass: 'blocked',
    metadata: buildOpenClawAdapterMetadata({
      routeKey: 'foundation-synthesis-openclaw-chatgpt',
      workload: LLM_WORKLOADS.SYNTHESIS,
      fallbackRouteKey: 'foundation-synthesis-openai-api',
      authPosture: OPENCLAW_SYNTHESIS_ALLOWED ? 'available' : 'probe_required',
    }),
    notes: OPENCLAW_SYNTHESIS_ALLOWED
      ? 'OpenClaw is adapter-only. Subscription route may support bounded internal synthesis after local operator opt-in, but it is not allowed as the primary Intelligence Spine/Director brain; official high-intelligence route stays first.'
      : 'OpenClaw is adapter-only. Candidate subscription route for shared-comms synthesis; not allowed as the primary Intelligence Spine/Director brain and must not own Foundation architecture.',
  },
  {
    routeKey: 'foundation-synthesis-claude-code',
    workload: 'synthesis',
    hubKey: 'foundation',
    priority: 20,
    provider: 'claude_code',
    model: process.env.LLM_CLAUDE_SYNTHESIS_MODEL || 'configured-claude-code-model',
    authPath: LLM_AUTH_PATHS.CLAUDE_CODE_SUBSCRIPTION,
    credentialKey: 'claude-code-local-max',
    fallbackRouteKey: 'foundation-synthesis-openai-api',
    status: 'probe_required',
    policyClassification: 'experimental',
    riskClass: 'untested',
    notes: 'Internal subscription-auth synthesis route. Requires workload-level policy classification before scheduling.',
  },
  {
    routeKey: 'foundation-synthesis-claude-oauth',
    workload: 'synthesis',
    hubKey: 'foundation',
    priority: 25,
    provider: 'claude_code',
    model: process.env.LLM_CLAUDE_SYNTHESIS_MODEL || 'configured-claude-code-model',
    authPath: LLM_AUTH_PATHS.CLAUDE_CODE_OAUTH_TOKEN,
    credentialKey: 'claude-code-oauth-token',
    fallbackRouteKey: 'foundation-synthesis-openai-api',
    status: 'probe_required',
    policyClassification: 'experimental',
    riskClass: 'untested',
    notes: 'Setup-token/OAuth candidate route for internal scripts. Requires token and policy classification before scheduling.',
  },
  {
    routeKey: 'foundation-synthesis-anthropic-api',
    workload: 'synthesis',
    hubKey: 'foundation',
    priority: 30,
    provider: 'anthropic',
    model: process.env.LLM_ANTHROPIC_SYNTHESIS_MODEL || 'configured-anthropic-synthesis-model',
    authPath: LLM_AUTH_PATHS.API_DIRECT,
    credentialKey: 'anthropic-api-default',
    fallbackRouteKey: 'foundation-synthesis-openai-api',
    status: 'probe_required',
    policyClassification: 'api_fallback',
    riskClass: 'low',
    notes: 'Official Anthropic API route. Safe production fallback once ANTHROPIC_API_KEY is configured.',
  },
  {
    routeKey: 'foundation-deep-audit-openclaw-chatgpt',
    workload: LLM_WORKLOADS.DEEP_AUDIT_SENIOR_REVIEW,
    hubKey: 'foundation',
    priority: 95,
    provider: 'openclaw',
    model: process.env.LLM_OPENCLAW_DEEP_AUDIT_MODEL || DEFAULT_OPENCLAW_MODEL,
    authPath: LLM_AUTH_PATHS.CHATGPT_SUBSCRIPTION_GATEWAY,
    credentialKey: 'openclaw-chatgpt-pro',
    fallbackRouteKey: 'foundation-deep-audit-openai-api',
    status: 'blocked',
    policyClassification: 'blocked',
    riskClass: 'blocked',
    metadata: buildOpenClawAdapterMetadata({
      routeKey: 'foundation-deep-audit-openclaw-chatgpt',
      workload: LLM_WORKLOADS.DEEP_AUDIT_SENIOR_REVIEW,
      fallbackRouteKey: 'foundation-deep-audit-openai-api',
      authPosture: OPENCLAW_SYNTHESIS_ALLOWED ? 'available' : 'probe_required',
    }),
    notes: OPENCLAW_SYNTHESIS_ALLOWED
      ? 'OpenClaw is adapter-only. Subscription route may support bounded internal deep-audit review after local operator opt-in, but it is not allowed as the primary Intelligence Spine/Director brain; official high-intelligence route stays first.'
      : 'OpenClaw is adapter-only. Candidate subscription route for deep-audit review; not allowed as the primary Intelligence Spine/Director brain and must not own Foundation architecture.',
  },
  {
    routeKey: 'foundation-deep-audit-claude-code',
    workload: LLM_WORKLOADS.DEEP_AUDIT_SENIOR_REVIEW,
    hubKey: 'foundation',
    priority: 20,
    provider: 'claude_code',
    model: process.env.LLM_CLAUDE_DEEP_AUDIT_MODEL || 'configured-claude-code-model',
    authPath: LLM_AUTH_PATHS.CLAUDE_CODE_SUBSCRIPTION,
    credentialKey: 'claude-code-local-max',
    fallbackRouteKey: 'foundation-deep-audit-openai-api',
    status: 'probe_required',
    policyClassification: 'experimental',
    riskClass: 'untested',
    notes: 'Fail-closed Claude Code CLI candidate for bounded deep-audit senior review. Requires probe, policy approval, and LLM_CLAUDE_CODE_ALLOW_EXECUTION=true before any provider call.',
  },
  {
    routeKey: 'foundation-deep-audit-openai-api',
    workload: LLM_WORKLOADS.DEEP_AUDIT_SENIOR_REVIEW,
    hubKey: 'foundation',
    priority: 5,
    provider: 'openai',
    model: DEFAULT_INTELLIGENCE_SPINE_MODEL,
    authPath: LLM_AUTH_PATHS.API_DIRECT,
    credentialKey: 'openai-api-default',
    fallbackRouteKey: null,
    status: 'probe_required',
    policyClassification: 'api_fallback',
    riskClass: 'low',
    metadata: {
      brainFleetCapability: {
        speedMode: 'quality',
        reasoningPosture: 'extra_high_required',
        supports: {
          video: 'unsupported',
          vision: 'unsupported',
          longContext: 'probe_required',
        },
        authPosture: 'probe_required',
        allowedWorkloads: [LLM_WORKLOADS.DEEP_AUDIT_SENIOR_REVIEW, LLM_WORKLOADS.SYNTHESIS, 'director_synthesis', 'intelligence_spine'],
        knownLimitations: [
          'official_api_capacity_required_for_core_intelligence_spine',
          'openclaw_5_4_medium_is_not_allowed_as_primary_director_or_synthesis_brain',
          'direct_responses_calls_require_spend_policy_allow_flag',
        ],
      },
      intelligenceSpinePolicy: {
        lane: 'core_intelligence',
        requiredPosture: 'gpt-5.5_extra_high_quality',
        openClawPrimaryAllowed: false,
      },
    },
    notes: 'Official API quality route for bounded deep-audit senior review and core Intelligence Spine review. Direct Responses calls still require the spend-policy allow flag.',
  },
  {
    routeKey: 'foundation-embedding-openai-api',
    workload: LLM_WORKLOADS.EMBEDDING,
    hubKey: 'foundation',
    priority: 10,
    provider: 'openai',
    model: process.env.LLM_EMBEDDING_MODEL || 'text-embedding-3-large',
    authPath: LLM_AUTH_PATHS.API_DIRECT,
    credentialKey: 'openai-api-default',
    fallbackRouteKey: null,
    status: 'probe_required',
    policyClassification: 'api_fallback',
    riskClass: 'low',
    notes: 'Embeddings stay API-direct; consumer subscriptions do not replace embedding APIs.',
  },
  {
    routeKey: 'foundation-video-gemini-api',
    workload: LLM_WORKLOADS.VIDEO_VISION,
    hubKey: 'foundation',
    priority: 10,
    provider: 'gemini',
    model: DEFAULT_GEMINI_VIDEO_MODEL,
    authPath: LLM_AUTH_PATHS.GEMINI_API_DIRECT,
    credentialKey: 'gemini-api-default',
    fallbackRouteKey: 'foundation-extraction-openai-api',
    status: 'probe_required',
    policyClassification: 'api_fallback',
    riskClass: 'low',
    metadata: {
      brainFleetCapability: {
        speedMode: 'vision',
        reasoningPosture: 'vision_multimodal',
        supports: {
          video: 'probe_required',
          vision: 'probe_required',
          longContext: 'probe_required',
        },
        authPosture: 'probe_required',
        allowedWorkloads: [LLM_WORKLOADS.VIDEO_VISION, 'vision_probe', 'video_probe', 'long_context_probe', 'public_youtube_video_probe', 'build_intel_video_extract_probe'],
        knownLimitations: [
          'fallback_route_is_transcript_or_text_only_not_visual_video_understanding',
          'no_broad_extraction_until_extractor_proof_card',
          'exact_source_approval_required_before_video_processing',
        ],
      },
      fallbackModel: DEFAULT_GEMINI_VIDEO_FALLBACK_MODEL,
      docs: {
        models: 'https://ai.google.dev/gemini-api/docs/models/gemini',
        video: 'https://ai.google.dev/gemini-api/docs/video-understanding',
        longContext: 'https://ai.google.dev/gemini-api/docs/long-context',
        rateLimits: 'https://ai.google.dev/gemini-api/docs/rate-limits',
      },
      fallbackContract: {
        routeKey: 'foundation-extraction-openai-api',
        mode: 'transcript_or_text_fallback_only',
        visualVideoUnderstandingFallback: false,
      },
    },
    notes: 'Default bounded Gemini route for public-video, vision, and long-context readiness. Requires ledgered route proof and exact source approval before extraction.',
  },
  {
    routeKey: 'foundation-agent-claude-code',
    workload: LLM_WORKLOADS.AGENT,
    hubKey: 'foundation',
    priority: 10,
    provider: 'claude_code',
    model: DEFAULT_CLAUDE_CODE_REVIEW_MODEL,
    authPath: LLM_AUTH_PATHS.CLAUDE_CODE_SUBSCRIPTION,
    credentialKey: 'claude-code-local-max',
    fallbackRouteKey: 'foundation-agent-codex-direct',
    status: 'probe_required',
    policyClassification: 'experimental',
    riskClass: 'untested',
    metadata: {
      brainFleetCapability: {
        speedMode: 'standard',
        reasoningPosture: 'coding_review_agent',
        supports: {
          video: 'unsupported',
          vision: 'probe_required',
          longContext: 'probe_required',
        },
        authPosture: 'probe_required',
        allowedWorkloads: [LLM_WORKLOADS.AGENT, LLM_WORKLOADS.DEEP_AUDIT_SENIOR_REVIEW, 'coding_review', 'code_review_probe', 'agent_probe', 'deep_audit_probe'],
        knownLimitations: [
          'experimental_local_tooling_route_not_generic_backend_api',
          'extractor_v1_not_blocked_on_claude_ambiguity',
          'no_extractor_or_external_write_workloads',
        ],
      },
    },
    notes: 'Bounded Claude Code review route. Probe and classify before any agent uses it; keep experimental and non-blocking for extractor v1.',
  },
  {
    routeKey: 'foundation-agent-codex-direct',
    workload: LLM_WORKLOADS.AGENT,
    hubKey: 'foundation',
    priority: 5,
    provider: 'codex',
    model: DEFAULT_CODEX_DIRECT_MODEL,
    authPath: LLM_AUTH_PATHS.CODEX_SUBSCRIPTION,
    credentialKey: 'codex-direct-chatgpt-local',
    fallbackRouteKey: 'foundation-agent-claude-code',
    status: 'probe_required',
    policyClassification: 'experimental',
    riskClass: 'untested',
    notes: 'Bounded direct Codex CLI route separate from OpenClaw. Requires Harlan auth-needed handling and Brain Fleet ledger proof before use.',
  },
  {
    routeKey: 'foundation-agent-stagehand-openai-proof',
    workload: LLM_WORKLOADS.AGENT,
    hubKey: 'foundation',
    priority: 4,
    provider: 'openai',
    model: DEFAULT_SOURCE_AGENTIC_BROWSER_STAGEHAND_MODEL,
    authPath: LLM_AUTH_PATHS.API_DIRECT,
    credentialKey: 'openai-api-default',
    fallbackRouteKey: 'foundation-agent-codex-direct',
    status: process.env.OPENAI_API_KEY ? 'available' : 'missing',
    policyClassification: 'api_fallback',
    riskClass: 'cost_guarded',
    metadata: {
      sourceAgenticBrowser: {
        adapter: 'stagehand',
        proofOnlyDefault: true,
        requiresCostPolicy: true,
        localNoModelFallback: 'source:local-browser-hands',
        browserbaseFallbackPolicy: 'bakeoff_only_with_explicit_caps',
      },
    },
    notes: 'Stagehand-compatible OpenAI provider route for proof-sized source-browser tests. Use through source-browser cost guardrails; subscription routes stay blocked for Stagehand.',
  },
]

function responseHeader(response, name) {
  if (!response?.headers?.get) return null
  return response.headers.get(name) || response.headers.get(name.toLowerCase()) || null
}

function extractModelProviderQuotaHeaders(response) {
  return Object.fromEntries(Object.entries({
    limit: responseHeader(response, 'x-ratelimit-limit'),
    remaining: responseHeader(response, 'x-ratelimit-remaining'),
    reset: responseHeader(response, 'x-ratelimit-reset'),
    retryAfter: responseHeader(response, 'retry-after'),
  }).filter(([, value]) => value !== null && value !== undefined && value !== ''))
}

function sanitizeModelProviderError(value = '') {
  return String(value || '')
    .trim()
    .replace(/key=[^&\s]+/gi, 'key=<redacted>')
    .replace(/x-goog-api-key["':=\s]+[A-Za-z0-9._-]+/gi, 'x-goog-api-key=<redacted>')
    .replace(/api[_-]?key["':=\s]+[A-Za-z0-9._-]+/gi, 'api_key=<redacted>')
    .slice(0, 900)
}

export async function callGeminiApi({
  method = 'GET',
  path = '',
  apiKey = '',
  body = null,
  timeoutMs = 90000,
  fetcher = globalThis.fetch,
} = {}) {
  if (typeof fetcher !== 'function') throw new Error('fetch is not available for Gemini API call.')
  const url = `https://generativelanguage.googleapis.com/v1beta/${path}`
  const controller = new AbortController()
  const effectiveTimeoutMs = Math.max(1000, Number(timeoutMs) || 90000)
  const timeout = setTimeout(() => controller.abort(), effectiveTimeoutMs)
  let response
  try {
    response = await fetcher(url, {
      method,
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? `Gemini API ${method} ${path} timed out after ${effectiveTimeoutMs}ms.`
      : `Gemini API ${method} ${path} request failed: ${error instanceof Error ? error.message : String(error)}`
    const wrapped = new Error(message)
    wrapped.statusCode = error?.name === 'AbortError' ? 408 : 0
    wrapped.cause = error
    throw wrapped
  } finally {
    clearTimeout(timeout)
  }
  const text = await response.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  const quotaHeaders = extractModelProviderQuotaHeaders(response)
  if (!response.ok) {
    const error = new Error(`Gemini API ${method} ${path} failed (${response.status}): ${sanitizeModelProviderError(text)}`)
    error.statusCode = response.status
    error.payload = json
    error.quotaHeaders = quotaHeaders
    throw error
  }
  return {
    ok: true,
    statusCode: response.status,
    json,
    text,
    quotaHeaders,
  }
}

export async function seedDefaultLlmRouterConfig(actor = 'system') {
  const credentials = []
  for (const credential of DEFAULT_LLM_CREDENTIALS) {
    credentials.push(await upsertLlmCredential(credential, actor))
  }

  const routes = []
  for (const route of DEFAULT_LLM_ROUTES) {
    routes.push(await upsertLlmRoute(route, actor))
  }

  return { credentials, routes }
}

export function estimateTokenCount(text) {
  const normalized = String(text || '').trim()
  if (!normalized) return 0
  return Math.ceil(normalized.length / 4)
}

function renderMessageContent(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (typeof part === 'string') return part
        if (part?.text) return part.text
        return JSON.stringify(part)
      })
      .join('\n')
  }
  return JSON.stringify(content || '')
}

function renderPrompt({ messages = [], inputText = '', responseFormat = null } = {}) {
  const lines = []
  if (inputText) lines.push(String(inputText))

  for (const message of messages || []) {
    lines.push(`\n[${String(message.role || 'user').toUpperCase()}]`)
    lines.push(renderMessageContent(message.content))
  }

  if (responseFormat?.schema) {
    lines.push('\n[OUTPUT CONTRACT]')
    lines.push('Return exactly one valid JSON object. Do not wrap it in markdown. Do not include commentary.')
    lines.push(`Schema name: ${responseFormat.name || 'response'}`)
    lines.push(JSON.stringify(responseFormat.schema))
  }

  return lines.join('\n').trim()
}

function getOpenAiResponsesOutputText(responseJson) {
  return (responseJson.output || [])
    .flatMap(item => item.content || [])
    .filter(item => item.type === 'output_text' && item.text)
    .map(item => item.text)
    .join('')
    .trim()
}

function normalizeEmbeddingInputs(input) {
  const inputs = Array.isArray(input) ? input : [input]
  return inputs
    .map(item => String(item || '').trim())
    .filter(Boolean)
}

function killProcessGroup(child, signal) {
  if (!child?.pid) return
  try {
    process.kill(-child.pid, signal)
  } catch {
    try {
      child.kill(signal)
    } catch {
      // The process may have already exited between timeout and cleanup.
    }
  }
}

async function callOpenClawModelRun({ model, prompt, timeoutMs = 120000 } = {}) {
  const result = await new Promise((resolve, reject) => {
    const child = spawn(
      'openclaw',
      ['infer', 'model', 'run', '--local', '--model', model, '--prompt', prompt, '--json'],
      {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
      },
    )
    let stdout = ''
    let stderr = ''
    let timedOut = false
    let settled = false
    let killEscalation = null
    const maxBuffer = 16 * 1024 * 1024
    const timeout = setTimeout(() => {
      timedOut = true
      killProcessGroup(child, 'SIGTERM')
      killEscalation = setTimeout(() => {
        killProcessGroup(child, 'SIGKILL')
      }, 5000)
    }, timeoutMs)

    child.stdout.on('data', chunk => {
      stdout += chunk.toString()
      if (stdout.length > maxBuffer) {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        if (killEscalation) clearTimeout(killEscalation)
        reject(new Error('OpenClaw model run exceeded stdout buffer.'))
        killProcessGroup(child, 'SIGKILL')
      }
    })
    child.stderr.on('data', chunk => {
      stderr += chunk.toString()
      if (stderr.length > maxBuffer) {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        if (killEscalation) clearTimeout(killEscalation)
        reject(new Error('OpenClaw model run exceeded stderr buffer.'))
        killProcessGroup(child, 'SIGKILL')
      }
    })
    child.on('error', error => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (killEscalation) clearTimeout(killEscalation)
      reject(error)
    })
    child.on('close', (exitCode, signal) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (killEscalation) clearTimeout(killEscalation)
      if (timedOut) {
        reject(new Error(`OpenClaw model run timed out after ${timeoutMs}ms.`))
        return
      }
      if (exitCode !== 0) {
        reject(new Error(`OpenClaw model run failed with ${signal || `exit ${exitCode}`}: ${String(stderr || stdout).slice(0, 500)}`))
        return
      }
      resolve({ stdout, stderr })
    })
  })

  const parsed = JSON.parse(result.stdout)
  const outputText = parsed.outputs?.map(item => item.text || '').join('\n').trim()
  if (!parsed.ok || !outputText) {
    throw new Error(`OpenClaw model run failed or returned no text: ${String(result.stdout || result.stderr).slice(0, 500)}`)
  }
  return { outputText, raw: parsed }
}

async function callOpenAiResponsesApi({
  model,
  messages,
  inputText,
  responseFormat,
  maxOutputTokens = 3000,
  timeoutMs = 120000,
  route = null,
  credential = null,
} = {}) {
  assertDirectOpenAiResponsesAllowed({
    workload: 'router OpenAI API fallback',
    route,
    credential,
  })
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for router OpenAI API fallback.')
  }

  const cappedMaxOutputTokens = Math.min(
    Math.max(1, Number(maxOutputTokens) || 3000),
    Math.max(1, Number(process.env.LLM_ROUTER_MAX_OUTPUT_TOKENS) || 6000)
  )
  const input = messages?.length
    ? messages
    : [{ role: 'user', content: inputText || '' }]
  const body = {
    model,
    store: false,
    input,
    max_output_tokens: cappedMaxOutputTokens,
  }
  if (responseFormat) {
    body.text = { format: responseFormat }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, Number(timeoutMs) || 120000))
  let response
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI router fallback failed (${response.status}): ${errorText.slice(0, 500)}`)
  }

  const responseJson = await response.json()
  const outputText = getOpenAiResponsesOutputText(responseJson)
  if (!outputText) throw new Error('OpenAI router fallback returned no output text.')
  return { outputText, raw: responseJson }
}

async function callOpenAiEmbeddingsApi({ model, input, dimensions = 1536, timeoutMs = 120000 } = {}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for OpenAI embeddings.')
  }

  const inputs = normalizeEmbeddingInputs(input)
  if (!inputs.length) throw new Error('Embedding input is required.')
  const body = {
    model,
    input: inputs,
    encoding_format: 'float',
  }
  if (dimensions) body.dimensions = Number(dimensions)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, Number(timeoutMs) || 120000))
  let response
  try {
    response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI embeddings failed (${response.status}): ${errorText.slice(0, 500)}`)
  }

  const responseJson = await response.json()
  const embeddings = [...(responseJson.data || [])]
    .sort((a, b) => Number(a.index || 0) - Number(b.index || 0))
    .map(item => item.embedding)

  if (embeddings.length !== inputs.length) {
    throw new Error(`OpenAI embeddings returned ${embeddings.length} vectors for ${inputs.length} inputs.`)
  }

  return {
    embeddings,
    usage: responseJson.usage || {},
    raw: {
      provider: 'openai',
      model: responseJson.model || model,
      usage: responseJson.usage || {},
    },
  }
}

export function buildClaudeCodeCliCommand({ model, outputFormat = 'json' } = {}) {
  const args = [
    '--print',
    '--input-format',
    'text',
    '--output-format',
    outputFormat,
    '--permission-mode',
    'dontAsk',
    '--no-session-persistence',
  ]
  if (model) args.push('--model', model)
  return {
    command: 'claude',
    args,
    promptTransport: 'stdin',
    outputFormat,
    permissionMode: 'dontAsk',
    sessionPersistence: false,
  }
}

function getClaudeCodeAdapterBlockReason(route, credential) {
  if (route.provider !== 'claude_code') return null
  if (process.env[CLAUDE_CODE_EXECUTION_ALLOW_FLAG] !== 'true') {
    return `Claude Code CLI execution is blocked; set ${CLAUDE_CODE_EXECUTION_ALLOW_FLAG}=true only after explicit route approval`
  }
  if (route.status !== 'available') return `route status is ${route.status}`
  if (route.policyClassification !== 'allowed') return `route policy is ${route.policyClassification}`
  if (route.riskClass !== 'low') return `route risk class is ${route.riskClass}`
  if (credential?.status !== 'available') return `credential status is ${credential?.status || 'missing'}`
  if (credential?.policyClassification !== 'allowed') return `credential policy is ${credential?.policyClassification || 'missing'}`
  return null
}

async function callClaudeCodeCli({ model, prompt, timeoutMs = 180000 } = {}) {
  if (process.env[CLAUDE_CODE_EXECUTION_ALLOW_FLAG] !== 'true') {
    throw new Error(`Claude Code CLI execution is blocked; set ${CLAUDE_CODE_EXECUTION_ALLOW_FLAG}=true only after explicit route approval.`)
  }
  const command = buildClaudeCodeCliCommand({ model, outputFormat: 'json' })
  const result = await new Promise((resolve, reject) => {
    const child = spawn(command.command, command.args, {
      detached: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    let settled = false
    let killEscalation = null
    const maxBuffer = 16 * 1024 * 1024
    const timeout = setTimeout(() => {
      timedOut = true
      killProcessGroup(child, 'SIGTERM')
      killEscalation = setTimeout(() => {
        killProcessGroup(child, 'SIGKILL')
      }, 5000)
    }, Math.max(1000, Number(timeoutMs) || 180000))

    child.stdout.on('data', chunk => {
      stdout += chunk.toString()
      if (stdout.length > maxBuffer) {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        if (killEscalation) clearTimeout(killEscalation)
        reject(new Error('Claude Code CLI run exceeded stdout buffer.'))
        killProcessGroup(child, 'SIGKILL')
      }
    })
    child.stderr.on('data', chunk => {
      stderr += chunk.toString()
      if (stderr.length > maxBuffer) {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        if (killEscalation) clearTimeout(killEscalation)
        reject(new Error('Claude Code CLI run exceeded stderr buffer.'))
        killProcessGroup(child, 'SIGKILL')
      }
    })
    child.on('error', error => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (killEscalation) clearTimeout(killEscalation)
      reject(error)
    })
    child.on('close', (exitCode, signal) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (killEscalation) clearTimeout(killEscalation)
      if (timedOut) {
        reject(new Error(`Claude Code CLI run timed out after ${timeoutMs}ms.`))
        return
      }
      if (exitCode !== 0) {
        reject(new Error(`Claude Code CLI run failed with ${signal || `exit ${exitCode}`}: ${String(stderr || stdout).slice(0, 500)}`))
        return
      }
      resolve({ stdout, stderr })
    })
    child.stdin.end(String(prompt || ''))
  })
  return {
    outputText: String(result.stdout || '').trim(),
    raw: {
      transport: 'claude_code_cli',
      provider: 'claude_code',
      model,
    },
  }
}

export async function planLlmRoute({ workload, hubKey = 'foundation', provider, model, authPath } = {}) {
  const normalizedWorkload = String(workload || '').trim()
  if (!normalizedWorkload) throw new Error('workload is required for LLM route planning.')

  const snapshot = await getLlmRuntimeSnapshot({ limit: 10 })
  const routes = snapshot.routes
    .filter(route => route.workload === normalizedWorkload)
    .filter(route => route.hubKey === hubKey || route.hubKey === 'foundation')
    .filter(route => !provider || route.provider === provider)
    .filter(route => !authPath || route.authPath === authPath)
    .filter(route => !model || route.model === model)
    .sort((a, b) => a.priority - b.priority)

  if (!routes.length) {
    throw new Error(`No LLM route registered for workload=${normalizedWorkload} hub=${hubKey}.`)
  }

  const credentialsByKey = new Map(snapshot.credentials.map(item => [item.credentialKey, item]))
  function getRouteBlockReason(route) {
    const credential = route.credentialKey ? credentialsByKey.get(route.credentialKey) : null
    const claudeCodeBlockReason = getClaudeCodeAdapterBlockReason(route, credential)
    if (claudeCodeBlockReason) return claudeCodeBlockReason
    if (route.status !== 'available') return `route status is ${route.status}`
    if (route.riskClass === 'blocked' || route.riskClass === 'untested') return `route risk class is ${route.riskClass}`
    if (!['allowed', 'api_fallback'].includes(route.policyClassification)) {
      return `route policy is ${route.policyClassification}`
    }
    if (!credential) return null
    if (credential.status !== 'available') return `credential status is ${credential.status}`
    if (!['allowed', 'api_fallback'].includes(credential.policyClassification)) {
      return `credential policy is ${credential.policyClassification}`
    }
    if (Array.isArray(credential.allowedWorkloads) && credential.allowedWorkloads.length && !credential.allowedWorkloads.includes(normalizedWorkload)) {
      return `credential does not allow workload ${normalizedWorkload}`
    }
    return null
  }

  const routeReadiness = routes.map(route => {
    const credential = route.credentialKey ? credentialsByKey.get(route.credentialKey) || null : null
    const blockReason = getRouteBlockReason(route)
    return {
      routeKey: route.routeKey,
      credentialKey: route.credentialKey || null,
      credentialStatus: credential?.status || null,
      credentialPolicyClassification: credential?.policyClassification || null,
      runnable: !blockReason,
      blockReason,
    }
  })
  const runnable = routes.find(route => !getRouteBlockReason(route))
  const selected = runnable || routes[0]
  const selectedReadiness = routeReadiness.find(item => item.routeKey === selected.routeKey) || null

  return {
    selectedRoute: selected,
    selectedCredential: selected.credentialKey ? credentialsByKey.get(selected.credentialKey) || null : null,
    fallbackRoute: selected.fallbackRouteKey ? routes.find(route => route.routeKey === selected.fallbackRouteKey) || null : null,
    fallbackMode: selected.fallbackRouteKey ? 'manual_explicit' : 'none',
    routeCount: routes.length,
    runnable: Boolean(runnable),
    blockReason: selectedReadiness?.blockReason || null,
    routeReadiness,
  }
}

export async function callLlm({
  workload,
  hubKey = 'foundation',
  provider,
  model,
  authPath,
  inputText = '',
  messages = [],
  responseFormat = null,
  maxOutputTokens = 3000,
  dryRun = true,
  metadata = {},
} = {}) {
  const plan = await planLlmRoute({ workload, hubKey, provider, model, authPath })
  const promptText = renderPrompt({ inputText, messages, responseFormat })
  const blockedReason = !dryRun && !plan.runnable
    ? `No runnable LLM route available. LLM route ${plan.selectedRoute.routeKey} is not runnable: ${plan.blockReason || 'no available route passed policy checks'}.`
    : ''
  const call = await createLlmCall({
    workload,
    hubKey,
    provider: plan.selectedRoute.provider,
    model: plan.selectedRoute.model,
    authPath: plan.selectedRoute.authPath,
    credentialKey: plan.selectedRoute.credentialKey,
    routeKey: plan.selectedRoute.routeKey,
    status: dryRun || blockedReason ? 'skipped' : 'planned',
    estimatedInputTokens: estimateTokenCount(promptText),
    errorMessage: blockedReason || null,
    finishedAt: dryRun || blockedReason ? new Date().toISOString() : null,
    metadata: {
      ...metadata,
      dryRun,
      reason: dryRun
        ? 'Router MVP records route selection only; no provider call made.'
        : blockedReason || 'Router provider adapter selected by policy-aware route.',
      fallbackMode: plan.fallbackMode,
      fallbackRouteKey: plan.fallbackRoute?.routeKey || null,
      routeRunnable: plan.runnable,
      routeReadiness: plan.routeReadiness,
    },
  }, 'llm-router')

  if (blockedReason) {
    const error = new Error(blockedReason)
    error.llmProvenance = {
      requestedModel: plan.selectedRoute.model,
      model: plan.selectedRoute.model,
      provider: plan.selectedRoute.provider,
      authPath: plan.selectedRoute.authPath,
      routeKey: plan.selectedRoute.routeKey,
      credentialKey: plan.selectedRoute.credentialKey,
      callId: call.callId,
      blockedReason,
    }
    throw error
  }

  if (dryRun) {
    return {
      plan,
      call,
      outputText: '',
      provider: plan.selectedRoute.provider,
      authPath: plan.selectedRoute.authPath,
      routeKey: plan.selectedRoute.routeKey,
      credentialKey: plan.selectedRoute.credentialKey,
      model: plan.selectedRoute.model,
    }
  }

  try {
    const model = plan.selectedRoute.model
    let result
    if (plan.selectedRoute.provider === 'openclaw') {
      result = await callOpenClawModelRun({
        model,
        prompt: promptText,
        timeoutMs: Number(metadata.timeoutMs || 240000),
      })
    } else if (plan.selectedRoute.provider === 'claude_code') {
      result = await callClaudeCodeCli({
        model,
        prompt: promptText,
        timeoutMs: Number(metadata.timeoutMs || 180000),
      })
    } else if (plan.selectedRoute.provider === 'openai' && plan.selectedRoute.authPath === LLM_AUTH_PATHS.API_DIRECT) {
      result = await callOpenAiResponsesApi({
        model,
        messages,
        inputText,
        responseFormat,
        maxOutputTokens,
        timeoutMs: Number(metadata.timeoutMs || 120000),
        route: plan.selectedRoute,
        credential: plan.selectedCredential,
      })
    } else {
      throw new Error(`No provider adapter for ${plan.selectedRoute.provider}/${plan.selectedRoute.authPath}.`)
    }

    const finishedCall = await finishLlmCall(call.callId, {
      status: 'succeeded',
      estimatedOutputTokens: estimateTokenCount(result.outputText),
      estimatedCostUsd: plan.selectedRoute.authPath === LLM_AUTH_PATHS.API_DIRECT ? null : 0,
      metadata: {
        providerResponse: {
          transport: result.raw?.transport || null,
          provider: result.raw?.provider || plan.selectedRoute.provider,
          model: result.raw?.model || model,
        },
      },
    })

    return {
      plan,
      call: finishedCall,
      outputText: result.outputText,
      raw: result.raw,
      provider: plan.selectedRoute.provider,
      authPath: plan.selectedRoute.authPath,
      routeKey: plan.selectedRoute.routeKey,
      credentialKey: plan.selectedRoute.credentialKey,
      model,
    }
  } catch (error) {
    const finishedCall = await finishLlmCall(call.callId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : String(error),
    })
    if (error && typeof error === 'object') {
      error.llmProvenance = {
        requestedModel: plan.selectedRoute.model,
        model: plan.selectedRoute.model,
        provider: plan.selectedRoute.provider,
        authPath: plan.selectedRoute.authPath,
        routeKey: plan.selectedRoute.routeKey,
        credentialKey: plan.selectedRoute.credentialKey,
        callId: finishedCall.callId,
      }
    }
    throw error
  }
}

export async function callEmbedding({
  hubKey = 'foundation',
  input,
  dimensions = 1536,
  dryRun = false,
  metadata = {},
} = {}) {
  const inputs = normalizeEmbeddingInputs(input)
  if (!inputs.length) throw new Error('Embedding input is required.')

  const plan = await planLlmRoute({ workload: 'embedding', hubKey })
  const blockedReason = !dryRun && !plan.runnable
    ? `No runnable embedding route available. LLM route ${plan.selectedRoute.routeKey} is not runnable: ${plan.blockReason || 'no available route passed policy checks'}.`
    : ''
  const estimatedInputTokens = inputs.reduce((sum, item) => sum + estimateTokenCount(item), 0)
  const call = await createLlmCall({
    workload: 'embedding',
    hubKey,
    provider: plan.selectedRoute.provider,
    model: plan.selectedRoute.model,
    authPath: plan.selectedRoute.authPath,
    credentialKey: plan.selectedRoute.credentialKey,
    routeKey: plan.selectedRoute.routeKey,
    status: dryRun || blockedReason ? 'skipped' : 'planned',
    estimatedInputTokens,
    errorMessage: blockedReason || null,
    finishedAt: dryRun || blockedReason ? new Date().toISOString() : null,
    metadata: {
      ...metadata,
      dryRun,
      dimensions,
      inputCount: inputs.length,
      reason: dryRun
        ? 'Router MVP records embedding route selection only; no provider call made.'
        : blockedReason || 'Router embedding adapter selected by policy-aware route.',
      routeRunnable: plan.runnable,
      routeReadiness: plan.routeReadiness,
    },
  }, 'llm-router')

  if (blockedReason) {
    const error = new Error(blockedReason)
    error.llmProvenance = {
      requestedModel: plan.selectedRoute.model,
      model: plan.selectedRoute.model,
      provider: plan.selectedRoute.provider,
      authPath: plan.selectedRoute.authPath,
      routeKey: plan.selectedRoute.routeKey,
      credentialKey: plan.selectedRoute.credentialKey,
      callId: call.callId,
      blockedReason,
    }
    throw error
  }

  if (dryRun) {
    return {
      plan,
      call,
      embeddings: [],
      usage: {},
      provider: plan.selectedRoute.provider,
      authPath: plan.selectedRoute.authPath,
      routeKey: plan.selectedRoute.routeKey,
      credentialKey: plan.selectedRoute.credentialKey,
      model: plan.selectedRoute.model,
      dimensions,
    }
  }

  try {
    let result
    if (plan.selectedRoute.provider === 'openai' && plan.selectedRoute.authPath === LLM_AUTH_PATHS.API_DIRECT) {
      result = await callOpenAiEmbeddingsApi({
        model: plan.selectedRoute.model,
        input: inputs,
        dimensions,
        timeoutMs: Number(metadata.timeoutMs || 120000),
      })
    } else {
      throw new Error(`No embedding adapter for ${plan.selectedRoute.provider}/${plan.selectedRoute.authPath}.`)
    }

    const finishedCall = await finishLlmCall(call.callId, {
      status: 'succeeded',
      estimatedOutputTokens: 0,
      metadata: {
        providerResponse: {
          provider: result.raw?.provider || plan.selectedRoute.provider,
          model: result.raw?.model || plan.selectedRoute.model,
          usage: result.usage || {},
        },
      },
    })

    return {
      plan,
      call: finishedCall,
      embeddings: result.embeddings,
      usage: result.usage,
      provider: plan.selectedRoute.provider,
      authPath: plan.selectedRoute.authPath,
      routeKey: plan.selectedRoute.routeKey,
      credentialKey: plan.selectedRoute.credentialKey,
      model: result.raw?.model || plan.selectedRoute.model,
      dimensions,
    }
  } catch (error) {
    const finishedCall = await finishLlmCall(call.callId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : String(error),
    })
    if (error && typeof error === 'object') {
      error.llmProvenance = {
        requestedModel: plan.selectedRoute.model,
        model: plan.selectedRoute.model,
        provider: plan.selectedRoute.provider,
        authPath: plan.selectedRoute.authPath,
        routeKey: plan.selectedRoute.routeKey,
        credentialKey: plan.selectedRoute.credentialKey,
        callId: finishedCall.callId,
      }
    }
    throw error
  }
}
