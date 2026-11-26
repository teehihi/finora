import { Image, View, useWindowDimensions, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  CalendarDays,
  ChevronRight,
  Columns2,
  FileScan,
  Search,
  type LucideIcon,
} from 'lucide-react-native';
import { router, type Href } from 'expo-router';
import { Action, Button, Heading, Text, useDesign } from '@finora/ui';
import { date, homeCopy } from '@finora/i18n';
import type { AccountData, DueRepayment, Profile } from '@finora/contracts';
import type { Readiness } from '@finora/api-client';
import { Data } from '../components/layout';
import { homeCashFlow } from './home-model';
import fin from '../../assets/brand/fin-assistant.png';

const amountInk: TextStyle = { fontVariant: ['tabular-nums'] };
const lime = '#C6F39A';
const caution = '#FFDAAA';
const allocationInks = ['#77B7A3', '#A1C7F1', lime];

type DataState<T> = { data: T | undefined; isError: boolean; refetch: () => unknown };

function MoneyFlow({ profile }: { profile: Profile }) {
  const { colors: c, locale, money } = useDesign();
  const copy = homeCopy(locale);
  const { remainder, shares } = homeCashFlow(profile);
  const compact = (value: number) =>
    locale === 'vi-VN' && value >= 1_000_000 && value % 1_000_000 === 0
      ? new Intl.NumberFormat(locale).format(value / 1_000_000) + ' triệu ₫'
      : money(value);
  const amounts = [profile.expenses, profile.debt, Math.abs(remainder)];
  const labels = [copy.expenses, copy.debt, remainder < 0 ? copy.cashShort : copy.cashLeft];

  return (
    <View
      style={{
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderColor: 'rgba(221,252,235,.25)',
        gap: 9,
      }}
    >
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 4 }}
      >
        <Text small style={{ color: c.onForestMuted, fontSize: 12 }}>
          {copy.income}
        </Text>
        <Text small bold style={{ ...amountInk, color: c.onForest, fontSize: 12 }}>
          {compact(profile.income)}
        </Text>
      </View>
      {shares ? (
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: 'row', height: 6, gap: 3 }}
        >
          {shares.map((share, index) =>
            share > 0 ? (
              <View
                key={labels[index]}
                style={{ flex: share, borderRadius: 5, backgroundColor: allocationInks[index] }}
              />
            ) : null,
          )}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {labels.map((label, index) => (
          <View key={label} style={{ flex: index === 2 ? 1.3 : 1, minWidth: 62, gap: 3 }}>
            <Text
              small
              bold
              style={{
                ...amountInk,
                color: index === 2 ? (remainder < 0 ? caution : lime) : c.onForest,
                fontSize: 14,
                lineHeight: 17,
              }}
            >
              {compact(amounts[index])}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5 }}>
              {shares ? (
                <View
                  accessible={false}
                  style={{
                    marginTop: 5,
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: allocationInks[index],
                  }}
                />
              ) : null}
              <Text
                small
                style={{
                  color: index === 2 && remainder < 0 ? caution : c.onForestMuted,
                  fontSize: 11,
                  lineHeight: 15,
                }}
              >
                {label}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function HomeCapacity({
  account,
  desktop,
}: {
  account: DataState<AccountData & { readiness: Readiness | null }>;
  desktop: boolean;
}) {
  const { t, colors: c, money, locale } = useDesign();
  const copy = homeCopy(locale);
  return (
    <View
      style={{
        backgroundColor: c.forest,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: desktop ? 22 : 18,
      }}
    >
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={{ position: 'absolute', right: -1, top: 0 }}
      >
        <Svg
          width={desktop ? 254 : 166}
          height={desktop ? 166 : 119}
          viewBox="0 0 175 124"
          fill="none"
        >
          <Path
            d="M187 6C120-11 80 14 65 51C53 80 82 113 174 111"
            stroke="#9ED1BB"
            strokeOpacity={0.14}
            strokeWidth={1.25}
          />
          <Path
            d="M188 17C138 0 98 19 84 49C70 78 105 101 174 97"
            stroke="#9ED1BB"
            strokeOpacity={0.16}
            strokeWidth={1.25}
          />
          <Path
            d="M187 27C149 15 112 26 101 51C88 76 123 89 177 84"
            stroke="#9ED1BB"
            strokeOpacity={0.17}
            strokeWidth={1.25}
          />
          <Path
            d="M187 40C152 29 127 38 119 52C113 67 139 77 177 70"
            stroke="#9ED1BB"
            strokeOpacity={0.19}
            strokeWidth={1.25}
          />
        </Svg>
      </View>
      <Data q={account}>
        {(data) => (
          <View
            style={{
              paddingHorizontal: desktop ? 24 : 17,
              paddingVertical: desktop ? 22 : 17,
              gap: 4,
            }}
          >
            <Text small bold style={{ color: c.onForestMuted }}>
              {copy.capacity}
            </Text>
            {data.readiness && data.profile ? (
              <>
                <Heading
                  size={data.readiness.monthlyBudget > 999_999_999 ? 30 : desktop ? 42 : 37}
                  style={{ ...amountInk, color: c.onForest }}
                >
                  {money(data.readiness.monthlyBudget)}
                </Heading>
                <Text small style={{ color: c.onForestMuted, fontSize: 11, lineHeight: 16 }}>
                  {copy.estimate}
                </Text>
                <MoneyFlow profile={data.profile} />
              </>
            ) : (
              <>
                <Heading size={24} style={{ color: c.onForest, maxWidth: '85%' }}>
                  {copy.missingTitle}
                </Heading>
                <Text small style={{ color: c.onForestMuted, maxWidth: 320 }}>
                  {copy.missingBody}
                </Text>
                <View style={{ alignSelf: 'flex-start', marginTop: 7 }}>
                  <Button
                    label={t(data.profile ? 'editProfile' : 'addProfile')}
                    variant="onForest"
                    onPress={() => router.navigate('/profile')}
                  />
                </View>
              </>
            )}
          </View>
        )}
      </Data>
    </View>
  );
}

export function HomeTools() {
  const { locale, colors: c } = useDesign();
  const { fontScale } = useWindowDimensions();
  const expanded = fontScale >= 1.35;
  const copy = homeCopy(locale);
  const entries = [
    [copy.find, '/explore', Search],
    [copy.simulate, '/simulate/personal-flex', Calculator],
    [copy.compare, '/explore?mode=sample&intent=compare', Columns2],
    [copy.documents, '/documents', FileScan],
    [copy.repayments, '/repayments', CalendarDays],
  ] as const;
  return (
    <View style={{ gap: 10 }}>
      <Heading size={17}>{copy.tools}</Heading>
      <View style={{ flexDirection: 'row', flexWrap: expanded ? 'wrap' : 'nowrap', gap: 4 }}>
        {entries.map(([label, href, Icon]) => (
          <Action
            key={href}
            label={label}
            onPress={() => router.navigate(href as Href)}
            style={{
              flex: expanded ? undefined : 1,
              width: expanded ? '31%' : undefined,
              minWidth: 0,
              minHeight: 66,
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingVertical: 1,
              gap: 6,
              borderRadius: 12,
            }}
          >
            <View
              accessible={false}
              style={{
                width: 40,
                height: 40,
                borderRadius: 13,
                backgroundColor: c.secondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={20} color={c.primary} strokeWidth={1.8} />
            </View>
            <Text small bold style={{ fontSize: 12, lineHeight: 16, textAlign: 'center' }}>
              {label}
            </Text>
          </Action>
        ))}
      </View>
    </View>
  );
}

export function HomeFin() {
  const { locale, colors: c } = useDesign();
  const copy = homeCopy(locale);
  return (
    <Action
      label={copy.finButton}
      onPress={() => router.navigate('/assistant')}
      style={{
        backgroundColor: c.secondary,
        borderRadius: 16,
        paddingLeft: 14,
        paddingRight: 10,
        paddingVertical: 9,
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text bold style={{ color: c.primary, fontSize: 15, lineHeight: 19 }}>
            {copy.finTitle}
          </Text>
          <ArrowUpRight size={15} color={c.primary} />
        </View>
        <Text small muted style={{ fontSize: 12, lineHeight: 17 }}>
          {copy.finBody}
        </Text>
      </View>
      <Image
        accessibilityIgnoresInvertColors
        accessible={false}
        source={fin}
        resizeMode="contain"
        style={{ width: 62, height: 60 }}
      />
    </Action>
  );
}

export function HomeSection({
  title,
  link,
  onPress,
  children,
  style,
}: {
  title: string;
  link: string;
  onPress: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { colors: c } = useDesign();
  return (
    <View style={style}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <Heading size={17} style={{ flexShrink: 1 }}>
          {title}
        </Heading>
        <Action
          label={link}
          onPress={onPress}
          style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: 4 }}
        >
          <Text small bold style={{ color: c.primary, textAlign: 'right' }}>
            {link}
          </Text>
          <ArrowRight size={14} color={c.primary} />
        </Action>
      </View>
      {children}
    </View>
  );
}

export function HomeActivityRow({
  title,
  accessibleTitle,
  detail,
  amount,
  icon: Icon,
  badge,
  warning,
  onPress,
}: {
  title: string;
  accessibleTitle?: string;
  detail: string;
  amount?: number;
  icon: LucideIcon;
  badge?: React.ReactNode;
  warning?: boolean;
  onPress: () => void;
}) {
  const { colors: c, money } = useDesign();
  const value = amount === undefined ? undefined : money(amount);
  return (
    <Action
      label={[accessibleTitle ?? title, value].filter(Boolean).join(', ')}
      onPress={onPress}
      style={{
        minHeight: 54,
        paddingVertical: 6,
        gap: 10,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View
        accessible={false}
        style={{
          width: 41,
          minHeight: 40,
          paddingVertical: 3,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: warning ? c.actionAmberSurface : c.secondary,
        }}
      >
        {badge ?? <Icon size={18} color={warning ? c.actionAmber : c.primary} />}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Text bold small style={warning ? { color: c.actionAmber } : undefined}>
          {title}
        </Text>
        <Text small muted style={{ fontSize: 12, lineHeight: 16 }}>
          {detail}
        </Text>
      </View>
      {value ? (
        <Text small bold style={{ ...amountInk, maxWidth: '42%', textAlign: 'right' }}>
          {value}
        </Text>
      ) : (
        <ChevronRight size={16} color={c.muted} />
      )}
    </Action>
  );
}

export function HomePayment({ payment }: { payment: DueRepayment }) {
  const { colors: c, locale, t } = useDesign();
  const copy = homeCopy(locale);
  const dueDate = new Date(payment.date.slice(0, 10) + 'T12:00:00Z');
  const month =
    locale === 'vi-VN'
      ? copy.monthAbbr + (dueDate.getUTCMonth() + 1)
      : new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(dueDate);
  return (
    <HomeActivityRow
      title={payment.title}
      accessibleTitle={t('upcoming') + ', ' + payment.title + ', ' + date(payment.date, locale)}
      detail={copy.tracked}
      amount={payment.payment}
      icon={CalendarDays}
      badge={
        <View accessible={false} style={{ alignItems: 'center' }}>
          <Text bold style={{ ...amountInk, color: c.primary, fontSize: 18, lineHeight: 21 }}>
            {dueDate.getUTCDate()}
          </Text>
          <Text bold small style={{ color: c.primary, fontSize: 9, lineHeight: 11 }}>
            {month}
          </Text>
        </View>
      }
      onPress={openRepayments}
    />
  );
}

export const openRepayments = () => router.navigate('/repayments');
export const openSavedSimulations = () => router.navigate('/loans?pane=simulations');
export const openSampleSimulator = () => router.navigate('/simulate/personal-flex');
