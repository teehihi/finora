import { View } from 'react-native';
import { router } from 'expo-router';
import { ArrowUpRight, BookOpen, House, Wallet } from 'lucide-react-native';
import { Button, Text, Heading, Card, SourceAttribution, Divider, useDesign } from '@finora/ui';
import { percent } from '@finora/i18n';
import type { Product } from '@finora/contracts';
export function LoanProductCard({ p }: { p: Product }) {
  const { t, colors: c, locale, money } = useDesign();
  const Icon = p.category === 'home' ? House : p.category === 'education' ? BookOpen : Wallet;
  return (
    <Card style={{ flex: 1, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ borderRadius: 10, backgroundColor: c.secondary, padding: 9 }}>
          <Icon size={18} color={c.primary} />
        </View>
        <Text small muted>
          {p.institution} · {t(p.category === 'home' ? 'homeCat' : p.category)}
        </Text>
      </View>
      <Heading size={25}>{locale === 'vi-VN' ? p.name : p.nameEn}</Heading>
      <Text bold style={{ color: c.primary, fontSize: 22, lineHeight: 30 }}>
        {percent(p.rateMin, locale)} – {percent(p.rateMax, locale)}{' '}
        <Text small muted>
          {t('yearRate').toLocaleLowerCase()}
        </Text>
      </Text>
      <Divider />
      <Text>
        {money(p.amountMin)} – {money(p.amountMax)}
      </Text>
      <Text small muted>
        {p.monthsMin}–{p.monthsMax} {t('months')} · {t(p.method)}
      </Text>
      <SourceAttribution source={p.source} />
      <Button
        label={t('openPlan')}
        variant="outline"
        icon={<ArrowUpRight size={16} color={c.primary} />}
        onPress={() => router.push('/simulate/' + p.id)}
      />
    </Card>
  );
}
