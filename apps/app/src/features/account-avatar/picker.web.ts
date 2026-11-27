import { launchImageLibraryAsync } from 'expo-image-picker';

// Invoke synchronously from the button gesture so Safari may open the file picker.
export const chooseAvatar = () => launchImageLibraryAsync({ mediaTypes: ['images'], exif: false });
