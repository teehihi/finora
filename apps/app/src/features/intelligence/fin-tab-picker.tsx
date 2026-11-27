import { useEffect, useRef } from 'react';
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

function FinGlass({ kind }: { kind: 'bar' | 'menu' }) {
  const { colors: c } = useDesign();
  const night = c === dark;
  const radius = kind === 'bar' ? 28 : 20;
  const shape = { ...StyleSheet.absoluteFill, borderRadius: radius };
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Platform.OS === 'ios' && isLiquidGlassSupported ? (
        <LiquidGlassView
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
export const FinComposerSurface = () => <FinGlass kind="bar" />;

export function FinTabsButton({ open, onPress }: { open: boolean; onPress: () => void }) {
  const { t, colors: c } = useDesign();
  return (
    <Pressable
      accessibilityRole="button"
      aria-expanded={open}
      accessibilityLabel={t('intelligenceTabs')}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 44,
        width: 44,
        borderRadius: 22,
        backgroundColor: open || pressed ? c.secondary : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <Grid2X2 size={21} color={c.primary} strokeWidth={1.8} />
    </Pressable>
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
  const enter = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) {
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
  }, [enter, reduceMotion]);
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
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        testID="fin-tab-picker"
        accessibilityViewIsModal
        style={{
          position: 'absolute',
          left: 20,
          bottom,
          width: 188,
          paddingHorizontal: 7,
          paddingVertical: 5,
          opacity: enter,
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [7, 0] }) },
          ],
          shadowColor: c.foreground,
          shadowOpacity: 0.13,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 5,
          backgroundColor: Platform.OS === 'android' ? c.surface : 'transparent',
          borderRadius: 20,
        }}
      >
        <FinGlass kind="menu" />
        <ScrollView
          keyboardShouldPersistTaps="always"
          style={{ maxHeight }}
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
      </Animated.View>
    </View>
  );
}
