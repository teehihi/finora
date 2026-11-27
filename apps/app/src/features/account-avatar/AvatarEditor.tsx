import { useRef, useState } from 'react';
import { Image, Platform, View } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import { File } from 'expo-file-system';
import { Camera } from 'lucide-react-native';
import { Action, Button, Dialog, Text, useDesign } from '@finora/ui';
import { avatarMime, maxAvatarBytes, type AvatarMime } from '@finora/contracts';
import { ProfileAvatar } from '../profile-account-hub';
import { queryClient } from '../../providers/AppProviders';
import { AvatarApiError, avatarKey, saveAvatar } from './client';
import { chooseAvatar } from './picker';

type Picked = { uri: string; body: BodyInit; mime: AvatarMime };
function prepare(asset: ImagePickerAsset): Picked {
  const candidate = Platform.OS === 'web' ? asset.file : new File(asset.uri);
  if (!candidate || candidate.size > maxAvatarBytes || candidate.size === 0)
    throw new AvatarApiError(413);
  const raw =
    asset.mimeType ||
    candidate.type ||
    (/\.png(?:$|[?#])/i.test(asset.uri)
      ? 'image/png'
      : /\.jpe?g(?:$|[?#])/i.test(asset.uri)
        ? 'image/jpeg'
        : '');
  const mime = raw === 'image/jpg' ? 'image/jpeg' : raw;
  if (!avatarMime(mime)) throw new AvatarApiError(415);
  return { uri: asset.uri, body: candidate as BodyInit, mime };
}

export function AvatarEditor({ owner, name }: { owner: string; name: string }) {
  const { colors: c, locale } = useDesign();
  const vi = locale === 'vi-VN';
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Picked>();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState<'pick' | 'save'>();
  const locked = useRef(false);
  const title = vi ? 'Đổi ảnh đại diện' : 'Change profile photo';
  function close() {
    if (locked.current) return;
    setOpen(false);
    setPicked(undefined);
    setStatus('');
  }
  function errorText(error: unknown) {
    if (error instanceof AvatarApiError) {
      if (error.status === 413)
        return vi ? 'Chọn ảnh không quá 5 MB.' : 'Choose a photo up to 5 MB.';
      if (error.status === 400 || error.status === 415)
        return vi ? 'Chọn ảnh JPG hoặc PNG hợp lệ.' : 'Choose a valid JPG or PNG.';
    }
    return vi
      ? 'Chưa xác nhận được ảnh mới. Vui lòng thử lại.'
      : 'Could not confirm the new photo. Please try again.';
  }
  async function pick() {
    if (locked.current) return;
    locked.current = true;
    setBusy('pick');
    setStatus('');
    try {
      const result = await chooseAvatar();
      if (!result.canceled && result.assets[0]) setPicked(prepare(result.assets[0]));
    } catch (error) {
      setStatus(errorText(error));
    } finally {
      locked.current = false;
      setBusy(undefined);
    }
  }
  async function confirm() {
    if (!picked || locked.current) return;
    locked.current = true;
    setBusy('save');
    setStatus('');
    try {
      const data = await saveAvatar(picked.body, picked.mime);
      await queryClient.cancelQueries({ queryKey: avatarKey(owner), exact: true });
      queryClient.setQueryData(avatarKey(owner), data);
      setOpen(false);
      setPicked(undefined);
    } catch (error) {
      setStatus(errorText(error));
      void queryClient.invalidateQueries({ queryKey: avatarKey(owner), exact: true });
    } finally {
      locked.current = false;
      setBusy(undefined);
    }
  }
  return (
    <>
      <View style={{ paddingBottom: 3, paddingRight: 3 }}>
        <ProfileAvatar name={name} owner={owner} size={92} />
        <Action
          label={title}
          onPress={() => setOpen(true)}
          style={{
            position: 'absolute',
            bottom: 0,
            right: -2,
            width: 44,
            height: 44,
            borderRadius: 24,
            borderWidth: 3,
            borderColor: c.surface,
            alignItems: 'center',
            backgroundColor: c.primary,
          }}
        >
          <Camera size={18} color={c.onPrimary} />
        </Action>
      </View>
      <Dialog visible={open} title={title} onClose={close}>
        <Text small muted>
          {vi
            ? 'Ảnh mới sẽ thay ảnh hiện tại và đồng bộ trên các thiết bị đăng nhập tài khoản này.'
            : 'The new photo replaces your current photo and syncs across devices signed in to this account.'}
        </Text>
        {picked ? (
          <Image
            source={{ uri: picked.uri }}
            resizeMode="cover"
            accessibilityLabel={vi ? 'Xem trước ảnh đại diện' : 'Profile photo preview'}
            style={{
              alignSelf: 'center',
              width: 132,
              height: 132,
              borderRadius: 66,
              backgroundColor: c.secondary,
            }}
          />
        ) : null}
        {status ? (
          <Text role="alert" small style={{ color: c.error }}>
            {status}
          </Text>
        ) : null}
        <Button
          label={
            picked
              ? vi
                ? 'Chọn ảnh khác'
                : 'Choose another photo'
              : vi
                ? 'Chọn ảnh'
                : 'Choose photo'
          }
          variant={picked ? 'outline' : 'primary'}
          onPress={() => void pick()}
          loading={busy === 'pick'}
          disabled={!!busy}
        />
        {picked ? (
          <Button
            label={vi ? 'Lưu ảnh' : 'Save photo'}
            onPress={() => void confirm()}
            loading={busy === 'save'}
            disabled={!!busy}
          />
        ) : null}
        <Button label={vi ? 'Hủy' : 'Cancel'} variant="text" disabled={!!busy} onPress={close} />
      </Dialog>
    </>
  );
}
