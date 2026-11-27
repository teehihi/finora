import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Platform, View } from 'react-native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';
import { Action, Text, useDesign } from '@finora/ui';

type LoadState = {
  isError: boolean;
  isFetching: boolean;
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

function usePulse() {
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
        minHeight: hero ? 169 : 87,
      }}
    >
      <Animated.View
        style={{ opacity, gap: 9 }}
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
  if (query.isFetching) return stale ? <RefreshIndicator /> : null;
  if (!query.isError) return null;
  const vi = locale === 'vi-VN';
  const label = stale
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
      <Action
        label={t('retry')}
        onPress={() => void query.refetch()}
        style={{ paddingHorizontal: 4 }}
      >
        <Text small bold style={{ color: c.primary }}>
          {t('retry')}
        </Text>
      </Action>
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
  return (
    <View style={{ gap: 8 }}>
      {query.data === undefined && (query.isFetching || !query.isError) ? (
        <TaskSkeleton kind={kind} />
      ) : null}
      <TaskNotice query={query} stale={query.data !== undefined} missing={missing} />
      {query.data !== undefined ? children(query.data) : null}
    </View>
  );
}
