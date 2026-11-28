import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, View, useWindowDimensions } from 'react-native';
import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import { ArrowRight, ArrowUpRight, MailCheck, ShieldCheck, WifiOff } from 'lucide-react-native';
import { z } from 'zod';
import { getAccessStrings, type Key } from '@finora/i18n';
import { Action, Button, Field, Heading, Text, useDesign } from '@finora/ui';
import { LaunchScene } from '../src/components/LaunchScene';
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
import { passkeySupported } from '../src/services/passkey-client';
import { passkeyCopy } from '../src/features/auth/passkey-copy';
import { GoogleAction } from '../src/features/auth/GoogleAction';
import { AuthArtwork } from '../src/features/auth/AuthArtwork';
import { twoFactorCopy } from '../src/features/auth/two-factor-copy';
import { AccessProgress } from '../src/features/auth/AccessProgress';

type Step = 'email' | 'code' | 'password' | 'totp';
type Pending =
  'request' | 'resend' | 'verify' | 'password' | 'google' | 'passkey' | 'reconnect' | 'restore';
const emailSchema = z.email().max(254);

export default function Auth() {
  const params = useLocalSearchParams<{ returnTo?: string; oauth?: string }>();
  const returnTo = allowedAuthReturn(params.returnTo);
  const { colors: c, locale, t } = useDesign();
  const copy = getAccessStrings(locale);
  const factor = twoFactorCopy[locale];
  const passkey = passkeyCopy[locale];
  const vi = locale === 'vi-VN';
  const { width } = useWindowDimensions();
  const wide = width >= 1024;
  const session = auth.useSession();
  const methods = useIdentityOptions();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [factorBackStep, setFactorBackStep] = useState<'email' | 'password'>('email');
  const [factorError, setFactorError] = useState<string>();
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

  useEffect(() => {
    if (Platform.OS !== 'web' || params.oauth !== 'complete') return;
    let active = true;
    void auth.$fetch<{ required: boolean }>('/two-factor/status').then(
      ({ data, error }) => {
        if (!active) return;
        if (data?.required) {
          setFactorBackStep('email');
          setStep('totp');
        } else if (error) {
          setError('authConnectionError');
        }
      },
      () => {
        if (active) setError('authConnectionError');
      },
    );
    return () => {
      active = false;
    };
  }, [params.oauth]);

  if (session.data) return <Redirect href={returnTo as Href} />;

  async function run(work: () => Promise<void>, operation: Pending, fallback: Key) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(operation);
    setError(null);
    setFactorError(undefined);
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
    setFactorError(undefined);
    setNotice(null);
    setRestoring(false);
    setRecovery(false);
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
        if (result.data && 'twoFactorRedirect' in result.data && result.data.twoFactorRedirect) {
          return startFactor('email');
        }
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
        if (result.data && 'twoFactorRedirect' in result.data && result.data.twoFactorRedirect) {
          return startFactor('password');
        }
        setRestoring(true);
        await session.refetch();
      },
      'password',
      'authConnectionError',
    );
  }

  function startFactor(back: 'email' | 'password') {
    setCode('');
    setRecovery(false);
    setFactorBackStep(back);
    setStep('totp');
  }

  function cancelAuthenticator() {
    void run(
      async () => {
        const result = await auth.$fetch('/two-factor/cancel', { method: 'POST' });
        if (result.error) return setError('authGenericError');
        setCode('');
        setRecovery(false);
        setStep(factorBackStep);
      },
      'verify',
      'authConnectionError',
    );
  }

  function verifyAuthenticator() {
    if (inFlight.current) return;
    if (recovery ? !code.trim() : !/^\d{6}$/.test(code)) return setFactorError(factor.incorrect);
    void run(
      async () => {
        const result = recovery
          ? await auth.twoFactor.verifyBackupCode({ code: code.trim() })
          : await auth.twoFactor.verifyTotp({ code });
        if (result.error) {
          const reason = result.error.code;
          if (
            reason === 'INVALID_TWO_FACTOR_COOKIE' ||
            reason === 'TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE' ||
            reason === 'ACCOUNT_TEMPORARILY_LOCKED'
          ) {
            setStep(factorBackStep);
            setRecovery(false);
            setFactorError(
              reason === 'ACCOUNT_TEMPORARILY_LOCKED' ? factor.locked : factor.expired,
            );
          } else if (result.error.status === 429) {
            setFactorError(factor.locked);
          } else if (reason === 'INVALID_CODE' || reason === 'INVALID_BACKUP_CODE') {
            setFactorError(factor.incorrect);
          } else {
            setError('authGenericError');
          }
          setCode('');
          return;
        }
        setCode('');
        setRestoring(true);
        await session.refetch();
      },
      'verify',
      'authConnectionError',
    );
  }

  function signInPasskey() {
    if (!passkeySupported(methods.data?.passkey)) return;
    void run(
      async () => {
        const result = await auth.signIn.passkey();
        if (result.error || !result.data?.session) {
          const code = result.error && 'code' in result.error ? result.error.code : undefined;
          setFactorError(
            code === 'ERROR_CEREMONY_ABORTED' ? passkey.cancelled : passkey.unavailable,
          );
          return;
        }
        setRestoring(true);
        await session.refetch();
      },
      'passkey',
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
          callbackURL: oauthCallback(
            `/auth?oauth=complete&returnTo=${encodeURIComponent(returnTo)}`,
          ),
          errorCallbackURL: oauthCallback(errorPath),
        });
        if (result.error) return setError('authGoogleError');
        if (Platform.OS !== 'web') {
          // Expo's system browser can return without a session when dismissed.
          const restored = await auth.getSession();
          if (!restored.data) {
            const status = await auth.$fetch<{ required: boolean }>('/two-factor/status');
            if (status.data?.required) return startFactor('email');
            return setError('authGoogleNoSession');
          }
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
  const showPasskey = step === 'email' && passkeySupported(methods.data?.passkey);
  const title = step === 'code' ? 'authCodeTitle' : 'signIn';
  const verificationInvalid =
    error === 'authCodeNeedSix' || error === 'authCodeAttempts' || error === 'authCodeInvalid';
  if (session.isPending && !busy && !restoring && step === 'email') return <LaunchScene checking />;

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
    <PublicPage auth>
      <View
        style={{
          width: '100%',
          maxWidth: wide ? 1040 : 470,
          alignSelf: 'center',
          flexDirection: wide ? 'row' : 'column',
          alignItems: wide ? 'stretch' : undefined,
          marginTop: wide ? 24 : 10,
          marginBottom: wide ? 40 : 28,
          ...(wide
            ? {
                borderRadius: 30,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.surface,
                overflow: 'hidden',
              }
            : { gap: 15 }),
        }}
      >
        {wide ? <AuthArtwork wide /> : step === 'email' ? <AuthArtwork wide={false} /> : null}
        <View
          style={{
            flex: wide ? 1 : undefined,
            minWidth: 0,
            justifyContent: 'center',
            gap: wide ? 18 : 13,
            paddingHorizontal: wide ? 37 : 0,
            paddingVertical: wide ? 30 : 0,
          }}
        >
          <View style={{ gap: 8 }}>
            {step !== 'totp' && (step !== 'email' || emailAvailable) ? (
              <AccessProgress step={step} />
            ) : null}
            <Heading size={wide ? 37 : 33}>{step === 'totp' ? factor.title : t(title)}</Heading>
            <Text muted style={{ fontSize: 15, lineHeight: 23, maxWidth: 410 }}>
              {step === 'totp'
                ? recovery
                  ? factor.recoveryIntro
                  : factor.intro
                : t(
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

          {showPasskey ? (
            <Button
              label={passkey.action}
              onPress={signInPasskey}
              loading={pending === 'passkey'}
              disabled={busy}
            />
          ) : null}

          {step === 'totp' ? (
            <Field
              label={recovery ? factor.recoveryCode : factor.code}
              value={code}
              onChangeText={(value) => {
                setFactorError(undefined);
                setCode(recovery ? value : value.replace(/[^0-9]/g, '').slice(0, 6));
              }}
              keyboardType={recovery ? 'default' : 'number-pad'}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              maxLength={recovery ? 32 : 6}
              editable={!busy}
              error={factorError}
              onSubmitEditing={verifyAuthenticator}
            />
          ) : step === 'code' ? (
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
                  <Text bold numberOfLines={2} style={{ fontSize: 15, lineHeight: 21 }}>
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
                setCode={(value) => {
                  setCode(value);
                  if (verificationInvalid) setError(null);
                }}
                editable={!busy}
                invalid={verificationInvalid}
                onSubmit={verifyCode}
              />
              <Text small muted>
                {vi
                  ? 'Chưa thấy thư? Kiểm tra hộp thư rác hoặc sửa địa chỉ trên.'
                  : 'No email yet? Check spam or edit the address above.'}
              </Text>
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
                inputMode="email"
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
                  autoFocus
                  maxLength={128}
                  editable={!busy}
                  style={{ minHeight: 54, borderRadius: 16 }}
                  error={error === 'authPasswordRequired' ? t(error) : undefined}
                  onSubmitEditing={signInPassword}
                />
              ) : null}
            </View>
          )}

          {factorError && step !== 'totp' ? (
            <Text role="alert" small style={{ color: c.error }}>
              {factorError}
            </Text>
          ) : null}
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
              variant={showPasskey ? 'outline' : 'primary'}
              icon={<ArrowRight size={17} color={showPasskey ? c.primary : c.onPrimary} />}
              label={t(
                step === 'code' || step === 'totp'
                  ? 'authCodeConfirm'
                  : step === 'password'
                    ? 'signIn'
                    : 'authContinueEmail',
              )}
              onPress={
                step === 'totp'
                  ? verifyAuthenticator
                  : step === 'code'
                    ? verifyCode
                    : step === 'password'
                      ? signInPassword
                      : () => requestCode()
              }
              loading={pending === 'request' || pending === 'verify' || pending === 'password'}
              disabled={busy || (step === 'email' && !emailAvailable)}
            />
            {step === 'totp' ? (
              <>
                <Button
                  variant="text"
                  label={recovery ? factor.useAuthenticator : factor.useRecovery}
                  disabled={busy}
                  onPress={() => {
                    setCode('');
                    setFactorError(undefined);
                    setError(null);
                    setRecovery(!recovery);
                  }}
                />
                <Button
                  variant="text"
                  label={factor.back}
                  disabled={busy}
                  onPress={cancelAuthenticator}
                />
              </>
            ) : step === 'code' ? (
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

          {step !== 'totp' ? (
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
          ) : null}
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
      </View>
    </PublicPage>
  );
}
