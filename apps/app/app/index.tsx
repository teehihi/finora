import { LaunchScene } from '../src/components/LaunchScene';
import { Redirect } from 'expo-router';
import { auth } from '../src/services/client';

export default function Index() {
  const session = auth.useSession();
  if (session.isPending) return <LaunchScene checking />;

  return <Redirect href={session.data ? '/home' : '/auth'} />;
}
