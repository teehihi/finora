import { describe, expect, it } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';
import { getAccessStrings, type Locale } from '@finora/i18n';
import { light } from '@finora/design-tokens';
import { DesignContext } from '@finora/ui';
import { AuthArtwork } from '../src/features/auth/AuthArtwork';

describe('AuthArtwork localization', () => {
  it('falls back to Vietnamese when the locale is missing or unsupported', () => {
    expect(getAccessStrings(undefined).welcome).toContain('Vay thông minh');
    expect(getAccessStrings('fr-FR').welcome).toContain('Vay thông minh');
  });

  it('renders without crashing when a restored preference has no locale', async () => {
    const screen = await render(
      <DesignContext.Provider value={{ colors: light, locale: undefined as unknown as Locale }}>
        <AuthArtwork wide={false} />
      </DesignContext.Provider>,
    );

    expect(screen.getByText(/Vay thông minh/)).toBeTruthy();
  });

  it('keeps English copy for a supported locale', () => {
    expect(getAccessStrings('en-US').welcome).toContain('Borrow smarter');
  });
});
