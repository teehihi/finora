import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Badge, SourceAttribution, useDesign } from '@finora/ui';
import { date } from '@finora/i18n';
import { api, auth } from '../../../src/services/client';
import { Page, Data, Back } from '../../../src/components/layout';
import { Breakdown } from '../../../src/features/breakdown';
export default function Saved() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { locale, t } = useDesign();
  const user = auth.useSession();
  const q = useQuery({
    queryKey: ['savedOne', user.data?.user.id, id],
    queryFn: () => api.detail(id),
    enabled: !!user.data?.user.id && !!id,
  });
  return (
    <Data q={q}>
      {(s) => (
        <Page
          title={locale === 'vi-VN' ? s.product.name : s.product.nameEn}
          description={t('savedDate') + ' ' + date(s.createdAt, locale)}
          top={<Back to={() => router.navigate('/loans')} />}
        >
          <Badge>{t('sample')}</Badge>
          <SourceAttribution source={s.product.source} />
          <Breakdown
            input={s.input}
            result={s.result}
            actions={
              <Button
                label={t('explain')}
                onPress={() =>
                  router.push({ pathname: '/assistant', params: { simulationId: s.id } })
                }
              />
            }
          />
        </Page>
      )}
    </Data>
  );
}
