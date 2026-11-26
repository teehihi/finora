import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Text, useDesign } from '@finora/ui';
import { auth } from '../src/services/client';

export default function Index() {
  const session = auth.useSession();
  const { colors, t } = useDesign();

  if (session.isPending) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} />
        <Text muted small>
          {t('authChecking')}
        </Text>
      </View>
    );
  }

  return <Redirect href={session.data ? '/home' : '/auth'} />;
}
