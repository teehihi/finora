import { useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import {
  Text,
  Heading,
  Button,
  Checkbox,
  Switch,
  Card,
  Badge,
  Progress,
  Dialog,
  SegmentedControl,
  FinancialMetric,
  Skeleton,
  ChatMessage,
  useDesign,
} from '@finora/ui';
import { Page } from '../src/components/layout';
export default function Showcase() {
  const { colors: c } = useDesign();
  const [yes, set] = useState(true),
    [open, show] = useState(false),
    [tab, select] = useState('VND');
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <Page title="Finora · Design system">
      <Heading size={42}>Kế hoạch tài chính</Heading>
      <Text>Geist · 0123456789 · Đđ Ắắ Ệệ Ữữ</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {Object.entries(c).map(([name, color]) => (
          <Card key={name}>
            <View style={{ height: 20, backgroundColor: color }} />
            <Text small>{name}</Text>
          </Card>
        ))}
      </View>
      <Card>
        <Badge>Finora Sandbox</Badge>
        <SegmentedControl
          value={tab}
          onChange={select}
          options={['VND', 'USD'].map((v) => ({ value: v, label: v }))}
        />
        <FinancialMetric label="VND" value="1.234.567 ₫" />
        <Progress label="Example" value={55} />
        <Skeleton />
        <Checkbox label="Checkbox" checked={yes} onChange={set} />
        <Switch label="Switch" value={yes} onChange={set} />
        <Button label="Dialog" onPress={() => show(true)} />
        <Button label="Disabled" onPress={() => {}} disabled />
        <ChatMessage who="Finora" body="Financial clarity. Peace of mind." />
      </Card>
      <Dialog title="Finora" visible={open} onClose={() => show(false)}>
        <Text>Geist · Source Serif 4 · Instrument Serif</Text>
      </Dialog>
    </Page>
  );
}
