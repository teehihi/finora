import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { requestId } from '../../src/services/request-id';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react-native';
import {
  Text,
  Card,
  Heading,
  Badge,
  Button,
  Select,
  ChatMessage,
  ChatComposer,
  SourceAttribution,
  FinancialMetric,
  useDesign,
} from '@finora/ui';
import type { ChatRequest } from '@finora/contracts';
import { Page, Columns, Data } from '../../src/components/layout';
import { api, auth } from '../../src/services/client';
import { queryClient } from '../../src/providers/AppProviders';
export default function Assistant() {
  const { t, locale, money, colors: c } = useDesign();
  const user = auth.useSession();
  const uid = user.data?.user.id;
  const { simulationId } = useLocalSearchParams<{ simulationId?: string }>();
  const [selected, choose] = useState(simulationId ?? '');
  useEffect(() => {
    if (simulationId) choose(simulationId);
  }, [simulationId]);
  const [prompt, write] = useState(''),
    [text, append] = useState(''),
    [active, setActive] = useState(false),
    [failed, fail] = useState(false);
  const last = useRef<ChatRequest | null>(null);
  const cancel = useRef<AbortController | null>(null);
  useEffect(() => () => cancel.current?.abort(), []);
  const saved = useQuery({ queryKey: ['saved', uid], queryFn: api.saved });
  const history = useQuery({ queryKey: ['history', uid], queryFn: api.history });
  const context = saved.data?.find((v) => v.id === selected);
  async function send(question: string, retry = false) {
    if (cancel.current || !question.trim()) return;
    const request =
      retry && last.current
        ? last.current
        : {
            requestId: requestId(),
            prompt: question.trim(),
            simulationId: selected || undefined,
            locale,
          };
    last.current = request;
    write(question);
    const controller = new AbortController();
    cancel.current = controller;
    setActive(true);
    append('');
    fail(false);
    try {
      await api.stream(request, controller.signal, (chunk) => append((s) => s + chunk));
      await queryClient.invalidateQueries({ queryKey: ['history', uid] });
      write('');
    } catch {
      if (!controller.signal.aborted) fail(true);
    } finally {
      cancel.current = null;
      setActive(false);
      append('');
    }
  }
  return (
    <Page title={t('assistantTitle')} description={t('assistantHint')}>
      <Badge>{t('mock')}</Badge>
      <Columns>
        <View style={{ flex: 1.5, gap: 14 }}>
          <Data q={history}>
            {(rows) => (
              <>
                {rows.map((row) => (
                  <View style={{ gap: 6 }} key={row.id}>
                    <ChatMessage who={t('you')} body={row.prompt} />
                    <ChatMessage who={'Finora · ' + t('mock')} body={row.answer} />
                    {row.facts ? <SourceAttribution source={t('calc')} /> : null}
                  </View>
                ))}
              </>
            )}
          </Data>
          {!history.data?.length ? (
            <View style={{ gap: 8 }}>
              {(['askInterest', 'askFee'] as const).map((k) => (
                <Button
                  key={k}
                  label={t(k)}
                  disabled={active}
                  variant="outline"
                  onPress={() => send(t(k))}
                />
              ))}
            </View>
          ) : null}
          {active ? <ChatMessage who={t('mock')} body={text || t('loading')} /> : null}
          <Card>
            <ChatComposer
              label={t('composer')}
              value={prompt}
              editable={!active}
              onChangeText={(s) => {
                write(s);
                fail(false);
              }}
            />
            {failed ? (
              <>
                <Text role="alert">{t('error')}</Text>
                <Button label={t('retry')} onPress={() => send(prompt, true)} variant="soft" />
              </>
            ) : null}
            <Button
              label={t(active ? 'stop' : 'send')}
              onPress={() => (active ? cancel.current?.abort() : send(prompt))}
              disabled={!active && !prompt.trim()}
            />
          </Card>
        </View>
        <View style={{ flex: 1 }}>
          <Card>
            <Sparkles color={c.primary} />
            <Heading size={23}>{t('context')}</Heading>
            <Data q={saved}>
              {(rows) => (
                <Select
                  label={t('saved')}
                  value={selected}
                  onChange={(v) => {
                    if (!active) choose(v);
                  }}
                  options={[
                    { value: '', label: t('none') },
                    ...rows.map((r) => ({
                      value: r.id,
                      label:
                        (locale === 'vi-VN' ? r.product.name : r.product.nameEn) +
                        ' · ' +
                        money(r.input.principal),
                    })),
                  ]}
                />
              )}
            </Data>
            {context ? (
              <>
                <FinancialMetric
                  label={t('firstPayment')}
                  value={money(context.result.firstPayment)}
                />
                <SourceAttribution source={t('calc')} />
              </>
            ) : null}
            <Text small muted>
              {t('aiNote')}
            </Text>
          </Card>
        </View>
      </Columns>
    </Page>
  );
}
