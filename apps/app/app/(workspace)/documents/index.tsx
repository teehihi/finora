import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  Activity,
  ClipboardCheck,
  FileText,
  FolderOpen,
  ScanLine,
  ShieldCheck,
} from 'lucide-react-native';
import { ActivityIndicator, View, useWindowDimensions } from 'react-native';
import { useDesign, Text, Heading, Button } from '@finora/ui';
import { date, documentStrings } from '@finora/i18n';
import { auth } from '../../../src/services/client';
import { Back, Data, LinkRow, Page } from '../../../src/components/layout';
import {
  DocumentApiError,
  docApi,
  type PickedPrivateDocument,
} from '../../../src/features/documents/client';
import { PrivateFilePicker } from '../../../src/features/documents/file-picker';
import { syntheticLoanOfferPdf } from '../../../src/features/documents/fixture';

export default function Documents() {
  const userId = auth.useSession().data?.user.id;
  return userId ? <PrivateIntake key={userId} userId={userId} /> : null;
}

function PrivateIntake({ userId }: { userId: string }) {
  const { colors: c, locale } = useDesign();
  const s = documentStrings[locale];
  const { width } = useWindowDimensions();
  const wide = width >= 1140;
  const vi = locale === 'vi-VN';
  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
  const [pickError, setPickError] = useState<unknown>(null);
  const inFlight = useRef(false);
  const attached = useRef(true);
  useEffect(() => {
    attached.current = true;
    return () => {
      attached.current = false;
    };
  }, []);
  const queryClient = useQueryClient();
  const queryKey = ['privateDocuments', userId];
  const q = useQuery({
    queryKey,
    queryFn: ({ signal }) => docApi.list(signal),
    enabled: Boolean(userId),
    gcTime: 60_000,
  });
  const upload = useMutation({
    mutationFn: (upload: { file: PickedPrivateDocument } | { synthetic: true }) =>
      'file' in upload
        ? docApi.upload(upload.file.body, upload.file.mime)
        : docApi.upload(syntheticLoanOfferPdf().buffer, 'application/pdf', true),
    gcTime: 0,
    onError: (error) => {
      if (attached.current) setPickError(error);
    },
    onSettled: () => {
      inFlight.current = false;
      // A Mutation otherwise retains its arguments, including the original bytes.
      if (attached.current) upload.reset();
    },
    onSuccess: (review) => {
      if (!review || !attached.current) return;
      void queryClient.invalidateQueries({ queryKey });
      router.push({ pathname: '/documents/[id]', params: { id: review.id } });
    },
  });
  function beginUpload(file?: PickedPrivateDocument) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPickError(null);
    upload.mutate(file ? { file } : { synthetic: true });
  }
  const error =
    pickError instanceof DocumentApiError
      ? pickError.status === 409
        ? s.tooMany
        : pickError.status === 503 || pickError.status === 429
          ? s.busy
          : pickError.status === 413
            ? s.tooLarge
            : pickError.status === 415
              ? s.wrongFormat
              : pickError.status === 400
                ? s.uploadError
                : s.requestError
      : pickError
        ? s.requestError
        : null;
  return (
    <Page
      title={s.title}
      description={s.description}
      top={<Back to={() => router.navigate('/assistant')} />}
    >
      <View
        style={{
          flexDirection: wide ? 'row' : 'column',
          alignItems: wide ? 'stretch' : undefined,
          gap: 14,
        }}
      >
        <View
          style={{
            flex: wide ? 1 : undefined,
            borderRadius: 22,
            padding: wide ? 22 : 16,
            gap: 12,
            backgroundColor: c.forest,
          }}
        >
          <View style={{ flexDirection: 'row', gap: 11, alignItems: 'center' }}>
            <View
              style={{
                backgroundColor: 'rgba(190,239,203,0.18)',
                borderRadius: 13,
                width: 46,
                height: 46,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ScanLine size={23} color={c.onForest} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Heading size={19} style={{ color: c.onForest }}>
                {s.intake}
              </Heading>
              <Text small style={{ color: c.onForestMuted }}>
                {vi ? 'PDF, JPEG, PNG · tối đa 5 MB' : 'PDF, JPEG, PNG · up to 5 MB'}
              </Text>
            </View>
          </View>
          <PrivateFilePicker
            label={s.select}
            busy={upload.isPending}
            onPick={beginUpload}
            onError={setPickError}
          />
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 7 }}>
            <ShieldCheck size={16} color={c.onForestMuted} />
            <Text small style={{ color: c.onForestMuted, flex: 1 }}>
              {vi
                ? 'Tệp chỉ được xử lý trên máy chủ Finora, không gửi đến AI bên ngoài.'
                : 'The Finora server processes the file. Nothing is sent to external AI.'}
            </Text>
          </View>
        </View>

        <View
          style={{
            flex: wide ? 0.75 : undefined,
            gap: 10,
            padding: 15,
            borderRadius: 18,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
            justifyContent: 'center',
          }}
        >
          <Heading size={17}>
            {vi ? 'Từ tài liệu đến mô phỏng' : 'From document to simulation'}
          </Heading>
          {(
            [
              [ScanLine, vi ? 'Đọc điều khoản' : 'Read terms'],
              [ClipboardCheck, vi ? 'Đối chiếu và xác nhận' : 'Review and confirm'],
              [Activity, vi ? 'Tính lại khoản trả' : 'Recalculate payments'],
            ] as const
          ).map(([Icon, label], i) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <Icon size={17} color={c.primary} />
              <Text small>
                <Text small bold style={{ color: c.primary }}>
                  {i + 1}.{' '}
                </Text>
                {label}
              </Text>
            </View>
          ))}
        </View>
      </View>
      {upload.isPending ? (
        <View
          accessibilityLiveRegion="polite"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 9,
            padding: 12,
            borderRadius: 13,
            backgroundColor: c.secondary,
          }}
        >
          <ActivityIndicator size="small" color={c.primary} />
          <Text small bold>
            {vi ? 'Đang đọc tài liệu của bạn…' : 'Reading your document…'}
          </Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Button
          label={s.sample}
          variant="outline"
          loading={upload.isPending && !!upload.variables && 'synthetic' in upload.variables}
          disabled={upload.isPending}
          leading={<FileText size={16} color={c.primary} />}
          onPress={() => beginUpload()}
        />
        <Text muted small>
          {s.syntheticFile}
        </Text>
      </View>
      {error ? (
        <Text role="alert" style={{ color: c.error }}>
          {error}
        </Text>
      ) : null}
      <View style={{ gap: 10 }}>
        <Heading size={21}>{s.recent}</Heading>
        <Data q={q}>
          {(rows) =>
            !rows.length ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 11,
                  padding: 15,
                  borderRadius: 16,
                  backgroundColor: c.surface,
                  borderWidth: 1,
                  borderColor: c.border,
                }}
              >
                <FolderOpen size={22} color={c.primary} />
                <Text muted small style={{ flex: 1 }}>
                  {s.empty}
                </Text>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 13, borderRadius: 16, backgroundColor: c.surface }}>
                {rows.map((row) => (
                  <LinkRow
                    key={row.id}
                    title={
                      date(row.createdAt, locale) +
                      ' · ' +
                      (row.mime === 'application/pdf'
                        ? s.pdf
                        : row.mime === 'image/jpeg'
                          ? s.jpg
                          : s.png)
                    }
                    body={
                      row.synthetic
                        ? s.syntheticFile
                        : time.format(new Date(row.createdAt)) +
                          ' · ' +
                          (row.mode === 'manual' ? s.manualStatus : s.extractedStatus)
                    }
                    icon={<FileText size={19} color={c.primary} />}
                    onPress={() =>
                      router.push({ pathname: '/documents/[id]', params: { id: row.id } })
                    }
                  />
                ))}
              </View>
            )
          }
        </Data>
      </View>
    </Page>
  );
}
