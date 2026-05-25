export const DIRECT_OPENAI_RESPONSES_ALLOW_FLAG = 'LLM_ALLOW_DIRECT_OPENAI_RESPONSES';

const ALLOWED_DIRECT_POLICY_CLASSIFICATIONS = new Set(['allowed', 'api_fallback']);

function getRouterApprovalFailure({ route, credential } = {}) {
  if (!route || !credential) return 'missing routed OpenAI route or credential';
  if (route.provider !== 'openai') return `route provider is ${route.provider || 'missing'}`;
  if (route.authPath !== 'api_direct') return `route auth path is ${route.authPath || 'missing'}`;
  if (route.status !== 'available') return `route status is ${route.status || 'missing'}`;
  if (route.riskClass !== 'low') return `route risk class is ${route.riskClass || 'missing'}`;
  if (!ALLOWED_DIRECT_POLICY_CLASSIFICATIONS.has(route.policyClassification)) {
    return `route policy is ${route.policyClassification || 'missing'}`;
  }
  if (credential.status !== 'available') return `credential status is ${credential.status || 'missing'}`;
  if (!ALLOWED_DIRECT_POLICY_CLASSIFICATIONS.has(credential.policyClassification)) {
    return `credential policy is ${credential.policyClassification || 'missing'}`;
  }
  if (route.credentialKey && credential.credentialKey && route.credentialKey !== credential.credentialKey) {
    return `route credential ${route.credentialKey} does not match selected credential ${credential.credentialKey}`;
  }
  if (route.metadata?.modelRouteControl?.operatorConfigured !== true) {
    return 'route was not operator-configured through model route control';
  }
  return '';
}

export function evaluateDirectOpenAiResponsesPermission({ route, credential, env = process.env } = {}) {
  if (env[DIRECT_OPENAI_RESPONSES_ALLOW_FLAG] === 'true') {
    return { allowed: true, reason: 'global_env_allow_flag' };
  }
  const failure = getRouterApprovalFailure({ route, credential });
  return {
    allowed: !failure,
    reason: failure ? `router_route_not_approved: ${failure}` : 'router_approved_operator_configured_route',
  };
}

export function buildDirectOpenAiSpendPolicyDogfood() {
  const approvedRoute = {
    provider: 'openai',
    authPath: 'api_direct',
    status: 'available',
    policyClassification: 'api_fallback',
    riskClass: 'low',
    credentialKey: 'openai-api-default',
    metadata: {
      modelRouteControl: {
        operatorConfigured: true,
      },
    },
  };
  const approvedCredential = {
    credentialKey: 'openai-api-default',
    status: 'available',
    policyClassification: 'api_fallback',
  };
  const cases = {
    randomDirectCall: evaluateDirectOpenAiResponsesPermission({ env: {} }),
    probeRequiredRoute: evaluateDirectOpenAiResponsesPermission({
      route: { ...approvedRoute, status: 'probe_required' },
      credential: approvedCredential,
      env: {},
    }),
    unconfiguredRoute: evaluateDirectOpenAiResponsesPermission({
      route: { ...approvedRoute, metadata: { modelRouteControl: { operatorConfigured: false } } },
      credential: approvedCredential,
      env: {},
    }),
    blockedCredential: evaluateDirectOpenAiResponsesPermission({
      route: approvedRoute,
      credential: { ...approvedCredential, status: 'blocked' },
      env: {},
    }),
    routerApprovedRoute: evaluateDirectOpenAiResponsesPermission({
      route: approvedRoute,
      credential: approvedCredential,
      env: {},
    }),
    globalEnvOverride: evaluateDirectOpenAiResponsesPermission({
      route: null,
      credential: null,
      env: { [DIRECT_OPENAI_RESPONSES_ALLOW_FLAG]: 'true' },
    }),
  };
  return {
    ok:
      cases.randomDirectCall.allowed === false &&
      cases.probeRequiredRoute.allowed === false &&
      cases.unconfiguredRoute.allowed === false &&
      cases.blockedCredential.allowed === false &&
      cases.routerApprovedRoute.allowed === true &&
      cases.globalEnvOverride.allowed === true,
    cases,
  };
}

export function assertDirectOpenAiResponsesAllowed({ workload, route, credential } = {}) {
  const permission = evaluateDirectOpenAiResponsesPermission({ route, credential });
  if (permission.allowed) return permission;

  if (process.env[DIRECT_OPENAI_RESPONSES_ALLOW_FLAG] === 'true') return;

  const label = workload ? `${workload} ` : '';
  throw new Error(
    `${label}direct OpenAI Responses API is blocked by default. ` +
      `Set ${DIRECT_OPENAI_RESPONSES_ALLOW_FLAG}=true only for an intentional paid API run, ` +
      'or use an available operator-configured route through lib/llm-router.js. ' +
      `Current route approval failed: ${permission.reason}.`,
  );
}
