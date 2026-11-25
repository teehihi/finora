import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FileText, ShieldCheck, Upload } from 'lucide-react-native';
import { View } from 'react-native';
import { useDesign, Text, Heading, Eyebrow, Button } from '@finora/ui';
import { date, documentStrings } from '@finora/i18n';
import { auth } from '../../../src/services/client';
import { Back, Data, LinkRow, Page } from '../../../src/components/layout';
import {
  DocumentApiError,
  choosePrivateDocument,
  docApi,
} from '../../../src/features/documents/client';
import { syntheticLoanOfferPdf } from '../../../src/features/documents/fixture';

export default function Documents() {
  const { colors: c, locale } = useDesign();
  const s = documentStrings[locale];
  const userId = auth.useSession().data?.user.id;
  const queryClient = useQueryClient();
  const queryKey = ['privateDocuments', userId];
  const q = useQuery({ queryKey, queryFn: docApi.list, enabled: Boolean(userId) });
  const upload = useMutation({
    mutationFn: async (synthetic: boolean) => {
      if (synthetic) return docApi.upload(syntheticLoanOfferPdf().buffer, 'application/pdf', true);
      const file = await choosePrivateDocument();
      return file ? docApi.upload(file.body, file.mime) : null;
    },
    onSuccess: (review) => {
      if (!review) return;
      void queryClient.invalidateQueries({ queryKey });
      queryClient.setQueryData(['privateDocument', userId, review.id], review);
      router.push({ pathname: '/documents/[id]', params: { id: review.id } });
    },
  });
  const error =
    upload.error instanceof DocumentApiError
      ? upload.error.status === 409
        ? s.tooMany
        : upload.error.status === 503 || upload.error.status === 429
          ? s.busy
          : upload.error.status === 400 ||
              upload.error.status === 413 ||
              upload.error.status === 415
            ? s.uploadError
            : s.requestError
      : upload.error
        ? s.requestError
        : null;
  return (
    <Page
      title={s.title}
      description={s.description}
      top={<Back to={() => router.navigate('/assistant')} />}
    >
      <View style={{ borderRadius: 18, padding: 22, gap: 13, backgroundColor: c.forest }}>
        <ShieldCheck size={24} color={c.onForestMuted} />
        <Eyebrow tone="onForest">{s.intake}</Eyebrow>
        <Text style={{ color: c.onForest, maxWidth: 520 }}>{s.intakeNote}</Text>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'center',
            marginTop: 5,
          }}
        >
          <Button
            label={s.select}
            variant="onForest"
            loading={upload.isPending && upload.variables === false}
            disabled={upload.isPending}
            leading={<Upload size={17} color={c.forest} />}
            onPress={() => upload.mutate(false)}
          />
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 11, alignItems: 'center' }}>
        <Button
          label={s.sample}
          variant="outline"
          loading={upload.isPending && upload.variables === true}
          disabled={upload.isPending}
          onPress={() => upload.mutate(true)}
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
      <View style={{ gap: 12, borderTopWidth: 1, borderColor: c.border, paddingTop: 20 }}>
        <Heading size={28}>{s.recent}</Heading>
        <Data q={q}>
          {(rows) =>
            !rows.length ? (
              <Text muted>{s.empty}</Text>
            ) : (
              <View>
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
                    body={row.synthetic ? s.syntheticFile : s.choose}
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
