import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { router } from 'expo-router';
import { Grid2X2 } from 'lucide-react-native';
import { dark } from '@finora/design-tokens';
import { Action, Text, useDesign, useReducedMotion } from '@finora/ui';
import { workspaceTabs } from '../../components/workspace-tabs';

const useNativeFinGlass = Platform.OS === 'ios' && isLiquidGlassSupported;

export function FinComposerSurface() {
  const { colors: c } = useDesign();
  const night = c === dark;
  const shape = { ...StyleSheet.absoluteFill, borderRadius: 28 };
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {useNativeFinGlass ? (
        <LiquidGlassView
          pointerEvents="none"
          effect="regular"
          colorScheme={night ? 'dark' : 'light'}
          tintColor={night ? 'rgba(21,39,31,0.78)' : 'rgba(252,255,250,0.78)'}
          style={shape}
        />
      ) : (
        <View
          style={[shape, { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1 }]}
        />
      )}
    </View>
  );
}

function FinMenuMaterial({ height }: { height: number }) {
  const { colors: c } = useDesign();
  const night = c === dark;
  const shape = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: 188,
    height,
    borderRadius: 20,
  };
  if (!useNativeFinGlass) {
    return (
      <View
        pointerEvents="none"
        style={[shape, { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }]}
      />
    );
  }

  // Native material is decorative; its hosting view must not own button hit testing.
  return (
    <LiquidGlassView
      pointerEvents="none"
      effect="regular"
      animated={false}
      colorScheme={night ? 'dark' : 'light'}
      tintColor={night ? 'rgba(24,40,34,0.27)' : 'rgba(250,253,248,0.27)'}
      style={shape}
    />
  );
}

export function FinBarButton({
  label,
  expanded,
  disabled,
  onPress,
  backgroundColor,
  children,
}: {
  label: string;
  expanded?: boolean;
  disabled?: boolean;
  onPress: () => void;
  backgroundColor: string;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      aria-expanded={expanded}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.barButton,
        { backgroundColor, opacity: disabled ? 0.55 : pressed ? 0.82 : 1 },
      ]}
    >
      <View pointerEvents="none" style={styles.barGlyph}>
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
      backgroundColor={open ? c.secondary : 'transparent'}
    >
      <Grid2X2 size={20} color={c.primary} strokeWidth={1.8} />
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
  const reduceMotion = useReducedMotion();
  const menuHeight = Math.min(190, maxHeight);
  // Native glass needs a stable backdrop and should not be drawn through a
  // transforming or partially transparent parent while this menu opens.
  const skipIntro = reduceMotion || useNativeFinGlass;
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
          left: 20,
          bottom,
          width: 188,
          height: menuHeight,
          ...(skipIntro
            ? {}
            : {
                opacity: enter,
                transform: [
                  { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [7, 0] }) },
                ],
              }),
          shadowColor: c.foreground,
          shadowOpacity: 0.13,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 5,
          borderRadius: 20,
        }}
      >
        <FinMenuMaterial height={menuHeight} />
        <View
          style={[
            styles.menuContent,
            useNativeFinGlass && {
              backgroundColor: c === dark ? 'rgba(24,40,34,0.14)' : 'rgba(250,253,248,0.14)',
            },
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="always"
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 7, paddingVertical: 5 }}
            showsVerticalScrollIndicator={false}
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
                    minHeight: 45,
                    borderRadius: 0,
                    paddingHorizontal: 10,
                    gap: 11,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderTopWidth: index ? StyleSheet.hairlineWidth : 0,
                    borderTopColor: c.border,
                  }}
                >
                  <Icon size={18} strokeWidth={1.7} color={c.primary} />
                  <Text>{t(key)}</Text>
                </Action>
              ))}
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  menuContent: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  barButton: {
    width: 44,
    height: 44,
    flexShrink: 0,
    alignSelf: 'flex-end',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    zIndex: 2,
  },
  barGlyph: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
});
