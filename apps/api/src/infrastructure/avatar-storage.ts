import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { AwsClient } from 'aws4fetch';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

export const maxAvatarStoredBytes = 512 * 1024;
function checkKey(key: string) {
  if (!/^avatars\/[a-f0-9]{64}\/[a-f0-9-]{36}\.jpg$/.test(key)) throw Error('Invalid avatar key');
  return key;
}
function local(key: string) {
  return join(env.LOCAL_STORAGE_PATH, 'account-images', checkKey(key));
}

const r2 =
  env.AVATAR_STORAGE_PROVIDER === 'r2'
    ? new AwsClient({
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
        service: 's3',
        region: 'auto',
        retries: 1,
      })
    : null;
const s3 = env.AVATAR_STORAGE_PROVIDER === 's3' ? new S3Client({ region: env.S3_REGION }) : null;
function remote(key: string) {
  return (
    'https://' +
    env.R2_ACCOUNT_ID +
    '.r2.cloudflarestorage.com/' +
    env.R2_AVATAR_BUCKET +
    '/' +
    checkKey(key)
  );
}
function checkedS3Key(key: string) {
  return checkKey(key);
}

export const avatarStorage = {
  async put(key: string, bytes: Buffer) {
    if (bytes.length > maxAvatarStoredBytes) throw Error('Avatar exceeds stored size limit');
    if (s3) {
      await s3.send(
        new PutObjectCommand({
          Bucket: env.S3_AVATAR_BUCKET,
          Key: checkedS3Key(key),
          Body: bytes,
          ContentType: 'image/jpeg',
          CacheControl: 'private, no-store',
        }),
      );
      return;
    }
    if (!r2) {
      const path = local(key);
      await mkdir(dirname(path), { recursive: true, mode: 0o700 });
      await writeFile(path, bytes, { flag: 'wx', mode: 0o600 });
      return;
    }
    const response = await r2.fetch(remote(key), {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store' },
      body: new Uint8Array(bytes),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw Error('R2 avatar write failed');
  },
  async get(key: string): Promise<Buffer | null> {
    if (s3) {
      let response;
      try {
        response = await s3.send(
          new GetObjectCommand({ Bucket: env.S3_AVATAR_BUCKET, Key: checkedS3Key(key) }),
        );
      } catch (error) {
        if (
          (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404
        )
          return null;
        throw error;
      }
      if (!response.Body) return null;
      if (response.ContentLength !== undefined && response.ContentLength > maxAvatarStoredBytes)
        throw Error('Avatar exceeds stored size limit');
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        size += chunk.byteLength;
        if (size > maxAvatarStoredBytes) throw Error('Avatar exceeds stored size limit');
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks, size);
    }
    if (!r2) {
      try {
        return await readFile(local(key));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw error;
      }
    }
    const response = await r2.fetch(remote(key), { signal: AbortSignal.timeout(8000) });
    if (response.status === 404) return null;
    if (!response.ok || !response.body) throw Error('R2 avatar read failed');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const entry = await reader.read();
        if (entry.done) break;
        size += entry.value.length;
        if (size > maxAvatarStoredBytes) throw Error('Avatar exceeds stored size limit');
        chunks.push(entry.value);
      }
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
    return Buffer.concat(chunks, size);
  },
  async remove(key: string) {
    if (s3) {
      await s3.send(
        new DeleteObjectCommand({ Bucket: env.S3_AVATAR_BUCKET, Key: checkedS3Key(key) }),
      );
      return;
    }
    if (!r2) {
      await rm(local(key), { force: true });
      return;
    }
    const response = await r2.fetch(remote(key), {
      method: 'DELETE',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok && response.status !== 404) throw Error('R2 avatar cleanup failed');
  },
};
