import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Wallet } from 'lucide-react-native';
import { Heading, Card, Text, EmptyState, Button, useDesign } from '@finora/ui';
import { date } from '@finora/i18n';
import { api, auth } from '../../src/services/client';
import { Page, Data, LinkRow } from '../../src/components/layout';
export default function Loans() {
  const { t, colors: c, locale, money } = useDesign();
  const user = auth.useSession();
  const q = useQuery({ queryKey: ['saved', user.data?.user.id], queryFn: api.saved });
  return (
    <Page title={t('loans')}>
      <Card>
        <Heading size={25}>{t('active')}</Heading>
        <Text muted>{t('emptyActive')}</Text>
      </Card>
      <Heading size={26}>{t('saved')}</Heading>
      <Data q={q}>
        {(rows) =>
          rows.length ? (
            rows.map((r) => (
              <Card key={r.id}>
                <LinkRow
                  title={locale === 'vi-VN' ? r.product.name : r.product.nameEn}
                  body={
                    money(r.input.principal) +
                    ' · ' +
                    r.input.months +
                    ' ' +
                    t('months') +
                    ' · ' +
                    date(r.createdAt, locale)
                  }
                  icon={<Wallet color={c.primary} />}
                  onPress={() => router.push('/saved/' + r.id)}
                />
              </Card>
            ))
          ) : (
            <EmptyState
              title={t('emptySaved')}
              body={t('emptySavedText')}
              action={<Button label={t('learn')} onPress={() => router.navigate('/explore')} />}
            />
          )
        }
      </Data>
    </Page>
  );
}
