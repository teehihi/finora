import { View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, CalendarDays, Feather } from 'lucide-react-native';
import { Action, Heading, Text, Button, useDesign } from '@finora/ui';
import { date, numeric } from '@finora/i18n';
import { api, auth } from '../../src/services/client';
import { Page, Data } from '../../src/components/layout';

export default function Loans() {
  const { t, colors: c, locale, money } = useDesign();
  const { width } = useWindowDimensions();
  const desktop = width >= 1024;
  const user = auth.useSession();
  const q = useQuery({
    queryKey: ['saved', user.data?.user.id],
    queryFn: api.saved,
    enabled: !!user.data?.user.id,
  });

  return (
    <Page title={t('loans')} description={t('loansIntro')} eyebrow={t('loansNotebook')}>
      <View style={{ flexDirection: desktop ? 'row' : 'column', gap: desktop ? 28 : 22 }}>
        <View
          style={{
            width: desktop ? 250 : undefined,
            alignSelf: desktop ? 'flex-start' : 'stretch',
            gap: 10,
            padding: 18,
            backgroundColor: c.elevated,
            borderRadius: 14,
          }}
        >
          <CalendarDays size={20} color={c.primary} />
          <Heading size={23}>{t('active')}</Heading>
          <Text small muted>
            {t('emptyActive')}
          </Text>
          <View style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 10, gap: 3 }}>
            <Text small bold>
              {t('upcoming')}
            </Text>
            <Text small muted>
              {t('noActiveLedger')}
            </Text>
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
          <View style={{ gap: 3 }}>
            <Heading size={27}>{t('saved')}</Heading>
            <Text small muted>
              {t('savedOnlyNote')}
            </Text>
          </View>
          <Data q={q}>
            {(rows) =>
              rows.length ? (
                <View>
                  {rows.map((r) => {
                    const name = locale === 'vi-VN' ? r.product.name : r.product.nameEn;
                    return (
                      <Action
                        key={r.id}
                        label={name}
                        onPress={() => router.push('/saved/' + r.id)}
                        style={{
                          borderTopWidth: 1,
                          borderColor: c.border,
                          borderRadius: 0,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          paddingVertical: 14,
                        }}
                      >
                        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                          <Text bold>{name}</Text>
                          <Text small muted>
                            {t('savedDate')} {date(r.createdAt, locale)}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 3, flexShrink: 1 }}>
                          <Text small bold style={{ fontVariant: ['tabular-nums'] }}>
                            {money(r.input.principal)}
                          </Text>
                          <Text small muted>
                            {numeric(r.input.months, locale)} {t('months')}
                          </Text>
                        </View>
                        <ArrowUpRight size={17} color={c.primary} />
                      </Action>
                    );
                  })}
                </View>
              ) : (
                <View
                  style={{
                    alignItems: 'flex-start',
                    gap: 10,
                    paddingVertical: 22,
                    borderTopWidth: 1,
                    borderColor: c.border,
                  }}
                >
                  <Feather size={20} color={c.primary} />
                  <Text bold>{t('emptySaved')}</Text>
                  <Text small muted>
                    {t('emptySavedText')}
                  </Text>
                  <Button
                    label={t('learn')}
                    variant="outline"
                    onPress={() => router.navigate('/explore')}
                  />
                </View>
              )
            }
          </Data>
        </View>
      </View>
    </Page>
  );
}
