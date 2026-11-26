import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, View, useWindowDimensions } from 'react-native';
import { Redirect, useLocalSearchParams, type Href } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { z } from 'zod';
import type { Key } from '@finora/i18n';
import { Action, Button, Field, Text, useDesign } from '@finora/ui';
import { PublicPage } from '../src/components/layout';
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
    } catch (cause) {
      console.warn('[Finora auth] action failed', {
        operation,
        type: cause instanceof Error ? cause.name : 'unknown',
      });
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
      'authConnectionError',
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
        void session.refetch().catch(() => undefined);
      },
      'verify',
      'authConnectionError',
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
        if (result.error) {
          console.warn('[Finora auth] password sign-in rejected', {
            status: result.error.status,
            code: result.error.code,
          });
          return setError(
            result.error.status === 429
              ? 'authRateLimited'
              : result.error.status === 401 || result.error.status === 400
                ? 'authInvalidCredentials'
                : 'authConnectionError',
          );
        }
        setPassword('');
        void session.refetch().catch(() => undefined);
      },
      'password',
      'authConnectionError',
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
          void session.refetch().catch(() => undefined);
        }
      },
      'google',
      'authGoogleError',
    );
  }

  const busy = pending !== null;
  const googleAvailable = methods.data?.google === true && redirectOAuthSupported;
  const emailAvailable = methods.data?.emailOtp !== false;
  const title = step === 'code' ? 'authCodeTitle' : 'signIn';
  if (session.isPending) {
    return (
      <PublicPage auth>
        <View
          style={{
            flex: 1,
            minHeight: 300,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <ActivityIndicator color={c.primary} />
          <Text muted small>
            {t('authChecking')}
          </Text>
        </View>
      </PublicPage>
    );
  }

  return (
    <PublicPage auth>
      <View
        style={{
          width: '100%',
          maxWidth: wide ? 460 : 498,
          alignSelf: 'center',
          flexGrow: 1,
          justifyContent: 'center',
          paddingTop: wide ? 32 : 24,
          paddingBottom: wide ? 48 : 34,
        }}
      >
        <View style={{ gap: 25 }}>
          <View style={{ gap: 12 }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 16,
                backgroundColor: c.secondary,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4,
              }}
            >
              <ShieldCheck size={23} color={c.primary} strokeWidth={1.8} />
            </View>
            <View style={{ gap: 7 }}>
              <Text
                role="header"
                style={{
                  fontSize: wide ? 34 : 31,
                  lineHeight: wide ? 42 : 39,
                  letterSpacing: -0.8,
                  fontFamily: 'GeistMedium',
                  color: c.foreground,
                }}
              >
                {t(title)}
              </Text>
              <Text muted style={{ maxWidth: 410 }}>
                {t(
                  step === 'code'
                    ? 'authCodeIntro'
                    : step === 'password'
                      ? 'authPasswordIntro'
                      : 'authWelcomeBody',
                )}
              </Text>
            </View>
          </View>

          {session.error || methods.isError ? (
            <Text role="alert" small style={{ color: c.error }}>
              {t('authConnectionError')}
            </Text>
          ) : null}

          {step === 'email' && googleAvailable ? (
            <View style={{ gap: 16 }}>
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
            <View style={{ gap: 12 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text small muted>
                    {t('authCodeSentTo')}
                  </Text>
                  <Text bold numberOfLines={1} style={{ fontSize: 15, lineHeight: 21 }}>
                    {email}
                  </Text>
                </View>
                <Action
                  disabled={busy}
                  onPress={() => changeStep('email')}
                  label={t('authEditEmail')}
                >
                  <Text small bold style={{ color: c.primary }}>
                    {t('authEditEmail')}
                  </Text>
                </Action>
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

          <View style={{ gap: 8 }}>
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
              <View style={{ alignItems: 'center', gap: 4 }}>
                <ResendCode
                  until={until}
                  disabled={busy}
                  loading={pending === 'resend'}
                  onPress={() => requestCode(true)}
                />
              </View>
            ) : (
              <Action
                label={t(step === 'password' ? 'authUseCode' : 'authUsePassword')}
                onPress={() => changeStep(step === 'password' ? 'email' : 'password')}
                disabled={busy}
                style={{ alignItems: 'center', marginTop: 2 }}
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
              alignItems: 'center',
              gap: 10,
              backgroundColor: c.secondary,
              paddingHorizontal: 13,
              paddingVertical: 12,
              borderRadius: 14,
            }}
          >
            <ShieldCheck size={18} color={c.primary} />
            <Text small muted style={{ flex: 1 }}>
              {t('authHint')}
            </Text>
          </View>
        </View>
      </View>
    </PublicPage>
  );
}
