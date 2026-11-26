import { useRef, useState } from 'react';
import { PanResponder, Pressable, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { Action, Text, useDesign } from '@finora/ui';

export function AmountControl({
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (next: number) => void;
}) {
  const { colors: c, money, locale } = useDesign();
  const [width, setWidth] = useState(0);
  const local = (vi: string, en: string) => (locale === 'vi-VN' ? vi : en);
  const step = Math.max(1, Math.round((max - min) / 36 / 100_000) * 100_000);
  const finite = Number.isFinite(value) ? value : min;
  const bounded = Math.max(min, Math.min(max, finite));
  const fraction = max === min ? 1 : (bounded - min) / (max - min);
  const gestures = useRef({ disabled, width, min, max, step, onChange });
  gestures.current = { disabled, width, min, max, step, onChange };
  const origin = useRef(0);
  const commit = useRef(-1);
  function position(x: number) {
    const state = gestures.current;
    if (state.width <= 0 || state.disabled) return;
    const ratio = Math.max(0, Math.min(1, x / state.width));
    const span = state.max - state.min;
    const next =
      ratio >= 0.99
        ? state.max
        : Math.min(state.max, state.min + Math.round((span * ratio) / state.step) * state.step);
    if (commit.current === next) return;
    commit.current = next;
    state.onChange(next);
  }
  const drag = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) =>
        !gestures.current.disabled &&
        g.numberActiveTouches < 2 &&
        Math.abs(g.dx) > 5 &&
        Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
      onPanResponderGrant: (event, g) => {
        origin.current = event.nativeEvent.locationX - g.dx;
        commit.current = -1;
        position(origin.current + g.dx);
      },
      onPanResponderMove: (_, g) => position(origin.current + g.dx),
      onPanResponderRelease: (_, g) => position(origin.current + g.dx),
    }),
  ).current;
  if (max === min) return null;
  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Action
          label={local('Giảm số tiền vay', 'Lower loan amount')}
          onPress={() => onChange(Math.max(min, bounded - step))}
          disabled={disabled || bounded <= min}
          style={{ width: 44, height: 44, alignItems: 'center', backgroundColor: c.secondary }}
        >
          <Minus color={c.primary} size={18} />
        </Action>
        <View style={{ flex: 1 }} {...drag.panHandlers}>
          <Pressable
            accessible={false}
            focusable={false}
            importantForAccessibility="no"
            disabled={disabled}
            onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
            onPress={(event) => {
              commit.current = -1;
              position(event.nativeEvent.locationX);
            }}
            style={{
              height: 44,
              paddingHorizontal: 2,
              justifyContent: 'center',
              opacity: disabled ? 0.55 : 1,
            }}
          >
            <View
              pointerEvents="none"
              style={{ height: 6, borderRadius: 4, backgroundColor: c.border }}
            >
              <View
                style={{
                  height: 6,
                  width: (fraction * 100 + '%') as `${number}%`,
                  borderRadius: 4,
                  backgroundColor: c.primary,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: -6,
                  left: (fraction * 100 + '%') as `${number}%`,
                  width: 18,
                  height: 18,
                  marginLeft: -9,
                  borderRadius: 9,
                  backgroundColor: c.primary,
                  borderColor: c.surface,
                  borderWidth: 2,
                }}
              />
            </View>
          </Pressable>
        </View>
        <Action
          label={local('Tăng số tiền vay', 'Raise loan amount')}
          onPress={() => onChange(Math.min(max, bounded + step))}
          disabled={disabled || bounded >= max}
          style={{ width: 44, height: 44, alignItems: 'center', backgroundColor: c.secondary }}
        >
          <Plus color={c.primary} size={18} />
        </Action>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <Text small muted>
          {money(min)}
        </Text>
        <Text small muted>
          {money(max)}
        </Text>
      </View>
    </View>
  );
}
