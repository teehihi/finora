import { useState, type ComponentProps } from 'react';
import { View } from 'react-native';
import { Field, Text, useDesign } from '@finora/ui';
import { formatVndDraft } from './simulator-decision';

type Props = Omit<ComponentProps<typeof Field>, 'value'> & { value: string };

export function SimulatorVndField({ value, onChangeText, onBlur, ...props }: Props) {
  const { locale, colors: c } = useDesign();
  const [editing, edit] = useState(false);
  return (
    <View style={{ position: 'relative' }}>
      <Field
        {...props}
        // Keep the displayed value stable on focus. Reformatting at that point
        // changes the native selection while an autofill or paste is replacing it.
        value={editing ? value : formatVndDraft(value, locale)}
        selectTextOnFocus={props.selectTextOnFocus ?? true}
        onChangeText={(next) => {
          edit(true);
          onChangeText?.(next);
        }}
        onBlur={(event) => {
          edit(false);
          onBlur?.(event);
        }}
      />
      <View
        accessible={false}
        pointerEvents="none"
        style={{ position: 'absolute', right: 2, top: 0 }}
      >
        <Text small bold style={{ color: c.primary }}>
          VND
        </Text>
      </View>
    </View>
  );
}
