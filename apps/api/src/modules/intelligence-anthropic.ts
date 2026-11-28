import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import {
  acceptsJsonTree,
  boundedInteger,
  encodeInput,
  IntelligenceProviderError,
  MAX_CALLS_PER_RESPONSE,
  MAX_ARGUMENT_BYTES,
  MAX_INPUT_BYTES,
  MAX_TEXT_BYTES,
  modelId,
  readResponse,
  type IntelligenceProviderCall,
  type IntelligenceProviderDecision,
  type IntelligenceProviderInput,
} from './intelligence-provider.js';

interface AnthropicConfig {
  authToken: string;
  model: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxOutputTokens?: number;
  retryCount?: number;
  retryDelayMs?: number;
}

const responseSchema = z.object({
  type: z.literal('message'),
  role: z.literal('assistant'),
  model: modelId,
  stop_reason: z.string(),
  content: z.array(z.unknown()).max(32),
  usage: z
    .object({
      input_tokens: z.number().int().nonnegative().max(10_000_000),
      output_tokens: z.number().int().nonnegative().max(10_000_000),
    })
    .optional(),
});
const textBlock = z.object({ type: z.literal('text'), text: z.string().max(MAX_TEXT_BYTES) });
const toolBlock = z.object({
  type: z.literal('tool_use'),
  id: z.string().regex(/^[A-Za-z0-9_-]{1,160}$/),
  name: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  input: z.record(z.string(), z.unknown()),
});
const thinkingBlock = z.union([
  z.object({
    type: z.literal('thinking'),
    thinking: z.string().max(MAX_TEXT_BYTES),
    signature: z.string().max(MAX_TEXT_BYTES).optional(),
  }),
  z.object({ type: z.literal('redacted_thinking'), data: z.string().max(MAX_TEXT_BYTES) }),
]);

function baseUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new IntelligenceProviderError('invalid_configuration');
  }
  if (
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname.includes('..')
  )
    throw new IntelligenceProviderError('invalid_configuration');
  const pathname = url.pathname.replace(/\/+$/u, '');
  return url.origin + (pathname === '/v1' ? '' : pathname) + '/v1';
}

function parseDecision(raw: unknown, names: ReadonlySet<string>): IntelligenceProviderDecision {
  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) throw new IntelligenceProviderError('invalid_response');
  const { stop_reason: stop, content, model, usage } = parsed.data;
  if (stop === 'refusal') throw new IntelligenceProviderError('refused');
  if (stop === 'max_tokens' || stop === 'model_context_window_exceeded')
    throw new IntelligenceProviderError('incomplete');
  if (stop !== 'end_turn' && stop !== 'tool_use')
    throw new IntelligenceProviderError('invalid_response');
  const text: string[] = [];
  const calls: IntelligenceProviderCall[] = [];
  for (const block of content) {
    if (
      block &&
      typeof block === 'object' &&
      'type' in block &&
      (block.type === 'thinking' || block.type === 'redacted_thinking')
    ) {
      if (!thinkingBlock.safeParse(block).success)
        throw new IntelligenceProviderError('invalid_response');
      continue;
    }
    const tool = toolBlock.safeParse(block);
    if (tool.success) {
      if (
        calls.length >= MAX_CALLS_PER_RESPONSE ||
        !names.has(tool.data.name) ||
        calls.some((existing) => existing.id === tool.data.id) ||
        !acceptsJsonTree(tool.data.input) ||
        Buffer.byteLength(JSON.stringify(tool.data.input)) > MAX_ARGUMENT_BYTES
      )
        throw new IntelligenceProviderError('invalid_response');
      calls.push({ id: tool.data.id, name: tool.data.name, arguments: tool.data.input });
      continue;
    }
    const part = textBlock.safeParse(block);
    if (!part.success) throw new IntelligenceProviderError('invalid_response');
    text.push(part.data.text);
  }
  if ((stop === 'tool_use') !== calls.length > 0)
    throw new IntelligenceProviderError('invalid_response');
  const metadata = {
    provider: 'anthropic' as const,
    model,
    status: 'completed' as const,
    ...(usage
      ? {
          usage: {
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            totalTokens: usage.input_tokens + usage.output_tokens,
          },
        }
      : {}),
  };
  if (calls.length) return { ...metadata, kind: 'calls', calls, anthropicContent: content };
  const answer = text.join('\n').trim();
  if (!answer || Buffer.byteLength(answer) > MAX_TEXT_BYTES)
    throw new IntelligenceProviderError('invalid_response');
  return { ...metadata, kind: 'text', text: answer };
}

export class AnthropicIntelligenceProvider {
  readonly id = 'anthropic';
  readonly #token: string;
  readonly #model: string;
  readonly #baseUrl: string;
  readonly #timeoutMs: number;
  readonly #maxOutputTokens: number;
  readonly #retryCount: number;
  readonly #retryDelayMs: number;

  constructor(
    config: AnthropicConfig,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    const key = config.authToken.trim();
    if (!key || key.length > 512 || /\s/u.test(key) || !modelId.safeParse(config.model).success)
      throw new IntelligenceProviderError('invalid_configuration');
    this.#token = key;
    this.#model = config.model;
    this.#baseUrl = baseUrl(config.baseUrl ?? 'https://api.anthropic.com');
    this.#timeoutMs = boundedInteger(config.timeoutMs, 12_000, 1_000, 30_000);
    this.#maxOutputTokens = boundedInteger(config.maxOutputTokens, 1024, 16, 4_096);
    this.#retryCount = boundedInteger(config.retryCount, 1, 0, 3);
    this.#retryDelayMs = boundedInteger(config.retryDelayMs, 250, 0, 2_000);
  }

  #headers() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.#token,
      'anthropic-version': '2023-06-01',
    };
  }

  async health(signal?: AbortSignal): Promise<{ healthy: boolean | null; model: string }> {
    if (signal?.aborted) throw new IntelligenceProviderError('canceled');
    const timeout = AbortSignal.timeout(this.#timeoutMs);
    try {
      const response = await this.fetcher(
        this.#baseUrl + '/models/' + encodeURIComponent(this.#model),
        {
          method: 'GET',
          headers: this.#headers(),
          signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
          redirect: 'error',
        },
      );
      void response.body?.cancel().catch(() => undefined);
      return {
        healthy: response.status === 404 || response.status === 405 ? null : response.ok,
        model: this.#model,
      };
    } catch {
      if (signal?.aborted) throw new IntelligenceProviderError('canceled');
      return { healthy: false, model: this.#model };
    }
  }

  async complete(input: IntelligenceProviderInput): Promise<IntelligenceProviderDecision> {
    if (input.signal?.aborted) throw new IntelligenceProviderError('canceled');
    const { names, toolDeclarations, instructions } = encodeInput(input);
    const messages: unknown[] = [];
    for (let i = 0; i < input.messages.length;) {
      const item = input.messages[i]!;
      if ('calls' in item) {
        const content =
          item.anthropicContent ??
          item.calls.map((call) => ({
            type: 'tool_use',
            id: call.id,
            name: call.name,
            input: call.arguments,
          }));
        const replayedCalls = content.filter(
          (
            block,
          ): block is {
            type: 'tool_use';
            id: string;
            name: string;
            input: Record<string, unknown>;
          } =>
            Boolean(
              block && typeof block === 'object' && 'type' in block && block.type === 'tool_use',
            ),
        );
        if (
          replayedCalls.length !== item.calls.length ||
          replayedCalls.some((block, index) => {
            const parsed = toolBlock.safeParse(block);
            const call = item.calls[index];
            return (
              !parsed.success ||
              !call ||
              parsed.data.id !== call.id ||
              parsed.data.name !== call.name ||
              JSON.stringify(parsed.data.input) !== JSON.stringify(call.arguments)
            );
          })
        )
          throw new IntelligenceProviderError('invalid_input');
        messages.push({ role: 'assistant', content });
        i++;
      } else if (item.role === 'tool') {
        const content: unknown[] = [];
        while (input.messages[i]?.role === 'tool') {
          const result = input.messages[i]!;
          if (result.role !== 'tool') break;
          content.push({
            type: 'tool_result',
            tool_use_id: result.callId,
            content: result.content,
          });
          i++;
        }
        messages.push({ role: 'user', content });
      } else {
        messages.push(item);
        i++;
      }
    }
    const body = JSON.stringify({
      model: this.#model,
      max_tokens: this.#maxOutputTokens,
      system: instructions,
      messages,
      thinking:
        this.#model.startsWith('claude-sonnet-5') && !this.#model.startsWith('claude-sonnet-5-5')
          ? { type: 'disabled' }
          : undefined,
      tools: toolDeclarations.length
        ? toolDeclarations.map(({ name, description, parameters }) => ({
            name,
            description,
            input_schema: parameters,
          }))
        : undefined,
      tool_choice: input.requiredTool
        ? { type: 'tool', name: input.requiredTool, disable_parallel_tool_use: true }
        : toolDeclarations.length
          ? input.noToolCalls
            ? { type: 'none' }
            : { type: 'auto', disable_parallel_tool_use: true }
          : undefined,
      stream: false,
    });
    if (Buffer.byteLength(body) > MAX_INPUT_BYTES)
      throw new IntelligenceProviderError('invalid_input');
    for (let attempt = 0; attempt <= this.#retryCount; attempt++) {
      const timeout = AbortSignal.timeout(this.#timeoutMs);
      const signal = input.signal ? AbortSignal.any([input.signal, timeout]) : timeout;
      try {
        const response = await this.fetcher(this.#baseUrl + '/messages', {
          method: 'POST',
          headers: this.#headers(),
          body,
          signal,
          redirect: 'error',
        });
        if (!response.ok) {
          void response.body?.cancel().catch(() => undefined);
          throw new IntelligenceProviderError(
            response.status === 429
              ? 'rate_limited'
              : response.status >= 400 && response.status < 500
                ? 'rejected'
                : 'unavailable',
            response.status,
          );
        }
        const raw = await readResponse(response);
        if (signal.aborted)
          throw new IntelligenceProviderError(input.signal?.aborted ? 'canceled' : 'timeout');
        return parseDecision(raw, names);
      } catch (error) {
        if (input.signal?.aborted) throw new IntelligenceProviderError('canceled');
        const failure = timeout.aborted
          ? new IntelligenceProviderError('timeout')
          : error instanceof IntelligenceProviderError
            ? error
            : new IntelligenceProviderError('unavailable');
        if (
          attempt === this.#retryCount ||
          !(['timeout', 'rate_limited', 'unavailable'] as string[]).includes(failure.code)
        )
          throw failure;
        await delay(this.#retryDelayMs * 2 ** attempt, undefined, { signal: input.signal });
      }
    }
    throw new IntelligenceProviderError('unavailable');
  }
}
