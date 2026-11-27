import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { router } from 'expo-router';
import { dark } from '@finora/design-tokens';
import { Action, Text, useDesign, useReducedMotion } from '@finora/ui';
import { workspaceTabs } from '../../components/workspace-tabs';

export const FIN_BAR_GUTTER = 17;
export const FIN_BAR_PADDING = 4;
export const FIN_BAR_TARGET = 44;
const FIN_MENU_WIDTH = 184;
const FIN_MENU_HEIGHT = 187;
const FIN_MENU_TAIL = 14;
// Same coordinate as the center of the grid's 44-point target.
const FIN_MENU_ANCHOR = 1 + FIN_BAR_PADDING + FIN_BAR_TARGET / 2;
const supportNativeGlass = Platform.OS === 'ios' && isLiquidGlassSupported;

function useFinMaterial() {
  const [reduceTransparency, setReduceTransparency] = useState(false);
  useEffect(() => {
    if (!supportNativeGlass) return;
    let mounted = true;
    let changed = false;
    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      (value) => {
        changed = true;
        setReduceTransparency(value);
      },
    );
    void AccessibilityInfo.isReduceTransparencyEnabled()
      .then((value) => {
        if (mounted && !changed) setReduceTransparency(value);
      })
      .catch(() => {});
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return { nativeGlass: supportNativeGlass && !reduceTransparency, reduceTransparency };
}

function FinMaterial({
  menu,
  nativeGlass,
  reduceTransparency,
}: {
  menu?: boolean;
  nativeGlass: boolean;
  reduceTransparency: boolean;
}) {
  const { colors: c } = useDesign();
  const night = c === dark;
  const radius = menu ? 23 : 32;
  const tint = night
    ? 'rgba(23,42,32,0.47)'
    : menu
      ? 'rgba(246,249,239,0.43)'
      : 'rgba(249,251,242,0.42)';
  const fallback = reduceTransparency
    ? c.surface
    : night
      ? 'rgba(25,42,34,0.91)'
      : menu
        ? 'rgba(245,249,240,0.84)'
        : 'rgba(248,251,244,0.74)';
  const shape = { ...StyleSheet.absoluteFill, borderRadius: radius };
  return (
    <View collapsable={false} pointerEvents="none" style={StyleSheet.absoluteFill}>
      {nativeGlass ? (
        <LiquidGlassView
          testID={menu ? 'fin-native-popup-glass' : 'fin-native-composer-glass'}
          pointerEvents="none"
          effect="clear"
          animated={false}
          colorScheme={night ? 'dark' : 'light'}
          tintColor={tint}
          style={shape}
        />
      ) : (
        <View
          style={[
            shape,
            { backgroundColor: fallback },
            Platform.OS === 'web' &&
              ({
                backdropFilter: 'blur(14px) saturate(115%)',
                WebkitBackdropFilter: 'blur(14px) saturate(115%)',
              } as ViewStyle),
          ]}
        />
      )}
      <View
        style={[
          shape,
          {
            borderColor: reduceTransparency ? c.border : night ? '#D2E9DA50' : '#FFFFFFE8',
            borderWidth: 1,
            ...(!menu && !reduceTransparency
              ? { boxShadow: night ? '0px 5px 14px #00000030' : '0px 5px 14px #203D2A26' }
              : {}),
          },
        ]}
      />
    </View>
  );
}

export function FinComposerSurface() {
  const material = useFinMaterial();
  return <FinMaterial {...material} />;
}

export function FinComposerDivider({ grown }: { grown: boolean }) {
  const { colors: c } = useDesign();
  return (
    <View
      pointerEvents="none"
      style={{
        width: 1,
        height: 28,
        alignSelf: grown ? 'flex-end' : 'center',
        marginHorizontal: 6,
        marginBottom: grown ? 8 : 0,
        backgroundColor: c.border,
      }}
    />
  );
}

export function FinBarButton({
  label,
  expanded,
  disabled,
  onPress,
  backgroundColor,
  borderColor,
  visualSize = 36,
  square = false,
  children,
}: {
  label: string;
  expanded?: boolean;
  disabled?: boolean;
  onPress: () => void;
  backgroundColor: string;
  borderColor?: string;
  visualSize?: number;
  square?: boolean;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      aria-expanded={expanded}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.barButton, { opacity: pressed ? 0.82 : 1 }]}
    >
      <View
        testID="fin-button-art"
        collapsable={false}
        pointerEvents="none"
        style={[
          styles.barButtonFill,
          {
            width: visualSize,
            height: visualSize,
            borderRadius: square ? 14 : visualSize / 2,
            backgroundColor,
            borderColor,
            borderWidth: borderColor ? 1.5 : 0,
          },
        ]}
      >
        {children}
      </View>
    </Pressable>
  );
}

export function FinTabsButton({ open, onPress }: { open: boolean; onPress: () => void }) {
  const { t, colors: c } = useDesign();
  return (
    <FinBarButton
      label={t('intelligenceTabs')}
      expanded={open}
      onPress={onPress}
      backgroundColor={open ? (c === dark ? c.secondary : '#D5EBDE') : 'transparent'}
      visualSize={38}
      square
    >
      <Svg width={20} height={20} viewBox="0 0 20 20" aria-hidden>
        {[1.5, 11.2].flatMap((x) =>
          [1.5, 11.2].map((y) => (
            <Rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={7}
              height={7}
              rx={2}
              fill="none"
              stroke={c.primary}
              strokeWidth={1.55}
            />
          )),
        )}
      </Svg>
    </FinBarButton>
  );
}

export function FinTabPicker({
  bottom,
  maxHeight,
  onClose,
}: {
  bottom: number;
  maxHeight: number;
  onClose: () => void;
}) {
  const { t, colors: c } = useDesign();
  const material = useFinMaterial();
  const night = c === dark;
  const reduceMotion = useReducedMotion();
  const menuHeight = Math.min(FIN_MENU_HEIGHT, maxHeight);
  // UIKit Glass should not sit inside a fading or transforming host.
  const skipIntro = reduceMotion || material.nativeGlass;
  const enter = useRef(new Animated.Value(skipIntro ? 1 : 0)).current;
  useEffect(() => {
    if (skipIntro) {
      enter.setValue(1);
      return;
    }
    const animation = Animated.timing(enter, {
      toValue: 1,
      duration: 150,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [enter, skipIntro]);
  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    if (Platform.OS === 'web') window.addEventListener('keydown', onKey);
    return () => {
      back.remove();
      if (Platform.OS === 'web') window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 10 }]}>
      <Pressable
        importantForAccessibility="no"
        accessible={false}
        onPress={onClose}
        style={[StyleSheet.absoluteFill, { bottom: Math.max(0, bottom - 6) }]}
      />
      <Animated.View
        testID="fin-tab-picker"
        accessibilityViewIsModal
        style={{
          position: 'absolute',
          left: FIN_BAR_GUTTER,
          bottom: bottom + FIN_MENU_TAIL - 4,
          width: FIN_MENU_WIDTH,
          height: menuHeight,
          ...(skipIntro
            ? {}
            : {
                opacity: enter,
                transform: [
                  { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [5, 0] }) },
                ],
              }),
          shadowColor: night ? '#000' : '#213C2D',
          shadowOpacity: 0.17,
          shadowRadius: 15,
          shadowOffset: { width: 0, height: 5 },
          elevation: material.nativeGlass ? 0 : 5,
          borderRadius: 23,
        }}
      >
        <View
          testID="fin-tab-tail"
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: menuHeight - 2,
            left: FIN_MENU_ANCHOR - 14,
            width: 28,
            height: FIN_MENU_TAIL,
          }}
        >
          <Svg width={28} height={FIN_MENU_TAIL} viewBox="0 0 28 14" aria-hidden>
            <Path
              d="M1 0H27L15.8 12.6a2.4 2.4 0 0 1-3.6 0Z"
              fill={material.reduceTransparency ? c.surface : night ? '#263E32EB' : '#E8F1E6ED'}
            />
            <Path
              d="m1 0 11.2 12.6a2.4 2.4 0 0 0 3.6 0L27 0"
              fill="none"
              stroke={material.reduceTransparency ? c.border : night ? '#D2E9DA50' : '#FFFFFFE8'}
            />
          </Svg>
        </View>
        <FinMaterial menu {...material} />
        <View collapsable={false} style={styles.menuContent}>
          <ScrollView
            keyboardShouldPersistTaps="always"
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 5 }}
            showsVerticalScrollIndicator={menuHeight < FIN_MENU_HEIGHT}
          >
            {workspaceTabs
              .filter(([key]) => key !== 'ai')
              .map(([key, href, Icon], index) => (
                <Action
                  key={key}
                  label={t(key)}
                  onPress={() => {
                    onClose();
                    Keyboard.dismiss();
                    router.replace(href);
                  }}
                  style={{
                    minHeight: FIN_BAR_TARGET,
                    borderRadius: 0,
                    paddingHorizontal: 12,
                    gap: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    borderTopWidth: index ? StyleSheet.hairlineWidth : 0,
                    borderTopColor: c.border,
                  }}
                >
                  <Icon size={20} strokeWidth={1.6} color={c.foreground} />
                  <Text style={{ fontSize: 16, lineHeight: 21 }}>{t(key)}</Text>
                </Action>
              ))}
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  menuContent: { flex: 1, borderRadius: 23, overflow: 'hidden', zIndex: 1 },
  barButton: {
    width: FIN_BAR_TARGET,
    height: FIN_BAR_TARGET,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: FIN_BAR_TARGET / 2,
    zIndex: 2,
  },
  barButtonFill: { alignItems: 'center', justifyContent: 'center' },
});
