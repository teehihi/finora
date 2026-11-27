import { View, useWindowDimensions } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { Button, Heading, Text, useDesign } from '@finora/ui';
import { date } from '@finora/i18n';
import type { DueRepayment } from '@finora/contracts';

export function PaymentHighlight({
  payment,
  today,
  label,
  open,
  children,
}: {
  payment: Pick<DueRepayment, 'payment' | 'date' | 'title'>;
  today: string;
  label: string;
  open?: { label: string; onPress: () => void };
  children?: React.ReactNode;
}) {
  const { colors: c, t, locale, money } = useDesign();
  const { width, fontScale } = useWindowDimensions();
  const late = payment.date < today;
  const stamp = late
    ? t('loanCenterPast')
    : payment.date === today
      ? t('loanCenterToday')
      : t('loanCenterDue').replace('{date}', date(payment.date, locale));
  const amount = money(payment.payment);
  return (
    <View
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 19,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.secondary,
        padding: width >= 1024 ? 22 : 16,
        gap: 5,
        minHeight: open ? 169 : undefined,
      }}
    >
      {[92, 118, 144].map((r) => (
        <View
          key={r}
          accessible={false}
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: 25 - r,
            top: 35 - r,
            borderRadius: r,
            width: r * 2,
            height: r * 2,
            borderWidth: 1,
            borderColor: c.primary,
            opacity: 0.14,
          }}
        />
      ))}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Text small bold style={{ color: c.primary }}>
          {label}
        </Text>
        <Text
          small
          bold
          style={{
            color: late ? c.actionAmber : c.primary,
            backgroundColor: late ? c.actionAmberSurface : c.surface,
            borderRadius: 7,
            paddingHorizontal: 7,
            paddingVertical: 2,
          }}
        >
          {stamp}
        </Text>
      </View>
      <Heading
        size={amount.length > 17 || fontScale > 1.3 ? 26 : width >= 1024 ? 39 : 34}
        style={{ color: c.foreground, fontVariant: ['tabular-nums'] }}
      >
        {amount}
      </Heading>
      <Text small muted>
        {payment.title}
        {late ? ' · ' + date(payment.date, locale) : ''}
      </Text>
      {open ? (
        <View style={{ marginTop: 8 }}>
          <Button
            label={open.label}
            onPress={open.onPress}
            icon={<ArrowRight size={16} color={c.onPrimary} />}
          />
        </View>
      ) : null}
      {children}
    </View>
  );
}
