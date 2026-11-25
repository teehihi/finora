import { useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Mail } from 'lucide-react-native';
import { Action, Button, Text, useDesign } from '@finora/ui';
import type { Key } from '@finora/i18n';
import { auth } from '../services/client';
import { GoogleAction, GoogleMark } from '../features/auth/GoogleAction';
import { ResendCode, VerificationField, resendDelay } from '../features/auth/Verification';
import {
  codeFailure,
  oauthCallback,
  redirectOAuthSupported,
  useIdentityOptions,
} from '../features/auth/identity';

export function AccountIdentity() {
  const { colors: c, t } = useDesign();
  const params = useLocalSearchParams<{ oauth?: string }>();
  const session = auth.useSession();
  const user = session.data?.user;
  const options = useIdentityOptions();
  const googleAvailable = options.data?.google === true && redirectOAuthSupported;
  const accounts = useQuery({
    queryKey: ['linked-accounts', user?.id],
    enabled: Boolean(user && googleAvailable),
    queryFn: async () => {
      const result = await auth.listAccounts();
      if (result.error) throw new Error('Could not retrieve linked accounts');
      return result.data ?? [];
    },
  });
  const googleLinked = accounts.data?.some((account) => account.providerId === 'google');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [until, setUntil] = useState(0);
  const [mode, setMode] = useState<'send' | 'resend' | 'verify' | 'google' | null>(null);
  const inFlight = useRef(false);
  const [error, setError] = useState<Key | null>(
    params.oauth === 'link-error' ? 'authAccountLinkError' : null,
  );
  const [resent, setResent] = useState(false);

  if (!user) return null;
  const email = user.email;

  async function perform(op: NonNullable<typeof mode>, fallback: Key, work: () => Promise<void>) {
    if (inFlight.current) return;
    setMode(op);
    inFlight.current = true;
    setError(null);
    setResent(false);
    try {
      await work();
    } catch {
      setError(fallback);
    } finally {
      inFlight.current = false;
      setMode(null);
    }
  }

  function send(retry = false) {
    if (Date.now() < until) return;
    void perform(retry ? 'resend' : 'send', 'authDeliveryError', async () => {
      const { error } = await auth.emailOtp.sendVerificationOtp({
        email,
        type: 'email-verification',
      });
      if (error) {
        if (error.status === 429) setUntil(Date.now() + resendDelay);
        return setError(error.status === 429 ? 'authRateLimited' : 'authDeliveryError');
      }
      setUntil(Date.now() + resendDelay);
      setCode('');
      setSent(true);
      setResent(retry);
    });
  }

  function verify() {
    if (code.length !== 6) return setError('authCodeNeedSix');
    void perform('verify', 'authGenericError', async () => {
      const result = await auth.emailOtp.verifyEmail({ email, otp: code });
      if (result.error) return setError(codeFailure(result.error));
      setSent(false);
      setCode('');
      await session.refetch();
    });
  }

  function linkGoogle() {
    if (!user?.emailVerified || !googleAvailable) return;
    void perform('google', 'authAccountLinkError', async () => {
      const result = await auth.linkSocial({
        provider: 'google',
        callbackURL: oauthCallback('/profile'),
        errorCallbackURL: oauthCallback('/profile?oauth=link-error'),
      });
      if (result.error) return setError('authAccountLinkError');
      if (Platform.OS !== 'web') {
        const { data } = await accounts.refetch();
        if (!data?.some(({ providerId }) => providerId === 'google'))
          setError('authAccountLinkError');
      }
    });
  }

  return (
    <View style={{ gap: 11, paddingVertical: 20, borderColor: c.border, borderTopWidth: 1 }}>
      <Text role="header" bold style={{ fontSize: 17 }}>
        {t('authAccountTitle')}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Mail size={17} color={c.muted} />
        <Text>{email}</Text>
        {user.emailVerified ? <CheckCircle2 size={15} color={c.success} /> : null}
        <Text small style={{ color: user.emailVerified ? c.success : c.muted }}>
          {t(user.emailVerified ? 'authEmailVerified' : 'authEmailNotVerified')}
        </Text>
      </View>
      {!user.emailVerified && options.data?.emailOtp === true ? (
        <View style={{ gap: 8 }}>
          <Text small muted>
            {t('authAccountVerifyNote')}
          </Text>
          {sent ? (
            <>
              <VerificationField code={code} setCode={setCode} onSubmit={verify} editable={!mode} />
              <Button
                label={t('authCodeConfirm')}
                onPress={verify}
                loading={mode === 'verify'}
                disabled={Boolean(mode)}
              />
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <ResendCode
                  until={until}
                  onPress={() => send(true)}
                  disabled={Boolean(mode)}
                  loading={mode === 'resend'}
                />
                <Action
                  onPress={() => {
                    setSent(false);
                    setCode('');
                    setError(null);
                    setResent(false);
                  }}
                  disabled={Boolean(mode)}
                  label={t('authCancelVerify')}
                >
                  <Text small muted>
                    {t('authCancelVerify')}
                  </Text>
                </Action>
              </View>
            </>
          ) : (
            <View style={{ alignSelf: 'flex-start' }}>
              <Button
                label={t('authVerifyCurrentEmail')}
                variant="outline"
                onPress={() => (Date.now() < until ? setSent(true) : send())}
                loading={mode === 'send'}
                disabled={Boolean(mode)}
              />
            </View>
          )}
        </View>
      ) : null}
      {googleAvailable && user.emailVerified && accounts.isSuccess ? (
        <View style={{ alignItems: 'flex-start', gap: 6 }}>
          {googleLinked ? (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              accessibilityLiveRegion="polite"
            >
              <GoogleMark />
              <Text small bold>
                {t('authAccountGoogleLinked')}
              </Text>
            </View>
          ) : (
            <>
              <Text small muted>
                {t('authAccountGoogleNote')}
              </Text>
              <GoogleAction
                label={t('authAccountGoogle')}
                onPress={linkGoogle}
                disabled={Boolean(mode)}
                busy={mode === 'google'}
              />
            </>
          )}
        </View>
      ) : null}
      {resent ? (
        <View accessibilityLiveRegion="polite">
          <Text small style={{ color: c.success }}>
            {t('authCodeResent')}
          </Text>
        </View>
      ) : null}
      {error ? (
        <Text small role="alert" style={{ color: c.error }}>
          {t(error)}
        </Text>
      ) : null}
    </View>
  );
}
