import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  TextInput,
  Text as NativeText,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  FileText,
  Paperclip,
  ShieldCheck,
  Square,
} from 'lucide-react-native';
import type { IntelligenceBlock, IntelligenceRequest, IntelligenceTurn } from '@finora/contracts';
import { tokens } from '@finora/design-tokens';
import { date } from '@finora/i18n';
import {
  Action,
  BottomSheet,
  Button,
  Dialog,
  Eyebrow,
  Heading,
  Text,
  Switch,
  useDesign,
} from '@finora/ui';
import { useWorkspaceDockInset } from '../../src/components/layout';
import { AnalysisBlocks } from '../../src/features/intelligence/blocks';
import { chooseDraftPrompt, chooseSimulationId } from '../../src/features/intelligence/model';
import {
  clearIntelligenceHistory,
  loadIntelligenceHistory,
  loadIntelligenceStatus,
  streamIntelligence,
} from '../../src/features/intelligence/transport';
import { api, auth } from '../../src/services/client';
import { requestId } from '../../src/services/request-id';

type Provider = IntelligenceTurn['provider'];
type Draft = {
  request: IntelligenceRequest;
  provider?: Provider;
  answer: string;
  blocks: IntelligenceBlock[];
  turnId?: string;
  stage: 'sending' | 'stopped' | 'failed' | 'done';
};

export default function Intelligence() {
  const session = auth.useSession();
  const { simulationId, draftPrompt } = useLocalSearchParams<{
    simulationId?: string;
    draftPrompt?: string;
  }>();
  const uid = session.data?.user.id;
  return uid ? (
    <Desk
      key={uid}
      uid={uid}
      simulationId={chooseSimulationId(simulationId)}
      initialPrompt={chooseDraftPrompt(draftPrompt)}
    />
  ) : null;
}

function Desk({
  uid,
  simulationId,
  initialPrompt,
}: {
  uid: string;
  simulationId?: string;
  initialPrompt: string;
}) {
  const { t, colors: c, locale, money } = useDesign();
  const { width } = useWindowDimensions();
  const wide = width >= 1150;
  const dock = useWorkspaceDockInset();
  const [externalConsent, setConsent] = useState(false);
  const [privacy, openPrivacy] = useState(false);
  const [toolSheet, openTools] = useState(false);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState(false);
  const [focus, setFocus] = useState(false);
  const [follow, setFollow] = useState(true);
  const [announcement, announce] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const active = useRef<AbortController | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const followRef = useRef(true);
  const initial = useRef(false);
  const turnTop = useRef(0);
  const stream = draft?.stage === 'sending';
  const queryClient = useQueryClient();
  const historyKey = ['intelligence-history', uid] as const;
  const status = useQuery({
    queryKey: ['intelligence-provider', uid],
    queryFn: ({ signal }) => loadIntelligenceStatus(signal),
    retry: false,
  });
  const allowConsent = status.data === 'openai';
  const history = useQuery({
    queryKey: historyKey,
    queryFn: ({ signal }) => loadIntelligenceHistory(signal),
    retry: false,
  });
  const saved = useQuery({
    queryKey: ['savedOne', uid, simulationId],
    queryFn: () => api.detail(simulationId!),
    enabled: !!simulationId,
    retry: false,
  });
  const scoped = simulationId ? saved.data : undefined;
  const pendingScope = Boolean(simulationId && saved.isPending);
  const historyRows = history.data ?? [];
  const last = historyRows.at(-1);
  const current =
    draft?.stage === 'done' &&
    last?.answer === draft.answer &&
    last?.prompt === draft.request.prompt
      ? null
      : draft;
  const engaged = !!current || historyRows.length > 0;
  const provider = current?.provider;

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
  }, [initialPrompt]);
  useEffect(() => {
    return () => {
      const previous = active.current;
      active.current = null;
      previous?.abort();
    };
  }, []);

  function jump() {
    followRef.current = true;
    setFollow(true);
    scroll.current?.scrollToEnd({ animated: false });
  }

  function fill(next: string) {
    setPrompt(next);
    if (engaged) jump();
  }

  async function submit(retry?: IntelligenceRequest) {
    if (clearing || active.current || (!retry && (!prompt.trim() || pendingScope))) return;
    const request: IntelligenceRequest = retry
      ? { ...retry }
      : {
          requestId: requestId(),
          prompt: prompt.trim(),
          locale,
          simulationId: scoped?.id,
          externalConsent: allowConsent && externalConsent,
        };
    // Do not re-send a previously opted-in request after turning off permission.
    if (retry?.externalConsent && (!allowConsent || !externalConsent)) {
      request.externalConsent = false;
      request.requestId = requestId();
    }
    const control = new AbortController();
    active.current = control;
    setConsent(false);
    const currentRequest = () => active.current === control;
    let reply: Draft = { request, answer: '', blocks: [], stage: 'sending' };
    if (!retry) {
      setPrompt('');
      if (initialPrompt) router.setParams({ draftPrompt: '' });
    }
    setDraft(reply);
    initial.current = true;
    announce(t('intelligenceWorking'));
    jump();
    try {
      await streamIntelligence(request, control.signal, (event) => {
        if (!currentRequest() || control.signal.aborted) return;
        switch (event.type) {
          case 'meta':
            reply = { ...reply, provider: event.provider };
            break;
          case 'delta':
            reply = { ...reply, answer: reply.answer + event.text };
            break;
          case 'structured': {
            reply = { ...reply, blocks: event.blocks };
            if (followRef.current) {
              followRef.current = false;
              // Show the beginning of a financial answer, not the last disclosure or offer.
              requestAnimationFrame(() => {
                if (currentRequest())
                  scroll.current?.scrollTo({ y: turnTop.current, animated: false });
              });
            }
            break;
          }
          case 'done':
            reply = { ...reply, turnId: event.turnId };
            break;
        }
        setDraft(reply);
      });
      if (!currentRequest()) return;
      if (control.signal.aborted) throw new Error('Aborted');
      const reloaded = await history.refetch();
      if (!currentRequest()) return;
      setDraft(reloaded.isSuccess ? null : { ...reply, stage: 'done' });
      announce(t('intelligenceComplete'));
    } catch {
      if (!currentRequest()) return;
      setDraft({ ...reply, blocks: [], stage: control.signal.aborted ? 'stopped' : 'failed' });
      announce(t(control.signal.aborted ? 'intelligenceStopped' : 'intelligenceSendError'));
    } finally {
      if (currentRequest()) active.current = null;
    }
  }

  const modeLabel = !provider
    ? t(allowConsent && externalConsent ? 'intelligenceExternalReady' : 'intelligenceLocalDefault')
    : provider === 'mock'
      ? t('intelligenceLocal')
      : t('intelligenceRemote') + ' · OpenAI';
  const starters = scoped
    ? ([
        ['intelligencePromptSaved', 'intelligenceStarterSaved'],
        ['intelligencePromptShock', 'intelligenceStarterShock'],
        ['intelligencePromptCompare', 'intelligenceStarterCompare'],
      ] as const)
    : ([
        ['intelligencePromptAfford', 'intelligenceStarterAfford'],
        ['intelligencePromptCompare', 'intelligenceStarterCompare'],
        ['intelligencePromptShock', 'intelligenceStarterShock'],
      ] as const);

  async function clear() {
    if (active.current || clearing) return;
    setClearError(false);
    setClearing(true);
    try {
      await clearIntelligenceHistory(new AbortController().signal);
      await queryClient.cancelQueries({ queryKey: historyKey, exact: true });
      queryClient.setQueryData(historyKey, []);
      initial.current = false;
      setDraft(null);
      setConfirmClear(false);
    } catch {
      setClearError(true);
    } finally {
      setClearing(false);
    }
  }

  const toolsPanel = (
    <View style={{ gap: 10 }}>
      <Eyebrow>{t('intelligenceTools')}</Eyebrow>
      <Entry
        label={t('intelligenceCatalog')}
        icon={<BookOpen color={c.primary} size={17} />}
        onPress={() => {
          openTools(false);
          router.push('/explore');
        }}
      />
      <Entry
        label={t('intelligenceDocuments')}
        icon={<FileText color={c.primary} size={17} />}
        onPress={() => {
          openTools(false);
          router.push('/documents');
        }}
      />
      <Entry
        label={t('intelligencePrivacy')}
        icon={<ShieldCheck color={c.primary} size={17} />}
        onPress={() => {
          openTools(false);
          openPrivacy(true);
        }}
      />
      <Text small muted style={{ paddingTop: 5 }}>
        {t('intelligenceCaution')}
      </Text>
    </View>
  );

  return (
    <View
      style={{
        flex: 1,
        minHeight: 0,
        width: '100%',
        alignSelf: 'center',
        maxWidth: 1240,
        paddingHorizontal: wide ? 34 : 18,
        paddingBottom: dock || 14,
      }}
    >
      <View
        style={{
          paddingVertical: 6,
          borderBottomWidth: 1,
          borderColor: c.border,
          flexDirection: 'row',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Action
          label={t('ai')}
          onPress={() => router.navigate('/assistant')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 4 }}
        >
          <ArrowLeft size={16} color={c.primary} />
          <Text small bold style={{ color: c.primary }}>
            {t('ai')}
          </Text>
        </Action>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent }} />
          <Text small muted style={{ textAlign: 'right' }}>
            {modeLabel}
          </Text>
        </View>
        {!wide ? (
          <Action
            label={t('intelligenceTools')}
            onPress={() => openTools(true)}
            style={{ minWidth: 44, alignItems: 'center' }}
          >
            <BookOpen size={18} color={c.primary} />
          </Action>
        ) : null}
      </View>

      <View style={{ flex: 1, minHeight: 0, flexDirection: 'row', gap: wide ? 27 : 0 }}>
        <View style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          {engaged ? (
            <Heading size={wide ? 27 : 22} style={{ paddingTop: 11, paddingBottom: 8 }}>
              {t('intelligenceTitle')}
            </Heading>
          ) : null}
          {scoped || (simulationId && saved.isError) ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                borderBottomWidth: 1,
                borderColor: c.border,
              }}
            >
              <Paperclip size={16} color={c.primary} />
              <Text small style={{ flex: 1 }} muted>
                {scoped
                  ? (locale === 'vi-VN' ? scoped.product.name : scoped.product.nameEn) +
                    ' · ' +
                    money(scoped.input.principal)
                  : t('intelligenceScopeMissing')}
              </Text>
              <Action
                label={t('intelligenceScopeRemove')}
                onPress={() => router.setParams({ simulationId: '' })}
                disabled={stream}
              >
                <Text small bold style={{ color: c.primary }}>
                  {t('intelligenceScopeRemove')}
                </Text>
              </Action>
            </View>
          ) : null}
          <ScrollView
            ref={scroll}
            style={{ flex: 1, minHeight: 0 }}
            contentContainerStyle={{ gap: 20, paddingVertical: 17, paddingRight: wide ? 7 : 0 }}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={64}
            onScroll={({ nativeEvent }) => {
              const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
              const next = contentSize.height - layoutMeasurement.height - contentOffset.y < 100;
              followRef.current = next;
              setFollow(next);
            }}
            onContentSizeChange={() => {
              if (!initial.current && historyRows.length) {
                initial.current = true;
                followRef.current = true;
              }
              if (engaged && followRef.current) scroll.current?.scrollToEnd({ animated: false });
            }}
          >
            {!engaged ? (
              <>
                <View
                  style={{
                    backgroundColor: c.forest,
                    borderRadius: tokens.radius.feature,
                    padding: wide ? 28 : 20,
                    gap: 9,
                  }}
                >
                  <Eyebrow style={{ color: c.onForestMuted }}>FINORA INTELLIGENCE</Eyebrow>
                  <Heading
                    size={wide ? 49 : 32}
                    style={{ color: c.onForest, maxWidth: width <= 430 ? 250 : undefined }}
                  >
                    {t('intelligenceTitle')}
                  </Heading>
                  <Text style={{ color: c.onForestMuted, maxWidth: 530 }}>
                    {t('intelligenceIntro')}
                  </Text>
                </View>
                <View style={{ gap: 4 }}>
                  <Eyebrow style={{ marginBottom: 4 }}>{t('intelligenceStarter')}</Eyebrow>
                  {starters.map(([question, title], index) => (
                    <Entry
                      key={question}
                      label={t(title)}
                      icon={
                        <Text small muted style={{ fontVariant: ['tabular-nums'] }}>
                          {'0' + (index + 1)}
                        </Text>
                      }
                      onPress={() => fill(t(question))}
                    />
                  ))}
                </View>
              </>
            ) : null}
            {!history.data && history.isError ? (
              <Action label={t('retry')} onPress={() => void history.refetch()}>
                <Text role="alert" small muted>
                  {t('error')}
                </Text>
              </Action>
            ) : null}
            {historyRows.map((row, index) => (
              <View key={row.id} style={{ gap: 9 }}>
                {index === 0 ||
                date(row.createdAt, locale) !== date(historyRows[index - 1].createdAt, locale) ? (
                  <Text small muted>
                    {date(row.createdAt, locale)}
                  </Text>
                ) : null}
                <Turn
                  turnId={row.id}
                  prompt={row.prompt}
                  answer={row.answer}
                  provider={row.provider}
                  blocks={row.blocks}
                />
              </View>
            ))}
            {current ? (
              <View
                style={{ gap: 10 }}
                onLayout={({ nativeEvent }) => {
                  turnTop.current = nativeEvent.layout.y;
                }}
              >
                <Turn
                  turnId={current.stage === 'done' ? current.turnId : undefined}
                  prompt={current.request.prompt}
                  answer={current.answer}
                  provider={current.provider}
                  blocks={current.blocks}
                />
                {current.stage === 'sending' && !current.answer ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color={c.primary} />
                    <Text small muted>
                      {t('intelligenceWorking')}
                    </Text>
                  </View>
                ) : null}
                {current.stage === 'stopped' || current.stage === 'failed' ? (
                  <View style={{ alignItems: 'flex-start' }}>
                    <Text role={current.stage === 'failed' ? 'alert' : undefined} small muted>
                      {t(
                        current.stage === 'stopped'
                          ? 'intelligenceStopped'
                          : 'intelligenceSendError',
                      )}
                    </Text>
                    <Action label={t('retry')} onPress={() => void submit(current.request)}>
                      <Text small bold style={{ color: c.primary }}>
                        {t('retry')}
                      </Text>
                    </Action>
                  </View>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
          {!follow ? (
            <Action
              label={t('assistantLatest')}
              onPress={jump}
              style={{
                alignSelf: 'center',
                alignItems: 'center',
                flexDirection: 'row',
                gap: 7,
              }}
            >
              <ArrowDown size={15} color={c.primary} />
              <Text small bold style={{ color: c.primary }}>
                {t('assistantLatest')}
              </Text>
            </Action>
          ) : null}
          <View
            accessibilityLiveRegion="polite"
            style={{ width: 1, height: 1, overflow: 'hidden' }}
          >
            <NativeText style={{ fontSize: 1, color: c.background }}>{announcement}</NativeText>
          </View>
          <View
            style={{
              borderTopWidth: 1,
              borderColor: c.border,
              paddingTop: 9,
              gap: 5,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                borderWidth: 1,
                borderColor: focus ? c.focus : c.border,
                backgroundColor: c.surface,
                borderRadius: tokens.radius.card,
                padding: 6,
                gap: 7,
              }}
            >
              <TextInput
                accessibilityLabel={t('intelligenceAsk')}
                value={prompt}
                onChangeText={setPrompt}
                onFocus={() => setFocus(true)}
                onBlur={() => setFocus(false)}
                editable={!stream}
                multiline
                numberOfLines={1}
                maxLength={1200}
                placeholder={t('intelligenceAsk')}
                placeholderTextColor={c.muted}
                style={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 44,
                  maxHeight: 94,
                  paddingHorizontal: 7,
                  paddingVertical: 9,
                  color: c.foreground,
                  fontFamily: tokens.font.body,
                  fontSize: 16,
                  ...(Platform.OS === 'web' ? { outlineWidth: 0 } : {}),
                }}
              />
              <Action
                label={t(stream ? 'stop' : 'send')}
                disabled={!stream && (!prompt.trim() || pendingScope || clearing)}
                onPress={() => (stream ? active.current?.abort() : void submit())}
                style={{
                  width: 44,
                  alignItems: 'center',
                  backgroundColor: c.primary,
                  borderRadius: tokens.radius.control,
                }}
              >
                {stream ? (
                  <Square size={15} color={c.onPrimary} fill={c.onPrimary} />
                ) : (
                  <ArrowUp size={21} color={c.onPrimary} />
                )}
              </Action>
            </View>
            {allowConsent && externalConsent ? (
              <Text small muted>
                {t('intelligenceConsentOn')}
              </Text>
            ) : null}
          </View>
        </View>
        {wide ? (
          <ScrollView
            style={{ width: 265, flexGrow: 0, borderLeftWidth: 1, borderColor: c.border }}
            contentContainerStyle={{ paddingLeft: 19, paddingTop: 19, paddingBottom: 14 }}
          >
            {toolsPanel}
          </ScrollView>
        ) : null}
      </View>
      <BottomSheet
        title={t('intelligenceTools')}
        visible={toolSheet}
        onClose={() => openTools(false)}
      >
        {toolsPanel}
      </BottomSheet>
      <BottomSheet
        title={t('intelligencePrivacy')}
        visible={privacy}
        onClose={() => openPrivacy(false)}
      >
        <Text>{t('intelligenceDataHint')}</Text>
        {allowConsent ? (
          <Switch label={t('intelligenceConsent')} value={externalConsent} onChange={setConsent} />
        ) : null}
        <Text small muted>
          {t('intelligenceCaution')}
        </Text>
        {historyRows.length ? (
          <Button
            label={t('intelligenceClear')}
            variant="outline"
            disabled={stream || clearing}
            onPress={() => {
              openPrivacy(false);
              setClearError(false);
              setConfirmClear(true);
            }}
          />
        ) : null}
      </BottomSheet>
      <Dialog
        title={t('intelligenceConfirmClear')}
        visible={confirmClear}
        onClose={() => !clearing && setConfirmClear(false)}
      >
        <Text>{t('intelligenceClearHint')}</Text>
        {clearError ? (
          <Text role="alert" muted>
            {t('error')}
          </Text>
        ) : null}
        <Button label={t('intelligenceClear')} loading={clearing} onPress={() => void clear()} />
        <Button
          label={t('cancel')}
          variant="outline"
          disabled={clearing}
          onPress={() => setConfirmClear(false)}
        />
      </Dialog>
    </View>
  );
}

function Turn({
  prompt,
  answer,
  provider,
  blocks,
  turnId,
}: {
  prompt: string;
  answer: string;
  provider?: Provider;
  blocks: IntelligenceBlock[];
  turnId?: string;
}) {
  const { t, colors: c } = useDesign();
  return (
    <View style={{ gap: 13 }}>
      <View
        style={{
          alignSelf: 'flex-end',
          maxWidth: '92%',
          backgroundColor: c.secondary,
          borderRadius: tokens.radius.card,
          borderBottomRightRadius: 4,
          paddingHorizontal: 13,
          paddingVertical: 9,
          gap: 1,
        }}
      >
        <Text small bold style={{ color: c.primary }}>
          {t('you')}
        </Text>
        <Text>{prompt}</Text>
      </View>
      {answer || blocks.length ? (
        <View style={{ gap: 9 }}>
          <Eyebrow>
            {provider === 'mock'
              ? t('intelligenceLocal')
              : provider
                ? t('intelligenceRemote') + ' · OpenAI'
                : t('ai')}
          </Eyebrow>
          {answer ? <Text style={{ maxWidth: tokens.layout.reading }}>{answer}</Text> : null}
          {blocks.length ? <AnalysisBlocks blocks={blocks} turnId={turnId} /> : null}
        </View>
      ) : null}
    </View>
  );
}

function Entry({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  const { colors: c } = useDesign();
  return (
    <Action
      label={label}
      onPress={onPress}
      style={{
        borderTopWidth: 1,
        borderColor: c.border,
        borderRadius: 0,
        gap: 10,
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 7,
      }}
    >
      {icon}
      <Text small bold style={{ flex: 1 }}>
        {label}
      </Text>
      <ArrowRight size={15} color={c.primary} />
    </Action>
  );
}
