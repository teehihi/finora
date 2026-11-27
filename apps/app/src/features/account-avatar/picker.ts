// A missing module on an old development binary should not break the account screen.
export async function chooseAvatar() {
  const { launchImageLibraryAsync } = await import('expo-image-picker');
  return launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
    exif: false,
  });
}
