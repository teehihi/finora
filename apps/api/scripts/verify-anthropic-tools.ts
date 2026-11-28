import 'dotenv/config';
import { AnthropicIntelligenceProvider } from '../src/modules/intelligence-anthropic.js';
import { IntelligenceProviderError } from '../src/modules/intelligence-provider.js';

const token = process.env.ANTHROPIC_AUTH_TOKEN;
if (!token) throw Error('ANTHROPIC_AUTH_TOKEN is not configured');
const root = (process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com').replace(/\/+$/u, '');
const endpoint = (root.endsWith('/v1') ? root : root + '/v1') + '/messages';
const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5';
const prompt = 'Use the available tool to inspect a synthetic monthly budget.';
const tool = {
  name: 'inspectSyntheticBudget',
  description: 'Inspect a synthetic budget; no account or real financial data is used.',
  input_schema: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  },
};

async function request(body: Record<string, unknown>) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': token!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, max_tokens: 256, thinking: { type: 'disabled' }, ...body }),
    signal: AbortSignal.timeout(30_000),
    redirect: 'error',
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    console.error('Anthropic tool check failed:', { status: response.status });
    process.exitCode = 1;
    return null;
  }
  if (!payload || typeof payload !== 'object' || !('content' in payload))
    throw Error('Invalid Anthropic response shape');
  const value = payload as {
    stop_reason?: unknown;
    content: unknown;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  if (!Array.isArray(value.content)) throw Error('Invalid Anthropic content');
  console.log('Anthropic tool response:', {
    status: response.status,
    stopReason: value.stop_reason,
    contentTypes: value.content.map((item: { type?: string }) => item.type),
    inputTokens: value.usage?.input_tokens,
    outputTokens: value.usage?.output_tokens,
  });
  return value;
}

const first = await request({
  messages: [{ role: 'user', content: prompt }],
  tools: [tool],
  tool_choice: { type: 'tool', name: tool.name },
});
if (first) {
  const call = first.content.find(
    (item: unknown): item is { type: 'tool_use'; id: string; name: string; input: object } =>
      Boolean(item && typeof item === 'object' && 'type' in item && item.type === 'tool_use'),
  );
  if (!call || call.name !== tool.name || typeof call.id !== 'string')
    throw Error('Gateway did not return native tool_use');
  const second = await request({
    max_tokens: 1024,
    system: 'After receiving the synthetic tool result, reply with only the word Done.',
    messages: [
      { role: 'user', content: prompt },
      { role: 'assistant', content: first.content },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: call.id,
            content: 'The synthetic budget was inspected by the local verifier.',
          },
        ],
      },
    ],
    tools: [tool],
  });
  if (
    !second ||
    second.stop_reason !== 'end_turn' ||
    !second.content.some((item: { type?: string }) => item.type === 'text')
  )
    throw Error('Gateway did not finish after native tool_result');
}

const provider = new AnthropicIntelligenceProvider({
  authToken: token,
  model,
  baseUrl: root,
  timeoutMs: 30_000,
  maxOutputTokens: 1024,
  retryCount: 0,
});
try {
  const first = await provider.complete({
    instructions: 'Use the available synthetic read-only tool exactly once.',
    messages: [{ role: 'user', content: prompt }],
    tools: [{ name: tool.name, description: tool.description, parameters: tool.input_schema }],
  });
  console.log('Adapter first result:', {
    kind: first.kind,
    calls: first.kind === 'calls' ? first.calls.map(({ name }) => name) : [],
  });
  if (first.kind !== 'calls') throw Error('Adapter did not receive tool_use');
  const second = await provider.complete({
    instructions: 'Reply with only the word Done after the synthetic tool result.',
    messages: [
      { role: 'user', content: prompt },
      { role: 'assistant', calls: first.calls, anthropicContent: first.anthropicContent },
      {
        role: 'tool',
        callId: first.calls[0]!.id,
        content: 'Synthetic budget inspected on the server.',
      },
    ],
    tools: [{ name: tool.name, description: tool.description, parameters: tool.input_schema }],
  });
  console.log('Adapter second result:', { kind: second.kind });
  if (second.kind !== 'text') throw Error('Adapter did not finish after tool_result');
} catch (error) {
  if (error instanceof IntelligenceProviderError)
    console.error('Adapter tool check failed:', { code: error.code, status: error.status });
  else console.error('Adapter tool check failed:', { name: (error as Error).name });
  process.exitCode = 1;
}

const invalidProvider = new AnthropicIntelligenceProvider({
  authToken: 'synthetic-invalid-token',
  model,
  baseUrl: root,
  timeoutMs: 10_000,
  retryCount: 0,
});
try {
  await invalidProvider.complete({
    messages: [{ role: 'user', content: 'Synthetic invalid credential check.' }],
  });
  throw Error('Gateway accepted an invalid synthetic credential');
} catch (error) {
  if (!(error instanceof IntelligenceProviderError) || error.code !== 'rejected') throw error;
  console.log('Invalid credential handling:', { code: error.code, status: error.status });
}
