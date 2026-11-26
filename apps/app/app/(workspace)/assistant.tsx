import { useLocalSearchParams } from 'expo-router';
import Intelligence from '../../src/features/intelligence/workspace';
import LegacyChat from '../../src/features/intelligence/legacy-chat';

export default function Assistant() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  return mode === 'legacy' ? <LegacyChat /> : <Intelligence />;
}
