import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import { useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import {
  Banknote,
  Calculator,
  Globe2,
  LockKeyhole,
  Moon,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';
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
import { getAccessStrings, profileMenuCopy } from '@finora/i18n';
import { backTo, Data, LinkRow } from '../../../src/components/layout';
import { SignatureIcon } from '../../../src/components/signature';
import { AccountIdentity } from '../../../src/components/AccountIdentity';
import {
  accountSection,
  ProfileAvatar,
  type AccountSection,
} from '../../../src/features/profile-account-hub';
import { AvatarEditor } from '../../../src/features/account-avatar/AvatarEditor';
import { AccountScroll, useProfileChrome } from '../../../src/features/profile-chrome';
import { ProfileNameEditor, ProfileSignInMethods } from '../../../src/features/personal-profile';
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
  action,
  children,
}: {
  title?: string;
  icon?: typeof Banknote;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { palette: p } = useProfileChrome();
  return (
    <View
      style={{
        gap: 14,
        backgroundColor: p.surface,
        paddingHorizontal: 19,
        paddingVertical: 19,
      }}
    >
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {Icon ? <SignatureIcon icon={Icon} size={38} /> : null}
          <Heading size={19} style={{ color: p.ink, ...(action && { flex: 1 }) }}>
            {title}
          </Heading>
          {action}
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
  const { palette: p } = useProfileChrome();
  const user = session.data?.user;
  const name = user?.name?.trim() || t('accountMember');
  const copy = profileMenuCopy[locale];
  const title = {
    personal: vi ? 'Hồ sơ cá nhân' : 'Personal profile',
    finance: t('finance'),
    preferences: t('settingsPreferences'),
    privacy: t('privacy'),
    health: copy.health,
    help: copy.help,
    about: copy.about,
  }[section];
  return (
    <AccountScroll detail={{ title, back: () => backTo('/profile') }}>
      {section === 'personal' ? (
        <>
          <View
            testID="personal-profile-identity"
            style={{
              alignItems: 'center',
              backgroundColor: p.surface,
              paddingTop: 30,
              paddingBottom: 25,
              paddingHorizontal: 19,
              gap: 7,
            }}
          >
            {uid ? (
              <AvatarEditor owner={uid} name={name} />
            ) : (
              <ProfileAvatar name={name} size={108} />
            )}
            <Heading size={26} style={{ textAlign: 'center', color: p.ink, marginTop: 4 }}>
              {name}
            </Heading>
            {user?.email ? (
              <Text small style={{ color: p.muted, textAlign: 'center' }}>
                {user.email}
              </Text>
            ) : null}
            <Text
              small
              bold
              style={{
                backgroundColor: p.profileChip,
                color: c.primary,
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 14,
              }}
            >
              {user?.emailVerified ? t('authEmailVerified') : t('authEmailNotVerified')}
            </Text>
          </View>
          <Panel
            title={vi ? 'Thông tin cá nhân' : 'Personal information'}
            action={uid ? <ProfileNameEditor key={uid} name={user?.name ?? ''} /> : undefined}
          >
            <View style={{ gap: 3 }}>
              <Text small style={{ color: p.muted }}>
                {vi ? 'Tên hiển thị' : 'Display name'}
              </Text>
              <Text style={{ color: p.ink }}>{name}</Text>
            </View>
            {user?.email ? (
              <View style={{ gap: 3 }}>
                <Text small style={{ color: p.muted }}>
                  Email
                </Text>
                <Text style={{ color: p.ink }}>{user.email}</Text>
              </View>
            ) : null}
          </Panel>
          <Panel title={vi ? 'Bảo mật' : 'Security'}>
            {uid ? <ProfileSignInMethods key={uid} owner={uid} /> : null}
            <AccountIdentity showEmail={false} compact />
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
      {section === 'health' ? (
        <Panel>
          <Text small muted>
            {copy.healthNote}
          </Text>
          <Data q={a}>
            {(data) =>
              data.profile ? (
                <ProfileInsights profile={data.profile} readiness={data.readiness} />
              ) : (
                <Text>{copy.healthEmpty}</Text>
              )
            }
          </Data>
          <Button
            variant="outline"
            label={t('finance')}
            onPress={() => router.push('/profile/finance')}
          />
        </Panel>
      ) : null}
      {section === 'help' ? (
        <Panel>
          <LinkRow
            title={copy.helpFinance}
            body={copy.helpFinanceNote}
            icon={<Banknote size={18} color={c.primary} />}
            onPress={() => router.push('/profile/finance')}
          />
          <LinkRow
            title={copy.helpSimulations}
            body={copy.helpSimulationsNote}
            icon={<Calculator size={18} color={c.primary} />}
            onPress={() => router.push({ pathname: '/loans', params: { pane: 'simulations' } })}
          />
          <LinkRow
            title={copy.helpFin}
            body={copy.helpFinNote}
            icon={<Sparkles size={18} color={c.primary} />}
            onPress={() => router.push('/assistant')}
          />
          <LinkRow
            title={copy.helpAccount}
            body={copy.helpAccountNote}
            icon={<ShieldCheck size={18} color={c.primary} />}
            onPress={() => router.push('/profile/personal')}
          />
        </Panel>
      ) : null}
      {section === 'about' ? (
        <Panel title="Finora">
          <Text>{copy.aboutDescription}</Text>
          {Constants.expoConfig?.version ? (
            <Text small muted>
              {copy.version} {Constants.expoConfig.version}
            </Text>
          ) : null}
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
    </AccountScroll>
  );
}
