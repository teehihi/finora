import {
  OpenAIIntelligenceProvider,
  type IntelligenceProviderTool,
} from '../src/modules/intelligence-provider';

const tools = [
  {
    name: 'simulate_repayment',
    description: 'Run the local financial engine; no external lookup.',
    parameters: {
      type: 'object',
      properties: { months: { type: 'integer' } },
      required: ['months'],
      additionalProperties: false,
    },
    strict: true,
  },
] satisfies IntelligenceProviderTool[];

const messages = [{ role: 'user', content: 'Tính thử lịch 12 tháng.' }] as const;
const config = { apiKey: 'mock-key-not-a-credential', model: 'gpt-5.4-mini' };

function fakeFetch() {
  return jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
}
function item(content: string) {
  return {
    type: 'message',
    role: 'assistant',
    content: [{ type: 'output_text', text: content }],
  };
}
function call(name = 'simulate_repayment', args = '{"months":12}') {
  return { type: 'function_call', name, call_id: 'call_test', arguments: args };
}
function completion(output: unknown[], options = {}) {
  return new Response(
    JSON.stringify({
      model: 'gpt-5.4-mini-2026-03-17',
      status: 'completed',
      output,
      usage: { input_tokens: 40, output_tokens: 10, total_tokens: 50 },
      ...options,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}
function posted(fetcher: ReturnType<typeof fakeFetch>, at = 0) {
  const [url, request] = fetcher.mock.calls[at] ?? [];
  expect(url).toBe('https://api.openai.com/v1/responses');
  expect(request).toEqual(
    expect.objectContaining({
      method: 'POST',
      redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + config.apiKey,
      },
    }),
  );
  if (typeof request?.body !== 'string') throw Error('Expected JSON request body');
  return JSON.parse(request.body) as Record<string, unknown>;
}

describe('OpenAI Responses adapter (network mocked)', () => {
  it('sends a bounded stateless request and extracts text and typed token counts', async () => {
    const fetcher = fakeFetch().mockResolvedValue(completion([item('Lịch trả nợ.')]));
    const adapter = new OpenAIIntelligenceProvider({ ...config, maxOutputTokens: 550 }, fetcher);
    await expect(
      adapter.complete({ messages, instructions: 'Use only verified facts.' }),
    ).resolves.toEqual({
      provider: 'openai',
      model: 'gpt-5.4-mini-2026-03-17',
      status: 'completed',
      usage: { inputTokens: 40, outputTokens: 10, totalTokens: 50 },
      kind: 'text',
      text: 'Lịch trả nợ.',
    });
    expect(posted(fetcher)).toEqual({
      model: config.model,
      instructions: 'Use only verified facts.',
      input: messages,
      max_output_tokens: 550,
      reasoning: { effort: 'none' },
      store: false,
      stream: false,
    });
  });

  it('returns an allowlisted call without executing it and replays a neutral tool result', async () => {
    const fetcher = fakeFetch()
      .mockResolvedValueOnce(completion([call()]))
      .mockResolvedValueOnce(completion([item('Đã nhận bản tính.')]));
    const adapter = new OpenAIIntelligenceProvider(config, fetcher);
    const result = await adapter.complete({ messages, tools });
    expect(result).toMatchObject({
      kind: 'calls',
      calls: [{ id: 'call_test', name: 'simulate_repayment', arguments: { months: 12 } }],
    });
    expect(posted(fetcher)).toMatchObject({
      tools: [{ type: 'function', ...tools[0] }],
      tool_choice: 'auto',
      parallel_tool_calls: false,
      store: false,
    });
    if (result.kind !== 'calls') throw Error('Expected call');
    await expect(
      adapter.complete({
        messages: [
          ...messages,
          { role: 'assistant', calls: result.calls },
          { role: 'tool', callId: 'call_test', content: '{"source":"local_engine"}' },
        ],
      }),
    ).resolves.toMatchObject({ kind: 'text', text: 'Đã nhận bản tính.' });
    expect(posted(fetcher, 1)).toMatchObject({
      input: [
        ...messages,
        {
          type: 'function_call',
          name: 'simulate_repayment',
          call_id: 'call_test',
          arguments: '{"months":12}',
        },
        {
          type: 'function_call_output',
          call_id: 'call_test',
          output: '{"source":"local_engine"}',
        },
      ],
    });
  });

  it('replays distinct parallel calls and rejects a missing result', async () => {
    const fetcher = fakeFetch()
      .mockResolvedValueOnce(
        completion([call(), { ...call(), call_id: 'call_second', arguments: '{"months":24}' }]),
      )
      .mockResolvedValueOnce(completion([item('Done.')]));
    const adapter = new OpenAIIntelligenceProvider(config, fetcher);
    const first = await adapter.complete({ messages, tools });
    expect(first).toMatchObject({
      kind: 'calls',
      calls: [
        { id: 'call_test', arguments: { months: 12 } },
        { id: 'call_second', arguments: { months: 24 } },
      ],
    });
    if (first.kind !== 'calls') throw Error('Expected calls');
    await expect(
      adapter.complete({
        messages: [
          ...messages,
          { role: 'assistant', calls: first.calls },
          { role: 'tool', callId: 'call_test', content: 'Accepted.' },
        ],
      }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await adapter.complete({
      messages: [
        ...messages,
        { role: 'assistant', calls: first.calls },
        { role: 'tool', callId: 'call_test', content: 'Accepted.' },
        { role: 'tool', callId: 'call_second', content: 'Accepted.' },
      ],
    });
    expect(posted(fetcher, 1).input).toEqual([
      ...messages,
      call(),
      { ...call(), call_id: 'call_second', arguments: '{"months":24}' },
      { type: 'function_call_output', call_id: 'call_test', output: 'Accepted.' },
      { type: 'function_call_output', call_id: 'call_second', output: 'Accepted.' },
    ]);
  });

  it.each([
    [call('unregistered')],
    [call('simulate_repayment', '{bad JSON')],
    [call('simulate_repayment', '["array"]')],
    [call('simulate_repayment', '{"nested":{"__proto__":{"poisoned":true}}}')],
    [call('simulate_repayment', '{"nested":{"constructor":{}}}')],
    [call(), call()],
    [{ type: 'reasoning', id: 'rs_internal' }, call()],
    [{ type: 'unrecognized_output' }],
  ])('rejects malformed or unregistered output: %j', async (...output) => {
    const fetcher = fakeFetch().mockResolvedValue(completion(output));
    const adapter = new OpenAIIntelligenceProvider(config, fetcher);
    await expect(adapter.complete({ messages, tools })).rejects.toMatchObject({
      code: 'invalid_response',
    });
  });

  it('will not replay orphan results or exceed request bounds', async () => {
    const fetcher = fakeFetch();
    const adapter = new OpenAIIntelligenceProvider(config, fetcher);
    await expect(
      adapter.complete({ messages: [{ role: 'tool', callId: 'orphan', content: '{}' }] }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(
      adapter.complete({ messages: [{ role: 'user', content: 'x'.repeat(20_000) }] }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(adapter.complete({ messages, tools: [...tools, ...tools] })).rejects.toMatchObject(
      { code: 'invalid_input' },
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('discards oversized response bodies', async () => {
    const fetcher = fakeFetch().mockResolvedValue(new Response('x'.repeat(257 * 1024)));
    const adapter = new OpenAIIntelligenceProvider(config, fetcher);
    await expect(adapter.complete({ messages })).rejects.toMatchObject({
      code: 'invalid_response',
    });
  });

  it('identifies rate limiting without leaking a provider body or even the key', async () => {
    const fetcher = fakeFetch().mockResolvedValue(
      new Response('private raw upstream body', { status: 429 }),
    );
    const adapter = new OpenAIIntelligenceProvider(config, fetcher);
    await expect(adapter.complete({ messages })).rejects.toMatchObject({
      code: 'rate_limited',
      status: 429,
      message: 'Intelligence provider: rate_limited',
    });
    expect(JSON.stringify(adapter)).not.toContain(config.apiKey);
  });

  it('discards partial or refused output instead of presenting final financial text', async () => {
    const fetcher = fakeFetch()
      .mockResolvedValueOnce(completion([item('Partial')], { status: 'incomplete' }))
      .mockResolvedValueOnce(
        completion([
          { type: 'message', role: 'assistant', content: [{ type: 'refusal', refusal: 'No.' }] },
        ]),
      );
    const adapter = new OpenAIIntelligenceProvider(config, fetcher);
    await expect(adapter.complete({ messages })).rejects.toMatchObject({ code: 'incomplete' });
    await expect(adapter.complete({ messages })).rejects.toMatchObject({ code: 'refused' });
  });

  it('distinguishes caller cancellation from timeout', async () => {
    const fetcher = fakeFetch().mockImplementation(
      (_url, options) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = options?.signal;
          signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
        }),
    );
    const adapter = new OpenAIIntelligenceProvider({ ...config, timeoutMs: 1_000 }, fetcher);
    const cancel = new AbortController();
    const aborted = adapter.complete({ messages, signal: cancel.signal });
    cancel.abort();
    await expect(aborted).rejects.toMatchObject({ code: 'canceled' });
    await expect(adapter.complete({ messages })).rejects.toMatchObject({ code: 'timeout' });
  });

  it('uses a configured compatible endpoint and retries a transient response without changing the request', async () => {
    const fetcher = fakeFetch()
      .mockResolvedValueOnce(new Response('temporary', { status: 503 }))
      .mockResolvedValueOnce(completion([item('Ready.')]));
    const adapter = new OpenAIIntelligenceProvider(
      { ...config, baseUrl: 'https://llm.example.test/api/v1/', retryCount: 1, retryDelayMs: 0 },
      fetcher,
    );
    await expect(adapter.complete({ messages })).resolves.toMatchObject({
      kind: 'text',
      text: 'Ready.',
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      'https://llm.example.test/api/v1/responses',
      'https://llm.example.test/api/v1/responses',
    ]);
    expect(fetcher.mock.calls[0][1]?.body).toBe(fetcher.mock.calls[1][1]?.body);
  });

  it('does not retry a rejected request or accept unsafe endpoint configuration', async () => {
    const fetcher = fakeFetch().mockResolvedValue(new Response('bad key', { status: 401 }));
    const adapter = new OpenAIIntelligenceProvider(
      { ...config, retryCount: 3, retryDelayMs: 0 },
      fetcher,
    );
    await expect(adapter.complete({ messages })).rejects.toMatchObject({ code: 'rejected' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    for (const baseUrl of [
      'http://example.test/v1',
      'https://user:pass@example.test/v1',
      'https://example.test/v1?key=secret',
    ]) {
      expect(() => new OpenAIIntelligenceProvider({ ...config, baseUrl })).toThrow();
    }
  });

  it('checks provider health without sending a user message', async () => {
    const fetcher = fakeFetch().mockResolvedValue(new Response('{}'));
    const adapter = new OpenAIIntelligenceProvider(
      { ...config, baseUrl: 'https://llm.example.test/v1' },
      fetcher,
    );
    await expect(adapter.health()).resolves.toEqual({ healthy: true, model: config.model });
    expect(fetcher.mock.calls[0][0]).toBe('https://llm.example.test/v1/models/gpt-5.4-mini');
    expect(fetcher.mock.calls[0][1]).toMatchObject({ method: 'GET', redirect: 'error' });
  });
});
