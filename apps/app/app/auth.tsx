import boat from '../assets/images/paper-boat.jpg';
import { useState } from 'react';
import { View, Image, useWindowDimensions } from 'react-native';
import { router, Redirect, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Heading, Text, Field, Action, useDesign } from '@finora/ui';
import { PublicPage } from '../src/components/layout';
import { auth, api } from '../src/services/client';
import { usePrefs } from '../src/providers/AppProviders';
export default function Auth() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const signup = params.mode === 'signup';
  const { colors: c, t, locale } = useDesign();
  const appearance = usePrefs((state) => state.appearance);
  const { width } = useWindowDimensions();
  const [error, setError] = useState(false);
  const session = auth.useSession();
  const form = useForm({
    resolver: zodResolver(
      z.object({
        name: signup ? z.string().trim().min(1).max(80) : z.string(),
        email: z.email(),
        password: z
          .string()
          .min(signup ? 8 : 1)
          .max(128),
      }),
    ),
    defaultValues: { email: '', password: '', name: '' },
  });
  if (session.data) return <Redirect href="/home" />;
  const submit = form.handleSubmit(async (values) => {
    setError(false);
    try {
      const r = signup
        ? await auth.signUp.email(values)
        : await auth.signIn.email({ email: values.email, password: values.password });
      if (r.error) {
        setError(true);
        return;
      }
      if (signup && (locale !== 'vi-VN' || appearance !== 'light')) {
        try {
          await api.preferences({ locale, appearance });
        } catch {
          // Keep the successful sign-up if preferences need to be saved later.
        }
      }
      await session.refetch();
      router.replace('/home');
    } catch {
      setError(true);
    }
  });
  return (
    <PublicPage auth>
      <View
        style={{
          flexDirection: width >= 900 ? 'row' : 'column',
          alignItems: 'stretch',
          gap: 48,
          justifyContent: 'center',
          paddingVertical: width >= 900 ? 56 : 32,
        }}
      >
        {width >= 900 ? (
          <Image
            source={boat}
            style={{ flex: 1, maxWidth: 510, minHeight: 530, borderRadius: 20 }}
          />
        ) : null}
        <View style={{ flex: 1, maxWidth: 440, width: '100%', alignSelf: 'center', gap: 18 }}>
          <Heading size={40}>{t(signup ? 'signUpTitle' : 'signInTitle')}</Heading>
          <Text muted>{t('authHint')}</Text>
          {(signup
            ? (['name', 'email', 'password'] as const)
            : (['email', 'password'] as const)
          ).map((key) => (
            <Controller
              key={key}
              control={form.control}
              name={key}
              render={({ field, fieldState }) => (
                <Field
                  label={t(key)}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  secureTextEntry={key === 'password'}
                  autoComplete={
                    key === 'password'
                      ? signup
                        ? 'new-password'
                        : 'current-password'
                      : key === 'email'
                        ? 'email'
                        : 'name'
                  }
                  autoCapitalize={key === 'name' ? 'words' : 'none'}
                  keyboardType={key === 'email' ? 'email-address' : 'default'}
                  hint={signup && key === 'password' ? t('pwdHint') : undefined}
                  error={fieldState.invalid ? t('invalid') : undefined}
                  onSubmitEditing={key === 'password' ? submit : undefined}
                />
              )}
            />
          ))}
          {error ? (
            <Text role="alert" style={{ color: c.error }}>
              {t(signup ? 'registerError' : 'authError')}
            </Text>
          ) : null}
          <Button
            label={t(signup ? 'signUp' : 'signIn')}
            loading={form.formState.isSubmitting}
            onPress={submit}
          />
          <Action
            onPress={() => {
              setError(false);
              form.clearErrors();
              router.setParams({ mode: signup ? 'signin' : 'signup' });
            }}
          >
            <Text muted>
              {t(signup ? 'haveAccount' : 'needAccount')}{' '}
              <Text bold style={{ color: c.primary }}>
                {t(signup ? 'signIn' : 'signUp')}
              </Text>
            </Text>
          </Action>
        </View>
      </View>
    </PublicPage>
  );
}
