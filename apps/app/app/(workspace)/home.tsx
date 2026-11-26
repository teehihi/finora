import { ScrollView, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import {
  ArrowRight,
  Calculator,
  CalendarDays,
  FileScan,
  Info,
  Search,
  Wallet,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import type { DueRepayment, Profile } from '@finora/contracts';
import { Action, Button, Heading, IconTile, Text, useDesign } from '@finora/ui';
import { date } from '@finora/i18n';
import { api, auth } from '../../src/services/client';
import { useAccount } from '../../src/providers/AppProviders';
import { useRepaymentLedger } from '../../src/features/repayments';
import { Data, useWorkspaceDockInset } from '../../src/components/layout';

const gutter = 21;
const accent = '#C5F38A';

export default function Home() {
  const { t, colors: c, money, locale } = useDesign();
  const { width } = useWindowDimensions();
  const dockInset = useWorkspaceDockInset();
  const user = auth.useSession().data?.user;
  const account = useAccount();
  const { ledger } = useRepaymentLedger();
  const saved = useQuery({
    queryKey: ['saved', user?.id],
    queryFn: api.saved,
    enabled: !!user?.id,
  });
  const vi = locale === 'vi-VN';
  const tr = (vn: string, en: string) => (vi ? vn : en);
  const mobile = width < 768;
  const desktop = width >= 1024;
  const name = user?.name?.trim();
  const shortMoney = (amount: number) =>
    vi && amount >= 1_000_000 && amount % 1_000_000 === 0
      ? new Intl.NumberFormat(locale).format(amount / 1_000_000) + ' triệu ₫'
      : money(amount);
  const shortcuts = [
    [tr('Tìm khoản vay', 'Find a loan'), '/explore', Search, c.secondary, c.primary],
    [
      tr('Mô phỏng', 'Simulate'),
      '/explore?mode=sample',
      Calculator,
      c.actionBlueSurface,
      c.actionBlue,
    ],
    [
      tr('Đọc hợp đồng', 'Read a contract'),
      '/documents',
      FileScan,
      c.actionAmberSurface,
      c.actionAmber,
    ],
    [
      tr('Lịch trả nợ', 'Repayment'),
      '/repayments',
      CalendarDays,
      c.actionVioletSurface,
      c.actionViolet,
    ],
  ] as const;

  const allocation = (p: Profile) => {
    const spending = p.expenses + p.debt;
    const rest = p.income - spending;
    const used = Math.min(1, spending / p.income);
    return (
      <View style={{ gap: 7, paddingTop: 12 }}>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 5,
            justifyContent: 'space-between',
          }}
        >
          <Text small bold style={{ color: c.onForest }}>
            {tr('Thu nhập tháng đã nhập', 'Monthly income entered')}
          </Text>
          <Text small bold style={{ color: c.onForestMuted, fontVariant: ['tabular-nums'] }}>
            {shortMoney(p.income)}
          </Text>
        </View>
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: 'row', height: 11, gap: 4 }}
        >
          {used > 0 ? (
            <View style={{ flex: used, borderRadius: 5, backgroundColor: '#77B7A3' }} />
          ) : null}
          {used < 1 ? (
            <View style={{ flex: 1 - used, borderRadius: 5, backgroundColor: accent }} />
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
            <Text bold style={{ color: c.onForest, fontVariant: ['tabular-nums'] }}>
              {shortMoney(spending)}
            </Text>
            <Text small style={{ color: c.onForestMuted }}>
              {tr('Chi phí + trả nợ', 'Expenses + repayments')}
            </Text>
          </View>
          <View style={{ flex: 1.35, minWidth: 0, gap: 1, alignItems: 'flex-end' }}>
            <Text
              bold
              style={{
                color: rest < 0 ? '#FFDAAA' : accent,
                textAlign: 'right',
                fontVariant: ['tabular-nums'],
              }}
            >
              {shortMoney(Math.abs(rest))}
            </Text>
            <Text small style={{ color: c.onForestMuted, textAlign: 'right' }}>
              {rest < 0
                ? tr('Thiếu trước khoản vay mới', 'Shortfall before new borrowing')
                : tr('Còn lại trước khoản vay mới', 'Left before new borrowing')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const capacity = (
    <View
      style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: c.forest,
        borderRadius: mobile ? 0 : 23,
        paddingHorizontal: gutter,
        paddingVertical: mobile ? 19 : 22,
        gap: 5,
      }}
    >
      <View
        pointerEvents="none"
        accessible={false}
        style={{ position: 'absolute', top: -134, right: -96 }}
      >
        {[286, 246, 202].map((size) => (
          <View
            key={size}
            style={{
              position: 'absolute',
              top: (286 - size) / 2,
              right: (286 - size) / 2,
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: 19,
              borderColor: 'rgba(217,255,222,0.07)',
            }}
          />
        ))}
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 6,
        }}
      >
        <Text small bold style={{ color: c.onForestMuted }}>
          {tr('Khả năng trả thêm mỗi tháng', 'Estimated room to repay each month')}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            borderWidth: 1,
            borderColor: c.forestBorder,
            borderRadius: 14,
            paddingHorizontal: 7,
          }}
        >
          <Info size={12} color={c.onForestMuted} />
          <Text small style={{ color: c.onForestMuted, fontSize: 11 }}>
            {tr('Ước tính', 'Estimate')}
          </Text>
        </View>
      </View>
      <Data q={account}>
        {(a) =>
          a.readiness && a.profile ? (
            <>
              <Heading
                size={desktop ? 44 : a.readiness.monthlyBudget > 999_999_999 ? 31 : 40}
                style={{ color: c.onForest, fontVariant: ['tabular-nums'] }}
              >
                {money(a.readiness.monthlyBudget)}
              </Heading>
              <Text small style={{ color: c.onForestMuted }}>
                {tr(
                  'Từ hồ sơ bạn nhập · Không phải hạn mức vay',
                  'Based on your profile · Not a credit limit',
                )}
              </Text>
              {allocation(a.profile)}
            </>
          ) : (
            <>
              <Heading size={25} style={{ color: c.onForest }}>
                {tr('Bạn có thể trả bao nhiêu?', 'What could you afford?')}
              </Heading>
              <Text small style={{ color: c.onForestMuted }}>
                {tr(
                  'Thêm thu nhập, chi phí và khoản trả nợ để FINORA ước tính.',
                  'Add income, expenses and repayments for a FINORA estimate.',
                )}
              </Text>
              <View style={{ alignSelf: 'flex-start', marginTop: 5 }}>
                <Button
                  label={t(a.profile ? 'editProfile' : 'addProfile')}
                  variant="onForest"
                  onPress={() => router.navigate('/profile')}
                />
              </View>
            </>
          )
        }
      </Data>
    </View>
  );

  const payments = (
    <View style={{ gap: 3, borderBottomWidth: 1, borderColor: c.border, paddingBottom: 9 }}>
      <SectionLine
        title={tr('Kỳ trả tiếp theo', 'Next payment')}
        link={tr('Xem lịch trả', 'See schedule')}
        onPress={() => router.navigate('/repayments')}
      />
      <Data q={ledger}>
        {(value) => (
          <>
            {value.overdue.length ? (
              <ActivityRow
                title={t('repaymentsLate')}
                detail={tr('Cần xem lại lịch thanh toán', 'Review your payment schedule')}
                amount={value.overdueTotal}
                icon={CalendarDays}
                onPress={() => router.navigate('/repayments')}
              />
            ) : null}
            {value.upcoming[0] ? (
              <NextPayment payment={value.upcoming[0]} />
            ) : (
              <ActivityRow
                title={t('upcoming')}
                detail={value.loans.length ? t('repaymentsNoDue') : t('emptyActive')}
                icon={CalendarDays}
                onPress={() => router.navigate('/repayments')}
              />
            )}
          </>
        )}
      </Data>
    </View>
  );

  const actions = (
    <View style={{ gap: 7 }}>
      <Heading size={18}>{tr('Bạn muốn làm gì?', 'What would you like to do?')}</Heading>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {shortcuts.map(([label, href, Icon, bg, fg]) => (
          <IconTile
            key={label}
            label={label}
            onPress={() => router.navigate(href)}
            background={bg}
            icon={<Icon size={22} color={fg} strokeWidth={1.9} />}
          />
        ))}
      </View>
    </View>
  );

  const recent = (
    <View style={{ gap: 2 }}>
      <SectionLine
        title={tr('Mô phỏng gần đây', 'Recent simulations')}
        link={t('seeAll')}
        onPress={() => router.navigate('/loans')}
      />
      <Data q={saved}>
        {(rows) =>
          rows.length ? (
            rows
              .slice(0, 3)
              .map((row) => (
                <ActivityRow
                  key={row.id}
                  title={vi ? row.product.name : row.product.nameEn}
                  detail={tr('Bản đã lưu', 'Saved') + ' · ' + row.input.months + ' ' + t('months')}
                  amount={row.input.principal}
                  icon={Wallet}
                  onPress={() => router.push('/saved/' + row.id)}
                />
              ))
          ) : (
            <ActivityRow
              title={t('emptySaved')}
              detail={tr(
                'Thử một phương án vay để bắt đầu.',
                'Try a borrowing scenario to get started.',
              )}
              icon={Calculator}
              onPress={() => router.navigate('/explore?mode=sample')}
            />
          )
        }
      </Data>
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        alignItems: 'center',
        paddingHorizontal: mobile ? 0 : desktop ? 38 : gutter,
        paddingTop: mobile ? 0 : 19,
        paddingBottom: dockInset + 20,
      }}
    >
      <View style={{ width: '100%', maxWidth: 1056, gap: mobile ? 11 : 17 }}>
        {!mobile ? (
          <Heading size={desktop ? 31 : 26}>
            {name ? t('greet') + ', ' + name + '.' : t('greet') + '!'}
          </Heading>
        ) : null}
        {desktop ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 25 }}>
            <View style={{ flex: 1.25, minWidth: 0, gap: 18 }}>
              {capacity}
              {actions}
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
              {payments}
              {recent}
            </View>
          </View>
        ) : (
          <>
            {capacity}
            <View style={{ gap: 10, paddingHorizontal: mobile ? gutter : 0 }}>
              {payments}
              {actions}
              {recent}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function SectionLine({
  title,
  link,
  onPress,
}: {
  title: string;
  link: string;
  onPress: () => void;
}) {
  const { colors: c } = useDesign();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 9,
      }}
    >
      <Heading size={18} style={{ flexShrink: 1 }}>
        {title}
      </Heading>
      <Action
        label={link}
        onPress={onPress}
        style={{ flexDirection: 'row', gap: 3, alignItems: 'center', flexShrink: 1 }}
      >
        <Text small bold style={{ textAlign: 'right', color: c.primary }}>
          {link}
        </Text>
        <ArrowRight size={13} color={c.primary} />
      </Action>
    </View>
  );
}

function NextPayment({ payment }: { payment: DueRepayment }) {
  const { colors: c, money, locale, t } = useDesign();
  const [, month, day] = payment.date.slice(0, 10).split('-');
  const dueDate = new Date(payment.date.slice(0, 10) + 'T12:00:00Z');
  return (
    <ActivityRow
      title={payment.title}
      accessibleTitle={t('upcoming') + ', ' + payment.title + ', ' + date(payment.date, locale)}
      detail={locale === 'vi-VN' ? 'Khoản vay đang theo dõi' : 'Tracked loan'}
      amount={payment.payment}
      icon={CalendarDays}
      badge={
        <View accessible={false} style={{ alignItems: 'center' }}>
          <Text bold style={{ color: c.primary, fontSize: 21, lineHeight: 23 }}>
            {Number(day)}
          </Text>
          <Text bold small style={{ color: c.primary, fontSize: 9, lineHeight: 12 }}>
            {locale === 'vi-VN'
              ? 'THG ' + Number(month)
              : new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(
                  dueDate,
                )}
          </Text>
        </View>
      }
      onPress={() => router.navigate('/repayments')}
      amountLabel={money(payment.payment)}
    />
  );
}

function ActivityRow({
  title,
  accessibleTitle,
  detail,
  amount,
  amountLabel,
  icon: Icon,
  badge,
  onPress,
}: {
  title: string;
  accessibleTitle?: string;
  detail: string;
  amount?: number;
  amountLabel?: string;
  icon: typeof Wallet | typeof CalendarDays | typeof Calculator;
  badge?: React.ReactNode;
  onPress: () => void;
}) {
  const { colors: c, money } = useDesign();
  const value = amountLabel ?? (amount === undefined ? undefined : money(amount));
  return (
    <Action
      label={value ? (accessibleTitle ?? title) + ', ' + value : (accessibleTitle ?? title)}
      onPress={onPress}
      style={{
        minHeight: 57,
        paddingVertical: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <View
        style={{
          width: 41,
          minHeight: 40,
          paddingVertical: 3,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.secondary,
        }}
      >
        {badge ?? <Icon size={18} color={c.primary} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text bold small>
          {title}
        </Text>
        <Text small muted>
          {detail}
        </Text>
      </View>
      {value ? (
        <Text
          small
          bold
          style={{ maxWidth: '40%', textAlign: 'right', fontVariant: ['tabular-nums'] }}
        >
          {value}
        </Text>
      ) : (
        <ArrowRight size={15} color={c.muted} />
      )}
    </Action>
  );
}
