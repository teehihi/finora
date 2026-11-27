import { dark } from '@finora/design-tokens';
import { Text as NativeText, View } from 'react-native';
import { Search } from 'lucide-react-native';
import { router } from 'expo-router';
import { Action, Heading, useDesign } from '@finora/ui';
import { homeCopy } from '@finora/i18n';
import { HomeSearchHint } from './home-search-hint';

export function HomeSearch({
  greeting,
  greetingName,
  gutter,
  animateHint,
}: {
  greeting: string;
  greetingName?: string;
  gutter: number;
  animateHint: boolean;
}) {
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
        <HomeSearchHint
          active={animateHint}
          fallback={copy.searchHint}
          vietnamese={locale === 'vi-VN'}
          color={c === dark ? '#D0E5D4' : '#41584A'}
        />
      </Action>
      {gutter > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Heading size={23} style={{ flexShrink: 1 }}>
            {greeting}
            {greetingName && (
              <NativeText testID="home-greeting-name" style={{ color: c.primary }}>
                {greetingName}
              </NativeText>
            )}
          </Heading>
          <NativeText
            testID="home-greeting-wave"
            aria-hidden
            accessible={false}
            style={{ fontSize: 16, lineHeight: 20 }}
          >
            👋
          </NativeText>
        </View>
      )}
    </View>
  );
}
