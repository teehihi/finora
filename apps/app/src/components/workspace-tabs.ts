import { Compass, House, Sparkles, UserRound, Wallet } from 'lucide-react-native';

export const workspaceTabs = [
  ['home', '/home', House],
  ['explore', '/explore', Compass],
  ['ai', '/assistant', Sparkles],
  ['loans', '/loans', Wallet],
  ['profile', '/profile', UserRound],
] as const;
