import { useRef, useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Button, BottomSheet, Field, Text, Toast, useDesign } from '@finora/ui';
import { displayNameSchema } from '@finora/contracts';
import { personalProfileCopy } from '@finora/i18n';
import { ProfilePasskeys } from './auth/ProfilePasskeys';
import { ProfileTwoFactor } from './auth/ProfileTwoFactor';
import { useIdentityOptions } from './auth/identity';
import { useProfileChrome } from './profile-chrome';
import { auth } from '../services/client';
import { passkeySupported } from '../services/passkey-client';

function useProfileSheet() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const lock = useRef(false);
  function start() {
    setError(undefined);
    setSaved(false);
    setOpen(true);
  }
  function close(reset: () => void) {
    if (lock.current) return;
    reset();
    setOpen(false);
  }
  async function submit(work: () => Promise<void>, fallback: string, reset: () => void) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError(undefined);
    try {
      await work();
      reset();
      setOpen(false);
      setSaved(true);
    } catch {
      setError(fallback);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return { open, pending, error, setError, saved, start, close, submit };
}

export function ProfileNameEditor({ name }: { name: string }) {
  const { locale, t } = useDesign();
  const copy = personalProfileCopy[locale];
  const session = auth.useSession();
  const sheet = useProfileSheet();
  const [value, setValue] = useState('');
  const reset = () => setValue('');
  function save() {
    const parsed = displayNameSchema.safeParse(value);
    if (!parsed.success) return sheet.setError(copy.nameInvalid);
    void sheet.submit(
      async () => {
        if (parsed.data === name) return;
        const { error } = await auth.updateUser({ name: parsed.data });
        if (error) throw error;
        await session.refetch();
      },
      t('error'),
      reset,
    );
  }
  return (
    <>
      <Button
        label={copy.edit}
        variant="text"
        onPress={() => {
          setValue(name);
          sheet.start();
        }}
      />
      <BottomSheet title={copy.editName} visible={sheet.open} onClose={() => sheet.close(reset)}>
        <Field
          label={copy.name}
          value={value}
          maxLength={80}
          autoCapitalize="words"
          autoComplete="name"
          editable={!sheet.pending}
          error={sheet.error}
          onChangeText={(next) => {
            setValue(next);
            sheet.setError(undefined);
          }}
          onSubmitEditing={save}
        />
        <Button label={copy.save} onPress={save} loading={sheet.pending} />
        <Button
          label={t('cancel')}
          variant="text"
          onPress={() => sheet.close(reset)}
          disabled={sheet.pending}
        />
      </BottomSheet>
    </>
  );
}

export function ProfileSignInMethods({ owner }: { owner: string }) {
  const { locale, t } = useDesign();
  const { palette: p } = useProfileChrome();
  const copy = personalProfileCopy[locale];
  const options = useIdentityOptions();
  const accounts = useQuery({
    queryKey: ['linked-accounts', owner],
    queryFn: async () => {
      const response = await auth.listAccounts();
      if (response.error) throw new Error('Could not retrieve linked accounts');
      return response.data ?? [];
    },
  });
  const credential = accounts.data?.some(({ providerId }) => providerId === 'credential') === true;
  const providers = [
    options.data?.emailOtp ? copy.emailCode : undefined,
    credential ? copy.password : undefined,
    accounts.data?.some(({ providerId }) => providerId === 'google') ? 'Google' : undefined,
    accounts.data?.some(({ providerId }) => providerId === 'apple') ? 'Apple' : undefined,
  ].filter(Boolean);
  return (
    <View style={{ gap: 8 }}>
      <Text bold style={{ color: p.ink }}>
        {copy.methods}
      </Text>
      {accounts.isPending ? (
        <Text small muted>
          {copy.loadingMethods}
        </Text>
      ) : null}
      {accounts.isError || options.isError ? (
        <>
          <Text small muted>
            {copy.methodsError}
          </Text>
          <Button
            label={t('retry')}
            variant="text"
            onPress={() => {
              void accounts.refetch();
              void options.refetch();
            }}
          />
        </>
      ) : null}
      {providers.length && !accounts.isError ? (
        <Text small style={{ color: p.muted }}>
          {providers.join(' · ')}
        </Text>
      ) : null}
      {credential && accounts.isSuccess ? <ProfilePasswordEditor /> : null}
      {options.data?.passkey ? (
        <ProfilePasskeys owner={owner} supported={passkeySupported(options.data.passkey)} />
      ) : null}
      {accounts.isSuccess ? <ProfileTwoFactor hasPassword={credential} /> : null}
    </View>
  );
}

function ProfilePasswordEditor() {
  const { locale, t, colors: c } = useDesign();
  const copy = personalProfileCopy[locale];
  const sheet = useProfileSheet();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [passwordError, setPasswordError] = useState<string>();
  function reset() {
    setCurrent('');
    setNext('');
    setRepeat('');
    setPasswordError(undefined);
  }
  function save() {
    setPasswordError(undefined);
    if (!current.trim()) return sheet.setError(t('invalid'));
    if (next.length < 8 || next.length > 128) return sheet.setError(copy.passwordInvalid);
    if (next !== repeat) return sheet.setError(copy.passwordMismatch);
    void sheet.submit(
      async () => {
        const { error } = await auth.changePassword({
          currentPassword: current,
          newPassword: next,
          revokeOtherSessions: false,
        });
        if (error?.code === 'INVALID_PASSWORD') {
          setPasswordError(copy.wrongPassword);
          throw error;
        }
        if (error) throw error;
      },
      t('error'),
      reset,
    );
  }
  const common = {
    secureTextEntry: true,
    autoCapitalize: 'none' as const,
    maxLength: 128,
    editable: !sheet.pending,
  };
  return (
    <>
      <View style={{ alignSelf: 'flex-start' }}>
        <Button label={copy.changePassword} onPress={sheet.start} variant="outline" />
      </View>
      <BottomSheet
        title={copy.changePassword}
        visible={sheet.open}
        onClose={() => sheet.close(reset)}
      >
        <Field
          label={copy.currentPassword}
          value={current}
          onChangeText={setCurrent}
          autoComplete="current-password"
          {...common}
        />
        <Field
          label={copy.newPassword}
          value={next}
          onChangeText={setNext}
          autoComplete="new-password"
          {...common}
        />
        <Field
          label={copy.confirmPassword}
          value={repeat}
          onChangeText={setRepeat}
          autoComplete="new-password"
          {...common}
        />
        {(passwordError ?? sheet.error) ? (
          <Text small role="alert" style={{ color: c.error }}>
            {passwordError ?? sheet.error}
          </Text>
        ) : null}
        <Button label={copy.save} onPress={save} loading={sheet.pending} />
        <Button
          label={t('cancel')}
          variant="text"
          onPress={() => sheet.close(reset)}
          disabled={sheet.pending}
        />
      </BottomSheet>
      {sheet.saved ? <Toast>{copy.passwordSaved}</Toast> : null}
    </>
  );
}
