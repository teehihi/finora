import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Platform, View } from 'react-native';
import { AlertCircle, RefreshCw, ScanLine } from 'lucide-react-native';
import { Action, Text, useDesign } from '@finora/ui';

import { canShowReadData, type ReadSnapshot } from './read-state';
import { SignatureIcon } from './signature';

export type LoadState = ReadSnapshot & {
  refetch: () => unknown;
};

function useMotionAllowed() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') {
      const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
      if (!media) return;
      const read = () => setAllowed(!media.matches);
      read();
      media.addEventListener('change', read);
      return () => media.removeEventListener('change', read);
    }
    let active = true;
    let receivedChange = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduce) => {
      receivedChange = true;
      setAllowed(!reduce);
    });
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (active && !receivedChange) setAllowed(!reduce);
      })
      .catch(() => {});
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return allowed;
}

export function usePulse() {
  const motion = useMotionAllowed();
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!motion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.62,
          duration: 690,
          useNativeDriver: Platform.OS !== 'web',
          isInteraction: false,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 690,
          useNativeDriver: Platform.OS !== 'web',
          isInteraction: false,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      opacity.setValue(1);
    };
  }, [motion, opacity]);
  return opacity;
}

// Never delay a response. This only adds reassurance if a real request stays pending.
function useSlowRequest(pending: boolean) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (!pending) return;
    const timer = setTimeout(() => setSlow(true), 3500);
    return () => clearTimeout(timer);
  }, [pending]);
  return pending && slow;
}

export function DocumentProcessing({ title, detail }: { title: string; detail: string }) {
  const { colors: c, t } = useDesign();
  const opacity = usePulse();
  const slow = useSlowRequest(true);
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityState={{ busy: true }}
      testID="document-processing"
      style={{
        alignItems: 'center',
        gap: 8,
        padding: 20,
        overflow: 'hidden',
        borderRadius: 20,
        backgroundColor: c.surface,
      }}
    >
      <View
        pointerEvents="none"
        accessible={false}
        style={{
          position: 'absolute',
          bottom: -35,
          width: '110%',
          height: 48,
          borderRadius: 100,
          backgroundColor: c.secondary,
        }}
      />
      <SignatureIcon icon={ScanLine} size={44} />
      <Text bold style={{ textAlign: 'center' }}>
        {title}
      </Text>
      <Text small muted style={{ textAlign: 'center', maxWidth: 320 }}>
        {slow ? t('documentProcessingSlow') : detail}
      </Text>
      <View
        accessible={false}
        style={{
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: c.secondary,
          alignItems: 'center',
        }}
      >
        <Animated.View
          style={{ width: 20, height: 4, borderRadius: 2, backgroundColor: c.primary, opacity }}
        />
      </View>
    </View>
  );
}

export function TaskSkeleton({ kind = 'hero' }: { kind?: 'hero' | 'rows' }) {
  const { colors: c, locale } = useDesign();
  const opacity = usePulse();
  const hero = kind === 'hero';
  return (
    <View
      accessibilityState={{ busy: true }}
      accessibilityLabel={locale === 'vi-VN' ? 'Đang tải' : 'Loading'}
      testID={hero ? 'task-hero-skeleton' : 'task-rows-skeleton'}
      style={{
        padding: 16,
        borderRadius: hero ? 19 : 15,
        backgroundColor: hero ? c.secondary : c.surface,
        minHeight: hero ? 204 : 87,
      }}
    >
      <Animated.View
        style={{ opacity, gap: hero ? 13 : 9 }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={{ width: '37%', height: 12, borderRadius: 6, backgroundColor: c.disabled }} />
        <View
          style={{
            width: hero ? '64%' : '52%',
            height: hero ? 33 : 12,
            borderRadius: 7,
            backgroundColor: c.disabled,
          }}
        />
        {hero ? (
          <>
            <View
              style={{ width: '49%', height: 12, borderRadius: 6, backgroundColor: c.disabled }}
            />
            <View style={{ height: 44, borderRadius: 10, backgroundColor: c.disabled }} />
          </>
        ) : null}
      </Animated.View>
    </View>
  );
}

export function RefreshAction({ onPress, busy }: { onPress: () => void; busy: boolean }) {
  const { locale, colors: c } = useDesign();
  const label = locale === 'vi-VN' ? 'Làm mới dữ liệu' : 'Refresh data';
  return (
    <Action
      label={label}
      onPress={onPress}
      disabled={busy}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        backgroundColor: c.elevated,
      }}
    >
      <RefreshCw size={18} color={c.primary} />
    </Action>
  );
}

function RefreshIndicator() {
  const { colors: c, locale } = useDesign();
  const opacity = usePulse();
  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityState={{ busy: true }}
      accessibilityLabel={locale === 'vi-VN' ? 'Đang cập nhật' : 'Updating'}
      testID="task-refresh-indicator"
      style={{ position: 'absolute', top: 0, right: 1, left: 1, height: 2, zIndex: 1 }}
    >
      <Animated.View style={{ height: 2, opacity, backgroundColor: c.primary, borderRadius: 2 }} />
    </View>
  );
}

export function TaskNotice({
  query,
  stale,
  missing,
}: {
  query: LoadState;
  stale: boolean;
  missing?: string;
}) {
  const { colors: c, locale, t } = useDesign();
  const slow = useSlowRequest(!stale && query.isFetching);
  const paused = query.fetchStatus === 'paused';
  if (!paused && query.isFetching) {
    if (stale) return <RefreshIndicator />;
    return slow ? (
      <View accessibilityLiveRegion="polite" testID="task-slow-notice">
        <Text small muted>
          {t('readSlow')}
        </Text>
      </View>
    ) : null;
  }
  if (!query.isError && !paused) return null;
  const vi = locale === 'vi-VN';
  const label = paused
    ? t(stale ? 'readPausedCached' : 'readPaused')
    : stale
      ? vi
        ? 'Chưa cập nhật được. Đang hiển thị dữ liệu lần gần nhất.'
        : 'Could not refresh. Showing the last available data.'
      : (missing ?? (vi ? 'Chưa tải được mục này.' : 'This section could not be loaded.'));
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 11,
        borderRadius: 10,
        backgroundColor: c.actionAmberSurface,
      }}
    >
      <AlertCircle size={15} color={c.actionAmber} />
      <Text small role="alert" style={{ color: c.actionAmber, flex: 1, paddingVertical: 8 }}>
        {label}
      </Text>
      {!paused && (
        <Action
          label={t('retry')}
          onPress={() => void query.refetch()}
          style={{ paddingHorizontal: 6, minWidth: 44, minHeight: 44, justifyContent: 'center' }}
        >
          <Text small bold style={{ color: c.primary }}>
            {t('retry')}
          </Text>
        </Action>
      )}
    </View>
  );
}

export function TaskData<T>({
  query,
  kind = 'hero',
  missing,
  children,
}: {
  query: LoadState & { data: T | undefined };
  kind?: 'hero' | 'rows';
  missing?: string;
  children: (value: T) => ReactNode;
}) {
  const visible = canShowReadData(query);
  return (
    <View style={{ gap: 8 }}>
      {!visible && query.fetchStatus !== 'paused' && (query.isFetching || !query.isError) ? (
        <TaskSkeleton kind={kind} />
      ) : null}
      <TaskNotice query={query} stale={visible} missing={missing} />
      {visible && query.data !== undefined ? children(query.data) : null}
    </View>
  );
}
