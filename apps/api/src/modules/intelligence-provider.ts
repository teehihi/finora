import { z } from 'zod';

export interface IntelligenceProviderCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export type IntelligenceProviderMessage =
  | { role: 'user' | 'assistant'; content: string }
  | { role: 'assistant'; calls: readonly IntelligenceProviderCall[] }
  | { role: 'tool'; callId: string; content: string };

export interface IntelligenceProviderTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  strict?: boolean;
}

interface IntelligenceProviderUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

type CompletionMetadata = {
  provider: 'openai';
  model: string;
  status: 'completed';
  usage?: IntelligenceProviderUsage;
};

export type IntelligenceProviderDecision = CompletionMetadata &
  ({ kind: 'text'; text: string } | { kind: 'calls'; calls: IntelligenceProviderCall[] });

export interface IntelligenceProviderInput {
  instructions?: string;
  messages: readonly IntelligenceProviderMessage[];
  tools?: readonly IntelligenceProviderTool[];
  signal?: AbortSignal;
}

interface OpenAIProviderConfig {
  apiKey: string;
  model: string;
  timeoutMs?: number;
  maxOutputTokens?: number;
}

type ErrorCode =
  | 'invalid_configuration'
  | 'invalid_input'
  | 'invalid_response'
  | 'canceled'
  | 'timeout'
  | 'rate_limited'
  | 'rejected'
  | 'unavailable'
  | 'incomplete'
  | 'refused';

export class IntelligenceProviderError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status?: number,
  ) {
    super('Intelligence provider: ' + code);
    this.name = 'IntelligenceProviderError';
  }
}

const endpoint = 'https://api.openai.com/v1/responses';
const MAX_INPUT_BYTES = 64 * 1024;
const MAX_RESPONSE_BYTES = 256 * 1024;
const MAX_TEXT_BYTES = 16 * 1024;
const MAX_ARGUMENT_BYTES = 4 * 1024;
const MAX_MESSAGES = 32;
const MAX_TOOLS = 12;

const modelId = z.string().regex(/^[\w.:-]{1,160}$/);
const callName = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const callId = z.string().regex(/^[A-Za-z0-9_-]{1,160}$/);
const outputItem = z.object({ type: z.string().max(60) });
const responseSchema = z.object({
  model: modelId,
  status: z.enum(['completed', 'failed', 'in_progress', 'cancelled', 'queued', 'incomplete']),
  output: z.array(z.unknown()).max(MAX_MESSAGES),
  usage: z
    .object({
      input_tokens: z.number().int().nonnegative().max(10_000_000),
      output_tokens: z.number().int().nonnegative().max(10_000_000),
      total_tokens: z.number().int().nonnegative().max(10_000_000),
    })
    .nullish(),
});
const incomingCall = z.object({
  name: callName,
  call_id: callId,
  arguments: z.string().max(MAX_ARGUMENT_BYTES),
});
const message = z.object({
  role: z.literal('assistant'),
  content: z
    .array(
      z.discriminatedUnion('type', [
        z.object({ type: z.literal('output_text'), text: z.string().max(MAX_TEXT_BYTES) }),
        z.object({ type: z.literal('refusal') }),
      ]),
    )
    .max(MAX_MESSAGES),
});
const argsRecord = z.record(z.string(), z.unknown());

function boundedInteger(value: number | undefined, fallback: number, min: number, max: number) {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw new IntelligenceProviderError('invalid_configuration');
  return value;
}

function acceptsJsonTree(value: unknown, depth = 0): boolean {
  if (depth > 12) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((part) => acceptsJsonTree(part, depth + 1));
  if (typeof value !== 'object') return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Object.entries(value).every(
    ([key, part]) =>
      key !== '__proto__' &&
      key !== 'constructor' &&
      key !== 'prototype' &&
      acceptsJsonTree(part, depth + 1),
  );
}

function json(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    throw new IntelligenceProviderError('invalid_input');
  }
}

function encodeInput({ instructions, messages, tools = [] }: IntelligenceProviderInput) {
  if (
    messages.length === 0 ||
    messages.length > MAX_MESSAGES ||
    tools.length > MAX_TOOLS ||
    (instructions !== undefined && Buffer.byteLength(instructions) > MAX_TEXT_BYTES)
  )
    throw new IntelligenceProviderError('invalid_input');

  const names = new Set<string>();
  const toolDeclarations = tools.map((tool) => {
    if (
      !callName.safeParse(tool.name).success ||
      names.has(tool.name) ||
      tool.description.length > 700 ||
      tool.parameters.type !== 'object' ||
      !acceptsJsonTree(tool.parameters)
    )
      throw new IntelligenceProviderError('invalid_input');
    names.add(tool.name);
    return {
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      strict: tool.strict ?? false,
    };
  });

  type InputItem =
    | { role: 'user' | 'assistant'; content: string }
    | { type: 'function_call'; name: string; call_id: string; arguments: string }
    | { type: 'function_call_output'; call_id: string; output: string };
  const items: InputItem[] = [];
  // One function at a time: a tool result must correspond to the preceding call.
  let pendingCall: string | undefined;
  const usedCallIds = new Set<string>();
  for (const entry of messages) {
    if ('calls' in entry) {
      const call = entry.calls[0];
      if (
        pendingCall !== undefined ||
        entry.calls.length !== 1 ||
        !call ||
        !callId.safeParse(call.id).success ||
        usedCallIds.has(call.id) ||
        !callName.safeParse(call.name).success ||
        !acceptsJsonTree(call.arguments)
      )
        throw new IntelligenceProviderError('invalid_input');

      const args = json(call.arguments);
      if (Buffer.byteLength(args) > MAX_ARGUMENT_BYTES)
        throw new IntelligenceProviderError('invalid_input');
      pendingCall = call.id;
      usedCallIds.add(call.id);
      items.push({
        type: 'function_call',
        name: call.name,
        call_id: call.id,
        arguments: args,
      });
    } else if (entry.role === 'tool') {
      if (pendingCall !== entry.callId || Buffer.byteLength(entry.content) > MAX_TEXT_BYTES)
        throw new IntelligenceProviderError('invalid_input');
      items.push({ type: 'function_call_output', call_id: entry.callId, output: entry.content });
      pendingCall = undefined;
    } else {
      if (pendingCall !== undefined || Buffer.byteLength(entry.content) > MAX_TEXT_BYTES)
        throw new IntelligenceProviderError('invalid_input');
      items.push({ role: entry.role, content: entry.content });
    }
  }
  if (pendingCall !== undefined) throw new IntelligenceProviderError('invalid_input');
  return { items, names, toolDeclarations, instructions };
}

function parseDecision(raw: unknown, names: ReadonlySet<string>): IntelligenceProviderDecision {
  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) throw new IntelligenceProviderError('invalid_response');
  const { status, model, usage, output } = parsed.data;
  if (status === 'incomplete') throw new IntelligenceProviderError('incomplete');
  if (status === 'cancelled') throw new IntelligenceProviderError('canceled');
  if (status !== 'completed') throw new IntelligenceProviderError('unavailable');

  const metadata: CompletionMetadata = {
    provider: 'openai',
    model,
    status,
    ...(usage
      ? {
          usage: {
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            totalTokens: usage.total_tokens,
          },
        }
      : {}),
  };
  const calls: IntelligenceProviderCall[] = [];
  const text: string[] = [];
  let reasoning = false;
  for (const item of output) {
    const result = outputItem.safeParse(item);
    if (!result.success) throw new IntelligenceProviderError('invalid_response');
    switch (result.data.type) {
      case 'reasoning': {
        reasoning = true;
        break;
      }
      case 'function_call': {
        const call = incomingCall.safeParse(item);
        if (
          calls.length ||
          !call.success ||
          !names.has(call.data.name) ||
          Buffer.byteLength(call.data.arguments) > MAX_ARGUMENT_BYTES
        )
          throw new IntelligenceProviderError('invalid_response');
        let args: unknown;
        try {
          args = JSON.parse(call.data.arguments);
        } catch {
          throw new IntelligenceProviderError('invalid_response');
        }
        const record = argsRecord.safeParse(args);
        if (!record.success || !acceptsJsonTree(args))
          throw new IntelligenceProviderError('invalid_response');
        calls.push({ id: call.data.call_id, name: call.data.name, arguments: record.data });
        break;
      }
      case 'message': {
        const parts = message.safeParse(item);
        if (!parts.success) throw new IntelligenceProviderError('invalid_response');
        const chunks = parts.data.content.map((part) => {
          if (part.type === 'refusal') throw new IntelligenceProviderError('refused');
          return part.text;
        });
        text.push(chunks.join(''));
        break;
      }
      default:
        throw new IntelligenceProviderError('invalid_response');
    }
  }

  // No incomplete or unverifiable continuation is allowed to authorize a local tool.
  if (calls.length) {
    if (reasoning) throw new IntelligenceProviderError('invalid_response');
    return { ...metadata, kind: 'calls', calls };
  }
  const answer = text.join('\n\n').trim();
  if (!answer || Buffer.byteLength(answer) > MAX_TEXT_BYTES)
    throw new IntelligenceProviderError('invalid_response');
  return { ...metadata, kind: 'text', text: answer };
}

async function readResponse(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new IntelligenceProviderError('invalid_response');
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) throw new IntelligenceProviderError('invalid_response');
      text += decoder.decode(next.value, { stream: true });
    }
    text += decoder.decode();
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new IntelligenceProviderError('invalid_response');
    }
  } finally {
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export class OpenAIIntelligenceProvider {
  readonly id = 'openai';
  readonly #apiKey: string;
  readonly #model: string;
  readonly #timeoutMs: number;
  readonly #maxOutputTokens: number;

  constructor(
    config: OpenAIProviderConfig,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    const key = config.apiKey.trim();
    if (!key || key.length > 512 || /\s/u.test(key) || !modelId.safeParse(config.model).success)
      throw new IntelligenceProviderError('invalid_configuration');
    this.#apiKey = key;
    this.#model = config.model;
    this.#timeoutMs = boundedInteger(config.timeoutMs, 12_000, 1_000, 30_000);
    this.#maxOutputTokens = boundedInteger(config.maxOutputTokens, 600, 16, 4_096);
  }

  async complete(input: IntelligenceProviderInput): Promise<IntelligenceProviderDecision> {
    if (input.signal?.aborted) throw new IntelligenceProviderError('canceled');
    const { names, items, toolDeclarations, instructions } = encodeInput(input);
    const body = json({
      model: this.#model,
      instructions,
      input: items,
      tools: toolDeclarations.length ? toolDeclarations : undefined,
      tool_choice: toolDeclarations.length ? 'auto' : undefined,
      parallel_tool_calls: toolDeclarations.length ? false : undefined,
      reasoning: /^gpt-5\.4-(?:mini|nano)(?:-|$)/u.test(this.#model)
        ? { effort: 'none' }
        : undefined,
      max_output_tokens: this.#maxOutputTokens,
      store: false,
      stream: false,
    });
    if (Buffer.byteLength(body) > MAX_INPUT_BYTES)
      throw new IntelligenceProviderError('invalid_input');

    const timeout = AbortSignal.timeout(this.#timeoutMs);
    const signal = input.signal ? AbortSignal.any([input.signal, timeout]) : timeout;
    try {
      const response = await this.fetcher(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + this.#apiKey },
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
      if (timeout.aborted) throw new IntelligenceProviderError('timeout');
      if (error instanceof IntelligenceProviderError) throw error;
      throw new IntelligenceProviderError('unavailable');
    }
  }
}
