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
  MessagesSquare,
  ArrowUp,
  BookOpen,
  ChartNoAxesCombined,
  CircleDollarSign,
  Scale,
  FileText,
  Paperclip,
  ShieldCheck,
  Square,
} from 'lucide-react-native';
import type { IntelligenceBlock, IntelligenceRequest, IntelligenceTurn } from '@finora/contracts';
import { tokens } from '@finora/design-tokens';
import { date } from '@finora/i18n';
import { Action, BottomSheet, Button, Dialog, Heading, Text, Switch, useDesign } from '@finora/ui';
import { useWorkspaceDockInset } from '../../components/layout';
import { SignatureIcon } from '../../components/signature';
import { AnalysisBlocks } from './blocks';
import { FinancePrompt, FinAvatar, FinIntro, ModeMark } from './presentation';
import { chooseDraftPrompt, chooseSimulationId } from './model';
import {
  clearIntelligenceHistory,
  loadIntelligenceHistory,
  loadIntelligenceStatus,
  streamIntelligence,
} from './transport';
import { api, auth } from '../../services/client';
import { requestId } from '../../services/request-id';

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
  const vi = locale === 'vi-VN';
  const title = vi ? 'Cùng Fin tính khoản vay' : 'Plan your loan with Fin';
  const { width, fontScale } = useWindowDimensions();
  const compactStarters = width >= 370 && fontScale < 1.25;
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
  const composer = useRef<ComponentRef<typeof TextInput>>(null);
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
  const scopeUnavailable = Boolean(simulationId && (saved.isPending || saved.isError));
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
    requestAnimationFrame(() => composer.current?.focus());
  }

  async function submit(retry?: IntelligenceRequest) {
    if (clearing || active.current || (!retry && (!prompt.trim() || scopeUnavailable))) return;
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
    ? allowConsent && externalConsent
      ? t('intelligenceExternalReady')
      : vi
        ? 'Cục bộ · mặc định'
        : 'Local · default'
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
    <View
      style={{
        gap: 9,
        padding: wide ? 13 : 0,
        borderRadius: 22,
        backgroundColor: wide ? c.elevated : undefined,
      }}
    >
      <Heading size={19}>{t('intelligenceTools')}</Heading>
      <FinancePrompt
        label={t('intelligenceCatalog')}
        icon={<BookOpen color={c.primary} size={17} />}
        onPress={() => {
          openTools(false);
          router.push('/explore');
        }}
      />
      <FinancePrompt
        label={t('intelligenceDocuments')}
        icon={<FileText color={c.primary} size={17} />}
        onPress={() => {
          openTools(false);
          router.push('/documents');
        }}
      />
      <FinancePrompt
        label={t('intelligencePrivacy')}
        icon={<ShieldCheck color={c.primary} size={17} />}
        onPress={() => {
          openTools(false);
          openPrivacy(true);
        }}
      />
      <FinancePrompt
        label={vi ? 'Cuộc trò chuyện cũ' : 'Classic chat history'}
        icon={<MessagesSquare color={c.primary} size={17} />}
        onPress={() => {
          openTools(false);
          router.push({ pathname: '/assistant', params: { mode: 'legacy' } });
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
        paddingHorizontal: wide ? 38 : 16,
        paddingBottom: dock || 14,
      }}
    >
      <View
        style={{
          paddingVertical: 7,
          borderBottomWidth: 1,
          borderColor: c.border,
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          <FinAvatar />
          <Text bold style={{ color: c.foreground, fontSize: 17 }}>
            {t('ai')}
          </Text>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <ModeMark
            label={modeLabel}
            external={provider ? provider !== 'mock' : allowConsent && externalConsent}
          />
        </View>
        {!wide ? (
          <Action
            label={t('intelligenceTools')}
            onPress={() => openTools(true)}
            style={{
              minWidth: 44,
              alignItems: 'center',
              backgroundColor: c.surface,
              borderRadius: 12,
            }}
          >
            <BookOpen size={18} color={c.primary} />
          </Action>
        ) : null}
      </View>

      <View style={{ flex: 1, minHeight: 0, flexDirection: 'row', gap: wide ? 27 : 0 }}>
        <View style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          {engaged ? (
            <Heading size={wide ? 28 : 22} style={{ paddingTop: 10, paddingBottom: 7 }}>
              {title}
            </Heading>
          ) : null}
          {scoped || (simulationId && saved.isError) ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: c.secondary,
                borderRadius: 12,
                paddingHorizontal: 12,
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
            contentContainerStyle={{
              gap: 16,
              paddingTop: 11,
              paddingBottom: 17,
              paddingRight: wide ? 7 : 0,
            }}
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
                <FinIntro
                  title={title}
                  signature
                  description={
                    vi
                      ? 'Cho Fin biết bạn định vay bao nhiêu. Mình sẽ tách rõ số phải trả, lãi, phí và dòng tiền còn lại.'
                      : 'Tell Fin how much you want to borrow. See installments, interest, fees and the cash you may have left.'
                  }
                  wide={wide}
                />
                <View style={{ gap: 10 }}>
                  <Heading size={18}>{t('intelligenceStarter')}</Heading>
                  <View
                    style={{
                      flexDirection: compactStarters ? 'row' : 'column',
                      alignItems: 'stretch',
                      gap: 7,
                    }}
                  >
                    {starters.map(([question, title], index) => {
                      const Icon = [CircleDollarSign, Scale, ChartNoAxesCombined][index]!;
                      const journeyStarter = !scoped && question === 'intelligencePromptCompare';
                      return (
                        <FinancePrompt
                          key={question}
                          label={
                            journeyStarter
                              ? vi
                                ? 'So sánh 12 và 24 tháng'
                                : 'Compare 12 and 24 months'
                              : t(title)
                          }
                          tile={compactStarters}
                          style={compactStarters ? { flex: 1, minWidth: 0 } : undefined}
                          icon={
                            <SignatureIcon
                              icon={Icon}
                              size={compactStarters ? 36 : 31}
                              tone={(['emerald', 'blue', 'amber'] as const)[index]}
                            />
                          }
                          onPress={() =>
                            fill(
                              journeyStarter
                                ? vi
                                  ? 'Tôi muốn vay 50 triệu để mua xe. Nếu trả trong 12 hay 24 tháng thì khác nhau thế nào?'
                                  : 'I want to borrow 50 million VND to buy a vehicle. How do 12 and 24 months compare?'
                                : t(question),
                            )
                          }
                        />
                      );
                    })}
                  </View>
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
                  followUp={
                    index === historyRows.length - 1 &&
                    !current &&
                    !prompt.trim() &&
                    (row.simulationId ?? undefined) === simulationId
                      ? fill
                      : undefined
                  }
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
                  followUp={current.stage === 'done' && !prompt.trim() ? fill : undefined}
                />
                {current.stage === 'sending' && !current.answer ? (
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      borderRadius: 16,
                      padding: 10,
                      backgroundColor: c.secondary,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
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
              paddingTop: 7,
              gap: 5,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                borderWidth: 1,
                borderColor: focus ? c.focus : c.borderStrong,
                backgroundColor: c.surface,
                borderRadius: 23,
                padding: 6,
                gap: 7,
                ...(focus
                  ? {
                      shadowColor: c.focus,
                      shadowOpacity: 0.15,
                      shadowRadius: 5,
                      shadowOffset: { width: 0, height: 0 },
                    }
                  : {}),
              }}
            >
              <TextInput
                ref={composer}
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
                  paddingHorizontal: 11,
                  paddingVertical: 9,
                  color: c.foreground,
                  fontFamily: tokens.font.body,
                  fontSize: 16,
                  ...(Platform.OS === 'web' ? { outlineWidth: 0 } : {}),
                }}
              />
              <Action
                label={t(stream ? 'stop' : 'send')}
                disabled={!stream && (!prompt.trim() || scopeUnavailable || clearing)}
                onPress={() => (stream ? active.current?.abort() : void submit())}
                style={{
                  width: 46,
                  minHeight: 46,
                  alignItems: 'center',
                  backgroundColor:
                    !stream && (!prompt.trim() || scopeUnavailable || clearing)
                      ? c.elevated
                      : c.signatureLime,
                  borderRadius: 17,
                }}
              >
                {stream ? (
                  <Square size={15} color={c.signatureInk} fill={c.signatureInk} />
                ) : (
                  <ArrowUp
                    size={21}
                    color={
                      !stream && (!prompt.trim() || scopeUnavailable || clearing)
                        ? c.muted
                        : c.signatureInk
                    }
                  />
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
            style={{ width: 255, flexGrow: 0 }}
            contentContainerStyle={{ paddingTop: 9, paddingBottom: 14 }}
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
  followUp,
}: {
  prompt: string;
  answer: string;
  provider?: Provider;
  blocks: IntelligenceBlock[];
  turnId?: string;
  followUp?: (value: string) => void;
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <FinAvatar />
            <Text small bold>
              {provider === 'mock'
                ? t('intelligenceLocal')
                : provider
                  ? t('intelligenceRemote') + ' · OpenAI'
                  : t('ai')}
            </Text>
          </View>
          {answer ? (
            <View
              style={{
                borderLeftWidth: 3,
                borderColor: c.signatureEdge,
                backgroundColor: c.surface,
                borderRadius: 13,
                padding: 13,
              }}
            >
              <Text style={{ maxWidth: tokens.layout.reading }}>{answer}</Text>
            </View>
          ) : null}
          {blocks.length ? (
            <AnalysisBlocks blocks={blocks} turnId={turnId} followUp={followUp} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
