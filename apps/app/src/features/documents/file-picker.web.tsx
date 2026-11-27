import { useRef } from 'react';
import { Upload } from 'lucide-react-native';
import { Button, useDesign } from '@finora/ui';
import { documentFileMime, type PickedPrivateDocument } from './client';

export function PrivateFilePicker({
  label,
  busy,
  onPick,
  onError,
}: {
  label: string;
  busy: boolean;
  onPick: (file: PickedPrivateDocument) => void;
  onError: (error: unknown) => void;
}) {
  const { colors: c } = useDesign();
  const picker = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={picker}
        type="file"
        accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
        hidden
        disabled={busy}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          // Clear the input immediately. Cancellation (even on browsers that
          // emit no event) never starts an upload or holds the UI in a busy state.
          event.currentTarget.value = '';
          if (!file || busy) return;
          try {
            onPick({ body: file, mime: documentFileMime(file.name, file.type, file.size) });
          } catch (error) {
            onError(error);
          }
        }}
      />
      <Button
        label={label}
        variant="primary"
        loading={busy}
        disabled={busy}
        leading={<Upload size={17} color={c.onPrimary} />}
        onPress={() => picker.current?.click()}
      />
    </>
  );
}
