import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import { Text, useReducedMotion } from '@finora/ui';

const textHeight = 20;
const suggestions = {
  vi: ['Tra hợp đồng vay', 'Tính thử khoản vay', 'Xem lịch trả nợ'],
  en: ['Review a loan contract', 'Estimate a loan', 'View repayment schedule'],
};

export function HomeSearchHint({
  active,
  fallback,
  vietnamese,
  color,
}: {
  active: boolean;
  fallback: string;
  vietnamese: boolean;
  color: string;
}) {
  const reduceMotion = useReducedMotion();
  const enabled = active && !reduceMotion;
  const [line, setLine] = useState(fallback);
  const offset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    offset.setValue(0);
    setLine(fallback);
    if (!enabled) return;

    const options = vietnamese ? suggestions.vi : suggestions.en;
    let index = 0;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let animation: Animated.CompositeAnimation | undefined;
    const wait = (run: () => void, delay: number) => {
      timer = setTimeout(() => {
        if (!stopped) run();
      }, delay);
    };
    const move = (toValue: number, done: () => void) => {
      animation = Animated.timing(offset, {
        toValue,
        duration: 165,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      });
      animation.start(({ finished }) => {
        if (finished && !stopped) done();
      });
    };

    function rotate() {
      move(-textHeight, () => {
        // NFC keeps each Vietnamese base letter and its tones together.
        const letters = Array.from(options[index]!.normalize('NFC'));
        index = (index + 1) % options.length;
        setLine('');
        offset.setValue(textHeight);
        function type(count: number) {
          setLine(letters.slice(0, count).join(''));
          if (count < letters.length) wait(() => type(count + 1), 48);
          else wait(rotate, 2700);
        }
        move(0, () => type(1));
      });
    }

    wait(rotate, 1650);
    return () => {
      stopped = true;
      clearTimeout(timer);
      animation?.stop();
    };
  }, [enabled, fallback, offset, vietnamese]);

  return (
    <View
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flex: 1, minWidth: 0, height: textHeight, overflow: 'hidden' }}
    >
      <Animated.View style={{ transform: [{ translateY: offset }] }}>
        <View testID="home-search-hint">
          <Text numberOfLines={1} style={{ fontSize: 15, lineHeight: textHeight, color }}>
            {enabled ? line : fallback}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}
