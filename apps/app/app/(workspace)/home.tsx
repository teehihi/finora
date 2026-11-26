import { Image, ScrollView, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  CalendarDays,
  ChevronRight,
  FileScan,
  Info,
  Search,
  Wallet,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { Action, Button, Heading, IconTile, Text, useDesign } from '@finora/ui';
import { date, percent } from '@finora/i18n';
import { api, auth } from '../../src/services/client';
import { useAccount } from '../../src/providers/AppProviders';
import { useRepaymentLedger } from '../../src/features/repayments';
import { Data, useWorkspaceDockInset } from '../../src/components/layout';
import fin from '../../assets/brand/fin-assistant.png';

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
  const desktop = width >= 1024;
  const name = user?.name?.trim();
  const panel = { backgroundColor: c.surface, borderRadius: 21, padding: 16, gap: 10 } as const;
  const shortcut = [
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

  const capacity = (
    <View
      style={{
        ...panel,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: c.forest,
        padding: desktop ? 23 : 18,
      }}
    >
      <View
        pointerEvents="none"
        accessible={false}
        style={{ position: 'absolute', top: -72, right: -37 }}
      >
        {[180, 142, 104].map((size) => (
          <View
            key={size}
            style={{
              position: 'absolute',
              top: (180 - size) / 2,
              right: (180 - size) / 2,
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: 1,
              borderColor: 'rgba(217,255,222,0.23)',
            }}
          />
        ))}
      </View>
      <Text bold small style={{ color: c.onForestMuted }}>
        {tr('Khả năng trả thêm mỗi tháng', 'Estimated room to repay each month')}
      </Text>
      <Data q={account}>
        {(a) => (
          <>
            {a.readiness ? (
              <>
                <Heading
                  size={desktop ? 43 : 33}
                  style={{ color: c.onForest, fontVariant: ['tabular-nums'] }}
                >
                  {money(a.readiness.monthlyBudget)}
                </Heading>
                <View style={{ gap: 5 }}>
                  <Text small style={{ color: c.onForestMuted, maxWidth: 375 }}>
                    {tr(
                      'Ước tính từ hồ sơ, theo ngưỡng trả nợ 35%. Không phải hạn mức tín dụng.',
                      'A profile-based estimate using a 35% debt planning cap. Not a credit limit.',
                    )}
                  </Text>
                  <Action
                    onPress={() => router.navigate('/profile')}
                    label={t('editProfile')}
                    style={{
                      alignSelf: 'flex-start',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 7,
                    }}
                  >
                    <Info size={15} color={c.onForestMuted} />
                    <Text small bold style={{ color: c.onForest }}>
                      {tr('Tỷ lệ trả nợ hiện tại', 'Current debt-to-income')}:{' '}
                      {percent(a.readiness.debtToIncome, locale)}
                    </Text>
                    <ChevronRight size={15} color={c.onForestMuted} />
                  </Action>
                </View>
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
                <View style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                  <Button
                    label={t(a.profile ? 'editProfile' : 'addProfile')}
                    variant="onForest"
                    onPress={() => router.navigate('/profile')}
                  />
                </View>
              </>
            )}
          </>
        )}
      </Data>
    </View>
  );

  const actions = (
    <View style={{ ...panel, flexDirection: 'row', gap: 6, padding: 12 }}>
      {shortcut.map(([label, href, Icon, bg, fg]) => (
        <IconTile
          key={label}
          label={label}
          onPress={() => router.navigate(href)}
          background={bg}
          icon={<Icon size={22} color={fg} strokeWidth={1.9} />}
        />
      ))}
    </View>
  );

  const ai = (
    <Action
      label={tr('Hỏi Fin ngay', 'Ask Fin')}
      onPress={() => router.navigate('/assistant')}
      style={{
        ...panel,
        backgroundColor: c.secondary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 13,
        gap: 8,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text small bold style={{ color: c.primary }}>
          Finora AI
        </Text>
        <Heading size={19}>{tr('Đang có kế hoạch vay?', 'Planning to borrow?')}</Heading>
        <Text small muted>
          {tr('So sánh chi phí, hiểu điều khoản.', 'Compare costs and understand terms.')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 3 }}>
          <Text bold small style={{ color: c.primary }}>
            {tr('Hỏi Fin ngay', 'Ask Fin')}
          </Text>
          <ArrowUpRight size={15} color={c.primary} />
        </View>
      </View>
      <Image
        source={fin}
        accessible={false}
        resizeMode="contain"
        style={{ width: desktop ? 100 : 75, height: desktop ? 100 : 75 }}
      />
    </Action>
  );

  const activity = (
    <View style={panel}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 9,
        }}
      >
        <Heading size={20}>{tr('Khoản vay của bạn', 'Your loans')}</Heading>
        <Action label={t('seeAll')} onPress={() => router.navigate('/loans')}>
          <Text small bold style={{ color: c.primary }}>
            {t('seeAll')}
          </Text>
        </Action>
      </View>
      <Data q={ledger}>
        {(value) => {
          const next = value.upcoming[0];
          const row = (title: string, detail: string, amount?: number) => (
            <ActivityRow
              title={title}
              detail={detail}
              amount={amount}
              icon={CalendarDays}
              onPress={() => router.navigate('/repayments')}
            />
          );
          return (
            <>
              {value.overdue.length
                ? row(
                    t('repaymentsLate'),
                    tr('Cần xem lại lịch thanh toán', 'Review your payment schedule'),
                    value.overdueTotal,
                  )
                : null}
              {next
                ? row(t('upcoming'), next.title + ' · ' + date(next.date, locale), next.payment)
                : row(t('upcoming'), value.loans.length ? t('repaymentsNoDue') : t('emptyActive'))}
            </>
          );
        }}
      </Data>
      <Data q={saved}>
        {(rows) => (
          <>
            {rows.length ? (
              rows
                .slice(0, 3)
                .map((row) => (
                  <ActivityRow
                    key={row.id}
                    title={vi ? row.product.name : row.product.nameEn}
                    detail={
                      tr('Mô phỏng đã lưu', 'Saved simulation') +
                      ' · ' +
                      date(row.createdAt, locale)
                    }
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
                icon={Wallet}
                onPress={() => router.navigate('/explore?mode=sample')}
              />
            )}
          </>
        )}
      </Data>
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        alignItems: 'center',
        paddingHorizontal: desktop ? 38 : 16,
        paddingTop: desktop ? 24 : 15,
        paddingBottom: dockInset + 25,
      }}
    >
      <View style={{ width: '100%', maxWidth: 1056, gap: 15 }}>
        <View style={{ gap: 3, paddingHorizontal: 2 }}>
          <Text small muted>
            {tr('Tài chính của bạn', 'Your finances')}
          </Text>
          <Heading size={desktop ? 31 : 26}>
            {name
              ? width < 768
                ? tr('Chào, ', 'Hello, ') + name.split(/\s+/).at(-1)
                : t('greet') + ', ' + name + '.'
              : t('greet') + '!'}
          </Heading>
        </View>
        {desktop ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 18 }}>
            <View style={{ flex: 1.35, minWidth: 0, gap: 15 }}>
              {capacity}
              {actions}
              {ai}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>{activity}</View>
          </View>
        ) : (
          <>
            {capacity}
            {actions}
            {ai}
            {activity}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function ActivityRow({
  title,
  detail,
  amount,
  icon: Icon,
  onPress,
}: {
  title: string;
  detail: string;
  amount?: number;
  icon: typeof Wallet | typeof CalendarDays;
  onPress: () => void;
}) {
  const { colors: c, money } = useDesign();
  return (
    <Action
      label={amount === undefined ? title : title + ', ' + money(amount)}
      onPress={onPress}
      style={{
        minHeight: 64,
        padding: 9,
        backgroundColor: c.background,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
      }}
    >
      <View
        style={{
          width: 35,
          height: 35,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.secondary,
        }}
      >
        <Icon size={17} color={c.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text bold small>
          {title}
        </Text>
        <Text small muted>
          {detail}
        </Text>
      </View>
      {amount !== undefined ? (
        <Text
          small
          bold
          style={{ maxWidth: '37%', textAlign: 'right', fontVariant: ['tabular-nums'] }}
        >
          {money(amount)}
        </Text>
      ) : (
        <ArrowRight size={15} color={c.muted} />
      )}
    </Action>
  );
}
