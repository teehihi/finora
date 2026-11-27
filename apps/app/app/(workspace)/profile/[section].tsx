import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { Banknote, Globe2, LockKeyhole, Moon, ShieldCheck } from 'lucide-react-native';
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
import { getAccessStrings } from '@finora/i18n';
import { backTo, Data, Page } from '../../../src/components/layout';
import { SignatureIcon } from '../../../src/components/signature';
import { AccountIdentity } from '../../../src/components/AccountIdentity';
import {
  accountSection,
  ProfileAvatar,
  type AccountSection,
} from '../../../src/features/profile-account-hub';
import { AvatarEditor } from '../../../src/features/account-avatar/AvatarEditor';
import { ProfileInsights } from '../../../src/features/profile-insights';
import { clearIntelligenceHistory } from '../../../src/features/intelligence/transport';
import { api, auth } from '../../../src/services/client';
import { queryClient, useAccount, usePrefs } from '../../../src/providers/AppProviders';

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
    <View style={{ gap: 14 }}>
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
      <View style={{ marginTop: 4 }}>
        <Button label={t('update')} onPress={submit} loading={mutation.isPending} />
      </View>
    </View>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title?: string;
  icon?: typeof Banknote;
  children: ReactNode;
}) {
  const { colors: c } = useDesign();
  return (
    <View
      style={{
        gap: 15,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        padding: 16,
        borderRadius: 20,
      }}
    >
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {Icon ? <SignatureIcon icon={Icon} size={38} /> : null}
          <Heading size={21}>{title}</Heading>
        </View>
      ) : null}
      {children}
    </View>
  );
}

export default function ProfileSectionRoute() {
  const { section: raw } = useLocalSearchParams<{ section?: string }>();
  const section = accountSection(raw);
  return section ? (
    <ProfileSection key={section} section={section} />
  ) : (
    <Redirect href="/profile" />
  );
}
function ProfileSection({ section }: { section: AccountSection }) {
  const a = useAccount();
  const session = auth.useSession();
  const { t, colors: c, locale } = useDesign();
  const accessCopy = getAccessStrings(locale);
  const { appearance, set } = usePrefs();
  const [clearKind, confirm] = useState<'fin' | 'legacy'>();
  const uid = session.data?.user.id;
  const clear = useMutation({
    mutationFn: (kind: 'fin' | 'legacy') =>
      kind === 'fin'
        ? clearIntelligenceHistory(new AbortController().signal)
        : api.clearHistory().then(() => undefined),
    onSuccess: async (_, kind) => {
      confirm(undefined);
      if (!uid) return;
      const key = [kind === 'fin' ? 'intelligence-history' : 'history', uid];
      await queryClient.cancelQueries({ queryKey: key, exact: true });
      queryClient.setQueryData(key, []);
    },
  });
  const pref = useMutation({
    mutationFn: api.preferences,
    onSuccess: (p) => {
      set(p);
      if (uid) {
        queryClient.setQueryData<NonNullable<typeof a.data>>(['account', uid], (current) =>
          current ? { ...current, preferences: p } : current,
        );
      }
      void queryClient.invalidateQueries({ queryKey: ['account'] });
    },
  });
  const update = (p: Preferences) => {
    if (!pref.isPending) pref.mutate(p);
  };
  const vi = locale === 'vi-VN';
  const user = session.data?.user;
  const name = user?.name?.trim() || t('accountMember');
  const title = {
    personal: vi ? 'Hồ sơ cá nhân' : 'Personal profile',
    finance: t('finance'),
    preferences: t('settingsPreferences'),
    privacy: t('privacy'),
  }[section];
  return (
    <Page title={title} detail={{ onBack: () => backTo('/profile') }} maxWidth={690}>
      {section === 'personal' ? (
        <>
          <View
            testID="personal-profile-identity"
            style={{
              alignItems: 'center',
              backgroundColor: c.surface,
              borderRadius: 22,
              padding: 21,
              gap: 7,
            }}
          >
            {uid ? (
              <AvatarEditor owner={uid} name={name} />
            ) : (
              <ProfileAvatar name={name} size={92} />
            )}
            <Heading size={25} style={{ textAlign: 'center' }}>
              {name}
            </Heading>
            <Text
              small
              bold
              style={{
                backgroundColor: c.secondary,
                color: c.primary,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 14,
              }}
            >
              {user?.emailVerified ? t('authEmailVerified') : t('authEmailNotVerified')}
            </Text>
          </View>
          {user?.email ? (
            <Panel title={vi ? 'Thông tin cá nhân' : 'Personal information'}>
              <View style={{ gap: 2 }}>
                <Text small muted>
                  Email
                </Text>
                <Text>{user.email}</Text>
              </View>
            </Panel>
          ) : null}
          <Panel title={vi ? 'Bảo mật' : 'Security'} icon={LockKeyhole}>
            <AccountIdentity showEmail={false} />
          </Panel>
        </>
      ) : null}
      {section === 'finance' ? (
        <Panel title={vi ? 'Thu nhập và chi phí' : 'Income and expenses'} icon={Banknote}>
          <Text small muted>
            {t('financeHint')}
          </Text>
          <Data q={a}>
            {(data) => (
              <>
                {data.profile ? (
                  <ProfileInsights profile={data.profile} readiness={data.readiness} />
                ) : (
                  <View
                    style={{
                      padding: 11,
                      backgroundColor: c.secondary,
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <ShieldCheck size={18} color={c.primary} />
                    <Text small bold style={{ flex: 1, color: c.primary }}>
                      {accessCopy.completeProfile}
                    </Text>
                  </View>
                )}
                <FinancialForm profile={data.profile} />
              </>
            )}
          </Data>
        </Panel>
      ) : null}
      {section === 'preferences' ? (
        <Panel title={vi ? 'Cá nhân hóa' : 'Personalization'} icon={Moon}>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Globe2 size={15} color={c.muted} />
              <Text bold small>
                {t('language')}
              </Text>
            </View>
            <Choices
              value={locale}
              onChange={(v) => update({ locale: v, appearance })}
              options={[
                { value: 'vi-VN', label: 'Tiếng Việt' },
                { value: 'en-US', label: 'English' },
              ]}
            />
          </View>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Moon size={15} color={c.muted} />
              <Text bold small>
                {t('appearance')}
              </Text>
            </View>
            <Choices
              value={appearance}
              onChange={(v) => update({ locale, appearance: v })}
              options={(['light', 'dark', 'system'] as const).map((v) => ({
                value: v,
                label: t(v),
              }))}
            />
          </View>
          {pref.isError ? (
            <ErrorState retry={() => pref.variables && pref.mutate(pref.variables)} />
          ) : null}
        </Panel>
      ) : null}
      {section === 'privacy' ? (
        <Panel title={vi ? 'Dữ liệu của bạn' : 'Your data'} icon={LockKeyhole}>
          <Text muted small>
            {t('privacyText')}
          </Text>
          {(['fin', 'legacy'] as const).map((kind) => (
            <Button
              key={kind}
              variant={kind === 'fin' ? 'outline' : 'text'}
              label={t(kind === 'fin' ? 'privacyClearFin' : 'privacyClearLegacy')}
              onPress={() => {
                clear.reset();
                confirm(kind);
              }}
            />
          ))}
          {clear.isSuccess ? (
            <Toast>
              {t(clear.variables === 'fin' ? 'privacyFinCleared' : 'privacyLegacyCleared')}
            </Toast>
          ) : null}
          <Dialog
            visible={!!clearKind}
            title={t(clearKind === 'fin' ? 'privacyClearFin' : 'privacyClearLegacy')}
            onClose={() => !clear.isPending && confirm(undefined)}
          >
            <Text>{t('privacyHistoryScope')}</Text>
            {clear.isError ? (
              <Text role="alert" style={{ color: c.error }}>
                {t('error')}
              </Text>
            ) : null}
            <Button
              label={t('privacyDeleteHistory')}
              onPress={() => {
                if (clearKind && !clear.isPending) clear.mutate(clearKind);
              }}
              loading={clear.isPending}
            />
            <Button
              variant="outline"
              label={t('cancel')}
              disabled={clear.isPending}
              onPress={() => confirm(undefined)}
            />
          </Dialog>
        </Panel>
      ) : null}
    </Page>
  );
}
