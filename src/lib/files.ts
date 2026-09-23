import { Directory, File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';

import { supabase } from '@/lib/supabase';

export function extensionFromUri(uri: string, fallback: string) {
  const match = uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
  return match ? match[1] : fallback;
}

// Camera photos and audio recordings are written to a temporary cache
// location that the OS can clear at any moment — Android in particular
// will reclaim it within seconds. Copying to the app's document directory
// first means the upload below is reading a file the OS won't yank out
// from under it while the network request is in flight.
async function savePersistentCopy(
  sourceUri: string,
  subdir: 'photos' | 'audio',
  extension: string,
): Promise<string> {
  const dir = new Directory(Paths.document, subdir);
  dir.create({ intermediates: true, idempotent: true });

  const destination = new File(dir, `${Crypto.randomUUID()}.${extension}`);
  const source = new File(sourceUri);
  await source.copy(destination);
  return destination.uri;
}

type StorageBucket = 'audio' | 'photos';

function contentTypeFor(bucket: StorageBucket, extension: string) {
  if (bucket === 'photos') return `image/${extension === 'jpg' ? 'jpeg' : extension}`;
  return `audio/${extension}`;
}

// Takes a just-captured file all the way from a volatile OS cache uri to a
// permanent Supabase Storage object, returning the storage path to persist
// in the database. Never store the local uri itself — it only exists on the
// device that captured it, which defeats the point of syncing.
export async function uploadCapturedFile(
  bucket: StorageBucket,
  sourceUri: string,
  extension: string,
): Promise<string> {
  const localUri = await savePersistentCopy(sourceUri, bucket, extension);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  // Buckets are private; RLS only allows a user to read/write inside a
  // folder named after their own user id (see the storage policies in
  // supabase/migrations).
  const storagePath = `${user.id}/${Crypto.randomUUID()}.${extension}`;
  const arrayBuffer = await fetch(localUri).then((res) => res.arrayBuffer());

  const { error } = await supabase.storage.from(bucket).upload(storagePath, arrayBuffer, {
    contentType: contentTypeFor(bucket, extension),
  });
  if (error) throw error;

  return storagePath;
}

const SIGNED_URL_TTL_SECONDS = 60 * 60;

// Buckets are private, so viewing a file means asking Supabase for a
// time-limited signed URL rather than constructing a public one.
export async function getSignedUrl(bucket: StorageBucket, storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteStorageFile(bucket: StorageBucket, storagePath: string): Promise<void> {
  await supabase.storage.from(bucket).remove([storagePath]);
}
