import { describe, expect, it } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';
import { AuthArtwork } from '../src/features/auth/AuthArtwork';

describe('AuthArtwork responsive display', () => {
  it('is only rendered in the wide desktop layout', async () => {
    const narrow = await render(<AuthArtwork wide={false} />);
    expect(narrow.toJSON()).toBeNull();

    const wide = await render(<AuthArtwork wide />);
    expect(wide.toJSON()).not.toBeNull();
  });
});
