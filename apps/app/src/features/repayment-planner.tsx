import { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Action, Button, Heading, Text, useDesign } from '@finora/ui';
import { date } from '@finora/i18n';
import { repaymentPlan } from '@finora/financial-engine';
import fin from '../../assets/brand/fin-assistant.png';

const fields = [
  ['reserved', 'loanCenterPlanReserved'],
  ['income', 'loanCenterPlanIncome'],
  ['expenses', 'loanCenterPlanCosts'],
] as const;

export function RepaymentPlanner({
  due,
  dueDate,
  onClose,
}: {
  due: number;
  dueDate: string;
  onClose: () => void;
}) {
  const { t, colors: c, money, locale } = useDesign();
  const { bottom, top } = useSafeAreaInsets();
  const [amounts, setAmounts] = useState({ reserved: '', income: '', expenses: '' });
  const [submitted, setSubmitted] = useState(false);
  const [editing, setEditing] = useState(true);
  const [lowerIncome, setLowerIncome] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', dismiss, true);
    return () => document.removeEventListener('keydown', dismiss, true);
  }, [onClose]);
  const invalid = fields.some(([field]) => !/^\d{1,12}$/.test(amounts[field]));
  const result =
    !editing && !invalid
      ? repaymentPlan({
          due,
          reserved: Number(amounts.reserved),
          income: Number(amounts.income),
          expenses: Number(amounts.expenses),
          lowerIncome,
        })
      : null;
  const title = t('loanCenterPlanTitle');
  const dueLabel = t('loanCenterPlanPayment')
    .replace('{money}', money(due))
    .replace('{date}', date(dueDate, locale));
  const short = result !== null && result.difference < 0;
  const tone = short ? c.actionAmber : c.primary;
  return (
    <Modal
      visible
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingTop: top + 10 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('close')}
          onPress={onClose}
          accessible={false}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: '#0A281D66',
          }}
        />
        <View
          role="dialog"
          accessibilityLabel={title}
          accessibilityViewIsModal
          style={{
            width: '100%',
            maxWidth: 520,
            maxHeight: '100%',
            backgroundColor: c.surface,
            borderTopLeftRadius: 25,
            borderTopRightRadius: 25,
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 19,
              paddingTop: 11,
              paddingBottom: bottom + 20,
              gap: 13,
            }}
          >
            <View
              accessible={false}
              style={{
                width: 34,
                height: 4,
                borderRadius: 5,
                alignSelf: 'center',
                backgroundColor: c.border,
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <Image source={fin} style={{ width: 43, height: 43 }} resizeMode="contain" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text small bold style={{ color: c.primary }}>
                  FIN
                </Text>
                <Heading size={21}>{title}</Heading>
              </View>
              <Action
                label={t('close')}
                onPress={onClose}
                style={{ minWidth: 44, alignItems: 'center' }}
              >
                <X size={19} color={c.muted} />
              </Action>
            </View>
            {editing ? (
              <>
                <Text small bold>
                  {dueLabel}
                </Text>
                <Text small muted>
                  {t('loanCenterPlanHelp')}
                </Text>
                {fields.map(([key, label]) => (
                  <View key={key} style={{ gap: 5 }}>
                    <Text small bold>
                      {t(label)}
                    </Text>
                    <TextInput
                      accessibilityLabel={t(label)}
                      inputMode="numeric"
                      keyboardType="number-pad"
                      onChangeText={(raw) =>
                        setAmounts((previous) => ({ ...previous, [key]: raw }))
                      }
                      value={amounts[key]}
                      placeholder="0"
                      placeholderTextColor={c.muted}
                      style={{
                        minHeight: 45,
                        borderRadius: 10,
                        paddingHorizontal: 11,
                        fontSize: 16,
                        color: c.foreground,
                        borderWidth: 1,
                        borderColor: c.border,
                        backgroundColor: c.background,
                      }}
                    />
                  </View>
                ))}
                {submitted && invalid ? (
                  <View accessibilityRole="alert">
                    <Text small style={{ color: c.actionAmber }}>
                      {t('loanCenterPlanInvalid')}
                    </Text>
                  </View>
                ) : null}
                <Button
                  label={t('loanCenterPlanCalculate')}
                  onPress={() => {
                    setSubmitted(true);
                    if (!invalid) setEditing(false);
                  }}
                />
              </>
            ) : result ? (
              <>
                <View
                  accessibilityLiveRegion="polite"
                  style={{
                    backgroundColor: short ? c.actionAmberSurface : c.secondary,
                    borderRadius: 13,
                    padding: 13,
                    gap: 3,
                  }}
                >
                  <Text small bold style={{ color: tone }}>
                    {t(
                      short
                        ? 'loanCenterPlanShort'
                        : result.difference > 0
                          ? 'loanCenterPlanSurplus'
                          : 'loanCenterPlanExact',
                    )}
                  </Text>
                  <Heading size={34} style={{ color: tone, fontVariant: ['tabular-nums'] }}>
                    {money(Math.abs(result.difference))}
                  </Heading>
                  <Text small muted>
                    {dueLabel}
                  </Text>
                </View>
                {(
                  [
                    ['loanCenterPlanReserved', Number(amounts.reserved)],
                    ['loanCenterPlanNet', result.net],
                    ['loanCenterPlanAvailable', result.available],
                  ] as const
                ).map(([label, amount], index) => (
                  <View
                    key={label}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      gap: 8,
                      alignItems: 'baseline',
                      paddingBottom: 8,
                      borderBottomWidth: index < 2 ? 1 : 0,
                      borderColor: c.border,
                    }}
                  >
                    <Text small bold={index === 2} style={{ flexShrink: 1 }}>
                      {t(label)}
                    </Text>
                    <Text small bold style={{ fontVariant: ['tabular-nums'] }}>
                      {money(amount)}
                    </Text>
                  </View>
                ))}
                <Text small bold>
                  {t('loanCenterPlanScenario')}
                </Text>
                <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 7 }}>
                  {([false, true] as const).map((stress) => {
                    const label = t(stress ? 'loanCenterPlanStress' : 'loanCenterPlanBase');
                    return (
                      <Action
                        key={String(stress)}
                        role="radio"
                        selected={lowerIncome === stress}
                        label={label}
                        onPress={() => setLowerIncome(stress)}
                        style={{
                          flex: 1,
                          alignItems: 'center',
                          paddingHorizontal: 5,
                          paddingVertical: 5,
                          borderWidth: 1,
                          borderColor: lowerIncome === stress ? c.primary : c.border,
                          backgroundColor: lowerIncome === stress ? c.secondary : c.surface,
                        }}
                      >
                        <Text small bold={lowerIncome === stress} style={{ textAlign: 'center' }}>
                          {label}
                        </Text>
                      </Action>
                    );
                  })}
                </View>
                <Text small muted>
                  {t('loanCenterPlanNote')}
                </Text>
                <Button
                  label={t('loanCenterPlanEdit')}
                  variant="outline"
                  onPress={() => setEditing(true)}
                />
              </>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
