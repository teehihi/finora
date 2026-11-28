import { useEffect, useState } from 'react';
import { Switch, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CircleAlert } from 'lucide-react-native';
import { Button, Dialog, Field, Heading, Text, useDesign } from '@finora/ui';
import { notificationPreferenceSchema, type NotificationPreference } from '@finora/contracts';
import { repaymentProactive, date } from '@finora/i18n';
import { backTo, Page } from '../../src/components/layout';
import { TaskData } from '../../src/components/task-surface';
import { api, auth } from '../../src/services/client';

export default function Notifications() {
  const { locale, colors: c } = useDesign();
  const s = repaymentProactive[locale];
  const userId = auth.useSession().data?.user.id;
  const qc = useQueryClient();
  const { width } = useWindowDimensions();
  const [showSettings, setShowSettings] = useState(false);
  const [draft, setDraft] = useState<NotificationPreference | null>(null);
  const [timeZone, setTimeZone] = useState('Asia/Ho_Chi_Minh');
  const [quietStart, setQuietStart] = useState('22');
  const [quietEnd, setQuietEnd] = useState('8');
  const [invalid, setInvalid] = useState(false);
  const items = useQuery({
    queryKey: ['notifications', userId],
    queryFn: api.notifications,
    enabled: !!userId,
  });
  const preferences = useQuery({
    queryKey: ['notification-preferences', userId],
    queryFn: api.notificationPreferences,
    enabled: !!userId,
  });
  const capabilities = useQuery({
    queryKey: ['notification-capabilities', userId],
    queryFn: api.notificationCapabilities,
    enabled: !!userId,
  });
  useEffect(() => {
    if (!preferences.data || draft) return;
    setDraft(preferences.data);
    setTimeZone(preferences.data.timeZone);
    setQuietStart(String(preferences.data.quietStart));
    setQuietEnd(String(preferences.data.quietEnd));
  }, [preferences.data, draft]);
  const save = useMutation({
    mutationFn: api.saveNotificationPreferences,
    onSuccess: (value) => {
      qc.setQueryData(['notification-preferences', userId], value);
      void qc.invalidateQueries({ queryKey: ['notifications', userId] });
      setShowSettings(false);
    },
  });
  const read = useMutation({
    mutationFn: api.readNotification,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications', userId] }),
  });
  const toggle = (
    key: 'remindersEnabled' | 'shortfallEnabled' | 'profileReviewEnabled' | 'emailEnabled',
  ) => setDraft((current) => (current ? { ...current, [key]: !current[key] } : current));
  const switches = [
    ['remindersEnabled', s.reminders],
    ['shortfallEnabled', s.shortfall],
    ['profileReviewEnabled', s.profileReview],
    ['emailEnabled', s.email],
  ] as const;
  return (
    <Page title={s.notifications} detail={{ onBack: () => backTo('/repayments') }}>
      <TaskData query={items}>
        {(center) => (
          <View style={{ gap: 15 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                <Bell color={c.primary} size={22} />
                <Heading size={22}>
                  {center.unread} {s.unread}
                </Heading>
              </View>
              <Button
                variant="outline"
                label={s.preferences}
                onPress={() => {
                  setInvalid(false);
                  setShowSettings(true);
                }}
              />
            </View>
            <Text small muted>
              {s.manual}
            </Text>
            {!center.items.length ? <Text muted>{s.empty}</Text> : null}
            {center.items.map((item) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: c.surface,
                  borderColor: c.border,
                  borderWidth: 1,
                  borderRadius: 18,
                  padding: 15,
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {item.kind === 'projected_shortfall' ||
                  item.kind === 'low_reserve' ||
                  item.kind === 'clustered_due' ||
                  item.kind === 'overdue' ? (
                    <CircleAlert color={c.warning} size={18} />
                  ) : (
                    <Bell color={c.primary} size={18} />
                  )}
                  <Text bold style={{ flex: 1 }}>
                    {s[item.kind]}
                  </Text>
                </View>
                {item.title ? <Text>{item.title}</Text> : null}
                <Text small muted>
                  {date(item.triggerDate, locale)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {!item.readAt ? (
                    <Button
                      variant="outline"
                      label={s.markRead}
                      onPress={() => read.mutate(item.id)}
                      disabled={read.isPending}
                    />
                  ) : null}
                  {item.repaymentId ? (
                    <Button
                      variant="outline"
                      label={s.openLoan}
                      onPress={() => router.push('/repayments')}
                    />
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </TaskData>
      <Dialog
        visible={showSettings}
        bottom={width < 620}
        title={s.preferences}
        onClose={() => setShowSettings(false)}
      >
        {draft ? (
          <View style={{ gap: 12 }}>
            {switches.map(([key, label]) => (
              <View
                key={key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <Text style={{ flex: 1 }}>{label}</Text>
                <Switch
                  accessibilityLabel={label}
                  value={draft[key]}
                  disabled={key === 'emailEnabled' && !capabilities.data?.email}
                  onValueChange={() => toggle(key)}
                  trackColor={{ true: c.primary }}
                />
              </View>
            ))}
            {!capabilities.data?.email ? (
              <Text small muted>
                {s.emailUnavailable}
              </Text>
            ) : null}
            <Text small muted>
              {s.pushUnavailable}
            </Text>
            <Field label={s.timeZone} value={timeZone} onChangeText={setTimeZone} maxLength={64} />
            <Field
              label={s.quietStart}
              value={quietStart}
              onChangeText={setQuietStart}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Field
              label={s.quietEnd}
              value={quietEnd}
              onChangeText={setQuietEnd}
              keyboardType="number-pad"
              maxLength={2}
            />
            {invalid || save.isError ? (
              <Text role="alert" style={{ color: c.error }}>
                {s.error}
              </Text>
            ) : null}
            <Button
              label={s.savePreferences}
              loading={save.isPending}
              onPress={() => {
                const checked = notificationPreferenceSchema.safeParse({
                  ...draft,
                  timeZone,
                  quietStart: Number(quietStart),
                  quietEnd: Number(quietEnd),
                });
                setInvalid(!checked.success);
                if (checked.success) save.mutate(checked.data);
              }}
            />
          </View>
        ) : null}
      </Dialog>
    </Page>
  );
}
