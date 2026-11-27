import { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react-native';
import { Button, useDesign } from '@finora/ui';
import { choosePrivateDocument, type PickedPrivateDocument } from './client';

type Props = {
  label: string;
  busy: boolean;
  onPick: (file: PickedPrivateDocument) => void;
  onError: (error: unknown) => void;
};

export function PrivateFilePicker({ label, busy, onPick, onError }: Props) {
  const { colors: c } = useDesign();
  const [picking, setPicking] = useState(false);
  const pending = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function choose() {
    if (pending.current) return;
    pending.current = true;
    setPicking(true);
    try {
      const file = await choosePrivateDocument();
      if (active.current && file) onPick(file);
    } catch (error) {
      if (active.current) onError(error);
    } finally {
      pending.current = false;
      if (active.current) setPicking(false);
    }
  }

  return (
    <Button
      label={label}
      variant="primary"
      loading={picking || busy}
      disabled={picking || busy}
      leading={<Upload size={17} color={c.onPrimary} />}
      onPress={() => void choose()}
    />
  );
}
