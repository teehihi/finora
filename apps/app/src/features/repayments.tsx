import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Dialog, Field, Heading, Text, useDesign } from '@finora/ui';
import type { Saved } from '@finora/contracts';
import { date } from '@finora/i18n';
import { api, auth } from '../services/client';

export const ledgerKey = (userId: string | undefined) =>
  ['owned-repayment-ledger', userId] as const;
export function useRepaymentLedger() {
  const session = auth.useSession();
  const userId = session.data?.user.id;
  const ledger = useQuery({
    queryKey: ledgerKey(userId),
    queryFn: api.repayments,
    enabled: !!userId,
  });
  return { ledger, userId };
}

export function TrackRepaymentCta({ simulation }: { simulation: Saved }) {
  const { t, colors: c, locale, money } = useDesign();
  const { width } = useWindowDimensions();
  const { ledger, userId } = useRepaymentLedger();
  const qc = useQueryClient();
  const label = locale === 'vi-VN' ? simulation.product.name : simulation.product.nameEn;
  const [title, setTitle] = useState(label.slice(0, 80));
  const [open, setOpen] = useState(false);
  const tracked = ledger.data?.loans.find(({ simulationId }) => simulationId === simulation.id);
  const draft = useMutation({
    mutationFn: () => api.trackRepayment({ simulationId: simulation.id, title, confirmed: true }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ledgerKey(userId) });
      setOpen(false);
      router.push('/repayments');
    },
  });
  const choice = () => {
    if (tracked) return router.push('/repayments');
    draft.reset();
    setOpen(true);
  };
  const first = simulation.result.schedule[0];
  const last = simulation.result.schedule.at(-1);
  if (!first || !last) return null;
  return (
    <View style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 19, gap: 8 }}>
      <Heading size={23}>{t('repaymentsTrack')}</Heading>
      <Text muted>{t(tracked ? 'repaymentsTracked' : 'repaymentsTrackIntro')}</Text>
      <View style={{ alignSelf: 'flex-start' }}>
        <Button
          variant="outline"
          label={t(tracked ? 'repaymentsOpen' : 'repaymentsTrack')}
          onPress={choice}
          disabled={ledger.isPending}
        />
      </View>
      <Dialog
        title={t('repaymentsTrack')}
        visible={open}
        onClose={() => {
          if (!draft.isPending) setOpen(false);
        }}
        bottom={width < 620}
      >
        <Field
          label={t('repaymentsTitleField')}
          value={title}
          onChangeText={setTitle}
          maxLength={80}
          editable={!draft.isPending}
        />
        <View
          style={{
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: c.border,
            paddingVertical: 9,
            gap: 6,
          }}
        >
          <Text small>
            {t('principal')}: {money(simulation.input.principal)} · {simulation.input.months}{' '}
            {t('months')}
          </Text>
          <Text small>
            {t('yearRate')}: {new Intl.NumberFormat(locale).format(simulation.input.annualRate)}% ·{' '}
            {t(simulation.input.method)}
          </Text>
          <Text small>
            {t('repaymentsReviewedSchedule')}: {date(first.date, locale)} · {money(first.payment)}
          </Text>
          <Text small>
            {t('repayment')}: {money(simulation.result.repayment)} · {date(last.date, locale)}
          </Text>
        </View>
        <Text small muted>
          {t('repaymentsTotalsNote')}
        </Text>
        <Text>{t('repaymentsConfirmRule')}</Text>
        {draft.isError ? (
          <Text role="alert" style={{ color: c.error }}>
            {t('repaymentsError')}
          </Text>
        ) : null}
        <Button
          label={t('repaymentsConfirmTrack')}
          onPress={() => {
            if (!draft.isPending) draft.mutate();
          }}
          loading={draft.isPending}
          disabled={!title.trim()}
        />
      </Dialog>
    </View>
  );
}
