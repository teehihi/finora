import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { Download, FileSearch, Image as ImageIcon, ShieldCheck } from 'lucide-react-native';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  View,
  useWindowDimensions,
} from 'react-native';
import type { DocumentEvidence, DocumentReview } from '@finora/contracts';
import { date, documentStrings } from '@finora/i18n';
import { Button, Dialog, Heading, Text, useDesign } from '@finora/ui';
import { loadPrivateImage, privateDocumentFileUrl } from './client';

export function PrivatePreview({
  review,
  focus,
}: {
  review: DocumentReview;
  focus?: (DocumentEvidence & { nonce: number }) | null;
}) {
  const { locale, colors: c } = useDesign();
  const { width: windowWidth } = useWindowDimensions();
  const s = documentStrings[locale];
  const vi = locale === 'vi-VN';
  const mime = review.mime;
  const [visible, setVisible] = useState(false);
  const [image, setImage] = useState<Awaited<ReturnType<typeof loadPrivateImage>> | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(1);
  const [highlight, setHighlight] = useState<DocumentEvidence['bbox']>();
  const format = mime === 'application/pdf' ? s.pdf : mime === 'image/png' ? s.png : s.jpg;
  const id = review.id;
  useEffect(() => {
    if (!focus) return;
    setPage(focus.page);
    setHighlight(focus.bbox);
    setImage(null);
    setFailed(false);
    setVisible(true);
  }, [focus]);
  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    void loadPrivateImage(
      id,
      mime === 'application/pdf' ? 'image/png' : mime,
      controller.signal,
      mime === 'application/pdf' ? page : undefined,
    ).then(
      (loaded) => {
        if (!controller.signal.aborted) setImage(loaded);
      },
      () => {
        if (!controller.signal.aborted) setFailed(true);
      },
    );
    return () => controller.abort();
  }, [attempt, id, mime, page, visible]);

  function close() {
    setVisible(false);
    setImage(null);
    setFailed(false);
  }
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        columnGap: 12,
        rowGap: 6,
        borderRadius: 17,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        padding: 13,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 11,
          backgroundColor: c.secondary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FileSearch size={21} color={c.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 135, gap: 2 }}>
        <Heading size={16}>{s.original}</Heading>
        <Text small muted>
          {format} · {date(review.createdAt, locale)} ·{' '}
          {Math.max(1, Math.round(review.size / 1024))} KB
        </Text>
      </View>

      {mime !== 'application/pdf' ? (
        <Button
          label={vi ? 'Xem ảnh gốc' : 'Preview original image'}
          variant="outline"
          leading={<ImageIcon size={16} color={c.primary} />}
          onPress={() => setVisible(true)}
        />
      ) : Platform.OS === 'web' ? (
        <>
          <Button
            label={vi ? 'Xem trang PDF' : 'Preview PDF page'}
            variant="outline"
            onPress={() => setVisible(true)}
          />
          <Link href={privateDocumentFileUrl(id)} asChild>
            <Pressable accessibilityRole="link" style={{ minHeight: 44, justifyContent: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Download size={16} color={c.primary} />
                <Text small bold style={{ color: c.primary }}>
                  {vi ? 'Tải PDF gốc' : 'Download original PDF'}
                </Text>
              </View>
            </Pressable>
          </Link>
        </>
      ) : (
        <Text small muted style={{ flexBasis: '100%' }}>
          {s.nativePdfOriginal}
        </Text>
      )}

      <Dialog
        title={
          mime === 'application/pdf'
            ? vi
              ? 'Trang PDF riêng tư'
              : 'Private PDF page'
            : vi
              ? 'Ảnh gốc riêng tư'
              : 'Private original image'
        }
        visible={visible}
        onClose={close}
      >
        {failed ? (
          <View style={{ gap: 10 }}>
            <Text role="alert">{s.requestError}</Text>
            <Button
              variant="outline"
              label={vi ? 'Thử mở lại' : 'Retry opening'}
              onPress={() => {
                setFailed(false);
                setImage(null);
                setAttempt((value) => value + 1);
              }}
            />
          </View>
        ) : image ? (
          <View
            style={{
              width:
                highlight || (image.width && image.height)
                  ? Math.min(
                      windowWidth - 60,
                      700,
                      540 *
                        ((highlight?.imageWidth ?? image.width ?? 1) /
                          (highlight?.imageHeight ?? image.height ?? 1)),
                    )
                  : '100%',
              ...(highlight || (image.width && image.height)
                ? {
                    aspectRatio:
                      (highlight?.imageWidth ?? image.width ?? 1) /
                      (highlight?.imageHeight ?? image.height ?? 1),
                  }
                : { height: 270 }),
              backgroundColor: c.background,
            }}
          >
            <Image
              accessibilityLabel={
                mime === 'application/pdf'
                  ? vi
                    ? 'Trang PDF gốc'
                    : 'Original PDF page'
                  : vi
                    ? 'Ảnh đề nghị vay bạn đã tải lên'
                    : 'Loan offer image you uploaded'
              }
              source={{ uri: image.uri, cache: 'reload' }}
              resizeMode="contain"
              onError={() => setFailed(true)}
              style={{ width: '100%', height: '100%', borderRadius: 12 }}
            />
            {highlight ? (
              <View
                pointerEvents="none"
                accessibilityLabel={vi ? 'Vùng dẫn chứng' : 'Evidence region'}
                style={{
                  position: 'absolute',
                  left: `${(highlight.x / highlight.imageWidth) * 100}%`,
                  top: `${(highlight.y / highlight.imageHeight) * 100}%`,
                  width: `${(highlight.width / highlight.imageWidth) * 100}%`,
                  height: `${(highlight.height / highlight.imageHeight) * 100}%`,
                  borderWidth: 2,
                  borderColor: c.warning,
                  backgroundColor: 'rgba(255, 200, 0, 0.12)',
                }}
              />
            ) : null}
          </View>
        ) : (
          <View
            accessibilityLiveRegion="polite"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <ActivityIndicator size="small" color={c.primary} />
            <Text small muted>
              {vi ? 'Đang mở ảnh…' : 'Opening image…'}
            </Text>
          </View>
        )}
        {mime === 'application/pdf' ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Button
              variant="outline"
              label={vi ? 'Trang trước' : 'Previous page'}
              disabled={page <= 1}
              onPress={() => {
                setPage((current) => current - 1);
                setHighlight(undefined);
                setImage(null);
              }}
            />
            <Text small>
              {s.page} {page}
            </Text>
            <Button
              variant="outline"
              label={vi ? 'Trang sau' : 'Next page'}
              disabled={page >= Math.max(1, review.pagesAnalyzed ?? 20)}
              onPress={() => {
                setPage((current) => current + 1);
                setHighlight(undefined);
                setImage(null);
              }}
            />
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <ShieldCheck size={15} color={c.primary} />
          <Text small muted>
            {vi ? 'Chỉ bạn xem được tệp này.' : 'Only your account can view this file.'}
          </Text>
        </View>
      </Dialog>
    </View>
  );
}
