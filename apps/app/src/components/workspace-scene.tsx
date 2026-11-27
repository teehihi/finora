import { useEffect, useId, useRef, type ComponentRef, type ReactNode } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { LucideIcon } from 'lucide-react-native';
import { dark, tokens } from '@finora/design-tokens';
import { Action, Eyebrow, Heading, Text, useDesign } from '@finora/ui';

export type WorkspaceSceneIdentity = {
  label: string;
  icon?: LucideIcon;
  image: ImageSourcePropType;
  subtitle?: string;
};

// Decorative image, unlabelled and outside the interaction/accessibility tree.
export function SceneWash({
  image,
  subdued = false,
}: {
  image: ImageSourcePropType;
  subdued?: boolean;
}) {
  const id = 'workspace-wash-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const { colors: c } = useDesign();
  const night = c === dark;
  const tint = night ? c.elevated : c.secondary;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { backgroundColor: tint }]}
    >
      <Image
        source={image}
        accessible={false}
        resizeMode="cover"
        fadeDuration={0}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: '79%',
          height: '100%',
          opacity: subdued ? (night ? 0.24 : 0.48) : night ? 0.47 : 1,
        }}
      />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0" stopColor={tint} />
            <Stop offset=".35" stopColor={tint} />
            <Stop offset=".54" stopColor={tint} stopOpacity=".92" />
            <Stop offset="1" stopColor={tint} stopOpacity={night ? '.32' : '0'} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={'url(#' + id + ')'} />
      </Svg>
    </View>
  );
}

export function WorkspaceScene({
  title,
  identity,
  desktop,
}: {
  title: string;
  identity: WorkspaceSceneIdentity;
  desktop: boolean;
}) {
  const { colors: c } = useDesign();
  const Icon = identity.icon;
  return (
    <View
      testID="workspace-scene"
      style={{
        backgroundColor: c.secondary,
        borderColor: c.border,
        borderWidth: 1,
        borderRadius: tokens.signature.radius,
        overflow: 'hidden',
        minHeight: desktop ? 138 : 112,
        paddingHorizontal: desktop ? 25 : 17,
        paddingVertical: desktop ? 20 : 14,
        alignItems: 'center',
        flexDirection: 'row',
        gap: 12,
      }}
    >
      <SceneWash image={identity.image} />
      <View
        style={{
          flex: 1,
          maxWidth: tokens.layout.reading,
          minWidth: 0,
          paddingRight: desktop ? 65 : 23,
          gap: 3,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {Icon ? <Icon color={c.primary} size={15} strokeWidth={2} /> : null}
          <Eyebrow tone="forest" style={{ fontSize: 11, lineHeight: 16 }}>
            {identity.label}
          </Eyebrow>
        </View>
        <Heading size={desktop ? 38 : 27}>{title}</Heading>
        {identity.subtitle ? (
          <Text small style={{ color: c.foreground }}>
            {identity.subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function WorkspaceModeRail<T extends string>({
  value,
  options,
  onChange,
  role = 'radio',
  label,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  role?: 'tab' | 'radio';
  label?: string;
}) {
  const { colors: c } = useDesign();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 350 && fontScale >= 1.3;
  const rail = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    // React Native Web's Pressable supports Enter for these roles, but Space
    // only for buttons. Preserve the normal radio/tab keyboard interaction.
    if (Platform.OS !== 'web' || !(rail.current instanceof HTMLElement)) return;
    const group = rail.current;
    const activate = (event: KeyboardEvent) => {
      const controls = Array.from(group.querySelectorAll<HTMLElement>('[role="' + role + '"]'));
      const index = controls.indexOf(event.target as HTMLElement);
      if (index < 0) return;
      const key = event.key;
      const next =
        key === ' '
          ? index
          : key === 'Home'
            ? 0
            : key === 'End'
              ? controls.length - 1
              : key === 'ArrowRight' || key === 'ArrowDown'
                ? (index + 1) % controls.length
                : key === 'ArrowLeft' || key === 'ArrowUp'
                  ? (index + controls.length - 1) % controls.length
                  : -1;
      if (next < 0 || !options[next]) return;
      event.preventDefault();
      controls[next]?.focus();
      onChange(options[next].value);
    };
    group.addEventListener('keydown', activate);
    return () => group.removeEventListener('keydown', activate);
  }, [onChange, options, role]);

  return (
    <View
      ref={rail}
      accessibilityRole={role === 'tab' ? 'tablist' : 'radiogroup'}
      accessibilityLabel={label}
      style={{
        alignSelf: width >= tokens.breakpoints.rail ? 'flex-start' : 'stretch',
        flexDirection: stacked ? 'column' : 'row',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.elevated,
        padding: 4,
        gap: 4,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Action
            key={option.value}
            role={role}
            selected={active}
            label={option.label}
            onPress={() => onChange(option.value)}
            style={{
              flex: stacked || width >= tokens.breakpoints.rail ? undefined : 1,
              minWidth: 0,
              borderRadius: 17,
              borderWidth: 1,
              borderColor: active ? c.border : 'transparent',
              backgroundColor: active ? c.surface : 'transparent',
              alignItems: 'center',
              paddingHorizontal: width >= tokens.breakpoints.rail ? 17 : 5,
              paddingVertical: 5,
            }}
          >
            <Text
              small
              bold={active}
              style={{ color: active ? c.primary : c.muted, textAlign: 'center' }}
            >
              {option.label}
            </Text>
          </Action>
        );
      })}
    </View>
  );
}

export function WorkspaceBackButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  const { colors: c } = useDesign();
  return (
    <Action
      label={label}
      onPress={onPress}
      style={{
        width: 44,
        minHeight: 44,
        alignItems: 'center',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
      }}
    >
      {children}
    </Action>
  );
}
