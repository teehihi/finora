import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Badge, SourceAttribution, useDesign } from '@finora/ui';
import { date, documentStrings } from '@finora/i18n';
import { reviewedDocumentSource } from '@finora/contracts';
import { api, auth } from '../../../src/services/client';
import { Page, Data, Back } from '../../../src/components/layout';
import { Breakdown } from '../../../src/features/breakdown';
import { TrackRepaymentCta } from '../../../src/features/repayments';
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
          <Badge>
            {s.product.source === reviewedDocumentSource
              ? documentStrings[locale].fileSource
              : s.product.source === 'FINORA_USER_SCENARIO'
                ? documentStrings[locale].userScenario
                : t('sample')}
          </Badge>
          {s.product.source !== reviewedDocumentSource &&
          s.product.source !== 'FINORA_USER_SCENARIO' ? (
            <SourceAttribution source={s.product.source} />
          ) : null}
          <Breakdown
            input={s.input}
            result={s.result}
            actions={
              <View style={{ gap: 8 }}>
                <Button
                  label={t('explain')}
                  onPress={() =>
                    router.push({ pathname: '/assistant', params: { simulationId: s.id } })
                  }
                />
                <Button
                  label={t('intelligenceSavedAnalysis')}
                  variant="outline"
                  onPress={() =>
                    router.push({ pathname: '/intelligence', params: { simulationId: s.id } })
                  }
                />
              </View>
            }
          />
          <TrackRepaymentCta key={s.id} simulation={s} />
        </Page>
      )}
    </Data>
  );
}
