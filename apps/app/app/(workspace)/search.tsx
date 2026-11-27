import { useRef, useState, type ComponentRef } from 'react';
import { Keyboard, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, ChevronRight, Search, X } from 'lucide-react-native';
import { tokens } from '@finora/design-tokens';
import { homeCopy } from '@finora/i18n';
import { Action, Heading, Text, useDesign } from '@finora/ui';
import { searchHomeServices } from '../../src/features/home-search-model';

export default function SearchScreen() {
  const { locale, colors: c } = useDesign();
  const copy = homeCopy(locale);
  const [term, setTerm] = useState('');
  const [focused, setFocused] = useState(false);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const results = searchHomeServices(term, locale);
  const go = (href: (typeof results)[number]['href']) => {
    Keyboard.dismiss();
    router.push(href);
  };
  return (
    <View testID="service-search-surface" style={{ flex: 1, backgroundColor: c.surface }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 4 }}>
          <Action
            label={copy.searchBack}
            onPress={() => {
              Keyboard.dismiss();
              if (router.canGoBack()) router.back();
              else router.replace('/home');
            }}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowLeft size={22} color={c.foreground} />
          </Action>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: 24,
              minHeight: 46,
              borderWidth: 1,
              borderColor: focused ? c.focus : c.border,
              backgroundColor: c.input,
              paddingLeft: 14,
              paddingRight: 4,
              gap: 8,
            }}
          >
            <Search size={18} color={c.muted} />
            <TextInput
              ref={input}
              testID="finora-service-search-input"
              autoFocus
              accessibilityLabel={copy.search}
              placeholder={copy.searchHint}
              placeholderTextColor={c.muted}
              value={term}
              onChangeText={setTerm}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={() => {
                if (results.length === 1) go(results[0]!.href);
              }}
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 44,
                fontSize: 16,
                fontFamily: tokens.font.body,
                color: c.foreground,
              }}
            />
            {term.length > 0 && (
              <Action
                label={copy.searchClear}
                onPress={() => {
                  setTerm('');
                  input.current?.focus();
                }}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} color={c.muted} />
              </Action>
            )}
          </View>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 48, gap: 8 }}
        >
          <Heading size={22}>{term.trim() ? copy.searchResults : copy.searchSuggested}</Heading>
          {results.map(({ label, href }) => (
            <Action
              key={href}
              label={label}
              onPress={() => go(href)}
              style={{
                minHeight: 50,
                paddingVertical: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                borderBottomWidth: 1,
                borderColor: c.border,
              }}
            >
              <Text>{label}</Text>
              <ChevronRight size={17} color={c.muted} />
            </Action>
          ))}
          {!results.length && (
            <Text role="alert" muted>
              {copy.searchEmpty}
            </Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
}
