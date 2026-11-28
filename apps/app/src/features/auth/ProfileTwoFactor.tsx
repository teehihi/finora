import { useRef, useState } from 'react';
import { Text as NativeText, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import qrcode from 'qrcode-generator';
import { BottomSheet, Button, Field, Text, Toast, useDesign } from '@finora/ui';
import { personalProfileCopy } from '@finora/i18n';
import { auth } from '../../services/client';
import { twoFactorCopy } from './two-factor-copy';

function SetupQr({ uri, label }: { uri: string; label: string }) {
  const qr = qrcode(0, 'M');
  qr.addData(uri);
  qr.make();
  const count = qr.getModuleCount();
  let path = '';
  for (let y = 0; y < count; y++)
    for (let x = 0; x < count; x++) if (qr.isDark(y, x)) path += `M${x},${y}h1v1h-1z`;
  return (
    <View accessibilityRole="image" accessibilityLabel={label} style={{ alignSelf: 'center' }}>
      <Svg width={192} height={192} viewBox={`-4 -4 ${count + 8} ${count + 8}`}>
        <Rect x={-4} y={-4} width={count + 8} height={count + 8} fill="white" />
        <Path d={path} fill="black" />
      </Svg>
    </View>
  );
}

type Setup = { totpURI: string; backupCodes: string[] };

export function ProfileTwoFactor({ hasPassword }: { hasPassword: boolean }) {
  const { locale, t, colors: c } = useDesign();
  const copy = twoFactorCopy[locale];
  const profile = personalProfileCopy[locale];
  const session = auth.useSession();
  const [mode, setMode] = useState<'enable' | 'disable'>();
  const [setup, setSetup] = useState<Setup>();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [toast, setToast] = useState<string>();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const enabled = session.data?.user.twoFactorEnabled === true;
  const verified = session.data?.user.emailVerified === true;
  const secret = setup ? /[?&]secret=([A-Z2-7]+)(?:&|$)/i.exec(setup.totpURI)?.[1] : undefined;

  function reset() {
    setPassword('');
    setCode('');
    setError(undefined);
    setSetup(undefined);
    setMode(undefined);
  }

  function close() {
    if (!lock.current) reset();
  }

  async function submit() {
    if (lock.current || !mode) return;
    setError(undefined);
    if (setup ? !/^\d{6}$/.test(code) : hasPassword && !password) return setError(t('invalid'));
    lock.current = true;
    setBusy(true);
    try {
      if (mode === 'enable' && !setup) {
        const result = await auth.twoFactor.enable(hasPassword ? { password } : {});
        if (result.error || !result.data || result.data.method !== 'totp') {
          setError(
            result.error?.code === 'AUTH_2FA_RECENT_SIGN_IN'
              ? copy.recent
              : result.error?.code === 'INVALID_PASSWORD'
                ? profile.wrongPassword
                : t('error'),
          );
          return;
        }
        setPassword('');
        setSetup(result.data);
        return;
      }
      const result =
        mode === 'enable'
          ? await auth.twoFactor.verifyTotp({ code })
          : await auth.twoFactor.disable(hasPassword ? { password } : {});
      if (result.error) {
        setError(
          result.error.code === 'AUTH_2FA_RECENT_SIGN_IN'
            ? copy.recent
            : result.error.code === 'INVALID_PASSWORD'
              ? profile.wrongPassword
              : result.error.code === 'INVALID_CODE'
                ? copy.incorrect
                : t('error'),
        );
        return;
      }
      setToast(mode === 'enable' ? copy.enabled : copy.disabled);
      reset();
      await session.refetch();
    } catch {
      setError(t('error'));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <View style={{ gap: 5, alignItems: 'flex-start' }}>
        {enabled || !verified ? (
          <Text small muted>
            {enabled ? copy.enabled : copy.verifyEmail}
          </Text>
        ) : null}
        <Button
          label={enabled ? copy.disable : copy.enable}
          variant="outline"
          disabled={!verified || !session.data}
          onPress={() => {
            setToast(undefined);
            setMode(enabled ? 'disable' : 'enable');
          }}
        />
      </View>
      <BottomSheet
        title={mode === 'disable' ? copy.disable : copy.enable}
        visible={!!mode}
        onClose={close}
      >
        {setup ? (
          <>
            <Text small muted>
              {copy.setupGuide}
            </Text>
            <SetupQr uri={setup.totpURI} label={copy.next} />
            {secret ? (
              <View style={{ gap: 4 }}>
                <Text small muted>
                  {copy.setupKey}
                </Text>
                <NativeText
                  testID="two-factor-setup-key"
                  selectable
                  style={{ color: c.foreground, fontWeight: '700' }}
                >
                  {secret}
                </NativeText>
              </View>
            ) : null}
            <View style={{ gap: 4 }}>
              <Text bold>{copy.backupTitle}</Text>
              <Text small muted>
                {copy.backupBody}
              </Text>
              <NativeText
                testID="two-factor-backup-codes"
                selectable
                style={{ color: c.foreground, fontVariant: ['tabular-nums'] }}
              >
                {setup.backupCodes.join('  •  ')}
              </NativeText>
            </View>
            <Field
              label={copy.code}
              value={code}
              onChangeText={(value) => setCode(value.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              editable={!busy}
              onSubmitEditing={() => void submit()}
            />
          </>
        ) : (
          <>
            <Text small muted>
              {mode === 'disable' ? copy.disableIntro : copy.setupIntro}
            </Text>
            {hasPassword ? (
              <Field
                label={profile.currentPassword}
                value={password}
                onChangeText={setPassword}
                autoComplete="current-password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={128}
                editable={!busy}
                onSubmitEditing={() => void submit()}
              />
            ) : null}
          </>
        )}
        {error ? (
          <Text role="alert" small style={{ color: c.error }}>
            {error}
          </Text>
        ) : null}
        <Button
          label={setup ? copy.finish : mode === 'disable' ? copy.disable : copy.next}
          onPress={() => void submit()}
          loading={busy}
        />
        <Button variant="text" label={t('cancel')} onPress={close} disabled={busy} />
      </BottomSheet>
      {toast ? <Toast>{toast}</Toast> : null}
    </>
  );
}
