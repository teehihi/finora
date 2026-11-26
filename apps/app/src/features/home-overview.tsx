import { useState } from 'react';
import { Image, View, useWindowDimensions, type TextStyle, type ViewStyle } from 'react-native';
import { tokens } from '@finora/design-tokens';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Calculator,
  CalendarDays,
  ChevronRight,
  Columns2,
  FileScan,
  Search,
  Sparkles,
  WalletCards,
  type LucideIcon,
} from 'lucide-react-native';
import { router, type Href } from 'expo-router';
import { Action, Button, Choices, Dialog, Heading, Text, useDesign } from '@finora/ui';
import { date, homeCopy } from '@finora/i18n';
import type { AccountData, DueRepayment, Profile } from '@finora/contracts';
import type { Readiness } from '@finora/api-client';
import { Data } from '../components/layout';
import { SignatureIcon, SignatureSweep } from '../components/signature';
import { homeCashFlow, homeStressPreview, type HomeStress } from './home-model';
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
          style={{ flexDirection: 'row', height: 8, gap: 4 }}
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
                  fontSize: 12,
                  lineHeight: 17,
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
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 370 || fontScale > 1.25;
  const [stressOpen, setStressOpen] = useState(false);
  return (
    <View
      style={{
        backgroundColor: c.signatureStart,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: tokens.signature.radius + 3,
      }}
    >
      <SignatureSweep name="finora-home-signature" />
      <Data q={account}>
        {(data) => (
          <View
            style={{
              paddingHorizontal: desktop ? 28 : tokens.signature.inset,
              paddingVertical: desktop ? 25 : 16,
              gap: 7,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <SignatureIcon icon={WalletCards} tone="lime" size={33} />
              <Text bold style={{ color: c.onForest, fontSize: 15, flexShrink: 1 }}>
                {copy.capacity}
              </Text>
            </View>
            {data.readiness && data.profile ? (
              <>
                <Heading
                  size={
                    data.readiness.monthlyBudget >= 100_000_000 || compact
                      ? desktop
                        ? 40
                        : 34
                      : desktop
                        ? tokens.signature.heroDesktop
                        : 47
                  }
                  style={{ ...amountInk, color: c.onForest }}
                >
                  {money(data.readiness.monthlyBudget)}
                </Heading>
                <Text small style={{ color: c.onForestMuted, fontSize: 12, lineHeight: 17 }}>
                  {copy.estimate}
                </Text>
                <MoneyFlow profile={data.profile} />
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginTop: 4,
                  }}
                >
                  <Action
                    label={locale === 'vi-VN' ? 'Thử biến động dòng tiền' : 'Stress-test cash flow'}
                    onPress={() => setStressOpen(true)}
                    style={{
                      flexDirection: 'row',
                      paddingHorizontal: 11,
                      gap: 7,
                      alignItems: 'center',
                      backgroundColor: c.signatureLime,
                      borderRadius: 14,
                    }}
                  >
                    <Activity size={16} color={c.signatureInk} />
                    <Text small bold style={{ color: c.signatureInk }}>
                      {locale === 'vi-VN' ? 'Thử biến động dòng tiền' : 'Stress-test cash flow'}
                    </Text>
                  </Action>
                  <Action
                    label={t('editProfile')}
                    onPress={() => router.navigate('/profile')}
                    style={{ paddingHorizontal: 8 }}
                  >
                    <Text small bold style={{ color: c.onForest }}>
                      {t('editProfile')}
                    </Text>
                  </Action>
                </View>
                {stressOpen ? (
                  <HomeStressSheet profile={data.profile} close={() => setStressOpen(false)} />
                ) : null}
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

function HomeStressSheet({ profile, close }: { profile: Profile; close: () => void }) {
  const { locale, colors: c, money } = useDesign();
  const { width } = useWindowDimensions();
  const vi = locale === 'vi-VN';
  const [mode, choose] = useState<HomeStress>('income');
  const { baseline, stressed } = homeStressPreview(profile, mode);
  return (
    <Dialog
      title={vi ? 'Thử biến động dòng tiền' : 'Stress-test cash flow'}
      visible
      bottom={width < 768}
      onClose={close}
    >
      <Text muted>
        {vi
          ? 'Thử trên hồ sơ hiện tại; không đổi dữ liệu đã lưu và chưa tính khoản vay mới.'
          : 'Uses your existing profile without changing it, before any new loan.'}
      </Text>
      <Choices
        value={mode}
        onChange={choose}
        options={[
          { value: 'income', label: vi ? 'Thu nhập giảm 20%' : 'Income down 20%' },
          { value: 'expenses', label: vi ? 'Chi phí tăng 20%' : 'Expenses up 20%' },
          { value: 'both', label: vi ? 'Cả hai' : 'Both' },
        ]}
      />
      <View
        style={{ backgroundColor: c.secondary, borderRadius: 17, padding: 16, gap: 7 }}
        accessibilityLiveRegion="polite"
      >
        <Text small muted>
          {vi ? 'Dòng tiền trước khoản vay mới' : 'Cash flow before new borrowing'}
        </Text>
        <Heading size={30} style={{ ...amountInk, color: stressed < 0 ? c.warning : c.foreground }}>
          {money(stressed)}
        </Heading>
        <Text small bold>
          {stressed < 0
            ? vi
              ? 'Thiếu ngay cả khi chưa vay thêm.'
              : 'Shortfall even without new borrowing.'
            : vi
              ? 'Số còn lại, không phải mức trả khuyến nghị.'
              : 'Remaining cash, not a suggested payment.'}
        </Text>
      </View>
      <Text small muted>
        {vi ? 'Hiện tại: ' : 'Current: '}
        {money(baseline)} · {vi ? 'Thay đổi: ' : 'Change: '}
        {money(stressed - baseline)}
      </Text>
    </Dialog>
  );
}

export function HomeTools() {
  const { colors: c, locale } = useDesign();
  const { fontScale } = useWindowDimensions();
  const expanded = fontScale >= 1.35;
  const copy = homeCopy(locale);
  const vi = locale === 'vi-VN';
  const main = [
    [
      copy.find,
      vi ? 'Tra điều kiện công bố' : 'Browse published terms',
      '/explore',
      Search,
      'emerald',
    ],
    [
      copy.simulate,
      vi ? 'Tính tiền theo từng kỳ' : 'Estimate each payment',
      '/simulate/personal-flex',
      Calculator,
      'blue',
    ],
  ] as const;
  const quick = [
    [copy.compare, '/explore?mode=sample&intent=compare', Columns2, 'violet'],
    [copy.documents, '/documents', FileScan, 'amber'],
    [copy.repayments, '/repayments', CalendarDays, 'lime'],
  ] as const;
  return (
    <View style={{ gap: 10 }}>
      <Heading size={20}>{copy.tools}</Heading>
      <View style={{ flexDirection: expanded ? 'column' : 'row', gap: 8 }}>
        {main.map(([label, detail, href, Icon, tone]) => (
          <Action
            key={href}
            label={label}
            onPress={() => router.navigate(href as Href)}
            style={{
              flex: expanded ? undefined : 1,
              minWidth: 0,
              minHeight: 88,
              justifyContent: 'flex-start',
              backgroundColor: c.surface,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: c.border,
              paddingHorizontal: 10,
              paddingVertical: 9,
              gap: 5,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <SignatureIcon icon={Icon} size={31} tone={tone} />
              <ArrowUpRight size={14} color={c.muted} />
            </View>
            <Text small bold>
              {label}
            </Text>
            <Text small muted style={{ fontSize: 12, lineHeight: 17 }}>
              {detail}
            </Text>
          </Action>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {quick.map(([label, href, Icon, tone]) => (
          <Action
            key={href}
            label={label}
            onPress={() => router.navigate(href as Href)}
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 71,
              paddingVertical: 5,
              gap: 5,
              alignItems: 'center',
              justifyContent: 'flex-start',
              borderRadius: 13,
            }}
          >
            <SignatureIcon icon={Icon} size={38} tone={tone} />
            <Text small bold style={{ fontSize: 12, lineHeight: 17, textAlign: 'center' }}>
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
        borderRadius: 23,
        paddingLeft: 16,
        paddingRight: 12,
        paddingVertical: 12,
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Sparkles size={13} color={c.primary} />
          <Text small bold style={{ color: c.primary }}>
            Finora AI
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text bold style={{ color: c.primary, fontSize: 18, lineHeight: 23, flexShrink: 1 }}>
            {copy.finTitle}
          </Text>
          <ArrowUpRight size={15} color={c.primary} />
        </View>
        <Text small muted style={{ fontSize: 13, lineHeight: 18 }}>
          {copy.finBody}
        </Text>
      </View>
      <Image
        accessibilityIgnoresInvertColors
        accessible={false}
        source={fin}
        resizeMode="contain"
        style={{ width: 71, height: 67 }}
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
        <Heading size={20} style={{ flexShrink: 1 }}>
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
  featured,
  onPress,
}: {
  title: string;
  accessibleTitle?: string;
  detail: string;
  amount?: number;
  icon: LucideIcon;
  badge?: React.ReactNode;
  warning?: boolean;
  featured?: boolean;
  onPress: () => void;
}) {
  const { colors: c, money } = useDesign();
  const value = amount === undefined ? undefined : money(amount);
  return (
    <Action
      label={[accessibleTitle ?? title, detail, value].filter(Boolean).join(', ')}
      onPress={onPress}
      style={{
        minHeight: featured ? 72 : 54,
        paddingVertical: featured ? 9 : 6,
        paddingHorizontal: featured ? 12 : 0,
        borderWidth: featured ? 1 : 0,
        borderColor: c.border,
        borderRadius: 17,
        backgroundColor: featured ? c.surface : undefined,
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
        <Text
          small
          bold
          style={{
            ...amountInk,
            maxWidth: '43%',
            textAlign: 'right',
            fontSize: featured ? 15 : 13,
            color: featured ? c.primary : c.foreground,
          }}
        >
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
      featured
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
