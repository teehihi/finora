import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { dark } from '@finora/design-tokens';
import { homeHeaderTopColor } from './home-header-theme';
import { ChevronRight, Search } from 'lucide-react-native';
import { router } from 'expo-router';
import { Action, Dialog, Field, Heading, Text, useDesign } from '@finora/ui';
import { homeCopy } from '@finora/i18n';
import { searchHomeServices } from './home-search-model';

export function HomeSearch({ greeting, gutter }: { greeting: string; gutter: number }) {
  const { colors: c, locale } = useDesign();
  const copy = homeCopy(locale);
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const close = () => {
    setOpen(false);
    setTerm('');
  };
  const results = searchHomeServices(term, locale);
  return (
    <View
      style={{
        marginHorizontal: -gutter,
        paddingHorizontal: gutter,
        paddingTop: gutter ? 7 : 0,
        gap: 12,
      }}
    >
      {gutter === 0 && <Heading size={28}>{greeting}</Heading>}
      {gutter > 0 && (
        <View
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={StyleSheet.absoluteFill}
        >
          <Svg width="100%" height="100%" viewBox="0 0 390 108" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="mastheadWash" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0" stopColor={homeHeaderTopColor(c === dark)} />
                <Stop offset=".48" stopColor={c === dark ? '#203A2E' : '#E8F5DE'} />
                <Stop offset="1" stopColor={c.surface} />
              </LinearGradient>
            </Defs>
            <Rect width="390" height="108" fill="url(#mastheadWash)" />
            {[0, 1, 2, 3, 4].map((n) => (
              <Path
                key={n}
                d={`M ${175 + n * 10} 85 C 250 80, 288 ${26 + n * 6}, 405 ${34 + n * 7}`}
                fill="none"
                stroke={c === dark ? '#66A47D' : '#6CA965'}
                strokeWidth=".85"
                opacity={0.15}
              />
            ))}
          </Svg>
        </View>
      )}
      <Action
        label={copy.search}
        onPress={() => setOpen(true)}
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
      <Dialog bottom visible={open} title={copy.search} onClose={close}>
        {open && (
          <>
            <Field
              autoFocus
              value={term}
              onChangeText={setTerm}
              autoCorrect={false}
              label={copy.search}
              placeholder={copy.searchHint}
              returnKeyType="search"
              onSubmitEditing={() => {
                if (results.length === 1) {
                  close();
                  router.push(results[0]!.href);
                }
              }}
            />
            {results.map(({ label, href }) => (
              <Action
                key={href}
                label={label}
                onPress={() => {
                  close();
                  router.push(href);
                }}
                style={{
                  minHeight: 46,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  borderBottomWidth: 1,
                  borderColor: c.border,
                }}
              >
                <Text bold>{label}</Text>
                <ChevronRight size={17} color={c.muted} />
              </Action>
            ))}
            {!results.length && (
              <Text role="alert" muted>
                {copy.searchEmpty}
              </Text>
            )}
          </>
        )}
      </Dialog>
    </View>
  );
}
