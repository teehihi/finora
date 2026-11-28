import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { SourceSerif4_500Medium } from '@expo-google-fonts/source-serif-4/500Medium';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Animated,
  Easing,
  BackHandler,
  Keyboard,
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
import {
  intelligenceProviderSchema,
  type IntelligenceBlock,
  type IntelligenceEvent,
  type IntelligenceProviderChoice,
  type IntelligenceRequest,
  type IntelligenceTurn,
} from '@finora/contracts';
import { dark, tokens } from '@finora/design-tokens';
import { date } from '@finora/i18n';
import {
  Action,
  BottomSheet,
  Button,
  Dialog,
  Heading,
  Text,
  Switch,
  useDesign,
  useReducedMotion,
} from '@finora/ui';
import { useWorkspaceDockInset } from '../../components/layout';
import { LakeScene } from './lake-scene';
import {
  FIN_BAR_GUTTER,
  FIN_BAR_PADDING,
  FIN_BAR_TARGET,
  FinBarButton,
  FinComposerDivider,
  FinComposerSurface,
  FinTabPicker,
  FinTabsButton,
} from './fin-tab-picker';
import { useFinPreviousPeer, useFinPromptDraft, useFinSwipeNavigation } from './prompt-session';
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

const FIN_INPUT_MIN_HEIGHT = 44;
const FIN_INPUT_LINE_HEIGHT = 21;
const FIN_INPUT_VERTICAL_PADDING = 9;
const FIN_TOOLBAR_BASE_HEIGHT = 62;
const finInputFont = {
  fontFamily: tokens.font.body,
  fontSize: 16,
  lineHeight: FIN_INPUT_LINE_HEIGHT,
} as const;

type Provider = IntelligenceTurn['provider'];
type ProgressStage = Extract<IntelligenceEvent, { type: 'progress' }>['stage'];
const progressLabel = {
  provider: 'intelligenceProgressProvider',
  profile: 'intelligenceProgressProfile',
  catalog: 'intelligenceProgressCatalog',
  calculation: 'intelligenceProgressCalculation',
} as const;
type Draft = {
  request: IntelligenceRequest;
  provider?: Provider;
  progress?: ProgressStage;
  answer: string;
  blocks: IntelligenceBlock[];
  turnId?: string;
  stage: 'sending' | 'stopped' | 'failed' | 'done';
};

export default function Intelligence() {
  const session = auth.useSession();
  const {
    simulationId,
    documentId,
    draftPrompt,
    conversationId: conversationParam,
  } = useLocalSearchParams<{
    simulationId?: string;
    documentId?: string;
    draftPrompt?: string;
    conversationId?: string;
  }>();
  const conversationId = chooseSimulationId(conversationParam);
  const uid = session.data?.user.id;
  const scope = chooseSimulationId(simulationId);
  return uid ? (
    <Desk
      key={uid + ':' + (conversationId ?? '') + ':' + (scope ?? '') + ':' + (documentId ?? '')}
      uid={uid}
      conversationId={conversationId}
      simulationId={scope}
      documentId={documentId}
      initialPrompt={chooseDraftPrompt(draftPrompt)}
    />
  ) : null;
}

function Desk({
  uid,
  conversationId,
  simulationId,
  documentId,
  initialPrompt,
}: {
  uid: string;
  conversationId?: string;
  simulationId?: string;
  documentId?: string;
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
  const [privacy, openPrivacy] = useState(false);
  const [toolSheet, openTools] = useState(false);
  const [prompt, setPrompt] = useFinPromptDraft(simulationId ?? documentId, initialPrompt);
  const [tabsOpen, showTabs] = useState(false);
  const closeTabs = useCallback(() => showTabs(false), []);
  const hasDraft = prompt.trim().length > 0;
  const showTabTrigger = phone && !hasDraft;
  useEffect(() => {
    if (!showTabTrigger) closeTabs();
  }, [closeTabs, showTabTrigger]);
  const [frameHeight, setFrameHeight] = useState(height);
  const [toolbarHeight, setToolbarHeight] = useState(FIN_TOOLBAR_BASE_HEIGHT);
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
  const [inputContentHeight, setInputContentHeight] = useState(FIN_INPUT_MIN_HEIGHT);
  const [inputWidth, setInputWidth] = useState(0);
  const nativeProbeHeight = useRef(0);
  const [iosLineCount, setIOSLineCount] = useState(1);
  const iosContentHeight =
    Math.max(iosLineCount, prompt.split('\n').length) * FIN_INPUT_LINE_HEIGHT +
    FIN_INPUT_VERTICAL_PADDING * 2;
  const measuredInputHeight = Platform.OS === 'ios' ? iosContentHeight : inputContentHeight;
  const inputLimit = Math.min(phone ? 132 : 152, Math.max(74, Math.round(frameHeight * 0.27)));
  const inputHeight = prompt
    ? Math.min(inputLimit, Math.max(FIN_INPUT_MIN_HEIGHT, measuredInputHeight))
    : FIN_INPUT_MIN_HEIGHT;
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const followRef = useRef(true);
  const initial = useRef(false);
  const turnTop = useRef(0);
  const stream = draft?.stage === 'sending';
  const previousPeer = useFinPreviousPeer();
  const navigateSwipe = useFinSwipeNavigation();
  const reduceMotion = useReducedMotion();
  const edgeOffset = useRef(new Animated.Value(0)).current;
  const edgeCommitted = useRef(false);
  const [edgeMoving, setEdgeMoving] = useState(false);
  useFocusEffect(
    useCallback(() => {
      return () => {
        edgeOffset.stopAnimation();
        edgeOffset.setValue(0);
        edgeCommitted.current = false;
        setEdgeMoving(false);
      };
    }, [edgeOffset]),
  );
  const canReturnToPeer = phone && !tabsOpen && !toolSheet && !privacy && !confirmClear && !stream;
  const openPreviousPeer = useCallback(() => {
    Keyboard.dismiss();
    router.replace(previousPeer());
  }, [previousPeer]);
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android' || !canReturnToPeer) return;
      const back = BackHandler.addEventListener('hardwareBackPress', () => {
        if (Keyboard.isVisible()) Keyboard.dismiss();
        else openPreviousPeer();
        return true;
      });
      return () => back.remove();
    }, [canReturnToPeer, openPreviousPeer]),
  );
  const edgeBackGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(canReturnToPeer && !focus)
        .hitSlop({ left: 0, width: 20 })
        .activeOffsetX(14)
        .failOffsetY([-22, 22])
        .maxPointers(1)
        .cancelsTouchesInView(false)
        .runOnJS(true)
        .onStart(() => {
          edgeCommitted.current = false;
          if (!reduceMotion) setEdgeMoving(true);
        })
        .onUpdate((event) => {
          if (!reduceMotion)
            edgeOffset.setValue(Math.min(64, Math.max(0, event.translationX) * 0.32));
        })
        .onEnd((event, success) => {
          if (
            success &&
            event.translationX >= 65 &&
            event.translationX > Math.abs(event.translationY) * 1.5
          ) {
            edgeCommitted.current = true;
            Keyboard.dismiss();
            navigateSwipe(previousPeer());
          }
        })
        .onFinalize(() => {
          if (edgeCommitted.current || reduceMotion) return;
          Animated.timing(edgeOffset, {
            toValue: 0,
            duration: 140,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: Platform.OS !== 'web',
          }).start(({ finished }) => {
            if (finished) setEdgeMoving(false);
          });
        }),
    [canReturnToPeer, edgeOffset, focus, navigateSwipe, previousPeer, reduceMotion],
  );
  const queryClient = useQueryClient();
  const historyKey = ['intelligence-history', uid, conversationId] as const;
  const providerKey = ['intelligence-preference', uid, conversationId] as const;
  const preferenceStorageKey = 'finora:provider:' + uid + ':' + (conversationId ?? 'default');
  const status = useQuery({
    queryKey: ['intelligence-provider', uid],
    queryFn: ({ signal }) => loadIntelligenceStatus(signal),
    retry: false,
  });
  const available = status.data?.available ?? [];
  const allowConsent = available.length > 0;
  const preference = useQuery({
    queryKey: providerKey,
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(preferenceStorageKey).catch(() => null);
      return intelligenceProviderSchema.safeParse(stored).data ?? null;
    },
    enabled: Boolean(uid),
    staleTime: Infinity,
  });
  const history = useQuery({
    queryKey: historyKey,
    queryFn: ({ signal }) => loadIntelligenceHistory(signal, conversationId),
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
  const selected = preference.data ?? last?.routing?.requestedProvider ?? 'mock';
  const externalConsent = selected !== 'mock' && available.includes(selected);
  const providerLabel = selected === 'anthropic' ? 'Claude' : 'OpenAI';
  const sendLabel = externalConsent
    ? t('intelligenceSendExternal') + ' ' + providerLabel
    : t('send');

  function selectProvider(choice: IntelligenceProviderChoice) {
    if (!uid) return;
    if (choice === 'mock') active.current?.abort();
    void queryClient.cancelQueries({ queryKey: providerKey, exact: true });
    queryClient.setQueryData(providerKey, choice);
    void AsyncStorage.setItem(preferenceStorageKey, choice).catch(() => undefined);
  }

  function setConsent(enabled: boolean) {
    selectProvider(
      enabled
        ? (available.find((provider) => provider === status.data?.provider) ??
            available[0] ??
            'mock')
        : 'mock',
    );
  }
  const current =
    draft?.stage === 'done' &&
    last?.answer === draft.answer &&
    last?.prompt === draft.request.prompt
      ? null
      : draft;
  const engaged = !!current || historyRows.length > 0;

  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || !composer.current) return;
    // The web textarea's scrollHeight cannot shrink until it is unconstrained.
    const node = composer.current as unknown as HTMLTextAreaElement;
    if (!node.style) return;
    const previous = node.style.height;
    const previousScroll = node.scrollTop;
    node.style.height = '0px';
    const measured = node.scrollHeight;
    node.style.height = previous;
    node.scrollTop = previousScroll;
    setInputContentHeight(Math.ceil(measured));
  }, [inputWidth, prompt]);

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
          documentId,
          conversationId,
          requestedProvider: selected,
          externalConsent,
        };
    // A retry after changing the selection is a new request with new consent.
    if (
      retry &&
      (retry.externalConsent !== externalConsent || retry.requestedProvider !== selected)
    ) {
      request.externalConsent = externalConsent;
      request.requestedProvider = selected;
      request.requestId = requestId();
    }
    const control = new AbortController();
    active.current = control;
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
          case 'progress':
            reply = { ...reply, progress: event.stage };
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
      await clearIntelligenceHistory(new AbortController().signal, conversationId);
      selectProvider('mock');
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

  const toolsButton = (
    <FinBarButton
      label={t('intelligenceTools')}
      onPress={() => openTools(true)}
      backgroundColor={phone ? 'transparent' : c.secondary}
      borderColor={phone ? c.primary : c.border}
      visualSize={phone ? 23 : 36}
    >
      <Plus size={phone ? 15 : 20} strokeWidth={phone ? 1.65 : 2} color={c.primary} />
    </FinBarButton>
  );

  const sendUnavailable = !stream && (!hasDraft || scopeUnavailable || clearing);
  const inputPadding = phone ? 5 : 11;
  const composerGrown = inputHeight > FIN_INPUT_MIN_HEIGHT;
  const singleLineInputNudge = phone && !composerGrown ? 3 : 0;
  const plusShift = useRef(new Animated.Value(0)).current;
  const sendShift = useRef(new Animated.Value(0)).current;
  const previousHasDraft = useRef(hasDraft);
  useLayoutEffect(() => {
    if (previousHasDraft.current === hasDraft) return;
    previousHasDraft.current = hasDraft;
    if (!phone) return;

    const enteringDraft = hasDraft;
    // The tab button, divider, and row gaps take 61pt; typing adds 6pt of inset.
    const leftActionShift = FIN_BAR_TARGET + 17 - 6;
    plusShift.setValue(enteringDraft ? leftActionShift : -leftActionShift);
    sendShift.setValue(enteringDraft ? 6 : -6);
    const animation = Animated.parallel([
      Animated.timing(plusShift, {
        toValue: 0,
        duration: reduceMotion ? 0 : 190,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(sendShift, {
        toValue: 0,
        duration: reduceMotion ? 0 : 190,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [hasDraft, phone, plusShift, reduceMotion, sendShift]);
  const composerInput = (
    <View style={{ flex: 1, minWidth: 0, position: 'relative' }}>
      {Platform.OS === 'ios' && prompt ? (
        <NativeText
          key={inputPadding}
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onTextLayout={({ nativeEvent: { lines } }) => {
            const next = Math.max(1, lines.length);
            if (nativeProbeHeight.current !== next) {
              nativeProbeHeight.current = next;
              setIOSLineCount(next);
            }
          }}
          style={{
            ...finInputFont,
            position: 'absolute',
            left: inputPadding,
            right: inputPadding,
            top: 0,
            opacity: 0,
          }}
        >
          {prompt + '\u200b'}
        </NativeText>
      ) : null}
      <TextInput
        ref={composer}
        accessibilityLabel={t('intelligenceAsk')}
        value={prompt}
        onChangeText={(next) => {
          if (!next) {
            nativeProbeHeight.current = 0;
            setIOSLineCount(1);
          }
          setPrompt(next);
        }}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        editable={!stream}
        multiline
        numberOfLines={Platform.OS === 'web' ? 1 : undefined}
        scrollEnabled={measuredInputHeight > inputLimit}
        onLayout={({ nativeEvent }) => {
          if (Platform.OS === 'web') setInputWidth(nativeEvent.layout.width);
        }}
        onContentSizeChange={({ nativeEvent }) => {
          if (Platform.OS === 'android') {
            setInputContentHeight(Math.ceil(nativeEvent.contentSize.height));
          }
        }}
        maxLength={1200}
        placeholder={t(phone ? 'intelligenceComposerHint' : 'intelligenceAsk')}
        placeholderTextColor={c.muted}
        style={{
          ...finInputFont,
          height: inputHeight,
          width: '100%',
          textAlign: 'left',
          textAlignVertical: composerGrown ? 'top' : 'center',
          paddingHorizontal: inputPadding,
          paddingTop: FIN_INPUT_VERTICAL_PADDING + singleLineInputNudge,
          paddingBottom: FIN_INPUT_VERTICAL_PADDING - singleLineInputNudge,
          color: c.foreground,
          ...(Platform.OS === 'web'
            ? {
                outlineWidth: 0,
                overflowY: measuredInputHeight > inputLimit ? 'auto' : 'hidden',
              }
            : {}),
        }}
      />
    </View>
  );
  const sendButton = (
    <FinBarButton
      label={stream ? t('stop') : sendLabel}
      disabled={sendUnavailable}
      onPress={() => (stream ? active.current?.abort() : void submit())}
      backgroundColor={sendUnavailable ? (c === dark ? c.secondary : '#D7EDDF') : c.primary}
      visualSize={phone ? (hasDraft ? 34 : 36) : 40}
    >
      {stream ? (
        <Square size={15} color={c.onPrimary} fill={c.onPrimary} />
      ) : (
        <ArrowUp size={21} color={sendUnavailable ? c.primary : c.onPrimary} />
      )}
    </FinBarButton>
  );
  const screen = (
    <Animated.View
      collapsable={false}
      onLayout={({ nativeEvent }) => setFrameHeight(nativeEvent.layout.height)}
      style={{
        flex: 1,
        minHeight: 0,
        width: '100%',
        alignSelf: 'center',
        paddingHorizontal: wide ? 38 : 20,
        paddingTop: phone ? insets.top : 0,
        paddingBottom: bottomGap,
        ...(edgeMoving ? { transform: [{ translateX: edgeOffset }] } : {}),
      }}
    >
      <LakeScene reading={engaged} dockInset={phone ? FIN_TOOLBAR_BASE_HEIGHT + bottomGap : dock} />
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
        {allowConsent && externalConsent ? (
          <View style={{ marginLeft: 'auto' }}>
            <Action label={t('intelligencePrivacy')} onPress={() => openPrivacy(true)}>
              <ModeMark label={t('intelligenceExternalReady') + ' · ' + providerLabel} external />
            </Action>
          </View>
        ) : allowConsent ? (
          <Action
            label={t('intelligenceChooseExternal')}
            onPress={() => openPrivacy(true)}
            style={{ marginLeft: 'auto', minHeight: 44, justifyContent: 'center' }}
          >
            <Text small bold style={{ color: c.primary }}>
              {t('intelligenceChooseExternalShort')}
            </Text>
          </Action>
        ) : null}
        {!wide && !phone ? toolsButton : null}
      </View>

      <View style={{ flex: 1, minHeight: 0, flexDirection: 'row', gap: wide ? 27 : 0 }}>
        <View style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          {scoped || documentId || (simulationId && saved.isError) ? (
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
                {documentId
                  ? t('intelligenceDocumentAttached')
                  : scoped
                    ? (locale === 'vi-VN' ? scoped.product.name : scoped.product.nameEn) +
                      ' · ' +
                      money(scoped.input.principal)
                    : t('intelligenceScopeMissing')}
              </Text>
              <Action
                label={t('intelligenceScopeRemove')}
                onPress={() => router.setParams({ simulationId: '', documentId: '' })}
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
                        minHeight: phone ? 49 : 52,
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
              <View
                key={row.id}
                style={{ gap: 9, width: '100%', maxWidth: 1000, alignSelf: 'center' }}
              >
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
                style={{ gap: 10, width: '100%', maxWidth: 1000, alignSelf: 'center' }}
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
                {current.stage === 'sending' && !current.blocks.length ? (
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
                      {current.progress
                        ? t(progressLabel[current.progress])
                        : t('intelligenceWorking')}
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
                    <Action
                      label={externalConsent ? sendLabel : t('retry')}
                      onPress={() => void submit(current.request)}
                    >
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
            onLayout={({ nativeEvent }) => {
              const next = nativeEvent.layout.height;
              if (next === toolbarHeight) return;
              setToolbarHeight(next);
              if (engaged && followRef.current) {
                requestAnimationFrame(() => {
                  if (followRef.current) scroll.current?.scrollToEnd({ animated: false });
                });
              }
            }}
            style={{ paddingTop: 7, gap: 5 }}
          >
            <View
              testID="fin-composer"
              style={{
                borderWidth: 1,
                borderColor: focus ? c.focus : phone ? 'transparent' : c.border,
                backgroundColor: phone ? 'transparent' : c.surface,
                borderRadius: phone ? 32 : 28,
                paddingTop: phone ? FIN_BAR_PADDING : 6,
                paddingBottom: phone ? FIN_BAR_PADDING : 6,
                paddingHorizontal: phone ? FIN_BAR_PADDING + 6 + (hasDraft ? 6 : 0) : 6,
                marginHorizontal: phone ? FIN_BAR_GUTTER - 20 : 0,
              }}
            >
              {phone ? <FinComposerSurface /> : null}
              <View
                collapsable={false}
                style={{
                  position: 'relative',
                  zIndex: 1,
                  flexDirection: 'row',
                  alignItems: composerGrown ? 'flex-end' : 'center',
                  gap: phone ? 2 : 7,
                }}
              >
                {showTabTrigger ? (
                  <>
                    <FinTabsButton open={tabsOpen} onPress={() => showTabs((open) => !open)} />
                    <FinComposerDivider grown={composerGrown} />
                  </>
                ) : null}
                {phone ? (
                  <Animated.View
                    style={{
                      width: FIN_BAR_TARGET,
                      height: FIN_BAR_TARGET,
                      alignItems: 'center',
                      justifyContent: 'center',
                      alignSelf: composerGrown ? 'flex-end' : 'center',
                      transform: [{ translateX: plusShift }],
                    }}
                  >
                    {toolsButton}
                  </Animated.View>
                ) : null}
                {composerInput}
                <Animated.View
                  style={{
                    width: FIN_BAR_TARGET,
                    height: FIN_BAR_TARGET,
                    alignItems: 'center',
                    justifyContent: 'center',
                    alignSelf: composerGrown ? 'flex-end' : 'center',
                    transform: [{ translateX: sendShift }],
                  }}
                >
                  {sendButton}
                </Animated.View>
              </View>
            </View>
            {allowConsent && externalConsent ? (
              <Text small muted>
                {sendLabel + ' · ' + t('intelligenceConsentOn')}
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
      {showTabTrigger && tabsOpen ? (
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
        {externalConsent && available.length > 1
          ? available.map((choice) => (
              <Button
                key={choice}
                label={choice === 'anthropic' ? 'Claude' : 'OpenAI'}
                variant="outline"
                disabled={selected === choice}
                onPress={() => selectProvider(choice)}
              />
            ))
          : null}
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
    </Animated.View>
  );
  return (
    <GestureDetector gesture={edgeBackGesture} touchAction="pan-y">
      <View collapsable={false} style={{ flex: 1 }}>
        {screen}
      </View>
    </GestureDetector>
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
  const { width } = useWindowDimensions();
  return (
    <View style={{ gap: 13, minWidth: 0 }}>
      <View
        style={{
          alignSelf: 'flex-end',
          maxWidth: Math.min(620, Math.max(0, width - 40)),
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
                    : provider === 'fallback'
                      ? t('intelligenceFallback')
                      : t('intelligenceRemote') +
                        (provider === 'anthropic' ? ' · Claude' : ' · OpenAI')
                }
                external={provider === 'openai' || provider === 'anthropic'}
              />
            ) : null}
          </View>
          {answer ? (
            <View
              style={{
                alignSelf: 'flex-start',
                width: '100%',
                maxWidth: 760,
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
            <View style={{ width: '100%', maxWidth: 960 }}>
              <AnalysisBlocks blocks={blocks} turnId={turnId} followUp={followUp} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
