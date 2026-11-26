import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { Download, FileSearch, Image as ImageIcon, ShieldCheck } from 'lucide-react-native';
import { ActivityIndicator, Image, Platform, Pressable, View } from 'react-native';
import type { DocumentReview } from '@finora/contracts';
import { date, documentStrings } from '@finora/i18n';
import { Button, Dialog, Heading, Text, useDesign } from '@finora/ui';
import { loadPrivateImage, privateDocumentFileUrl } from './client';

export function PrivatePreview({ review }: { review: DocumentReview }) {
  const { locale, colors: c } = useDesign();
  const s = documentStrings[locale];
  const vi = locale === 'vi-VN';
  const mime = review.mime;
  const [visible, setVisible] = useState(false);
  const [image, setImage] = useState('');
  const [failed, setFailed] = useState(false);
  const format = mime === 'application/pdf' ? s.pdf : mime === 'image/png' ? s.png : s.jpg;
  const id = review.id;
  useEffect(() => {
    if (!visible || mime === 'application/pdf') return;
    const controller = new AbortController();
    void loadPrivateImage(id, mime, controller.signal).then(
      (uri) => {
        if (!controller.signal.aborted) setImage(uri);
      },
      () => {
        if (!controller.signal.aborted) setFailed(true);
      },
    );
    return () => controller.abort();
  }, [id, mime, visible]);

  function close() {
    setVisible(false);
    setImage('');
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
      ) : null}

      <Dialog
        title={vi ? 'Ảnh gốc riêng tư' : 'Private original image'}
        visible={visible}
        onClose={close}
      >
        {failed ? (
          <Text role="alert">{s.requestError}</Text>
        ) : image ? (
          <Image
            accessibilityLabel={
              vi ? 'Ảnh đề nghị vay bạn đã tải lên' : 'Loan offer image you uploaded'
            }
            source={{ uri: image, cache: 'reload' }}
            resizeMode="contain"
            onError={() => setFailed(true)}
            style={{
              width: '100%',
              minHeight: 180,
              height: 270,
              borderRadius: 12,
              backgroundColor: c.background,
            }}
          />
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
