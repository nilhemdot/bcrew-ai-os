export const DIRECT_OPENAI_RESPONSES_ALLOW_FLAG = 'LLM_ALLOW_DIRECT_OPENAI_RESPONSES';

export function assertDirectOpenAiResponsesAllowed({ workload } = {}) {
  if (process.env[DIRECT_OPENAI_RESPONSES_ALLOW_FLAG] === 'true') return;

  const label = workload ? `${workload} ` : '';
  throw new Error(
    `${label}direct OpenAI Responses API is blocked by default. ` +
      `Set ${DIRECT_OPENAI_RESPONSES_ALLOW_FLAG}=true only for an intentional paid API run, ` +
      'or migrate this workload to lib/llm-router.js once a subscription route is executable.',
  );
}
