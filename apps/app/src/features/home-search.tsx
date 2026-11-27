import { dark } from '@finora/design-tokens';
import { View } from 'react-native';
import { Search } from 'lucide-react-native';
import { router } from 'expo-router';
import { Action, Heading, Text, useDesign } from '@finora/ui';
import { homeCopy } from '@finora/i18n';

export function HomeSearch({ greeting, gutter }: { greeting: string; gutter: number }) {
  const { colors: c, locale } = useDesign();
  const copy = homeCopy(locale);
  return (
    <View
      style={{
        marginHorizontal: -gutter,
        paddingHorizontal: gutter,
        paddingTop: gutter ? 7 : 0,
        gap: gutter ? 8 : 12,
      }}
    >
      {gutter === 0 && <Heading size={28}>{greeting}</Heading>}
      <Action
        label={copy.search}
        onPress={() => router.push('/search')}
        style={{
          minHeight: 46,
          maxWidth: gutter ? undefined : 600,
          borderRadius: 24,
          backgroundColor: c === dark ? '#243C31' : '#FFFFFF',
          borderWidth: 1,
          borderColor: c === dark ? '#44634E' : '#C3DDC0',
          justifyContent: 'flex-start',
          paddingHorizontal: 15,
          gap: 10,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Search color={c === dark ? '#BFE5C1' : '#386F49'} size={20} strokeWidth={2.2} />
        <Text style={{ fontSize: 15, color: c === dark ? '#D0E5D4' : '#41584A' }}>
          {copy.searchHint}
        </Text>
      </Action>
      {gutter > 0 && <Heading size={23}>{greeting}</Heading>}
    </View>
  );
}
