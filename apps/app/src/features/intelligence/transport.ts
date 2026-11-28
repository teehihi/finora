import { withReadDeadline } from '@finora/api-client';
import { Platform } from 'react-native';
import { fetch as expoFetch } from 'expo/fetch';
import {
  intelligenceEventSchema,
  intelligenceHistorySchema,
  intelligenceProviderSchema,
  intelligenceRequestSchema,
  type IntelligenceEvent,
  type IntelligenceProviderChoice,
  type IntelligenceRequest,
} from '@finora/contracts';
import { auth, base } from '../../services/client';
import { chooseSimulationId } from './model';

const transport = Platform.OS === 'web' ? fetch : (expoFetch as typeof fetch);

async function init(signal: AbortSignal) {
  const headers: Record<string, string> =
    Platform.OS === 'web' ? {} : { cookie: await auth.getCookie() };
  return { signal, credentials: 'include' as const, headers };
}

function historyUrl(conversationId?: string) {
  return `${base}/api/intelligence/history${conversationId ? '?conversationId=' + encodeURIComponent(conversationId) : ''}`;
}

export async function loadIntelligenceHistory(signal: AbortSignal, conversationId?: string) {
  return withReadDeadline(async (readSignal) => {
    const response = await transport(historyUrl(conversationId), await init(readSignal));
    if (!response.ok) throw new Error('History unavailable');
    return intelligenceHistorySchema.parse(await response.json());
  }, signal);
}

export async function streamIntelligence(
  input: IntelligenceRequest,
  signal: AbortSignal,
  receive: (event: IntelligenceEvent) => void,
) {
  const options = await init(signal);
  const response = await transport(`${base}/api/intelligence/stream`, {
    ...options,
    method: 'POST',
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(intelligenceRequestSchema.parse(input)),
  });
  if (
    !response.ok ||
    !response.body ||
    !response.headers.get('Content-Type')?.startsWith('text/event-stream')
  )
    throw new Error('Stream unavailable');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let complete = false;
  function handle(frame: string) {
    const data = frame
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).replace(/^ /, ''))
      .join('\n');
    if (!data || complete) return;
    const event = intelligenceEventSchema.parse(JSON.parse(data));
    if (event.type === 'error') throw new Error('Could not finish analysis');
    complete = event.type === 'done';
    receive(event);
  }
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) {
        buffer += decoder.decode();
        if (buffer.trim()) handle(buffer);
        break;
      }
      buffer += decoder.decode(part.value, { stream: true });
      if (buffer.length > 128_000) throw new Error('Oversized intelligence response');
      for (let match = /\r?\n\r?\n/.exec(buffer); match; match = /\r?\n\r?\n/.exec(buffer)) {
        handle(buffer.slice(0, match.index));
        buffer = buffer.slice(match.index + match[0].length);
      }
    }
    if (!complete) throw new Error('Incomplete intelligence response');
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export async function loadIntelligenceStatus(signal: AbortSignal) {
  return withReadDeadline(async (readSignal) => {
    const response = await transport(`${base}/api/intelligence/status`, await init(readSignal));
    if (!response.ok) throw new Error('Status unavailable');
    const body: unknown = await response.json();
    if (typeof body !== 'object' || !body || !('provider' in body))
      throw new Error('Invalid intelligence status');
    if (body.provider !== 'mock' && body.provider !== 'openai' && body.provider !== 'anthropic')
      throw new Error('Invalid intelligence provider');
    const available: Exclude<IntelligenceProviderChoice, 'mock'>[] =
      'available' in body && Array.isArray(body.available)
        ? body.available.flatMap((item) => {
            const parsed = intelligenceProviderSchema.safeParse(item);
            return parsed.success && parsed.data !== 'mock' ? [parsed.data] : [];
          })
        : body.provider === 'mock'
          ? []
          : [body.provider];
    const provider: IntelligenceProviderChoice = body.provider;
    return { provider, available };
  }, signal);
}

export async function saveIntelligenceScenario(
  input: { turnId: string; blockIndex: number; requestId: string; confirmed: true },
  signal: AbortSignal,
) {
  const options = await init(signal);
  const response = await transport(`${base}/api/intelligence/scenarios/save`, {
    ...options,
    method: 'POST',
    headers: { ...options.headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Save unavailable');
  const body: unknown = await response.json();
  const id =
    typeof body === 'object' && body && 'id' in body ? chooseSimulationId(body.id) : undefined;
  if (!id) throw new Error('Invalid saved simulation ID');
  return id;
}

export async function clearIntelligenceHistory(signal: AbortSignal, conversationId?: string) {
  const response = await transport(historyUrl(conversationId), {
    ...(await init(signal)),
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('History could not be cleared');
}
