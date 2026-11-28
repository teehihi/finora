import { useRef, useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { BottomSheet, Button, Text, Toast, useDesign } from '@finora/ui';
import { auth } from '../../services/client';
import { passkeyCopy } from './passkey-copy';

type PasskeySummary = { id: string; name?: string | null };

export function ProfilePasskeys({ owner, supported }: { owner: string; supported: boolean }) {
  const { colors: c, locale, t } = useDesign();
  const copy = passkeyCopy[locale];
  const session = auth.useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [removal, setRemoval] = useState<PasskeySummary>();
  const lock = useRef(false);
  const passkeys = useQuery({
    queryKey: ['passkeys', owner],
    queryFn: async () => {
      const actual = await auth.$fetch<PasskeySummary[]>('/passkey/list-user-passkeys');
      if (actual.error || !actual.data) throw new Error('Passkeys unavailable');
      return actual.data;
    },
  });
  const verified = session.data?.user.emailVerified === true;

  async function run(action: 'add' | 'remove') {
    if (lock.current) return;
    if (action === 'add' && (!verified || !supported)) return;
    if (action === 'remove' && !removal) return;
    lock.current = true;
    setBusy(true);
    setNotice(undefined);
    setError(undefined);
    try {
      const result =
        action === 'add'
          ? await auth.passkey.addPasskey({ name: 'FINORA', authenticatorAttachment: 'platform' })
          : await auth.passkey.deletePasskey({ id: removal!.id });
      if (result.error) {
        const code = 'code' in result.error ? result.error.code : undefined;
        setError(
          code === 'SESSION_NOT_FRESH' || code === 'PASSKEY_RECENT_SIGN_IN'
            ? copy.recent
            : code === 'AUTH_VERIFY_EMAIL_FIRST'
              ? copy.verifyEmail
              : code === 'ERROR_CEREMONY_ABORTED'
                ? copy.cancelled
                : t('error'),
        );
        return;
      }
      setRemoval(undefined);
      setNotice(action === 'add' ? copy.created : copy.deleted);
      await passkeys.refetch();
    } catch {
      setError(t('error'));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const feedback = error ? (
    <Text role="alert" small style={{ color: c.error }}>
      {error}
    </Text>
  ) : null;
  return (
    <View style={{ gap: 7, alignItems: 'flex-start' }}>
      <Text bold>{copy.title}</Text>
      {supported ? (
        <Text small muted>
          {verified ? copy.description : copy.verifyEmail}
        </Text>
      ) : null}
      {passkeys.isError ? (
        <Button label={t('retry')} variant="text" onPress={() => void passkeys.refetch()} />
      ) : null}
      {passkeys.data?.map((item, index) => (
        <View key={item.id} style={{ gap: 4, flexDirection: 'row', alignItems: 'center' }}>
          <Text small>{(item.name || copy.title) + ' ' + (index + 1)}</Text>
          <Button
            label={copy.remove}
            variant="text"
            disabled={busy}
            onPress={() => {
              setError(undefined);
              setNotice(undefined);
              setRemoval(item);
            }}
          />
        </View>
      ))}
      {supported ? (
        <Button
          label={copy.add}
          variant="outline"
          disabled={!verified || busy}
          loading={busy && !removal}
          onPress={() => void run('add')}
        />
      ) : null}
      {removal ? null : feedback}
      <BottomSheet
        visible={!!removal}
        title={copy.removeTitle}
        onClose={() => {
          if (!busy) setRemoval(undefined);
        }}
      >
        <Text muted>{copy.removeBody}</Text>
        {removal ? feedback : null}
        <Button label={copy.remove} loading={busy} onPress={() => void run('remove')} />
        <Button
          label={t('cancel')}
          variant="text"
          disabled={busy}
          onPress={() => setRemoval(undefined)}
        />
      </BottomSheet>
      {notice ? <Toast>{notice}</Toast> : null}
    </View>
  );
}
