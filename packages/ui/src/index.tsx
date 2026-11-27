import React, { createContext, useContext, useState, type ReactNode } from 'react';
import {
  View,
  Text as RNText,
  TextInput as RNInput,
  Pressable,
  Modal,
  ScrollView,
  Switch as RNSwitch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  type TextStyle,
  type ViewStyle,
  type TextInputProps,
} from 'react-native';
import { Check, ChevronDown, Search, X } from 'lucide-react-native';
import { light, tokens } from '@finora/design-tokens';
import { translate, currency, type Locale, type Key } from '@finora/i18n';

import { overlayMotion, useReducedMotion } from './motion';
export { overlayMotion, useReducedMotion } from './motion';

export const DesignContext = createContext({ colors: light, locale: 'vi-VN' as Locale });
export function useDesign() {
  const ctx = useContext(DesignContext);
  return {
    ...ctx,
    t: (key: Key) => translate(ctx.locale, key),
    money: (n: number) => currency(n, ctx.locale),
  };
}
export function Text({
  children,
  style,
  muted = false,
  small = false,
  bold = false,
  role,
  numberOfLines,
}: {
  children: ReactNode;
  style?: TextStyle;
  muted?: boolean;
  small?: boolean;
  bold?: boolean;
  role?: 'alert' | 'header';
  numberOfLines?: number;
}) {
  const { colors: c } = useDesign();
  return (
    <RNText
      accessibilityRole={role}
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: bold ? tokens.font.medium : tokens.font.body,
          ...(small ? tokens.type.caption : tokens.type.body),
          color: muted ? c.muted : c.foreground,
          flexShrink: 1,
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}
export function Heading({
  children,
  size = 32,
  style,
}: {
  children: ReactNode;
  size?: number;
  style?: TextStyle;
}) {
  const { colors } = useDesign();
  return (
    <RNText
      accessibilityRole="header"
      style={[
        {
          fontFamily: tokens.font.heading,
          fontSize: size,
          lineHeight: Math.ceil(size * (size >= 32 ? 1.18 : 1.24)),
          color: colors.foreground,
          letterSpacing: -size * 0.026,
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}
export function Eyebrow({
  children,
  tone = 'muted',
  style,
}: {
  children: ReactNode;
  tone?: 'muted' | 'forest' | 'onForest';
  style?: TextStyle;
}) {
  const { colors: c } = useDesign();
  return (
    <Text
      small
      bold
      style={{
        ...tokens.type.label,
        color: tone === 'onForest' ? c.onForestMuted : tone === 'forest' ? c.primary : c.muted,
        ...style,
      }}
    >
      {children}
    </Text>
  );
}
export function SectionHeader({
  title,
  description,
  eyebrow,
  accessory,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  accessory?: ReactNode;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      <View style={{ flexGrow: 1, flexShrink: 1, gap: 4 }}>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <Heading size={26}>{title}</Heading>
        {description ? <Text muted>{description}</Text> : null}
      </View>
      {accessory}
    </View>
  );
}
export function Surface({
  children,
  tone = 'paper',
  style,
}: {
  children: ReactNode;
  tone?: 'paper' | 'grouped' | 'forest';
  style?: ViewStyle;
}) {
  const { colors: c } = useDesign();
  return (
    <View
      style={[
        {
          backgroundColor:
            tone === 'forest' ? c.forest : tone === 'grouped' ? c.elevated : c.surface,
          borderRadius: tone === 'forest' ? tokens.radius.feature : tokens.radius.card,
          padding: 20,
          gap: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Action({
  children,
  onPress,
  label,
  style,
  disabled = false,
  selected,
  role = 'button',
}: {
  children: ReactNode;
  onPress: () => void;
  label?: string;
  style?: ViewStyle;
  disabled?: boolean;
  selected?: boolean;
  role?: 'button' | 'tab' | 'checkbox' | 'radio';
}) {
  const { colors } = useDesign();
  const [pressed, press] = useState(false);
  const [focused, focus] = useState(false);
  const [hover, hovered] = useState(false);
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={{
        disabled,
        selected,
        checked: role === 'checkbox' || role === 'radio' ? selected : undefined,
      }}
      aria-checked={role === 'checkbox' || role === 'radio' ? selected : undefined}
      aria-selected={role === 'tab' ? selected : undefined}
      disabled={disabled}
      onFocus={() => focus(true)}
      onBlur={() => focus(false)}
      onHoverIn={() => hovered(true)}
      onHoverOut={() => hovered(false)}
      onPressIn={() => press(true)}
      onPressOut={() => press(false)}
      onPress={onPress}
      style={[
        { minHeight: 44, justifyContent: 'center', borderRadius: tokens.radius.small },
        style,
        { opacity: disabled ? 0.5 : pressed ? 0.74 : hover ? 0.88 : 1 },
        focused && { outlineColor: colors.focus, outlineWidth: 2, outlineStyle: 'solid' },
      ]}
    >
      {children}
    </Pressable>
  );
}
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  leading,
  disabled = false,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'soft' | 'outline' | 'onForest' | 'text';
  icon?: ReactNode;
  leading?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors: c } = useDesign();
  const fg = variant === 'primary' ? c.onPrimary : variant === 'onForest' ? c.forest : c.primary;
  return (
    <Action
      onPress={onPress}
      label={label}
      disabled={disabled || loading}
      style={{
        minHeight: 48,
        borderRadius: tokens.radius.control,
        alignItems: 'center',
        flexDirection: 'row',
        gap: 9,
        paddingHorizontal: variant === 'text' ? 0 : 18,
        paddingVertical: 10,
        borderWidth: variant === 'outline' ? 1 : 0,
        borderColor: c.borderStrong,
        backgroundColor:
          variant === 'primary'
            ? c.primary
            : variant === 'onForest'
              ? c.onForest
              : variant === 'soft'
                ? c.secondary
                : 'transparent',
      }}
    >
      {loading ? <ActivityIndicator color={fg} /> : null}
      {leading}
      <Text bold style={{ color: fg, fontSize: 15, textAlign: 'center' }}>
        {label}
      </Text>
      {icon}
    </Action>
  );
}
export function IconTile({
  icon,
  label,
  onPress,
  background,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  background?: string;
}) {
  const { colors: c } = useDesign();
  return (
    <Action
      label={label}
      onPress={onPress}
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 76,
        padding: 3,
        gap: 6,
        alignItems: 'center',
        justifyContent: 'flex-start',
      }}
    >
      <View
        style={{
          width: 45,
          height: 45,
          borderRadius: 15,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: background || c.secondary,
        }}
      >
        {icon}
      </View>
      <Text bold small style={{ textAlign: 'center', fontSize: 12, lineHeight: 16 }}>
        {label}
      </Text>
    </Action>
  );
}

export function IconButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  return (
    <Action label={label} onPress={onPress} style={{ minWidth: 44, alignItems: 'center' }}>
      {icon}
    </Action>
  );
}
export function Field({
  label,
  error,
  hint,
  ...props
}: TextInputProps & { label: string; error?: string; hint?: string }) {
  const { colors: c } = useDesign();
  const [focus, set] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text bold small>
        {label}
      </Text>
      <RNInput
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={c.muted}
        underlineColorAndroid="transparent"
        {...props}
        onFocus={(e) => {
          set(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          set(false);
          props.onBlur?.(e);
        }}
        style={[
          {
            paddingHorizontal: 14,
            paddingVertical: 12,
            minHeight: 48,
            borderWidth: 1,
            borderColor: error ? c.error : focus ? c.focus : c.borderStrong,
            color: c.foreground,
            backgroundColor: c.input,
            borderRadius: tokens.radius.control,
            fontFamily: tokens.font.body,
            fontSize: 16,
          },
          props.style,
        ]}
      />
      {error ? (
        <Text small role="alert" style={{ color: c.error }}>
          {error}
        </Text>
      ) : hint ? (
        <Text muted small>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
export const TextInput = Field;
export function NumberInput(props: React.ComponentProps<typeof Field>) {
  return <Field keyboardType="decimal-pad" inputMode="decimal" {...props} />;
}
export function CurrencyInput(props: React.ComponentProps<typeof Field>) {
  return <NumberInput {...props} keyboardType="number-pad" inputMode="numeric" />;
}
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors: c } = useDesign();
  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: tokens.radius.card,
          padding: 20,
          gap: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Divider() {
  const { colors } = useDesign();
  return <View style={{ height: 1, backgroundColor: colors.border, alignSelf: 'stretch' }} />;
}
export function Badge({ children }: { children: ReactNode }) {
  const { colors: c } = useDesign();
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: c.secondary,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 8,
      }}
    >
      <Text small bold style={{ color: c.primary }}>
        {children}
      </Text>
    </View>
  );
}
export function Choices<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { colors: c } = useDesign();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {options.map((o) => (
        <Action
          key={o.value}
          role="radio"
          selected={value === o.value}
          onPress={() => onChange(o.value)}
          style={{
            borderColor: value === o.value ? c.primary : c.border,
            borderWidth: 1,
            backgroundColor: value === o.value ? c.primary : c.surface,
            paddingHorizontal: 12,
            borderRadius: 12,
          }}
        >
          <Text small bold style={{ color: value === o.value ? c.onPrimary : c.muted }}>
            {o.label}
          </Text>
        </Action>
      ))}
    </View>
  );
}
export const RadioGroup = Choices,
  SegmentedControl = Choices,
  Tabs = Choices;
export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors: c } = useDesign();
  return (
    <Action
      role="checkbox"
      selected={checked}
      onPress={() => onChange(!checked)}
      label={label}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 8 }}
    >
      <View
        style={{
          height: 22,
          width: 22,
          borderWidth: 1,
          borderColor: c.primary,
          borderRadius: 4,
          backgroundColor: checked ? c.primary : c.surface,
        }}
      >
        {checked ? <Check color={c.onPrimary} size={18} /> : null}
      </View>
      <Text>{label}</Text>
    </Action>
  );
}
export function Switch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <RNSwitch accessibilityLabel={label} value={value} onValueChange={onChange} />
      <Text>{label}</Text>
    </View>
  );
}
export function Dialog({
  title,
  visible,
  onClose,
  children,
  bottom = false,
}: {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  bottom?: boolean;
}) {
  const { colors: c, t } = useDesign();
  const reduced = useReducedMotion();
  // React Native Web owns the focus trap and the outer dialog role.
  const webLabel = Platform.OS === 'web' ? { 'aria-label': title } : {};
  return (
    <Modal
      {...webLabel}
      visible={visible}
      transparent
      onRequestClose={onClose}
      animationType={overlayMotion(bottom, reduced, Platform.OS)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          backgroundColor: c.overlay,
          justifyContent: bottom ? 'flex-end' : 'center',
          alignItems: 'center',
          padding: bottom ? 0 : 18,
        }}
      >
        <View
          accessibilityViewIsModal
          style={{
            width: '100%',
            maxWidth: 560,
            maxHeight: bottom ? '92%' : '88%',
            backgroundColor: c.surface,
            borderRadius: bottom ? 28 : 20,
            borderBottomLeftRadius: bottom ? 0 : 20,
            borderBottomRightRadius: bottom ? 0 : 20,
            padding: bottom ? 20 : 24,
            paddingBottom: bottom ? 30 : 24,
            gap: 12,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Heading size={24} style={{ flex: 1 }}>
              {title}
            </Heading>
            <IconButton label={t('close')} onPress={onClose} icon={<X color={c.foreground} />} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function BottomSheet(props: React.ComponentProps<typeof Dialog>) {
  return <Dialog {...props} bottom />;
}
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const [open, set] = useState(false);
  const { colors: c } = useDesign();
  return (
    <View style={{ gap: 6 }}>
      <Text small bold>
        {label}
      </Text>
      <Button
        variant="outline"
        label={options.find((o) => o.value === value)?.label ?? label}
        icon={<ChevronDown size={16} color={c.primary} />}
        onPress={() => set(true)}
      />
      <BottomSheet visible={open} title={label} onClose={() => set(false)}>
        <Choices
          options={options}
          value={value}
          onChange={(v) => {
            onChange(v);
            set(false);
          }}
        />
      </BottomSheet>
    </View>
  );
}
export function SearchInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { colors: c } = useDesign();
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: c.borderStrong,
        borderRadius: tokens.radius.control,
        paddingHorizontal: 12,
        backgroundColor: c.input,
      }}
    >
      <Search size={18} color={c.muted} />
      <RNInput
        accessibilityLabel={label}
        placeholder={label}
        value={value}
        onChangeText={onChange}
        placeholderTextColor={c.muted}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 48,
          color: c.foreground,
          fontFamily: tokens.font.body,
          fontSize: 15,
        }}
      />
    </View>
  );
}
export function Avatar({ name }: { name: string }) {
  const { colors: c } = useDesign();
  return (
    <View
      style={{
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: c.secondary,
      }}
    >
      <Text bold style={{ color: c.primary }}>
        {name.trim().slice(0, 1).toLocaleUpperCase()}
      </Text>
    </View>
  );
}
export function Progress({ value, label }: { value: number; label: string }) {
  const { colors: c } = useDesign();
  const n = Math.min(100, Math.max(0, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ now: n, min: 0, max: 100 }}
      style={{ height: 8, backgroundColor: c.secondary, borderRadius: 4, overflow: 'hidden' }}
    >
      <View style={{ width: `${n}%`, height: 8, backgroundColor: c.chartPrincipal }} />
    </View>
  );
}
export function Skeleton() {
  const { colors: c } = useDesign();
  return (
    <View style={{ width: '70%', height: 18, borderRadius: 6, backgroundColor: c.secondary }} />
  );
}
export function LoadingState() {
  const { t, colors } = useDesign();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('loading')}
      style={{
        backgroundColor: colors.surface,
        borderRadius: tokens.radius.card,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View
        accessible={false}
        style={{
          width: 34,
          height: 34,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.secondary,
          borderRadius: 12,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text small muted>
          {t('loading')}
        </Text>
        <View
          accessible={false}
          style={{ width: '62%', backgroundColor: colors.elevated, height: 5, borderRadius: 3 }}
        />
      </View>
    </View>
  );
}
export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  const { colors: c } = useDesign();
  return (
    <View style={{ alignItems: 'flex-start', paddingVertical: 10, gap: 9 }}>
      {icon ? (
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 15,
            backgroundColor: c.secondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </View>
      ) : null}
      <Heading size={22}>{title}</Heading>
      {body ? <Text muted>{body}</Text> : null}
      {action ? <View style={{ alignSelf: 'flex-start' }}>{action}</View> : null}
    </View>
  );
}
export function ErrorState({ retry }: { retry: () => void }) {
  const { t, colors: c } = useDesign();
  return (
    <View
      style={{
        borderWidth: 1,
        borderRadius: tokens.radius.card,
        borderColor: c.border,
        backgroundColor: c.surface,
        padding: 16,
        gap: 10,
      }}
    >
      <Text role="alert" style={{ color: c.error }}>
        {t('error')}
      </Text>
      <View style={{ alignSelf: 'flex-start' }}>
        <Button label={t('retry')} onPress={retry} variant="outline" />
      </View>
    </View>
  );
}
export function Toast({ children }: { children: ReactNode }) {
  const { colors: c } = useDesign();
  return (
    <Text role="alert" style={{ color: c.success }}>
      {children}
    </Text>
  );
}
export function FinancialAmount({ value }: { value: number }) {
  const { money } = useDesign();
  return (
    <Text bold style={{ fontVariant: ['tabular-nums'] }}>
      {money(value)}
    </Text>
  );
}
export function FinancialMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text small muted>
        {label}
      </Text>
      <Text bold style={{ fontSize: 20, lineHeight: 28, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}
export function SourceAttribution({ source }: { source: string }) {
  const { t } = useDesign();
  return (
    <Text small muted>
      {t('source')} · {source}
    </Text>
  );
}
export function RiskIndicator({ children }: { children: ReactNode }) {
  const { colors: c } = useDesign();
  return (
    <Text small style={{ color: c.warning }}>
      {children}
    </Text>
  );
}
export function ChatMessage({ who, body }: { who: string; body: string }) {
  return (
    <Card>
      <Text small bold>
        {who}
      </Text>
      <Text>{body}</Text>
    </Card>
  );
}
export function ChatComposer(props: React.ComponentProps<typeof Field>) {
  return <Field multiline maxLength={1200} {...props} />;
}
