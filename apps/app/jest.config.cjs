module.exports = {
  watchman: false,
  preset: 'jest-expo',
  testMatch: ['**/test/**/*.test.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-.*|react-native-.*|nativewind|lucide-react-native|@finora/.*)/)',
  ],
};
