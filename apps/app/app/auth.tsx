import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, View, useWindowDimensions } from 'react-native';
import { Redirect, useLocalSearchParams, type Href } from 'expo-router';
import { ArrowRight, LockKeyhole, Mail, MailCheck } from 'lucide-react-native';
import { z } from 'zod';
import { getAccessStrings, type Key } from '@finora/i18n';
import { Action, Button, Heading, Text, useDesign } from '@finora/ui';
import { LaunchScene } from '../src/components/LaunchScene';
import { Logo, PublicPage } from '../src/components/layout';
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
import { AuthInputField } from '../src/features/auth/AuthInputField';
import finVerification from '../assets/brand/fin-verification.png';

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
  const title =
    step === 'code' ? 'authCodeTitle' : step === 'password' ? 'authPasswordTitle' : 'authWelcome';
  const verificationInvalid =
    error === 'authCodeNeedSix' ||
    error === 'authCodeAttempts' ||
    error === 'authCodeExpired' ||
    error === 'authCodeInvalid';
  if (session.isPending && !busy && !restoring && step === 'email') return <LaunchScene checking />;

  if (restoring) {
    return (
      <PublicPage auth authBack={{ label: t('back'), onPress: () => changeStep('email') }}>
        <View
          style={{
            width: '100%',
            maxWidth: 490,
            alignSelf: 'center',
            flex: 1,
            justifyContent: 'center',
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
          {busy || session.isRefetching ? (
            <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: 8 }}>
              <ActivityIndicator color={c.primary} />
              <Text muted small>
                {t('authChecking')}
              </Text>
            </View>
          ) : (
            <>
              <Button label={copy.restoreRetry} onPress={retrySession} />
              <Button
                variant="text"
                label={copy.useDifferentLogin}
                onPress={() => changeStep('email')}
              />
            </>
          )}
        </View>
      </PublicPage>
    );
  }

  return (
    <PublicPage
      auth
      authBrand={false}
      authBack={
        step === 'email' ? undefined : { label: t('back'), onPress: () => changeStep('email') }
      }
    >
      <View
        style={{
          width: '100%',
          maxWidth: wide ? 1100 : 470,
          alignSelf: 'center',
          flexDirection: wide ? 'row' : 'column',
          alignItems: 'stretch',
          marginTop: 0,
          marginBottom: 0,
          ...(wide
            ? {
                flex: 1,
                minHeight: 600,
                gap: 28,
              }
            : { flex: 1, gap: 5 }),
        }}
      >
        {wide ? <AuthArtwork wide /> : null}
        <View
          style={{
            flex: 1,
            minWidth: 0,
            justifyContent: 'center',
            gap: wide ? 20 : 16,
            paddingHorizontal: wide ? 42 : 0,
            paddingVertical: wide ? 34 : 12,
          }}
        >
          <View style={{ gap: 8, alignItems: step === 'code' ? 'center' : 'stretch' }}>
            {step !== 'code' ? (
              <View style={{ alignItems: 'center', gap: 1, marginBottom: 5 }}>
                <Logo auth />
                <Text small muted style={{ fontSize: 12, lineHeight: 16 }}>
                  {t('authBrandSlogan')}
                </Text>
              </View>
            ) : null}
            {step === 'code' ? (
              <View style={{ height: 90, width: 112, marginBottom: 0 }}>
                <Image
                  source={finVerification}
                  resizeMode="contain"
                  accessibilityLabel={t('authCodeTitle')}
                  style={{ width: '100%', height: '100%' }}
                />
              </View>
            ) : null}
            <Heading
              size={wide ? 34 : 29}
              style={{ textAlign: step === 'code' ? 'center' : 'left' }}
            >
              {t(title)}
            </Heading>
            {step === 'code' ? (
              <View style={{ alignItems: 'center', gap: 3 }}>
                <Text muted style={{ fontSize: 15, lineHeight: 21, textAlign: 'center' }}>
                  {t('authCodeIntro')}
                </Text>
                <Text bold style={{ fontSize: 15, lineHeight: 21, textAlign: 'center' }}>
                  {email.replace(/^(.{1,2})[^@]*/, '$1•••')}
                </Text>
                <Text small muted style={{ textAlign: 'center' }}>
                  {t('authCodeExpiresIn')}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                  <Text small muted>
                    {t('authEmailWrong')}
                  </Text>
                  <Action
                    disabled={busy}
                    onPress={() => changeStep('email')}
                    label={t('authEditEmail')}
                    style={{ minHeight: 28, justifyContent: 'center' }}
                  >
                    <Text small bold style={{ color: c.primary }}>
                      {t('authEditEmail')}
                    </Text>
                  </Action>
                </View>
              </View>
            ) : (
              <Text
                muted
                style={{
                  fontSize: 15,
                  lineHeight: 22,
                  maxWidth: 410,
                  textAlign: 'left',
                }}
              >
                {t(step === 'password' ? 'authPasswordIntro' : 'authWelcomeBody')}
              </Text>
            )}
          </View>

          {step === 'code' ? (
            <View style={{ gap: 13 }}>
              <VerificationField
                code={code}
                setCode={(value) => {
                  setCode(value);
                  if (verificationInvalid) setError(null);
                }}
                editable={!busy}
                invalid={verificationInvalid}
                onSubmit={verifyCode}
              />
            </View>
          ) : (
            <View style={{ gap: 13 }}>
              <AuthInputField
                label={t('email')}
                icon={Mail}
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
                placeholder={t('authEmailPlaceholder')}
                inputMode="email"
                error={error === 'authEmailInvalid' ? t(error) : undefined}
                onSubmitEditing={step === 'email' ? () => requestCode() : undefined}
              />
              {step === 'password' ? (
                <AuthInputField
                  label={t('password')}
                  icon={LockKeyhole}
                  value={password}
                  onChangeText={setPassword}
                  secure
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  autoFocus
                  maxLength={128}
                  editable={!busy}
                  error={error === 'authPasswordRequired' ? t(error) : undefined}
                  onSubmitEditing={signInPassword}
                />
              ) : null}
            </View>
          )}

          {error &&
          !['authConnectionError', 'authEmailInvalid', 'authPasswordRequired'].includes(error) ? (
            <Text
              role="alert"
              small
              style={{ color: c.error, textAlign: step === 'code' ? 'center' : 'left' }}
            >
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
              disabled={
                busy ||
                (step === 'email' && !emailAvailable) ||
                (step === 'code' && code.length !== 6)
              }
            />
            {connectionIssue ? (
              <View
                style={{
                  minHeight: 24,
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                <Text role="alert" small numberOfLines={1} style={{ color: c.error }}>
                  {copy.offlineTitle}
                </Text>
                <Text small muted>
                  ·
                </Text>
                <Action
                  label={copy.offlineRetry}
                  onPress={reconnect}
                  disabled={busy}
                  style={{ minHeight: 28, justifyContent: 'center' }}
                >
                  <Text small bold style={{ color: c.primary }}>
                    {copy.offlineRetry}
                  </Text>
                </Action>
              </View>
            ) : null}
            {step === 'code' ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  marginTop: 4,
                }}
              >
                <Text small muted numberOfLines={1}>
                  {t('authCodeNoEmail')}
                </Text>
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
                style={{
                  alignItems: 'center',
                  marginTop: 6,
                  minHeight: 40,
                  justifyContent: 'center',
                }}
              >
                <Text small bold style={{ color: c.primary }}>
                  {t(step === 'password' ? 'authUseCode' : 'authUsePassword')}
                </Text>
              </Action>
            )}
          </View>

          {step !== 'code' ? (
            <View style={{ gap: 9, marginTop: 2 }}>
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
                disabled={busy || !googleAvailable}
                busy={pending === 'google'}
              />
            </View>
          ) : null}
        </View>
      </View>
    </PublicPage>
  );
}
