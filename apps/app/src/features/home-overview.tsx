import { Image, View, useWindowDimensions, type TextStyle, type ViewStyle } from 'react-native';
import { useState } from 'react';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  WalletCards,
  type LucideIcon,
} from 'lucide-react-native';
import { router, type Href } from 'expo-router';
import { Action, Button, Choices, Dialog, Heading, Text, useDesign } from '@finora/ui';
import { homeCopy } from '@finora/i18n';
import type { AccountData, Profile } from '@finora/contracts';
import type { Readiness } from '@finora/api-client';
import { TaskData } from '../components/task-surface';
import { SignatureIcon } from '../components/signature';
import { homeCashFlow, homeStressPreview, type HomeStress } from './home-model';
import fin from '../../assets/brand/fin-assistant.png';

import simulateArt from '../../assets/home/simulate.png';
import scheduleArt from '../../assets/home/schedule.png';
import compareArt from '../../assets/home/compare.png';
import contractArt from '../../assets/home/contract.png';

const amountInk: TextStyle = { fontVariant: ['tabular-nums'] };

type DataState<T> = {
  data: T | undefined;
  isError: boolean;
  isFetching: boolean;
  refetch: () => unknown;
};

function MoneyFlow({ profile }: { profile: Profile }) {
  const { colors: c, locale, money } = useDesign();
  const copy = homeCopy(locale);
  const allocationInks = [c.chartPrincipal, c.chartFee, c.signatureEdge];
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
        borderColor: c.border,
        gap: 9,
      }}
    >
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 4 }}
      >
        <Text small style={{ color: c.muted, fontSize: 12 }}>
          {copy.income}
        </Text>
        <Text small bold style={{ ...amountInk, color: c.foreground, fontSize: 12 }}>
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
                color: index === 2 ? (remainder < 0 ? c.actionAmber : c.primary) : c.foreground,
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
                  color: index === 2 && remainder < 0 ? c.actionAmber : c.muted,
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
  const [stressOpen, setStressOpen] = useState(false);
  const compact = width < 370 || fontScale > 1.25;
  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderTopWidth: desktop ? 0 : 1,
        borderColor: c.border,
        position: 'relative',
        borderLeftWidth: desktop ? 1 : 0,
      }}
    >
      <TaskData query={account} kind="rows">
        {(data) => (
          <View
            style={{
              paddingLeft: desktop ? 22 : 0,
              paddingTop: desktop ? 5 : 20,
              gap: 6,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <SignatureIcon icon={WalletCards} tone="emerald" size={30} />
              <Text small bold style={{ color: c.muted }}>
                {copy.capacity}
              </Text>
            </View>
            {data.readiness && data.profile ? (
              <>
                <Heading
                  size={
                    data.readiness.monthlyBudget >= 100_000_000 || compact ? 26 : desktop ? 34 : 30
                  }
                  style={{ ...amountInk, color: c.foreground }}
                >
                  {money(data.readiness.monthlyBudget)}
                </Heading>
                <Text small style={{ color: c.muted, fontSize: 12, lineHeight: 17 }}>
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
                      backgroundColor: c.secondary,
                      borderRadius: 14,
                    }}
                  >
                    <Activity size={16} color={c.primary} />
                    <Text small bold style={{ color: c.primary }}>
                      {locale === 'vi-VN' ? 'Thử biến động dòng tiền' : 'Stress-test cash flow'}
                    </Text>
                  </Action>
                  <Action
                    label={t('editProfile')}
                    onPress={() => router.navigate('/profile')}
                    style={{ paddingHorizontal: 8 }}
                  >
                    <Text small bold style={{ color: c.primary }}>
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
                <Heading size={24} style={{ color: c.foreground, maxWidth: '85%' }}>
                  {copy.missingTitle}
                </Heading>
                <Text small style={{ color: c.muted, maxWidth: 320 }}>
                  {copy.missingBody}
                </Text>
                <View style={{ alignSelf: 'flex-start', marginTop: 7 }}>
                  <Button
                    label={t(data.profile ? 'editProfile' : 'addProfile')}
                    variant="outline"
                    onPress={() => router.navigate('/profile')}
                  />
                </View>
              </>
            )}
          </View>
        )}
      </TaskData>
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
  const { locale } = useDesign();
  const { fontScale } = useWindowDimensions();
  const large = fontScale >= 1.35;
  const copy = homeCopy(locale);
  const vi = locale === 'vi-VN';
  const entries = [
    [copy.simulate, vi ? 'Mô phỏng' : 'Simulate', '/simulate/personal-flex', simulateArt],
    [copy.repayments, vi ? 'Lịch trả' : 'Schedule', '/repayments', scheduleArt],
    [copy.compare, vi ? 'So sánh' : 'Compare', '/explore?mode=sample&intent=compare', compareArt],
    [copy.documents, vi ? 'Hợp đồng' : 'Contracts', '/documents', contractArt],
  ] as const;
  return (
    <HomeSection
      title={vi ? 'Công cụ' : 'Tools'}
      link={copy.find}
      onPress={() => router.navigate('/explore')}
    >
      <View style={{ flexDirection: 'row', flexWrap: large ? 'wrap' : 'nowrap', gap: 4 }}>
        {entries.map(([label, visible, href, art]) => (
          <Action
            key={href}
            label={label}
            onPress={() => router.push(href as Href)}
            style={{
              flex: large ? undefined : 1,
              width: large ? '48%' : undefined,
              minWidth: 0,
              minHeight: 68,
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingVertical: 2,
              gap: 5,
              borderRadius: 12,
            }}
          >
            <Image
              source={art}
              accessible={false}
              resizeMode="contain"
              style={{ width: 48, height: 48 }}
            />
            <Text small bold style={{ fontSize: 12, lineHeight: 16, textAlign: 'center' }}>
              {visible}
            </Text>
          </Action>
        ))}
      </View>
    </HomeSection>
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
        borderTopWidth: 1,
        borderColor: c.border,
        borderRadius: 0,
        paddingVertical: 12,
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <Image
        accessibilityIgnoresInvertColors
        accessible={false}
        source={fin}
        resizeMode="contain"
        style={{ width: 46, height: 46 }}
      />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text bold>{copy.finTitle}</Text>
        <Text small muted>
          {copy.finBody}
        </Text>
      </View>
      <ArrowUpRight size={16} color={c.primary} />
    </Action>
  );
}

export function HomeSection({
  title,
  link,
  onPress,
  children,
  style,
  secondary = false,
}: {
  title: string;
  link: string;
  onPress: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  secondary?: boolean;
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
        <Heading size={secondary ? 16 : 21} style={{ flexShrink: 1 }}>
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
  detail,
  amount,
  icon: Icon,
  onPress,
}: {
  title: string;
  detail: string;
  amount?: number;
  icon: LucideIcon;
  onPress: () => void;
}) {
  const { colors: c, money } = useDesign();
  const value = amount === undefined ? undefined : money(amount);
  return (
    <Action
      label={[title, detail, value].filter(Boolean).join(', ')}
      onPress={onPress}
      style={{
        minHeight: 56,
        paddingVertical: 7,
        gap: 10,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Icon size={21} strokeWidth={1.7} color={c.primary} />
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Text bold small>
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
            fontSize: 14,
            color: c.foreground,
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

export const openSavedSimulations = () => router.navigate('/loans?pane=simulations');
export const openSampleSimulator = () => router.navigate('/simulate/personal-flex');
