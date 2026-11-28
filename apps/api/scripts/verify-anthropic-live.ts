import 'dotenv/config';
import { AnthropicIntelligenceProvider } from '../src/modules/intelligence-anthropic.js';
import { IntelligenceProviderError } from '../src/modules/intelligence-provider.js';

const token = process.env.ANTHROPIC_AUTH_TOKEN;
if (!token) throw Error('ANTHROPIC_AUTH_TOKEN is not configured');
const provider = new AnthropicIntelligenceProvider({
  authToken: token,
  model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5',
  baseUrl: process.env.ANTHROPIC_BASE_URL,
  timeoutMs: 30_000,
  maxOutputTokens: 1024,
  retryCount: 0,
});
try {
  const health = await provider.health();
  console.log('Model endpoint healthy:', health.healthy);
  if (!health.healthy) {
    const root = (process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com').replace(
      /\/+$/u,
      '',
    );
    const endpoint =
      (root.endsWith('/v1') ? root : root + '/v1') +
      '/models/' +
      encodeURIComponent(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5');
    const response = await fetch(endpoint, {
      headers: { 'x-api-key': token, 'anthropic-version': '2023-06-01' },
      signal: AbortSignal.timeout(30_000),
    });
    console.log('Model endpoint status:', response.status);
    await response.body?.cancel();
  }
  const first = await provider.complete({
    instructions:
      'This is a synthetic connectivity check. Answer briefly in English without numbers.',
    messages: [{ role: 'user', content: 'Can you help explain loan terms in plain language?' }],
  });
  console.log('Live response:', {
    provider: first.provider,
    model: first.model,
    kind: first.kind,
    inputTokens: first.usage?.inputTokens,
    outputTokens: first.usage?.outputTokens,
  });
  if (first.kind !== 'text') throw Error('Expected text response');
  const second = await provider.complete({
    instructions:
      'This is a synthetic connectivity check. Answer briefly in English without numbers.',
    messages: [
      { role: 'user', content: 'Can you help explain loan terms in plain language?' },
      { role: 'assistant', content: first.text },
      { role: 'user', content: 'In one short sentence, why should I ask about fees?' },
    ],
  });
  console.log('Second turn:', {
    provider: second.provider,
    model: second.model,
    kind: second.kind,
    inputTokens: second.usage?.inputTokens,
    outputTokens: second.usage?.outputTokens,
  });
  if (second.kind !== 'text') throw Error('Expected text response');
} catch (error) {
  if (error instanceof IntelligenceProviderError) {
    console.error('Live check failed:', { code: error.code, status: error.status });
    if (error.code === 'invalid_response') {
      const root = (process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com').replace(
        /\/+$/u,
        '',
      );
      const endpoint = root.endsWith('/v1') ? root + '/messages' : root + '/v1/messages';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': token,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5',
          max_tokens: 32,
          messages: [{ role: 'user', content: 'Synthetic connectivity check.' }],
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const raw = await response.text();
      let shape: Record<string, unknown> = {};
      try {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const object = parsed as Record<string, unknown>;
          shape = {
            keys: Object.keys(object),
            type: object.type,
            role: object.role,
            stop_reason: object.stop_reason,
            contentTypes: Array.isArray(object.content)
              ? object.content.map((block: unknown) =>
                  block && typeof block === 'object' && 'type' in block ? block.type : null,
                )
              : undefined,
          };
        }
      } catch {
        shape = { nonJson: true };
      }
      console.error('Gateway response shape:', {
        status: response.status,
        contentType: response.headers.get('content-type'),
        ...shape,
      });
    }
    process.exitCode = 1;
  } else throw error;
}
