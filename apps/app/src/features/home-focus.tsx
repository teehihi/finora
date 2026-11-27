import { View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { tokens } from '@finora/design-tokens';
import type { RepaymentLedger } from '@finora/contracts';
import { date, homeCopy } from '@finora/i18n';
import { Action, Heading, Text, useDesign } from '@finora/ui';
import { firstUpcomingPayment } from './home-model';

/** A real, owner-scoped ledger is required: an unresolved ledger is never an empty wallet. */
export function HomeFocus({ ledger }: { ledger: RepaymentLedger }) {
  const { t, locale, colors: c, money } = useDesign();
  const { width, fontScale } = useWindowDimensions();
  const vi = locale === 'vi-VN';
  const pay = ledger.overdue[0] ?? firstUpcomingPayment(ledger);
  const late = pay && pay.date < ledger.today;
  const tracked = ledger.loans.length > 0;
  const label = pay
    ? late
      ? homeCopy(locale).overdue
      : t('repaymentsNextFocus')
    : vi
      ? 'Sổ trả nợ'
      : 'Repayment ledger';
  const title = pay
    ? money(pay.payment)
    : tracked
      ? t('repaymentsDone')
      : vi
        ? 'Chưa có lịch trả nợ'
        : 'No repayment schedule yet';
  const body = pay
    ? pay.title
    : tracked
      ? t('repaymentsNoAction')
      : vi
        ? 'Chỉ khoản vay bạn xác nhận theo dõi mới xuất hiện ở đây.'
        : 'Only loans you confirm for tracking appear here.';
  const action = pay
    ? vi
      ? 'Xem kỳ trả'
      : 'View payment'
    : vi
      ? 'Mở sổ trả nợ'
      : 'Open repayment ledger';
  // Put year on the date as well, not just the month/day: schedules may cross years.
  const dateLabel = pay && date(pay.date, locale);
  const large = width >= tokens.breakpoints.desktop;
  return (
    <View
      testID="home-ledger-focus"
      style={{
        borderRadius: tokens.signature.radius,
        paddingHorizontal: large ? 26 : 20,
        paddingTop: large ? 24 : 18,
        paddingBottom: large ? 24 : 17,
        backgroundColor: c.forest,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 7,
          marginBottom: 7,
        }}
      >
        <View
          accessible={false}
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: late ? c.chartInterest : c.signatureLime,
          }}
        />
        <Text small bold style={{ color: c.onForestMuted }}>
          {label}
        </Text>
      </View>
      <Heading
        size={pay ? (title.length > 17 || fontScale > 1.3 ? 30 : large ? 44 : 38) : large ? 31 : 27}
        style={{ fontVariant: ['tabular-nums'], color: c.onForest }}
      >
        {title}
      </Heading>
      <Text small style={{ color: c.onForestMuted, marginTop: 5 }}>
        {body}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          rowGap: 7,
          columnGap: 11,
          marginTop: 14,
          borderTopWidth: pay ? 1 : 0,
          borderColor: c.forestBorder,
          paddingTop: pay ? 12 : 0,
        }}
      >
        <Action
          label={action}
          onPress={() => router.navigate('/repayments')}
          style={{
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 9,
            paddingHorizontal: 15,
            paddingVertical: 6,
            borderRadius: 26,
            backgroundColor: c.signatureLime,
            maxWidth: '100%',
          }}
        >
          <Text small bold style={{ color: c.signatureInk }}>
            {action}
          </Text>
          <ArrowRight size={16} color={c.signatureInk} />
        </Action>
        {dateLabel ? (
          <View style={{ gap: 1, alignItems: 'flex-start' }}>
            <Text small style={{ fontSize: 12, lineHeight: 16, color: c.onForestMuted }}>
              {pay?.date === ledger.today ? t('loanCenterToday') : vi ? 'Hạn trả' : 'Due date'}
            </Text>
            <Text small bold style={{ color: c.onForest, fontVariant: ['tabular-nums'] }}>
              {dateLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
