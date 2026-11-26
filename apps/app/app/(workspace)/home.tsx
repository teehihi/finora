import { ScrollView, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Compass,
  Info,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { Action, Button, Heading, Text, useDesign } from '@finora/ui';
import { date, percent } from '@finora/i18n';
import { api, auth } from '../../src/services/client';
import { useAccount } from '../../src/providers/AppProviders';
import { useRepaymentLedger } from '../../src/features/repayments';
import { Page, Data, Columns, LinkRow } from '../../src/components/layout';

export default function Home() {
  const { t, colors: c, money, locale } = useDesign();
  const { width } = useWindowDimensions();
  const session = auth.useSession();
  const user = session.data?.user;
  const account = useAccount();
  const { ledger } = useRepaymentLedger();
  const saved = useQuery({
    queryKey: ['saved', user?.id],
    queryFn: api.saved,
    enabled: !!user?.id,
  });
  const vi = locale === 'vi-VN';
  const choose = (vn: string, en: string) => (vi ? vn : en);
  const large = width >= 1024;
  if (width < 768) {
    const name = user?.name?.trim().split(/\s+/).at(-1);
    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: 118 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 6 }}>
          <Text role="header" style={{ fontSize: 27, lineHeight: 34, letterSpacing: -0.7 }}>
            {name ? choose(`Chào, ${name}`, `Hello, ${name}`) : choose('Chào bạn', 'Hello there')}
          </Text>
          <Text muted>
            {choose(
              'Mình cùng xem kế hoạch tài chính của bạn nhé.',
              "Let's look at your financial plan.",
            )}
          </Text>
        </View>

        <View style={{ marginTop: 30, gap: 8 }}>
          <Text small muted>
            {choose('Khả năng trả thêm mỗi tháng', 'Estimated room to repay each month')}
          </Text>
          <Data q={account}>
            {(a) => (
              <View style={{ gap: 8 }}>
                {a.readiness ? (
                  <Text
                    style={{
                      fontSize: 35,
                      lineHeight: 43,
                      fontVariant: ['tabular-nums'],
                      letterSpacing: -1.1,
                      color: c.primary,
                    }}
                  >
                    {money(a.readiness.monthlyBudget)}
                  </Text>
                ) : (
                  <Text
                    role="header"
                    style={{ fontSize: 22, lineHeight: 29, letterSpacing: -0.45 }}
                  >
                    {choose('Bắt đầu từ thông tin của bạn', 'Start with your financial details')}
                  </Text>
                )}
                <Text muted style={{ fontSize: 14, lineHeight: 21 }}>
                  {a.readiness
                    ? choose(
                        'Ước tính từ thu nhập, chi phí và khoản trả nợ bạn đã nhập. Dùng ngưỡng kế hoạch 35%, không phải hạn mức được duyệt.',
                        'Estimated from the income, expenses and repayments you entered. Uses a 35% planning cap; it is not an approved credit limit.',
                      )
                    : choose(
                        'Thêm thu nhập, chi phí và khoản trả nợ để xem mức tham khảo. Finora chưa có đủ thông tin để ước tính.',
                        'Add your income, expenses and repayments to see a planning estimate. There is not enough information to calculate one yet.',
                      )}
                </Text>
                {!a.readiness ? (
                  <Action
                    label={t(a.profile ? 'editProfile' : 'addProfile')}
                    onPress={() => router.navigate('/profile')}
                    style={{
                      alignSelf: 'flex-start',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 7,
                      marginTop: 2,
                    }}
                  >
                    <Text bold style={{ color: c.primary }}>
                      {t(a.profile ? 'editProfile' : 'addProfile')}
                    </Text>
                    <ArrowUpRight size={16} color={c.primary} />
                  </Action>
                ) : null}
              </View>
            )}
          </Data>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
          <Action
            label={choose('Thử mô phỏng vay', 'Try a loan simulation')}
            onPress={() => router.navigate('/explore?mode=sample')}
            style={{
              flex: 1,
              minHeight: 50,
              borderRadius: 14,
              backgroundColor: c.primary,
              paddingHorizontal: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Compass size={18} color={c.onPrimary} />
            <Text small bold style={{ color: c.onPrimary }}>
              {choose('Mô phỏng', 'Simulate')}
            </Text>
          </Action>
          <Action
            label={t('ai')}
            onPress={() => router.navigate('/assistant')}
            style={{
              flex: 1,
              minHeight: 50,
              borderRadius: 14,
              backgroundColor: c.secondary,
              paddingHorizontal: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Sparkles size={18} color={c.primary} />
            <Text small bold style={{ color: c.primary }}>
              Finora AI
            </Text>
          </Action>
        </View>

        <View style={{ marginTop: 30 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <Text role="header" style={{ fontSize: 18, lineHeight: 25, letterSpacing: -0.3 }}>
              {choose('Mô phỏng gần đây', 'Recent simulations')}
            </Text>
            <Action label={t('seeAll')} onPress={() => router.navigate('/loans')}>
              <Text small bold style={{ color: c.primary }}>
                {t('seeAll')}
              </Text>
            </Action>
          </View>
          <Data q={saved}>
            {(rows) =>
              rows.length ? (
                <View>
                  {rows.slice(0, 3).map((row) => (
                    <Action
                      key={row.id}
                      label={`${vi ? row.product.name : row.product.nameEn}, ${money(row.input.principal)}`}
                      onPress={() => router.push('/saved/' + row.id)}
                      style={{
                        minHeight: 66,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        borderTopWidth: 1,
                        borderColor: c.border,
                      }}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 12,
                          backgroundColor: c.secondary,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <BookOpen size={17} color={c.primary} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                        <Text bold style={{ flexShrink: 1 }}>
                          {vi ? row.product.name : row.product.nameEn}
                        </Text>
                        <Text small muted>
                          {money(row.input.principal)} · {date(row.createdAt, locale)}
                        </Text>
                      </View>
                      <ArrowRight size={17} color={c.muted} />
                    </Action>
                  ))}
                </View>
              ) : (
                <View
                  style={{
                    borderTopWidth: 1,
                    borderColor: c.border,
                    paddingTop: 14,
                    paddingBottom: 8,
                    gap: 5,
                  }}
                >
                  <Text bold>{t('emptySaved')}</Text>
                  <Text small muted>
                    {t('emptySavedText')}
                  </Text>
                  <Action
                    label={t('learn')}
                    onPress={() => router.navigate('/explore?mode=sample')}
                    style={{
                      alignSelf: 'flex-start',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 3,
                    }}
                  >
                    <Text small bold style={{ color: c.primary }}>
                      {t('learn')}
                    </Text>
                    <ArrowUpRight size={15} color={c.primary} />
                  </Action>
                </View>
              )
            }
          </Data>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 9,
            marginTop: 22,
            paddingTop: 15,
            borderTopWidth: 1,
            borderColor: c.border,
          }}
        >
          <Info size={17} color={c.muted} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, gap: 5 }}>
            <Text small bold>
              {t('upcoming')}
            </Text>
            <Data q={ledger}>
              {(value) => {
                const next = value.upcoming[0];
                return (
                  <View style={{ gap: 4 }}>
                    {next ? (
                      <Action
                        label={`${next.title}, ${date(next.date, locale)}, ${money(next.payment)}`}
                        onPress={() => router.push('/repayments')}
                        style={{
                          alignSelf: 'flex-start',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <CalendarDays size={16} color={c.primary} />
                        <Text small bold>
                          {next.title}
                        </Text>
                        <Text small muted>
                          {date(next.date, locale)} · {money(next.payment)}
                        </Text>
                        <ArrowRight size={15} color={c.muted} />
                      </Action>
                    ) : (
                      <Text small muted>
                        {value.loans.length ? t('repaymentsNoDue') : t('repaymentsUntrackedNote')}
                      </Text>
                    )}
                    {value.overdue.length ? (
                      <Text small style={{ color: c.warning }}>
                        {t('repaymentsLate')}: {money(value.overdueTotal)}
                      </Text>
                    ) : null}
                  </View>
                );
              }}
            </Data>
          </View>
        </View>
      </ScrollView>
    );
  }
  return (
    <Page
      title={user?.name?.trim() ? t('greet') + ', ' + user.name.trim() + '.' : t('greet') + '!'}
      description={choose(
        'Hiểu mình trả được bao nhiêu, trước khi chọn vay.',
        'Know what you can repay before deciding to borrow.',
      )}
    >
      <Columns style={{ gap: large ? 32 : 24 }}>
        <View style={{ flex: large ? 1.7 : undefined, minWidth: 0 }}>
          <Data q={account}>
            {(a) => (
              <View
                style={{
                  backgroundColor: c.forest,
                  borderRadius: 22,
                  padding: large ? 34 : 20,
                  gap: large ? 17 : 12,
                }}
              >
                <View style={{ gap: 6 }}>
                  <Text small bold style={{ color: c.onForestMuted, letterSpacing: 1.2 }}>
                    {choose('KHẢ NĂNG TRẢ THÊM HẰNG THÁNG', 'ESTIMATED MONTHLY ROOM TO REPAY')}
                  </Text>
                  {a.readiness ? (
                    <Text
                      style={{
                        color: c.onForest,
                        fontSize: large ? 52 : 35,
                        lineHeight: large ? 61 : 45,
                        fontVariant: ['tabular-nums'],
                        letterSpacing: -1,
                      }}
                    >
                      {money(a.readiness.monthlyBudget)}
                    </Text>
                  ) : (
                    <Heading size={large ? 37 : 30} style={{ color: c.onForest }}>
                      {choose('Bắt đầu từ ngân sách của bạn.', 'Start with your budget.')}
                    </Heading>
                  )}
                  <Text style={{ color: c.onForestMuted, lineHeight: 24, maxWidth: 520 }}>
                    {a.readiness
                      ? choose(
                          'Ước tính từ thu nhập, chi phí và tiền trả nợ bạn đã nhập.',
                          'Estimated from the income, expenses and repayments you entered.',
                        )
                      : t('readinessHint')}
                  </Text>
                </View>
                {a.readiness ? (
                  <View
                    style={{
                      paddingTop: large ? 14 : 10,
                      borderTopWidth: 1,
                      borderColor: 'rgba(220,230,215,0.30)',
                      gap: 4,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: 10,
                      }}
                    >
                      <Text small style={{ color: c.onForestMuted }}>
                        {t('ratio')}
                      </Text>
                      <Text small bold style={{ color: c.onForest, fontVariant: ['tabular-nums'] }}>
                        {percent(a.readiness.debtToIncome, locale)}
                      </Text>
                    </View>
                    <Text small style={{ color: c.onForestMuted }}>
                      {choose(
                        'Dùng ngưỡng trả nợ 35% để lập kế hoạch. Đây không phải hạn mức được duyệt.',
                        'Uses a 35% debt-to-income planning cap, not an approved credit limit.',
                      )}
                    </Text>
                  </View>
                ) : null}
                <View style={{ alignSelf: 'flex-start' }}>
                  <Button
                    variant="onForest"
                    label={t(a.profile ? 'editProfile' : 'addProfile')}
                    onPress={() => router.navigate('/profile')}
                    icon={<ArrowUpRight size={16} color={c.forest} />}
                  />
                </View>
              </View>
            )}
          </Data>
        </View>
        <View
          style={{ flex: large ? 1 : undefined, minWidth: 0, paddingTop: large ? 8 : 0, gap: 6 }}
        >
          <Text small bold muted style={{ letterSpacing: 1.2 }}>
            {choose('ĐI TIẾP TỪ ĐÂY', 'CONTINUE FROM HERE')}
          </Text>
          <Heading size={27}>{choose('Hai cách để bắt đầu', 'Two ways to get started')}</Heading>
          <View style={{ borderBottomWidth: 1, borderColor: c.border }}>
            <LinkRow
              title={t('learn')}
              body={choose(
                'Thử lãi suất và kỳ hạn trước khi quyết định.',
                'Try a rate and term before making a decision.',
              )}
              icon={<Compass size={20} color={c.primary} />}
              onPress={() => router.navigate('/explore?mode=sample')}
            />
          </View>
          <LinkRow
            title={t('ai')}
            body={choose(
              'Hỏi kỹ hơn về gốc, lãi và phí.',
              'Get a clearer answer about principal, interest and fees.',
            )}
            icon={<MessageCircle size={20} color={c.primary} />}
            onPress={() => router.navigate('/assistant')}
          />
        </View>
      </Columns>
      <View style={{ marginTop: large ? 16 : 4, gap: 10 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <Heading size={28}>{t('saved')}</Heading>
          <Action label={t('seeAll')} onPress={() => router.navigate('/loans')}>
            <Text small bold style={{ color: c.primary }}>
              {t('seeAll')}
            </Text>
          </Action>
        </View>
        <Data q={saved}>
          {(rows) => (
            <View style={{ borderTopWidth: 1, borderColor: c.border }}>
              {rows.length ? (
                rows.slice(0, 3).map((r) => (
                  <View key={r.id} style={{ borderBottomWidth: 1, borderColor: c.border }}>
                    <LinkRow
                      title={vi ? r.product.name : r.product.nameEn}
                      body={money(r.input.principal) + '  ·  ' + date(r.createdAt, locale)}
                      icon={<BookOpen size={18} color={c.primary} />}
                      onPress={() => router.push('/saved/' + r.id)}
                    />
                  </View>
                ))
              ) : (
                <LinkRow
                  title={t('emptySaved')}
                  body={t('emptySavedText')}
                  icon={<BookOpen size={18} color={c.primary} />}
                  onPress={() => router.navigate('/explore?mode=sample')}
                />
              )}
            </View>
          )}
        </Data>
      </View>
      <View
        style={{
          borderTopWidth: 1,
          borderColor: c.border,
          paddingTop: 16,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 11,
        }}
      >
        <ShieldCheck size={19} color={c.primary} />
        <View style={{ gap: 4, flex: 1 }}>
          <Text bold>{t('upcoming')}</Text>
          <Text muted small>
            {t('emptyActive')}
          </Text>
        </View>
      </View>
    </Page>
  );
}
