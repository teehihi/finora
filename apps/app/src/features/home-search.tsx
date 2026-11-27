import { useState } from 'react';
import { View } from 'react-native';
import { ChevronRight, Search } from 'lucide-react-native';
import { router } from 'expo-router';
import { Action, Dialog, Field, Heading, Text, useDesign } from '@finora/ui';
import { homeCopy } from '@finora/i18n';
import { searchHomeServices } from './home-search-model';

export function HomeSearch({ greeting }: { greeting: string }) {
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
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingVertical: 15,
        gap: 12,
        backgroundColor: c.forest,
        overflow: 'hidden',
      }}
    >
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: -58,
          top: -95,
          width: 220,
          height: 220,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {[220, 176, 132, 88].map((size) => (
          <View
            key={size}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderWidth: 1,
              borderColor: c.signatureLime,
              opacity: 0.24,
              borderRadius: size / 2,
            }}
          />
        ))}
      </View>
      <Heading size={22} style={{ color: c.onForest }}>
        {greeting}
      </Heading>
      <Action
        label={copy.search}
        onPress={() => setOpen(true)}
        style={{
          minHeight: 46,
          borderRadius: 24,
          backgroundColor: c.surface,
          paddingHorizontal: 15,
          gap: 10,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Search color={c.primary} size={19} />
        <Text small muted>
          {copy.searchHint}
        </Text>
      </Action>
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
