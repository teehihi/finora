import { useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import {
  Text,
  Heading,
  Button,
  Checkbox,
  Switch,
  Surface,
  Eyebrow,
  SectionHeader,
  Progress,
  Dialog,
  SegmentedControl,
  FinancialMetric,
  Skeleton,
  CurrencyInput,
  useDesign,
} from '@finora/ui';
import { Columns, Page } from '../src/components/layout';

export default function Showcase() {
  const { colors: c } = useDesign();
  const [yes, set] = useState(true);
  const [open, show] = useState(false);
  const [tab, select] = useState('VND');
  const [amount, setAmount] = useState('1234567');
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <Page
      eyebrow="Finora · Phòng thiết kế"
      title="Mẫu giao diện"
      description="Bảng màu ngữ nghĩa, kiểu chữ và trạng thái sử dụng trong ứng dụng."
    >
      <Columns>
        <Surface tone="forest" style={{ flex: 1 }}>
          <Eyebrow tone="onForest">Điểm nhấn tài chính</Eyebrow>
          <Heading size={32} style={{ color: c.onForest }}>
            Sổ tay tài chính
          </Heading>
          <Text
            bold
            style={{
              color: c.onForest,
              fontVariant: ['tabular-nums'],
              fontSize: 26,
              lineHeight: 33,
            }}
          >
            1.234.567 ₫
          </Text>
        </Surface>
        <Surface tone="grouped" style={{ flex: 1 }}>
          <Eyebrow>Chữ và số</Eyebrow>
          <Heading size={25}>Đặt mình vào từng lựa chọn</Heading>
          <Text>Geist · 0123456789 · Đđ Ắắ Ệệ Ữữ</Text>
          <Text small muted>
            Source Serif 4 · Instrument Serif
          </Text>
        </Surface>
      </Columns>
      <SectionHeader title="Bảng màu" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {(
          [
            'background',
            'surface',
            'elevated',
            'primary',
            'secondary',
            'muted',
            'error',
            'focus',
          ] as const
        ).map((name) => (
          <View key={name} style={{ width: 98, gap: 4 }}>
            <View
              style={{
                height: 24,
                backgroundColor: c[name],
                borderWidth: 1,
                borderColor: c.border,
              }}
            />
            <Text small>{name}</Text>
          </View>
        ))}
      </View>
      <SectionHeader title="Điều khiển và phản hồi" />
      <Columns>
        <Surface style={{ flex: 1 }}>
          <CurrencyInput label="Số tiền" value={amount} onChangeText={setAmount} />
          <SegmentedControl
            value={tab}
            onChange={select}
            options={['VND', 'USD'].map((value) => ({ value, label: value }))}
          />
          <Checkbox label="Mô phỏng có phí" checked={yes} onChange={set} />
          <Switch label="Hiện tổng chi phí" value={yes} onChange={set} />
        </Surface>
        <Surface style={{ flex: 1 }}>
          <FinancialMetric label="Số tiền minh họa" value="1.234.567 ₫" />
          <Progress label="Ví dụ tiến trình" value={55} />
          <Skeleton />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button label="Mở hộp thoại" onPress={() => show(true)} />
            <Button label="Không khả dụng" onPress={() => {}} disabled variant="outline" />
            <Button label="Đang xử lý" onPress={() => {}} loading variant="soft" />
          </View>
        </Surface>
      </Columns>
      <Dialog title="Chi tiết" visible={open} onClose={() => show(false)}>
        <Text>Thông tin bổ sung xuất hiện theo yêu cầu, không làm khuất đường đi chính.</Text>
      </Dialog>
    </Page>
  );
}
