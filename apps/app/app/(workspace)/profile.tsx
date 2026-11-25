import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import {
  Text,
  Heading,
  Card,
  CurrencyInput,
  Button,
  Choices,
  ErrorState,
  Toast,
  Dialog,
  useDesign,
} from '@finora/ui';
import { profileSchema, type Profile, type Preferences } from '@finora/contracts';
import { Page, Data, Columns } from '../../src/components/layout';
import { api, auth } from '../../src/services/client';
import { queryClient, useAccount, usePrefs } from '../../src/providers/AppProviders';
function FinancialForm({ profile }: { profile: Profile | null }) {
  const { t } = useDesign();
  const [invalid, setInvalid] = useState(false);
  const mutation = useMutation({
    mutationFn: api.profile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account'] }),
  });
  const form = useForm({
    defaultValues: {
      income: profile ? String(profile.income) : '',
      expenses: profile ? String(profile.expenses) : '',
      debt: profile ? String(profile.debt) : '',
    },
  });
  const submit = form.handleSubmit((raw) => {
    const p = profileSchema.safeParse(
      Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [k, /^\d+$/.test(v) ? Number(v) : NaN]),
      ),
    );
    setInvalid(!p.success);
    if (p.success) mutation.mutate(p.data);
  });
  return (
    <Card>
      <Heading size={24}>{t('finance')}</Heading>
      <Text muted>{t('financeHint')}</Text>
      {(['income', 'expenses', 'debt'] as const).map((k) => (
        <Controller
          key={k}
          name={k}
          control={form.control}
          render={({ field }) => (
            <CurrencyInput
              label={t(k)}
              value={field.value}
              onChangeText={(v) => {
                mutation.reset();
                setInvalid(false);
                field.onChange(v);
              }}
              placeholder="VND"
            />
          )}
        />
      ))}
      {invalid ? <Text role="alert">{t('invalid')}</Text> : null}
      {mutation.isError ? <Text role="alert">{t('error')}</Text> : null}
      {mutation.isSuccess ? <Toast>{t('updated')}</Toast> : null}
      <Button label={t('update')} onPress={submit} loading={mutation.isPending} />
    </Card>
  );
}
export default function ProfileScreen() {
  const a = useAccount();
  const session = auth.useSession();
  const { t, locale } = useDesign();
  const { appearance, set } = usePrefs();
  const [signError, error] = useState(false);
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
    try {
      const r = await auth.signOut();
      if (r.error) throw Error();
      queryClient.clear();
      set({ locale: 'vi-VN', appearance: 'light' });
      router.replace('/');
    } catch {
      error(true);
    }
  }
  return (
    <Page title={t('profileTitle')}>
      <Columns>
        <View style={{ flex: 1.1 }}>
          <Data q={a}>{(data) => <FinancialForm profile={data.profile} />}</Data>
        </View>
        <View style={{ flex: 1, gap: 14 }}>
          <Card>
            <Heading size={24}>{t('account')}</Heading>
            <Text bold>{session.data?.user.name}</Text>
            <Text muted>{session.data?.user.email}</Text>
          </Card>
          <Card>
            <Text bold>{t('language')}</Text>
            <Choices
              value={locale}
              onChange={(v) => update({ locale: v, appearance })}
              options={[
                { value: 'vi-VN', label: 'Tiếng Việt' },
                { value: 'en-US', label: 'English' },
              ]}
            />
            <Text bold>{t('appearance')}</Text>
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
          </Card>
          <Card>
            <Heading size={22}>{t('privacy')}</Heading>
            <Text muted small>
              {t('privacyText')}
            </Text>
            <Button variant="outline" label={t('clearHistory')} onPress={() => confirm(true)} />
            {clear.isSuccess ? <Toast>{t('historyCleared')}</Toast> : null}
            <Dialog visible={confirmClear} title={t('clearHistory')} onClose={() => confirm(false)}>
              <Text>{t('confirmClear')}</Text>
              {clear.isError ? <Text role="alert">{t('error')}</Text> : null}
              <Button
                label={t('clearHistory')}
                onPress={() => clear.mutate()}
                loading={clear.isPending}
              />
              <Button variant="outline" label={t('cancel')} onPress={() => confirm(false)} />
            </Dialog>
            <Button variant="outline" label={t('out')} onPress={signOut} />
            {signError ? <Text role="alert">{t('error')}</Text> : null}
          </Card>
        </View>
      </Columns>
    </Page>
  );
}
