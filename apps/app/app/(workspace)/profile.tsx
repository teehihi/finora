import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { LockKeyhole, LogOut } from 'lucide-react-native';
import {
  Text,
  Heading,
  CurrencyInput,
  Button,
  Choices,
  ErrorState,
  Toast,
  Dialog,
  useDesign,
} from '@finora/ui';
import { profileSchema, type Profile, type Preferences } from '@finora/contracts';
import { Page, Data } from '../../src/components/layout';
import { AccountIdentity } from '../../src/components/AccountIdentity';
import { api, auth } from '../../src/services/client';
import { queryClient, useAccount, usePrefs } from '../../src/providers/AppProviders';

const financeFields = [
  { name: 'income', hint: 'profileHintIncome' },
  { name: 'expenses', hint: 'profileHintExpenses' },
  { name: 'debt', hint: 'profileHintDebt' },
] as const;

function FinancialForm({ profile }: { profile: Profile | null }) {
  const { t, colors: c } = useDesign();
  const mutation = useMutation({
    mutationFn: api.profile,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['account'] }),
  });
  const form = useForm({
    defaultValues: {
      income: profile ? String(profile.income) : '',
      expenses: profile ? String(profile.expenses) : '',
      debt: profile ? String(profile.debt) : '',
    },
  });
  const submit = form.handleSubmit((raw) => {
    const parsed = profileSchema.safeParse(
      Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [k, /^\d+$/.test(v.trim()) ? Number(v) : NaN]),
      ),
    );
    if (parsed.success) {
      mutation.mutate(parsed.data);
    } else {
      for (const issue of parsed.error.issues) {
        const field = financeFields.find(({ name }) => name === issue.path[0]);
        if (field) form.setError(field.name, { type: 'validate', message: t('invalid') });
      }
    }
  });
  return (
    <View style={{ gap: 18 }}>
      {financeFields.map(({ name, hint }) => (
        <Controller
          key={name}
          name={name}
          control={form.control}
          render={({ field, fieldState }) => (
            <CurrencyInput
              label={t(name)}
              hint={t(hint)}
              error={fieldState.error?.message}
              value={field.value}
              editable={!mutation.isPending}
              onBlur={field.onBlur}
              onChangeText={(value) => {
                mutation.reset();
                form.clearErrors(name);
                field.onChange(value);
              }}
              placeholder="0 ₫"
              style={{ fontVariant: ['tabular-nums'] }}
            />
          )}
        />
      ))}
      {mutation.isError ? (
        <Text role="alert" style={{ color: c.error }}>
          {t('error')}
        </Text>
      ) : null}
      {mutation.isSuccess ? <Toast>{t('updated')}</Toast> : null}
      <View style={{ alignSelf: 'flex-start' }}>
        <Button label={t('update')} onPress={submit} loading={mutation.isPending} />
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const a = useAccount();
  const session = auth.useSession();
  const { t, colors: c, locale } = useDesign();
  const { width } = useWindowDimensions();
  const desktop = width >= 1024;
  const { appearance, set } = usePrefs();
  const [signError, error] = useState(false);
  const [signingOut, signBusy] = useState(false);
  const [confirmClear, confirm] = useState(false);
  const clear = useMutation({
    mutationFn: api.clearHistory,
    onSuccess: async () => {
      confirm(false);
      await queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });
  const pref = useMutation({
    mutationFn: api.preferences,
    onSuccess: (p) => {
      set(p);
      void queryClient.invalidateQueries({ queryKey: ['account'] });
    },
  });
  const update = (p: Preferences) => {
    if (!pref.isPending) pref.mutate(p);
  };
  async function signOut() {
    if (signingOut) return;
    signBusy(true);
    error(false);
    try {
      const r = await auth.signOut();
      if (r.error) throw Error();
      queryClient.clear();
      set({ locale: 'vi-VN', appearance: 'light' });
      router.replace('/');
    } catch {
      error(true);
    } finally {
      signBusy(false);
    }
  }
  const name = session.data?.user.name?.trim() || t('accountMember');
  const initial = (name[0] || 'F').toLocaleUpperCase(locale);
  return (
    <Page title={t('profileTitle')} description={t('settingsIntro')}>
      <View style={{ flexDirection: desktop ? 'row' : 'column', gap: desktop ? 34 : 28 }}>
        <View style={{ flex: 1.2, minWidth: 0, gap: 16 }}>
          <View style={{ gap: 4, borderBottomWidth: 1, borderColor: c.border, paddingBottom: 12 }}>
            <Heading size={27}>{t('finance')}</Heading>
            <Text small muted>
              {t('financeHint')}
            </Text>
          </View>
          <Data q={a}>{(data) => <FinancialForm profile={data.profile} />}</Data>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 19 }}>
          <View style={{ gap: 12, backgroundColor: c.elevated, padding: 16, borderRadius: 14 }}>
            <Heading size={23}>{t('account')}</Heading>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={{
                  borderRadius: 24,
                  width: 44,
                  height: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: c.secondary,
                }}
              >
                <Text bold style={{ color: c.primary }}>
                  {initial}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text bold>{name}</Text>
              </View>
            </View>
          </View>
          <AccountIdentity />
          <View style={{ gap: 10 }}>
            <Heading size={23}>{t('settingsPreferences')}</Heading>
            <Text bold small>
              {t('language')}
            </Text>
            <Choices
              value={locale}
              onChange={(v) => update({ locale: v, appearance })}
              options={[
                { value: 'vi-VN', label: 'Tiếng Việt' },
                { value: 'en-US', label: 'English' },
              ]}
            />
            <Text bold small>
              {t('appearance')}
            </Text>
            <Choices
              value={appearance}
              onChange={(v) => update({ locale, appearance: v })}
              options={(['light', 'dark', 'system'] as const).map((v) => ({
                value: v,
                label: t(v),
              }))}
            />
            {pref.isError ? (
              <ErrorState retry={() => pref.variables && pref.mutate(pref.variables)} />
            ) : null}
          </View>
          <View style={{ gap: 10, borderTopWidth: 1, borderColor: c.border, paddingTop: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <LockKeyhole size={16} color={c.primary} />
              <Heading size={23}>{t('privacy')}</Heading>
            </View>
            <Text muted small>
              {t('privacyText')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button variant="outline" label={t('clearHistory')} onPress={() => confirm(true)} />
              <Button
                variant="text"
                label={t('out')}
                icon={<LogOut size={15} color={c.primary} />}
                onPress={signOut}
                loading={signingOut}
              />
            </View>
            {clear.isSuccess ? <Toast>{t('historyCleared')}</Toast> : null}
            {signError ? (
              <Text role="alert" style={{ color: c.error }}>
                {t('error')}
              </Text>
            ) : null}
            <Dialog visible={confirmClear} title={t('clearHistory')} onClose={() => confirm(false)}>
              <Text>{t('confirmClear')}</Text>
              {clear.isError ? (
                <Text role="alert" style={{ color: c.error }}>
                  {t('error')}
                </Text>
              ) : null}
              <Button
                label={t('clearHistory')}
                onPress={() => clear.mutate()}
                loading={clear.isPending}
              />
              <Button variant="outline" label={t('cancel')} onPress={() => confirm(false)} />
            </Dialog>
          </View>
        </View>
      </View>
    </Page>
  );
}
