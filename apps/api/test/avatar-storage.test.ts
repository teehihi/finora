import { avatarStorage } from '../src/infrastructure/avatar-storage.js';

jest.mock('../src/config/env.js', () => ({
  env: {
    AVATAR_STORAGE_PROVIDER: 'r2',
    R2_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
    R2_AVATAR_BUCKET: 'finora-avatar-test',
    R2_ACCESS_KEY_ID: 'fake-test-key',
    R2_SECRET_ACCESS_KEY: 'fake-test-secret',
  },
}));

test('R2 requests are signed and carry only private avatar objects', async () => {
  const key = 'avatars/' + 'a'.repeat(64) + '/00000000-0000-4000-a000-000000000001.jpg';
  let object: ArrayBuffer | undefined;
  const verbs: string[] = [];
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    expect(url.origin).toBe('https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com');
    expect(url.pathname).toBe('/finora-avatar-test/' + key);
    expect(request.headers.get('authorization')).toMatch(/^AWS4-HMAC-SHA256/);
    verbs.push(request.method);
    if (request.method === 'PUT') {
      expect(request.headers.get('content-type')).toBe('image/jpeg');
      expect(request.headers.get('cache-control')).toBe('private, no-store');
      object = await request.arrayBuffer();
      return new Response(null, { status: 200 });
    }
    if (request.method === 'DELETE') {
      object = undefined;
      return new Response(null, { status: 204 });
    }
    return object ? new Response(object) : new Response(null, { status: 404 });
  });
  try {
    const fixture = Buffer.from('synthetic object');
    await avatarStorage.put(key, fixture);
    expect(await avatarStorage.get(key)).toEqual(fixture);
    await avatarStorage.remove(key);
    expect(await avatarStorage.get(key)).toBeNull();
    expect(verbs).toEqual(['PUT', 'GET', 'DELETE', 'GET']);
    await expect(avatarStorage.get('../outside.jpg')).rejects.toThrow('Invalid avatar key');
  } finally {
    fetchMock.mockRestore();
  }
});
