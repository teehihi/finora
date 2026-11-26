import { useRef, useState } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { Redirect, useLocalSearchParams, type Href } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { z } from 'zod';
import type { Key } from '@finora/i18n';
import { Action, Button, Field, Heading, LoadingState, Text, useDesign } from '@finora/ui';
import { PublicPage } from '../src/components/layout';
import { AuthArtwork } from '../src/features/auth/AuthArtwork';
import { ResendCode, VerificationField, resendDelay } from '../src/features/auth/Verification';
import {
  allowedAuthReturn,
  codeFailure,
  oauthCallback,
  useIdentityOptions,
  redirectOAuthSupported,
} from '../src/features/auth/identity';
import { auth } from '../src/services/client';
import { GoogleAction } from '../src/features/auth/GoogleAction';

type Step = 'email' | 'code' | 'password';
type Pending = 'request' | 'resend' | 'verify' | 'password' | 'google';
const emailSchema = z.email().max(254);

export default function Auth() {
  const params = useLocalSearchParams<{ returnTo?: string; oauth?: string }>();
  const returnTo = allowedAuthReturn(params.returnTo);
  const { colors: c, t } = useDesign();
  const { width } = useWindowDimensions();
  const wide = width >= 1024;
  const session = auth.useSession();
  const methods = useIdentityOptions();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const inFlight = useRef(false);
  const [until, setUntil] = useState(0);
  const [error, setError] = useState<Key | null>(
    params.oauth === 'error' ? 'authGoogleError' : null,
  );
  const [notice, setNotice] = useState<Key | null>(null);

  if (session.data) return <Redirect href={returnTo as Href} />;

  async function run(work: () => Promise<void>, operation: Pending, fallback: Key) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(operation);
    setError(null);
    setNotice(null);
    try {
      await work();
    } catch {
      setError(fallback);
    } finally {
      setPending(null);
      inFlight.current = false;
    }
  }

  function changeStep(next: Step) {
    if (inFlight.current) return;
    setError(null);
    setNotice(null);
    setPassword('');
    setCode('');
    setStep(next);
  }

  function requestCode(retry = false) {
    if (inFlight.current || (retry && Date.now() < until)) return;
    const check = emailSchema.safeParse(email.trim());
    if (!check.success) {
      setError('authEmailInvalid');
      return;
    }
    if (methods.data?.emailOtp === false) return;
    const address = check.data;
    void run(
      async () => {
        const result = await auth.emailOtp.sendVerificationOtp({ email: address, type: 'sign-in' });
        if (result.error) {
          if (result.error.status === 429) setUntil(Date.now() + resendDelay);
          setError(result.error.status === 429 ? 'authRateLimited' : 'authDeliveryError');
          return;
        }
        setEmail(address);
        setCode('');
        setUntil(Date.now() + resendDelay);
        setStep('code');
        if (retry) setNotice('authCodeResent');
      },
      retry ? 'resend' : 'request',
      'authDeliveryError',
    );
  }

  function verifyCode() {
    if (inFlight.current) return;
    if (code.length !== 6) {
      setError('authCodeNeedSix');
      return;
    }
    void run(
      async () => {
        const result = await auth.signIn.emailOtp({ email, otp: code });
        if (result.error) return setError(codeFailure(result.error));
        setCode('');
        await session.refetch();
      },
      'verify',
      'authGenericError',
    );
  }

  function signInPassword() {
    if (inFlight.current) return;
    const address = emailSchema.safeParse(email.trim());
    if (!address.success) return setError('authEmailInvalid');
    if (password.length === 0) return setError('authPasswordRequired');
    void run(
      async () => {
        const result = await auth.signIn.email({ email: address.data, password });
        if (result.error)
          return setError(result.error.status === 429 ? 'authRateLimited' : 'authError');
        setPassword('');
        await session.refetch();
      },
      'password',
      'authError',
    );
  }

  function signInGoogle() {
    if (!methods.data?.google || !redirectOAuthSupported) return;
    const errorPath = `/auth?oauth=error&returnTo=${encodeURIComponent(returnTo)}`;
    void run(
      async () => {
        const result = await auth.signIn.social({
          provider: 'google',
          callbackURL: oauthCallback(returnTo),
          errorCallbackURL: oauthCallback(errorPath),
        });
        if (result.error) return setError('authGoogleError');
        if (Platform.OS !== 'web') {
          // Expo's system browser can return without a session when dismissed.
          const restored = await auth.getSession();
          if (!restored.data) return setError('authGoogleNoSession');
          await session.refetch();
        }
      },
      'google',
      'authGoogleError',
    );
  }

  const busy = pending !== null;
  const googleAvailable = methods.data?.google === true && redirectOAuthSupported;
  const emailAvailable = methods.data?.emailOtp !== false;
  const title = step === 'code' ? 'authCodeTitle' : step === 'password' ? 'signIn' : 'authWelcome';
  return (
    <PublicPage auth>
      <View
        style={{
          flexDirection: wide ? 'row' : 'column',
          width: '100%',
          alignItems: wide ? 'stretch' : 'center',
          justifyContent: 'center',
          gap: wide ? 56 : 24,
          paddingVertical: wide ? 42 : 20,
        }}
      >
        {wide ? <AuthArtwork wide /> : null}
        <View style={{ width: '100%', maxWidth: wide ? 432 : 498, alignSelf: 'center', gap: 21 }}>
          {!wide ? <AuthArtwork wide={false} verification={step === 'code'} /> : null}
          {session.isPending ? (
            <View style={{ gap: 8, minHeight: 234, justifyContent: 'center' }}>
              <LoadingState />
              <Text small muted style={{ textAlign: 'center' }}>
                {t('authChecking')}
              </Text>
            </View>
          ) : (
            <>
              <View style={{ gap: 7 }}>
                <Heading size={wide ? 44 : 36} style={{ lineHeight: wide ? 53 : 43 }}>
                  {t(title)}
                </Heading>
                <Text muted>
                  {t(
                    step === 'code'
                      ? 'authCodeIntro'
                      : step === 'password'
                        ? 'authPasswordIntro'
                        : 'authWelcomeBody',
                  )}
                </Text>
              </View>

              {step === 'email' && googleAvailable ? (
                <View style={{ gap: 15 }}>
                  <GoogleAction
                    onPress={signInGoogle}
                    label={t('authGoogleContinue')}
                    disabled={busy}
                    busy={pending === 'google'}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ height: 1, flex: 1, backgroundColor: c.border }} />
                    <Text small muted>
                      {t('authOr')}
                    </Text>
                    <View style={{ height: 1, flex: 1, backgroundColor: c.border }} />
                  </View>
                </View>
              ) : null}

              {step === 'code' ? (
                <View style={{ gap: 13 }}>
                  <View
                    style={{
                      borderLeftWidth: 2,
                      borderColor: c.accent,
                      paddingLeft: 12,
                      paddingVertical: 2,
                    }}
                  >
                    <Text bold style={{ color: c.primary }}>
                      {email}
                    </Text>
                  </View>
                  <VerificationField
                    code={code}
                    setCode={setCode}
                    editable={!busy}
                    onSubmit={verifyCode}
                  />
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  <Field
                    label={t('email')}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={254}
                    editable={!busy}
                    placeholder="ban@example.com"
                    error={error === 'authEmailInvalid' ? t(error) : undefined}
                    onSubmitEditing={step === 'email' ? () => requestCode() : undefined}
                  />
                  {step === 'password' ? (
                    <Field
                      label={t('password')}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoComplete="current-password"
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={128}
                      editable={!busy}
                      error={error === 'authPasswordRequired' ? t(error) : undefined}
                      onSubmitEditing={signInPassword}
                    />
                  ) : null}
                </View>
              )}

              {error && !['authEmailInvalid', 'authPasswordRequired'].includes(error) ? (
                <Text role="alert" small style={{ color: c.error }}>
                  {t(error)}
                </Text>
              ) : null}
              {notice ? (
                <View accessibilityLiveRegion="polite">
                  <Text small style={{ color: c.success }}>
                    {t(notice)}
                  </Text>
                </View>
              ) : null}
              {!emailAvailable && step === 'email' ? (
                <Text muted small>
                  {t('authUnavailable')}
                </Text>
              ) : null}

              <View style={{ gap: 5 }}>
                <Button
                  label={t(
                    step === 'code'
                      ? 'authCodeConfirm'
                      : step === 'password'
                        ? 'signIn'
                        : 'authContinueEmail',
                  )}
                  onPress={
                    step === 'code'
                      ? verifyCode
                      : step === 'password'
                        ? signInPassword
                        : () => requestCode()
                  }
                  loading={pending === 'request' || pending === 'verify' || pending === 'password'}
                  disabled={busy || (step === 'email' && !emailAvailable)}
                />
                {step === 'code' ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <ResendCode
                      until={until}
                      disabled={busy}
                      loading={pending === 'resend'}
                      onPress={() => requestCode(true)}
                    />
                    <Action
                      disabled={busy}
                      onPress={() => changeStep('email')}
                      label={t('authEditEmail')}
                    >
                      <Text muted small>
                        {t('authEditEmail')}
                      </Text>
                    </Action>
                  </View>
                ) : (
                  <Action
                    label={t(step === 'password' ? 'authUseCode' : 'authUsePassword')}
                    onPress={() => changeStep(step === 'password' ? 'email' : 'password')}
                    disabled={busy}
                    style={{ alignItems: 'center' }}
                  >
                    <Text small bold style={{ color: c.primary }}>
                      {t(step === 'password' ? 'authUseCode' : 'authUsePassword')}
                    </Text>
                  </Action>
                )}
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 9,
                  borderTopWidth: 1,
                  borderColor: c.border,
                  paddingTop: 13,
                }}
              >
                <ShieldCheck size={17} color={c.primary} />
                <Text small muted>
                  {t('authHint')}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </PublicPage>
  );
}
