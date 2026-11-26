import { View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { ArrowUpRight, BookOpen, Compass, MessageCircle, ShieldCheck } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { Action, Button, Heading, Text, useDesign } from '@finora/ui';
import { date, percent } from '@finora/i18n';
import { api, auth } from '../../src/services/client';
import { useAccount } from '../../src/providers/AppProviders';
import { Page, Data, Columns, LinkRow } from '../../src/components/layout';

export default function Home() {
  const { t, colors: c, money, locale } = useDesign();
  const { width } = useWindowDimensions();
  const session = auth.useSession();
  const user = session.data?.user;
  const account = useAccount();
  const saved = useQuery({
    queryKey: ['saved', user?.id],
    queryFn: api.saved,
    enabled: !!user?.id,
  });
  const vi = locale === 'vi-VN';
  const choose = (vn: string, en: string) => (vi ? vn : en);
  const large = width >= 1024;
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
              onPress={() => router.navigate('/explore')}
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
                  onPress={() => router.navigate('/explore')}
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
