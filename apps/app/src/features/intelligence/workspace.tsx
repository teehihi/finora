import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { SourceSerif4_500Medium } from '@expo-google-fonts/source-serif-4/500Medium';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
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
  ArrowUpRight,
  MessagesSquare,
  ArrowUp,
  BookOpen,
  ChartNoAxesCombined,
  CircleDollarSign,
  Scale,
  FileText,
  Paperclip,
  Plus,
  ShieldCheck,
  Square,
} from 'lucide-react-native';
import type { IntelligenceBlock, IntelligenceRequest, IntelligenceTurn } from '@finora/contracts';
import { tokens } from '@finora/design-tokens';
import { date } from '@finora/i18n';
import { Action, BottomSheet, Button, Dialog, Heading, Text, Switch, useDesign } from '@finora/ui';
import { useWorkspaceDockInset } from '../../components/layout';
import { LakeScene } from './lake-scene';
import { FinComposerSurface, FinTabPicker, FinTabsButton } from './fin-tab-picker';
import { useFinPromptDraft } from './prompt-session';
import { AnalysisBlocks } from './blocks';
import { FinancePrompt, FinAvatar, ModeMark } from './presentation';
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
  const scope = chooseSimulationId(simulationId);
  return uid ? (
    <Desk
      key={uid + ':' + (scope ?? '')}
      uid={uid}
      simulationId={scope}
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
  const [serifReady] = useFonts({ [tokens.font.serifVi]: SourceSerif4_500Medium });
  const { width, height } = useWindowDimensions();
  const wide = width >= 1150;
  const phone = width < tokens.breakpoints.rail;
  const dock = useWorkspaceDockInset();
  const insets = useSafeAreaInsets();
  const [externalConsent, setConsent] = useState(false);
  const [privacy, openPrivacy] = useState(false);
  const [toolSheet, openTools] = useState(false);
  const [prompt, setPrompt] = useFinPromptDraft(simulationId, initialPrompt);
  const [tabsOpen, showTabs] = useState(false);
  const closeTabs = useCallback(() => showTabs(false), []);
  const [frameHeight, setFrameHeight] = useState(height);
  const [toolbarHeight, setToolbarHeight] = useState(62);
  const bottomGap = dock || 14;
  useFocusEffect(useCallback(() => closeTabs, [closeTabs]));
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
  const provider = current?.provider ?? last?.provider;

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
  }, [initialPrompt, setPrompt]);
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
      : t('intelligenceDefaultMark')
    : provider === 'mock'
      ? t('intelligenceLocal')
      : t('intelligenceRemote') + ' · OpenAI';
  const starters = scoped
    ? ([
        ['intelligencePromptSaved', 'intelligenceStarterSaved', FileText],
        ['intelligencePromptShock', 'intelligenceStarterShock', ChartNoAxesCombined],
        ['intelligencePromptCompare', 'intelligenceStarterCompare', Scale],
      ] as const)
    : ([
        ['intelligenceTermExampleDraft', 'intelligenceTermExample', Scale],
        ['intelligencePromptAfford', 'intelligenceStarterAfford', CircleDollarSign],
        ['intelligencePromptShock', 'intelligenceStarterShock', ChartNoAxesCombined],
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

  const providerMark = (
    <ModeMark
      label={modeLabel}
      external={provider ? provider !== 'mock' : allowConsent && externalConsent}
    />
  );
  const toolsButton = (
    <Action
      label={t('intelligenceTools')}
      onPress={() => openTools(true)}
      style={{
        width: 44,
        minHeight: 44,
        alignItems: 'center',
        borderRadius: 22,
        backgroundColor: c.secondary,
      }}
    >
      <Plus size={20} color={c.primary} />
    </Action>
  );

  return (
    <View
      onLayout={({ nativeEvent }) => setFrameHeight(nativeEvent.layout.height)}
      style={{
        flex: 1,
        minHeight: 0,
        width: '100%',
        alignSelf: 'center',
        paddingHorizontal: wide ? 38 : 20,
        paddingTop: phone ? insets.top : 0,
        paddingBottom: bottomGap,
      }}
    >
      <LakeScene reading={engaged} dockInset={phone ? toolbarHeight + bottomGap : dock} />
      <View
        style={{
          paddingVertical: 10,
          flexWrap: 'wrap',
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            paddingRight: 10,
            borderRadius: 99,
            backgroundColor: c.surface,
          }}
        >
          <FinAvatar />
          <Text
            role={engaged ? 'header' : undefined}
            bold
            style={{ color: c.foreground, fontSize: 17 }}
          >
            {t('ai')}
          </Text>
        </View>
        {provider || (allowConsent && externalConsent) ? (
          <View style={{ marginLeft: 'auto' }}>{providerMark}</View>
        ) : null}
        {!wide && !phone ? toolsButton : null}
      </View>

      <View style={{ flex: 1, minHeight: 0, flexDirection: 'row', gap: wide ? 27 : 0 }}>
        <View style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
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
              <View
                style={{
                  gap: wide ? 26 : 18,
                  paddingTop: height < 700 ? 0 : wide ? 38 : 18,
                  maxWidth: 520,
                }}
              >
                <View style={{ gap: 9 }}>
                  <Heading
                    size={wide ? 58 : 43}
                    style={{
                      fontFamily: serifReady ? tokens.font.serifVi : tokens.font.heading,
                      maxWidth: wide ? 480 : 310,
                      color: c.foreground,
                    }}
                  >
                    {t('intelligenceWelcome')}
                  </Heading>
                  <Text style={{ maxWidth: wide ? 420 : 315, lineHeight: 23 }}>
                    {t('intelligenceWelcomeHint')}
                  </Text>
                </View>
                <View
                  style={{
                    maxWidth: 440,
                    backgroundColor: c.surface,
                    borderRadius: tokens.radius.card,
                    paddingHorizontal: 15,
                  }}
                >
                  {starters.map(([question, label, Icon], index) => (
                    <Action
                      key={question}
                      label={t(label)}
                      onPress={() => fill(t(question))}
                      style={{
                        minHeight: 52,
                        paddingVertical: 8,
                        gap: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderRadius: 0,
                        borderColor: c.border,
                        borderTopWidth: index ? 1 : 0,
                      }}
                    >
                      <Icon size={19} color={c.primary} strokeWidth={1.7} />
                      <Text bold style={{ flex: 1, fontSize: 15, lineHeight: 22 }}>
                        {t(label)}
                      </Text>
                      <ArrowUpRight size={16} color={c.muted} />
                    </Action>
                  ))}
                </View>
              </View>
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
          {engaged && !follow ? (
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
            onLayout={({ nativeEvent }) => setToolbarHeight(nativeEvent.layout.height)}
            style={{ paddingTop: 7, gap: 5 }}
          >
            <View
              testID="fin-composer"
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                borderWidth: 1,
                borderColor: focus ? c.focus : phone ? 'transparent' : c.border,
                backgroundColor: phone ? 'transparent' : c.surface,
                borderRadius: 28,
                padding: 6,
                gap: phone ? 4 : 7,
              }}
            >
              {phone ? (
                <>
                  <FinComposerSurface />
                  <FinTabsButton open={tabsOpen} onPress={() => showTabs((open) => !open)} />
                  {toolsButton}
                </>
              ) : null}
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
                placeholder={t(phone ? 'intelligenceComposerHint' : 'intelligenceAsk')}
                placeholderTextColor={c.muted}
                style={{
                  position: 'relative',
                  zIndex: 1,
                  flex: 1,
                  minWidth: 0,
                  minHeight: 44,
                  maxHeight: 94,
                  paddingHorizontal: phone ? 5 : 11,
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
                  width: 44,
                  minHeight: 44,
                  alignItems: 'center',
                  backgroundColor:
                    !stream && (!prompt.trim() || scopeUnavailable || clearing)
                      ? c.elevated
                      : c.primary,
                  borderRadius: 22,
                }}
              >
                {stream ? (
                  <Square size={15} color={c.onPrimary} fill={c.onPrimary} />
                ) : (
                  <ArrowUp
                    size={21}
                    color={
                      !stream && (!prompt.trim() || scopeUnavailable || clearing)
                        ? c.muted
                        : c.onPrimary
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
      {phone && tabsOpen ? (
        <FinTabPicker
          onClose={closeTabs}
          bottom={toolbarHeight + bottomGap}
          maxHeight={Math.min(
            190,
            Math.max(72, frameHeight - toolbarHeight - bottomGap - insets.top - 12),
          )}
        />
      ) : null}
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
        <Text>{prompt}</Text>
      </View>
      {answer || blocks.length ? (
        <View style={{ gap: 9 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <FinAvatar />
            <Text small bold style={{ color: c.primary }}>
              {t('ai')}
            </Text>
            {provider ? (
              <ModeMark
                label={
                  provider === 'mock'
                    ? t('intelligenceLocal')
                    : t('intelligenceRemote') + ' · OpenAI'
                }
                external={provider !== 'mock'}
              />
            ) : null}
          </View>
          {answer ? (
            <View
              style={{
                backgroundColor: c.surface,
                borderRadius: 18,
                borderTopLeftRadius: 5,
                paddingHorizontal: 14,
                paddingVertical: 11,
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
