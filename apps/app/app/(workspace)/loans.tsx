import { CashflowEntry } from '../../src/features/cashflow-map';
import { View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Calculator, ChevronRight, Wallet } from 'lucide-react-native';
import { Action, Button, EmptyState, Heading, Text, useDesign } from '@finora/ui';
import { date, numeric } from '@finora/i18n';
import { api, auth } from '../../src/services/client';
import { Page } from '../../src/components/layout';
import { workspaceArtwork } from '../../src/components/workspace-artwork';
import { WorkspaceModeRail } from '../../src/components/workspace-scene';
import { canShowReadData } from '../../src/components/read-state';
import { TaskData } from '../../src/components/task-surface';
import { useRepaymentLedger } from '../../src/features/repayments';
import { MarketPanel, ProductIcon } from '../../src/features/market-ui';
import { LoanList, PaymentFocus } from '../../src/features/loan-center';

export default function Loans() {
  const { t, colors: c, locale, money } = useDesign();
  const { width } = useWindowDimensions();
  const { ledger } = useRepaymentLedger();
  const user = auth.useSession().data?.user;
  const saved = useQuery({
    queryKey: ['saved', user?.id],
    queryFn: api.saved,
    enabled: !!user?.id,
  });
  const desktop = width >= 1024;
  const params = useLocalSearchParams<{ pane?: string }>();
  const pane = params.pane === 'simulations' ? 'simulations' : 'schedule';
  const setPane = (next: 'schedule' | 'simulations') => router.setParams({ pane: next });

  return (
    <Page
      title={t('loans')}
      scene={{
        image: workspaceArtwork.loans,
        label: locale === 'vi-VN' ? 'FINORA · Chủ động trả nợ' : 'FINORA · Stay on track',
        icon: Wallet,
        subtitle:
          locale === 'vi-VN' ? 'Lịch trả và phương án đã lưu' : 'Repayments and saved scenarios',
      }}
    >
      <WorkspaceModeRail
        label={t('loans')}
        role="tab"
        value={pane}
        options={[
          { value: 'schedule', label: t('loanCenterScheduleTab') },
          { value: 'simulations', label: t('loanCenterPlansTab') },
        ]}
        onChange={setPane}
      />
      {pane === 'schedule' && canShowReadData(ledger) && ledger.data ? (
        <PaymentFocus value={ledger.data} desktop={desktop} />
      ) : null}
      {pane === 'schedule' ? <CashflowEntry /> : null}
      {pane === 'schedule' ? (
        <TaskData query={ledger} kind="rows">
          {(value) => <LoanList value={value} onPlans={() => setPane('simulations')} />}
        </TaskData>
      ) : (
        <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Heading size={22}>{t('saved')}</Heading>
            <Text
              small
              bold
              style={{
                color: c.actionBlue,
                backgroundColor: c.actionBlueSurface,
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              {t('loanCenterSimulation')}
            </Text>
          </View>
          <Text small muted>
            {t('savedOnlyNote')}
          </Text>
          <TaskData query={saved} kind="rows">
            {(rows) =>
              rows.length ? (
                <MarketPanel style={{ paddingHorizontal: 10, paddingVertical: 4, gap: 0 }}>
                  {rows.map((r, i) => {
                    const name = locale === 'vi-VN' ? r.product.name : r.product.nameEn;
                    return (
                      <Action
                        key={r.id}
                        label={name}
                        onPress={() => router.push('/saved/' + r.id)}
                        style={{
                          minHeight: 64,
                          borderTopWidth: i ? 1 : 0,
                          borderColor: c.border,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 9,
                          paddingVertical: 9,
                        }}
                      >
                        <ProductIcon category={r.product.category} />
                        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                          <Text bold>{name}</Text>
                          <Text small muted>
                            {t('savedDate')} {date(r.createdAt, locale)}
                          </Text>
                        </View>
                        <View
                          style={{ flexShrink: 1, minWidth: 0, alignItems: 'flex-end', gap: 3 }}
                        >
                          <Text
                            small
                            bold
                            style={{ fontVariant: ['tabular-nums'], textAlign: 'right' }}
                          >
                            {money(r.input.principal)}
                          </Text>
                          <Text small muted>
                            {numeric(r.input.months, locale)} {t('months')}
                          </Text>
                        </View>
                        <ChevronRight size={17} color={c.muted} />
                      </Action>
                    );
                  })}
                </MarketPanel>
              ) : (
                <MarketPanel>
                  <EmptyState
                    title={t('emptySaved')}
                    body={t('emptySavedText')}
                    icon={<Calculator size={23} color={c.primary} />}
                    action={
                      <Button
                        label={t('learn')}
                        variant="outline"
                        onPress={() => router.navigate('/explore?mode=sample')}
                      />
                    }
                  />
                </MarketPanel>
              )
            }
          </TaskData>
        </View>
      )}
    </Page>
  );
}
