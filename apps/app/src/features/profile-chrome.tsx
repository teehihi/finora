import type { ReactNode } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { dark, tokens } from '@finora/design-tokens';
import { Action, Heading, useDesign } from '@finora/ui';
import { useWorkspaceDockInset } from '../components/layout';
import { useCYLScrollTarget } from '../components/cyl-scroll-target';

export const profileLight = {
  background: '#F5F5F6',
  surface: '#FFFFFF',
  line: '#EEEEEF',
  ink: '#151C26',
  muted: '#626D7B',
  icon: '#333943',
  hero: '#EFEEE8',
  profileChip: '#E0F1EE',
};
export const profileDark = {
  background: '#14171D',
  surface: '#1C2027',
  line: '#313640',
  ink: '#F3F4F6',
  muted: '#B8C1CC',
  icon: '#E0E5EC',
  hero: '#172722',
  profileChip: '#23433C',
};
export function useProfileChrome() {
  const night = useDesign().colors === dark;
  return { night, palette: night ? profileDark : profileLight };
}

export function AccountScroll({
  children,
  header,
  detail,
}: {
  children: ReactNode;
  header?: ReactNode;
  detail?: { title: string; back: () => void };
}) {
  const { t } = useDesign();
  const { palette: p } = useProfileChrome();
  const { width } = useWindowDimensions();
  const dockInset = useWorkspaceDockInset();
  const scrollTarget = useCYLScrollTarget();
  const wide = width >= tokens.breakpoints.rail;
  return (
    <View style={{ flex: 1, backgroundColor: p.background }}>
      {detail ? (
        <View
          testID="workspace-detail-chrome"
          style={{
            backgroundColor: p.surface,
            borderBottomWidth: 1,
            borderBottomColor: p.line,
            width: '100%',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 720,
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: 57,
              paddingHorizontal: 13,
            }}
          >
            <Action
              label={t('back')}
              onPress={detail.back}
              style={{ width: 44, height: 44, alignItems: 'center' }}
            >
              <ArrowLeft size={22} strokeWidth={2.1} color={p.ink} />
            </Action>
            <Heading size={17} style={{ flex: 1, textAlign: 'center', color: p.ink }}>
              {detail.title}
            </Heading>
            <View style={{ width: 44 }} />
          </View>
        </View>
      ) : null}
      <ScrollView
        {...scrollTarget}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ alignItems: 'center', paddingBottom: dockInset + 24 }}
        style={{ flex: 1 }}
      >
        <View style={{ width: '100%', maxWidth: 720, paddingTop: wide ? 22 : 0 }}>
          {header}
          <View
            style={{
              gap: detail ? 12 : 15,
              paddingHorizontal: detail ? 0 : wide ? 22 : 15,
              paddingTop: detail ? 0 : 14,
            }}
          >
            {children}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
