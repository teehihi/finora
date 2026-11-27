import { useRef, type ReactNode } from 'react';
import {
  Animated,
  Image,
  Platform,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { dark, tokens } from '@finora/design-tokens';
import { Action, Heading, useDesign } from '@finora/ui';
import { useWorkspaceDockInset } from '../components/layout';
import { useCYLScrollTarget } from '../components/cyl-scroll-target';

export const profileLight = {
  background: '#F5F5F6',
  surface: '#FFFFFF',
  line: '#EEEEEF',
  ink: '#151C26',
  muted: '#626D7B',
  icon: '#333943',
  hero: '#EFEEE8',
  profileChip: '#E0F1EE',
};
export const profileDark = {
  background: '#14171D',
  surface: '#1C2027',
  line: '#313640',
  ink: '#F3F4F6',
  muted: '#B8C1CC',
  icon: '#E0E5EC',
  hero: '#172722',
  profileChip: '#23433C',
};
export function useProfileChrome() {
  const night = useDesign().colors === dark;
  return { night, palette: night ? profileDark : profileLight };
}

export function AccountScroll({
  children,
  header,
  detail,
  fixedBackground,
}: {
  children: ReactNode;
  header?: ReactNode;
  detail?: { title: string; back: () => void };
  fixedBackground?: ImageSourcePropType;
}) {
  const { t } = useDesign();
  const { palette: p } = useProfileChrome();
  const { width } = useWindowDimensions();
  const dockInset = useWorkspaceDockInset();
  const scrollTarget = useCYLScrollTarget();
  const scrollY = useRef(new Animated.Value(0)).current;
  const wide = width >= tokens.breakpoints.rail;
  const backdropOffset = scrollY.interpolate({
    inputRange: [0, 136],
    outputRange: [0, -136],
    extrapolate: 'clamp',
  });
  return (
    <View style={{ flex: 1, backgroundColor: p.background }}>
      {fixedBackground ? (
        <Animated.View
          testID="profile-fixed-backdrop"
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 136,
            overflow: 'hidden',
            backgroundColor: p.hero,
            transform: [{ translateY: backdropOffset }],
          }}
        >
          <Image
            source={fixedBackground}
            accessible={false}
            resizeMode="cover"
            fadeDuration={0}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: '100%',
              minWidth: 408,
              height: '100%',
              opacity: p === profileDark ? 0.14 : 1,
            }}
          />
        </Animated.View>
      ) : null}
      {detail ? (
        <View
          testID="workspace-detail-chrome"
          style={{
            backgroundColor: p.surface,
            borderBottomWidth: 1,
            borderBottomColor: p.line,
            width: '100%',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 720,
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: 57,
              paddingHorizontal: 13,
            }}
          >
            <Action
              label={t('back')}
              onPress={detail.back}
              style={{ width: 44, height: 44, alignItems: 'center' }}
            >
              <ArrowLeft size={22} strokeWidth={2.1} color={p.ink} />
            </Action>
            <Heading size={17} style={{ flex: 1, textAlign: 'center', color: p.ink }}>
              {detail.title}
            </Heading>
            <View style={{ width: 44 }} />
          </View>
        </View>
      ) : null}
      <Animated.ScrollView
        {...scrollTarget}
        onScroll={
          fixedBackground
            ? Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
                useNativeDriver: Platform.OS !== 'web',
                listener: scrollTarget?.onScroll,
              })
            : scrollTarget?.onScroll
        }
        scrollEventThrottle={fixedBackground ? 16 : scrollTarget?.scrollEventThrottle}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ alignItems: 'center', paddingBottom: dockInset + 24 }}
        style={{ flex: 1 }}
      >
        <View style={{ width: '100%', maxWidth: 720, paddingTop: wide ? 22 : 0 }}>
          {header}
          <View
            style={{
              gap: detail ? 12 : 15,
              paddingHorizontal: detail ? 0 : wide ? 22 : 15,
              paddingTop: detail ? 0 : 14,
            }}
          >
            {children}
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}
