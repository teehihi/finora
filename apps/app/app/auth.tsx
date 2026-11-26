import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, View, useWindowDimensions } from 'react-native';
import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import {
  ArrowRight,
  ArrowUpRight,
  LockKeyhole,
  MailCheck,
  ShieldCheck,
  WifiOff,
} from 'lucide-react-native';
import { z } from 'zod';
import { getAccessStrings, type Key } from '@finora/i18n';
import { Action, Button, Field, Heading, Text, useDesign } from '@finora/ui';
import { PublicPage } from '../src/components/layout';
import { SignatureIcon } from '../src/components/signature';
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
import { AuthArtwork } from '../src/features/auth/AuthArtwork';

type Step = 'email' | 'code' | 'password';
type Pending = 'request' | 'resend' | 'verify' | 'password' | 'google' | 'reconnect' | 'restore';
const emailSchema = z.email().max(254);

export default function Auth() {
  const params = useLocalSearchParams<{ returnTo?: string; oauth?: string }>();
  const returnTo = allowedAuthReturn(params.returnTo);
  const { colors: c, locale, t } = useDesign();
  const copy = getAccessStrings(locale);
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
  const lastDelivery = useRef<{ address: string; deadline: number } | null>(null);
  const [restoring, setRestoring] = useState(false);
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
    setRestoring(false);
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
    const previous = lastDelivery.current;
    if (
      !retry &&
      previous?.address.toLowerCase() === address.toLowerCase() &&
      previous.deadline > Date.now()
    ) {
      // Editing an unchanged address need not replace the valid code already sent.
      setEmail(previous.address);
      setCode('');
      setUntil(previous.deadline);
      setError(null);
      setStep('code');
      return;
    }
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
        const deadline = Date.now() + resendDelay;
        lastDelivery.current = { address, deadline };
        setUntil(deadline);
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
        lastDelivery.current = null;
        setRestoring(true);
        await session.refetch();
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
        setRestoring(true);
        await session.refetch();
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
          setRestoring(true);
          await session.refetch();
        }
      },
      'google',
      'authGoogleError',
    );
  }

  function reconnect() {
    void run(
      async () => {
        await Promise.allSettled([session.refetch(), methods.refetch()]);
      },
      'reconnect',
      'authConnectionError',
    );
  }

  function retrySession() {
    void run(() => session.refetch(), 'restore', 'authConnectionError');
  }

  const busy = pending !== null;
  const connectionIssue = Boolean(
    session.error || methods.isError || error === 'authConnectionError',
  );
  const googleAvailable = methods.data?.google === true && redirectOAuthSupported;
  const emailAvailable = methods.data?.emailOtp !== false;
  const title = step === 'code' ? 'authCodeTitle' : 'signIn';
  if (session.isPending && !busy && !restoring && step === 'email') {
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
          <SignatureIcon icon={LockKeyhole} tone="lime" size={53} />
          <ActivityIndicator color={c.primary} />
          <Text muted small>
            {t('authChecking')}
          </Text>
        </View>
      </PublicPage>
    );
  }

  if (restoring) {
    return (
      <PublicPage auth>
        <View
          style={{
            width: '100%',
            maxWidth: 490,
            alignSelf: 'center',
            marginVertical: 30,
            borderTopWidth: 1,
            borderColor: c.border,
            paddingTop: 23,
            gap: 15,
          }}
        >
          <SignatureIcon icon={MailCheck} tone="lime" size={53} />
          <Heading size={32}>{copy.restoreTitle}</Heading>
          <Text muted>{copy.restoreBody}</Text>
          {connectionIssue ? (
            <Text role="alert" small style={{ color: c.error }}>
              {copy.offlineBody}
            </Text>
          ) : null}
          <Button
            label={copy.restoreRetry}
            onPress={retrySession}
            loading={busy || session.isRefetching}
          />
          <Button
            variant="text"
            label={copy.useDifferentLogin}
            onPress={() => changeStep('email')}
            disabled={busy}
          />
        </View>
      </PublicPage>
    );
  }

  return (
    <PublicPage auth>
      <View
        style={{
          width: '100%',
          maxWidth: wide ? 1040 : 470,
          alignSelf: 'center',
          flexDirection: wide ? 'row' : 'column',
          alignItems: wide ? 'stretch' : undefined,
          marginTop: wide ? 24 : 16,
          marginBottom: wide ? 40 : 28,
          ...(wide
            ? {
                borderRadius: 30,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.surface,
                overflow: 'hidden',
              }
            : { gap: 20 }),
        }}
      >
        {wide ? <AuthArtwork wide /> : null}
        <View
          style={{
            flex: wide ? 1 : undefined,
            minWidth: 0,
            justifyContent: 'center',
            gap: wide ? 18 : 17,
            paddingHorizontal: wide ? 37 : 0,
            paddingVertical: wide ? 30 : 0,
          }}
        >
          <View style={{ gap: 8 }}>
            {step !== 'email' ? (
              <SignatureIcon
                icon={step === 'code' ? MailCheck : LockKeyhole}
                tone="lime"
                size={50}
              />
            ) : null}
            <Heading size={wide ? 37 : 33}>{t(title)}</Heading>
            <Text muted style={{ fontSize: 15, lineHeight: 23, maxWidth: 410 }}>
              {t(
                step === 'code'
                  ? 'authCodeIntro'
                  : step === 'password'
                    ? 'authPasswordIntro'
                    : 'authWelcomeBody',
              )}
            </Text>
          </View>

          {connectionIssue ? (
            <View
              style={{
                backgroundColor: c.elevated,
                borderRadius: 15,
                borderLeftWidth: 3,
                borderColor: c.error,
                padding: 12,
                gap: 6,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <WifiOff size={17} color={c.error} />
                <Text role="alert" bold small>
                  {copy.offlineTitle}
                </Text>
              </View>
              <Text small muted>
                {copy.offlineBody}
              </Text>
              <Action
                label={copy.offlineRetry}
                onPress={reconnect}
                disabled={busy}
                style={{ alignSelf: 'flex-start' }}
              >
                <Text small bold style={{ color: c.primary }}>
                  {copy.offlineRetry}
                </Text>
              </Action>
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
                  backgroundColor: c.elevated,
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                }}
              >
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
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
                onChangeText={(next) => {
                  setEmail(next);
                  if (error === 'authEmailInvalid') setError(null);
                }}
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType={step === 'email' ? 'go' : 'default'}
                maxLength={254}
                editable={!busy}
                placeholder="ban@example.com"
                style={{ minHeight: 54, borderRadius: 16 }}
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
                  returnKeyType="go"
                  maxLength={128}
                  editable={!busy}
                  style={{ minHeight: 54, borderRadius: 16 }}
                  error={error === 'authPasswordRequired' ? t(error) : undefined}
                  onSubmitEditing={signInPassword}
                />
              ) : null}
            </View>
          )}

          {error &&
          !['authConnectionError', 'authEmailInvalid', 'authPasswordRequired'].includes(error) ? (
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

          <View style={{ gap: 7 }}>
            <Button
              icon={<ArrowRight size={17} color={c.onPrimary} />}
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

          {step === 'email' && googleAvailable ? (
            <View style={{ gap: 9 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ height: 1, flex: 1, backgroundColor: c.border }} />
                <Text small muted>
                  {t('authOr')}
                </Text>
                <View style={{ height: 1, flex: 1, backgroundColor: c.border }} />
              </View>
              <GoogleAction
                onPress={signInGoogle}
                label={t('authGoogleContinue')}
                disabled={busy}
                busy={pending === 'google'}
              />
            </View>
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              borderTopWidth: 1,
              borderColor: c.border,
              paddingTop: 14,
            }}
          >
            <SignatureIcon icon={ShieldCheck} tone="emerald" size={33} />
            <Text small muted style={{ flex: 1 }}>
              {t('authHint')}
            </Text>
          </View>
          {step === 'email' ? (
            <Action
              label={copy.preview}
              onPress={() => router.push('/showcase')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start',
                alignSelf: 'flex-start',
                gap: 5,
              }}
            >
              <Text small bold style={{ color: c.primary }}>
                {copy.preview}
              </Text>
              <ArrowUpRight size={15} color={c.primary} />
            </Action>
          ) : null}
        </View>
        {!wide && step === 'email' ? <AuthArtwork wide={false} /> : null}
      </View>
    </PublicPage>
  );
}
