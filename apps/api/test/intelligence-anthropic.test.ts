import { AnthropicIntelligenceProvider } from '../src/modules/intelligence-anthropic';

const config = {
  authToken: 'synthetic-test-token',
  model: 'claude-sonnet-5',
  baseUrl: 'https://gateway.example.test/',
};
const messages = [{ role: 'user', content: 'Help me understand a loan.' }] as const;
const tool = {
  name: 'searchLoanProducts',
  description: 'Search public catalog.',
  parameters: { type: 'object', properties: {}, additionalProperties: false },
};
const fetcher = () => jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
const reply = (content: unknown[], stop_reason: string = 'end_turn', status = 200) =>
  new Response(
    JSON.stringify({
      type: 'message',
      role: 'assistant',
      model: config.model,
      content,
      stop_reason,
      usage: { input_tokens: 8, output_tokens: 4 },
    }),
    { status },
  );

describe('Anthropic Messages adapter (network mocked)', () => {
  it('sends a stateless request and parses text', async () => {
    const network = fetcher().mockResolvedValue(reply([{ type: 'text', text: 'I can help.' }]));
    const provider = new AnthropicIntelligenceProvider(config, network);
    await expect(
      provider.complete({ messages, instructions: 'Be concise.' }),
    ).resolves.toMatchObject({
      provider: 'anthropic',
      kind: 'text',
      text: 'I can help.',
      usage: { inputTokens: 8, outputTokens: 4, totalTokens: 12 },
    });
    expect(network.mock.calls[0]?.[0]).toBe('https://gateway.example.test/v1/messages');
    const request = network.mock.calls[0]?.[1];
    expect(request?.headers).toMatchObject({
      'x-api-key': config.authToken,
      'anthropic-version': '2023-06-01',
    });
    expect(JSON.parse(String(request?.body))).toMatchObject({
      model: config.model,
      system: 'Be concise.',
      messages,
      stream: false,
      thinking: { type: 'disabled' },
    });
  });

  it('parses one allowlisted tool call and replays its neutral result', async () => {
    const network = fetcher()
      .mockResolvedValueOnce(
        reply([{ type: 'tool_use', id: 'toolu_1', name: tool.name, input: {} }], 'tool_use'),
      )
      .mockResolvedValueOnce(reply([{ type: 'text', text: 'Done.' }]));
    const provider = new AnthropicIntelligenceProvider(config, network);
    const first = await provider.complete({ messages, tools: [tool] });
    expect(first).toMatchObject({
      kind: 'calls',
      calls: [{ id: 'toolu_1', name: tool.name, arguments: {} }],
    });
    if (first.kind !== 'calls') throw Error('Expected tool call');
    await provider.complete({
      messages: [
        ...messages,
        { role: 'assistant', calls: first.calls },
        { role: 'tool', callId: first.calls[0]!.id, content: 'Accepted read-only selection.' },
      ],
      tools: [tool],
    });
    expect(JSON.parse(String(network.mock.calls[1]?.[1]?.body)).messages).toEqual([
      ...messages,
      {
        role: 'assistant',
        content: [{ type: 'tool_use', id: 'toolu_1', name: tool.name, input: {} }],
      },
      {
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 'toolu_1', content: 'Accepted read-only selection.' },
        ],
      },
    ]);
  });

  it('accepts bounded parallel read-only calls and replays every result together', async () => {
    const secondTool = { ...tool, name: 'assessRepaymentCapacity' };
    const calls = [
      { type: 'tool_use', id: 'toolu_1', name: tool.name, input: {} },
      { type: 'tool_use', id: 'toolu_2', name: secondTool.name, input: {} },
    ];
    const network = fetcher()
      .mockResolvedValueOnce(reply(calls, 'tool_use'))
      .mockResolvedValueOnce(reply([{ type: 'text', text: 'I can help compare the choices.' }]));
    const provider = new AnthropicIntelligenceProvider(config, network);
    const first = await provider.complete({ messages, tools: [tool, secondTool] });
    expect(first).toMatchObject({
      kind: 'calls',
      calls: [
        { id: 'toolu_1', name: tool.name, arguments: {} },
        { id: 'toolu_2', name: secondTool.name, arguments: {} },
      ],
    });
    if (first.kind !== 'calls') throw Error('Expected tool calls');
    await provider.complete({
      messages: [
        ...messages,
        { role: 'assistant', calls: first.calls },
        ...first.calls.map((call) => ({
          role: 'tool' as const,
          callId: call.id,
          content: 'Accepted.',
        })),
      ],
      tools: [tool, secondTool],
    });
    expect(JSON.parse(String(network.mock.calls[1]?.[1]?.body)).messages).toEqual([
      ...messages,
      { role: 'assistant', content: calls },
      {
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 'toolu_1', content: 'Accepted.' },
          { type: 'tool_result', tool_use_id: 'toolu_2', content: 'Accepted.' },
        ],
      },
    ]);
  });

  it('preserves an upstream thinking block unchanged during tool continuation', async () => {
    const thinking = {
      type: 'thinking',
      thinking: 'private synthetic thought',
      signature: 'opaque-test',
    };
    const toolUse = { type: 'tool_use', id: 'toolu_signed', name: tool.name, input: {} };
    const content = [thinking, { type: 'text', text: 'I will check.' }, toolUse];
    const network = fetcher()
      .mockResolvedValueOnce(reply(content, 'tool_use'))
      .mockResolvedValueOnce(reply([{ type: 'text', text: 'I can help.' }]));
    const provider = new AnthropicIntelligenceProvider(config, network);
    const first = await provider.complete({ messages, tools: [tool] });
    expect(first.kind).toBe('calls');
    if (first.kind !== 'calls') throw Error('Expected tool call');
    await provider.complete({
      messages: [
        ...messages,
        {
          role: 'assistant',
          calls: first.calls,
          anthropicContent: (first as typeof first & { anthropicContent?: unknown[] })
            .anthropicContent,
        } as never,
        { role: 'tool', callId: first.calls[0]!.id, content: 'Accepted.' },
      ],
      tools: [tool],
    });
    expect(JSON.parse(String(network.mock.calls[1]?.[1]?.body)).messages[1]).toEqual({
      role: 'assistant',
      content,
    });
  });

  it('rejects unknown calls and incomplete answers', async () => {
    const unknown = new AnthropicIntelligenceProvider(
      config,
      fetcher().mockResolvedValue(
        reply([{ type: 'tool_use', id: 'toolu_1', name: 'deleteUser', input: {} }], 'tool_use'),
      ),
    );
    await expect(unknown.complete({ messages, tools: [tool] })).rejects.toMatchObject({
      code: 'invalid_response',
    });
    const incomplete = new AnthropicIntelligenceProvider(
      config,
      fetcher().mockResolvedValue(reply([{ type: 'text', text: 'Partial' }], 'max_tokens')),
    );
    await expect(incomplete.complete({ messages })).rejects.toMatchObject({ code: 'incomplete' });
  });

  it('does not expose reasoning blocks in a complete answer', async () => {
    const network = fetcher().mockResolvedValue(
      reply([
        { type: 'thinking', thinking: 'Private reasoning', signature: 'test' },
        { type: 'text', text: 'Ask for the fee schedule.' },
      ]),
    );
    const provider = new AnthropicIntelligenceProvider(config, network);
    await expect(provider.complete({ messages })).resolves.toMatchObject({
      kind: 'text',
      text: 'Ask for the fee schedule.',
    });
  });

  it('reports unknown when a compatible gateway omits model metadata', async () => {
    const provider = new AnthropicIntelligenceProvider(
      config,
      fetcher().mockResolvedValue(new Response(null, { status: 404 })),
    );
    await expect(provider.health()).resolves.toEqual({ healthy: null, model: config.model });
  });
});
