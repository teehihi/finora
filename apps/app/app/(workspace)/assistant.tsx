import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Calculator,
  FileSearch,
  ReceiptText,
  WalletCards,
  Paperclip,
  Square,
} from 'lucide-react-native';
import type { ChatRequest, ChatTurn, Saved } from '@finora/contracts';
import { date } from '@finora/i18n';
import { tokens } from '@finora/design-tokens';
import { Action, BottomSheet, Heading, SourceAttribution, Text, useDesign } from '@finora/ui';
import { Data, useWorkspaceDockInset } from '../../src/components/layout';
import { api, auth } from '../../src/services/client';
import { requestId } from '../../src/services/request-id';
import {
  FinancePrompt,
  FinAvatar,
  FinIntro,
  ModeMark,
} from '../../src/features/intelligence/presentation';

type PendingTurn = {
  request: ChatRequest;
  answer: string;
  state: 'sending' | 'stopped' | 'failed' | 'complete';
};

export default function Assistant() {
  const { data } = auth.useSession();
  const { simulationId } = useLocalSearchParams<{ simulationId?: string }>();
  // Discard drafts, selected simulations and aborted streams across identity changes.
  return data?.user.id ? (
    <AssistantWorkspace key={data.user.id} uid={data.user.id} simulationId={simulationId} />
  ) : null;
}

function AssistantWorkspace({ uid, simulationId }: { uid: string; simulationId?: string }) {
  const { t, locale, money, colors: c } = useDesign();
  const { width } = useWindowDimensions();
  const dockInset = useWorkspaceDockInset();
  const twoColumns = width >= 1080;
  const history = useQuery({ queryKey: ['history', uid], queryFn: api.history });
  const saved = useQuery({ queryKey: ['saved', uid], queryFn: api.saved });
  const [selected, choose] = useState(simulationId ?? '');
  const [composerFocused, setComposerFocused] = useState(false);
  const [picker, setPicker] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [turn, setTurn] = useState<PendingTurn | null>(null);
  const controller = useRef<AbortController | null>(null);
  const feed = useRef<ComponentRef<typeof ScrollView>>(null);
  const initialHistory = useRef(false);
  const followFeed = useRef(false);
  const [showJump, setShowJump] = useState(false);
  const scope = saved.data?.find((item) => item.id === selected);
  const active = turn?.state === 'sending';
  const loadingScope = Boolean(selected) && saved.isPending;
  const lastStored = history.data?.at(-1);
  const visibleTurn =
    turn?.state === 'complete' &&
    lastStored?.prompt === turn.request.prompt &&
    lastStored.answer === turn.answer
      ? null
      : turn;
  const engaged = Boolean(visibleTurn || history.data?.length);

  useEffect(() => {
    if (typeof simulationId === 'string') choose(simulationId);
  }, [simulationId]);
  useEffect(
    () => () => {
      const activeController = controller.current;
      controller.current = null;
      activeController?.abort();
    },
    [],
  );

  function jumpToLatest() {
    followFeed.current = true;
    setShowJump(false);
    feed.current?.scrollToEnd({ animated: false });
  }

  async function send(question: string, retry?: ChatRequest) {
    const clean = question.trim();
    if (controller.current || !clean || (loadingScope && !retry)) return;
    const request: ChatRequest = retry ?? {
      requestId: requestId(),
      prompt: clean,
      simulationId: scope?.id,
      locale,
    };
    const transfer = new AbortController();
    controller.current = transfer;
    const isCurrent = () => controller.current === transfer;
    jumpToLatest();
    if (!retry) setPrompt('');
    setTurn({ request, answer: '', state: 'sending' });
    let answer = '';
    try {
      await api.stream(request, transfer.signal, (delta) => {
        if (!isCurrent() || transfer.signal.aborted) return;
        answer += delta;
        setTurn({ request, answer, state: 'sending' });
      });
      if (!isCurrent()) return;
      if (transfer.signal.aborted) {
        setTurn({ request, answer, state: 'stopped' });
        return;
      }
      // The server's history is authoritative and contains the calculation facts.
      // If refresh fails, keep the finished answer readable rather than dropping it.
      const refreshed = await history.refetch();
      if (!isCurrent()) return;
      setTurn(refreshed.isSuccess ? null : { request, answer, state: 'complete' });
    } catch {
      if (isCurrent()) {
        setTurn({ request, answer, state: transfer.signal.aborted ? 'stopped' : 'failed' });
      }
    } finally {
      if (isCurrent()) controller.current = null;
    }
  }

  function attach(id: string) {
    choose(id);
    // Preserve an explicit reference (or its explicit removal) across Back and reload.
    // Only the opaque saved ID is included; the account-scoped API resolves the plan.
    router.setParams({ simulationId: id });
    setPicker(false);
  }

  const actionRow: ViewStyle = {
    minHeight: 50,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  };
  return (
    <View
      style={{
        flex: 1,
        minHeight: 0,
        width: '100%',
        maxWidth: 1240,
        alignSelf: 'center',
        flexDirection: 'row',
        paddingHorizontal: width >= 1024 ? 32 : 18,
        paddingBottom: dockInset || 13,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
        {engaged ? (
          <View
            style={{
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <FinAvatar />
              <Heading size={19}>{t('assistantTitle')}</Heading>
            </View>
            <ModeMark label={t('mock')} />
          </View>
        ) : null}
        {engaged ? (
          <FinancePrompt
            label={t('intelligenceOpen')}
            icon={<Calculator size={16} color={c.primary} />}
            onPress={() => router.push('/intelligence')}
          />
        ) : null}
        <ScrollView
          ref={feed}
          style={{ flex: 1, minHeight: 0 }}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={80}
          onScroll={({ nativeEvent }) => {
            const { contentSize, layoutMeasurement, contentOffset } = nativeEvent;
            const near = contentSize.height - layoutMeasurement.height - contentOffset.y < 110;
            followFeed.current = near;
            setShowJump(!near);
          }}
          onContentSizeChange={() => {
            if (!initialHistory.current && history.data?.length) {
              initialHistory.current = true;
              followFeed.current = true;
            }
            if (followFeed.current) feed.current?.scrollToEnd({ animated: false });
          }}
          contentContainerStyle={{
            gap: 15,
            paddingTop: twoColumns ? 12 : 14,
            paddingBottom: 20,
            paddingRight: twoColumns ? 12 : 0,
          }}
        >
          {!engaged ? (
            <FinIntro
              title={t('assistantTitle')}
              description={t('assistantHint')}
              wide={twoColumns}
              mode={t('mock')}
            />
          ) : null}
          {!engaged ? (
            <View style={{ flexDirection: width >= 730 ? 'row' : 'column', gap: 7 }}>
              <FinancePrompt
                label={t('intelligenceOpen')}
                icon={<Calculator size={16} color={c.primary} />}
                onPress={() => router.push('/intelligence')}
                style={{ flex: width >= 730 ? 1 : undefined }}
              />
              <FinancePrompt
                label={t('intelligenceDocuments')}
                icon={<FileSearch size={16} color={c.primary} />}
                onPress={() => router.push('/documents')}
                style={{ flex: width >= 730 ? 1 : undefined }}
              />
            </View>
          ) : null}
          <Data q={{ ...history, isError: history.isError && history.data === undefined }}>
            {(all) => (
              <>
                {!all.length && !visibleTurn ? (
                  <View style={{ gap: 7, marginTop: 1 }}>
                    <Heading size={17} style={{ marginBottom: 2 }}>
                      {t('assistantStartingPoints')}
                    </Heading>
                    {(
                      [
                        ['askInterest', Calculator],
                        ['askFee', ReceiptText],
                        ['assistantAskPlanning', WalletCards],
                      ] as const
                    ).map(([key, Icon]) => (
                      <FinancePrompt
                        key={key}
                        label={t(key)}
                        onPress={() => void send(t(key))}
                        icon={<Icon size={16} color={c.primary} />}
                      />
                    ))}
                  </View>
                ) : null}
                {all.map((row, index) => {
                  const day = date(row.createdAt, locale);
                  return (
                    <View key={row.id} style={{ gap: 14 }}>
                      {index === 0 || date(all[index - 1].createdAt, locale) !== day ? (
                        <Text small muted>
                          {day}
                        </Text>
                      ) : null}
                      <TurnContent
                        prompt={row.prompt}
                        answer={row.answer}
                        facts={row.facts}
                        simulationId={
                          saved.data?.some(({ id }) => id === row.simulationId)
                            ? row.simulationId
                            : undefined
                        }
                      />
                    </View>
                  );
                })}
              </>
            )}
          </Data>
          {visibleTurn ? (
            <View style={{ gap: 10 }}>
              <TurnContent prompt={visibleTurn.request.prompt} answer={visibleTurn.answer} />
              {visibleTurn.state === 'sending' && !visibleTurn.answer ? (
                <View
                  accessibilityLiveRegion="polite"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <ActivityIndicator size="small" color={c.primary} />
                  <Text small muted>
                    {t('assistantPreparing')}
                  </Text>
                </View>
              ) : null}
              {visibleTurn.state === 'failed' || visibleTurn.state === 'stopped' ? (
                <View style={{ alignItems: 'flex-start' }}>
                  <Text role={visibleTurn.state === 'failed' ? 'alert' : undefined} small muted>
                    {t(visibleTurn.state === 'stopped' ? 'assistantStopped' : 'assistantSendError')}
                  </Text>
                  <Action
                    label={t('retry')}
                    onPress={() => void send(visibleTurn.request.prompt, visibleTurn.request)}
                    style={{ paddingHorizontal: 6 }}
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
        {showJump ? (
          <Action
            label={t('assistantLatest')}
            onPress={jumpToLatest}
            style={{
              alignSelf: 'center',
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.border,
              marginBottom: 5,
            }}
          >
            <ArrowDown size={15} color={c.primary} />
            <Text small>{t('assistantLatest')}</Text>
          </Action>
        ) : null}
        <View
          style={{
            paddingTop: 5,
            paddingBottom: 2,
            gap: 4,
            backgroundColor: c.background,
          }}
        >
          {!twoColumns ? (
            <Action
              label={t('context')}
              onPress={() => setPicker(true)}
              disabled={active}
              style={{
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 4,
                gap: 6,
                minWidth: 44,
                maxWidth: '100%',
              }}
            >
              <Paperclip size={15} color={c.primary} />
              <Text small bold style={{ color: c.primary }}>
                {scope
                  ? locale === 'vi-VN'
                    ? scope.product.name
                    : scope.product.nameEn
                  : t('assistantAttach')}
              </Text>
              <ChevronDown size={14} color={c.muted} />
            </Action>
          ) : null}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              padding: 6,
              gap: 8,
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: composerFocused ? c.focus : c.border,
              borderRadius: 18,
            }}
          >
            <TextInput
              nativeID="finora-assistant-composer"
              accessibilityLabel={t('composer')}
              value={prompt}
              onChangeText={setPrompt}
              onFocus={() => setComposerFocused(true)}
              onBlur={() => setComposerFocused(false)}
              placeholder={t('composer')}
              placeholderTextColor={c.muted}
              editable={!active}
              multiline
              numberOfLines={1}
              maxLength={1200}
              textAlignVertical="center"
              style={{
                flex: 1,
                minWidth: 0,
                color: c.foreground,
                fontFamily: tokens.font.body,
                fontSize: 16,
                lineHeight: 23,
                paddingHorizontal: 7,
                paddingVertical: 9,
                minHeight: 44,
                maxHeight: 96,
                ...(Platform.OS === 'web' ? { outlineWidth: 0 } : {}),
              }}
            />
            <Action
              label={t(active ? 'stop' : 'send')}
              disabled={!active && (!prompt.trim() || loadingScope)}
              onPress={() => (active ? controller.current?.abort() : void send(prompt))}
              style={{
                width: 44,
                minHeight: 44,
                alignItems: 'center',
                backgroundColor: c.primary,
                borderRadius: 9,
              }}
            >
              {active ? (
                <Square size={15} color={c.onPrimary} fill={c.onPrimary} />
              ) : (
                <ArrowUp size={22} color={c.onPrimary} />
              )}
            </Action>
          </View>
        </View>
      </View>

      {twoColumns ? (
        <View
          style={{
            marginTop: 14,
            marginLeft: 20,
            alignSelf: 'flex-start',
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 19,
            width: width >= 1440 ? 282 : 224,
            padding: 15,
            gap: 11,
          }}
        >
          <BookOpen size={20} color={c.primary} />
          <Heading size={19}>{t('context')}</Heading>
          <Text small muted>
            {t('assistantContextHint')}
          </Text>
          <Action
            label={t('context')}
            onPress={() => setPicker(true)}
            disabled={active}
            style={{
              ...actionRow,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 10,
            }}
          >
            <Paperclip size={15} color={c.primary} />
            <Text small bold style={{ flex: 1 }}>
              {scope ? (locale === 'vi-VN' ? scope.product.name : scope.product.nameEn) : t('none')}
            </Text>
            <ChevronDown size={16} color={c.muted} />
          </Action>
          {scope ? <ContextPlan item={scope} /> : null}
          <View style={{ paddingTop: 14, borderTopWidth: 1, borderColor: c.border, gap: 7 }}>
            <CircleHelp size={17} color={c.muted} />
            <Text small muted>
              {t('aiNote')}
            </Text>
          </View>
        </View>
      ) : null}
      <BottomSheet visible={picker} title={t('context')} onClose={() => setPicker(false)}>
        <Text small muted>
          {t('assistantContextHint')}
        </Text>
        <Action
          label={t('none')}
          onPress={() => attach('')}
          style={{ ...actionRow, borderTopWidth: 1, borderColor: c.border }}
        >
          <Text bold style={{ flex: 1 }}>
            {t('none')}
          </Text>
          {!scope ? <Check size={17} color={c.primary} /> : null}
        </Action>
        <Data q={saved}>
          {(all) =>
            all.map((item: Saved) => (
              <Action
                key={item.id}
                label={locale === 'vi-VN' ? item.product.name : item.product.nameEn}
                onPress={() => attach(item.id)}
                style={{ ...actionRow, borderTopWidth: 1, borderColor: c.border }}
              >
                <View style={{ flex: 1 }}>
                  <Text bold>{locale === 'vi-VN' ? item.product.name : item.product.nameEn}</Text>
                  <Text small muted>
                    {money(item.input.principal)}
                  </Text>
                </View>
                {item.id === scope?.id ? <Check size={17} color={c.primary} /> : null}
              </Action>
            ))
          }
        </Data>
        {saved.data?.length === 0 ? (
          <Text small muted>
            {t('assistantNoPlans')}
          </Text>
        ) : null}
        <Text small muted>
          {t('aiNote')}
        </Text>
      </BottomSheet>
    </View>
  );
}

function TurnContent({
  prompt,
  answer,
  facts,
  simulationId,
}: {
  prompt: string;
  answer: string;
  facts?: ChatTurn['facts'];
  simulationId?: string | null;
}) {
  const { t, colors: c } = useDesign();
  return (
    <View style={{ gap: 13 }}>
      <View
        style={{
          alignSelf: 'flex-end',
          maxWidth: '92%',
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 13,
          borderBottomRightRadius: 4,
          backgroundColor: c.secondary,
          gap: 2,
        }}
      >
        <Text small bold style={{ color: c.primary }}>
          {t('you')}
        </Text>
        <Text style={{ fontSize: 15 }}>{prompt}</Text>
      </View>
      {answer ? (
        <View
          style={{
            alignItems: 'flex-start',
            gap: 8,
            padding: 13,
            borderRadius: 16,
            backgroundColor: c.surface,
          }}
        >
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 7 }}>
            <FinAvatar />
            <Text small bold style={{ color: c.primary }}>
              {t('ai')}
            </Text>
          </View>
          <Text style={{ maxWidth: 620, fontSize: 16, lineHeight: 25 }}>{answer}</Text>
          {facts ? <FactsLedger facts={facts} simulationId={simulationId} /> : null}
        </View>
      ) : null}
    </View>
  );
}

function ContextPlan({ item }: { item: Saved }) {
  const { t, money, colors: c } = useDesign();
  return (
    <View
      style={{
        paddingVertical: 10,
        gap: 5,
        borderTopWidth: 1,
        borderColor: c.border,
      }}
    >
      {[
        [t('amount'), money(item.input.principal)],
        [t('term'), item.input.months + ' ' + t('months')],
      ].map(([label, value]) => (
        <View
          key={label}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 5,
            flexWrap: 'wrap',
          }}
        >
          <Text small muted>
            {label}
          </Text>
          <Text small bold style={{ fontVariant: ['tabular-nums'] }}>
            {value}
          </Text>
        </View>
      ))}
      <OpenPlan id={item.id} />
    </View>
  );
}

function OpenPlan({ id }: { id: string }) {
  const { t, colors: c } = useDesign();
  return (
    <Action
      label={t('assistantOpenPlan')}
      onPress={() => router.push({ pathname: '/saved/[id]', params: { id } })}
      style={{ flexDirection: 'row', gap: 6, alignItems: 'center', alignSelf: 'flex-start' }}
    >
      <Text small bold style={{ color: c.primary }}>
        {t('assistantOpenPlan')}
      </Text>
      <ArrowRight size={15} color={c.primary} />
    </Action>
  );
}

function FactsLedger({
  facts,
  simulationId,
}: {
  facts: NonNullable<ChatTurn['facts']>;
  simulationId?: string | null;
}) {
  const { t, money, colors: c } = useDesign();
  return (
    <View
      style={{
        width: '100%',
        maxWidth: 520,
        borderRadius: 12,
        backgroundColor: c.secondary,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginTop: 4,
        gap: 5,
      }}
    >
      <Text small bold style={{ color: c.primary, marginBottom: 3 }}>
        {t('assistantSavedFigures')}
      </Text>
      {[
        [t('firstPayment'), money(facts.firstPayment)],
        [t('assistantPrincipalInterest'), money(facts.repayment)],
        [t('assistantIncludingFees'), facts.total === null ? t('unknown') : money(facts.total)],
      ].map(([label, value]) => (
        <View
          key={label}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            columnGap: 9,
            flexWrap: 'wrap',
          }}
        >
          <Text small muted>
            {label}
          </Text>
          <Text small bold style={{ fontVariant: ['tabular-nums'] }}>
            {value}
          </Text>
        </View>
      ))}
      <SourceAttribution source={t('calc')} />
      {simulationId ? <OpenPlan id={simulationId} /> : null}
    </View>
  );
}
