import { Directory, File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';

import { supabase } from '@/lib/supabase';

const PHOTOS_BUCKET = 'photos';

export function extensionFromUri(uri: string, fallback: string) {
  const match = uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
  return match ? match[1] : fallback;
}

// Camera photos are written to a temporary cache location that the OS can
// clear at any moment — Android in particular will reclaim it within
// seconds. Copying to the app's document directory first means the upload
// below is reading a file the OS won't yank out from under it while the
// network request is in flight.
async function savePersistentCopy(sourceUri: string, extension: string): Promise<string> {
  const dir = new Directory(Paths.document, PHOTOS_BUCKET);
  dir.create({ intermediates: true, idempotent: true });

  const destination = new File(dir, `${Crypto.randomUUID()}.${extension}`);
  const source = new File(sourceUri);
  await source.copy(destination);
  return destination.uri;
}

// Takes a just-captured photo all the way from a volatile OS cache uri to a
// permanent Supabase Storage object, returning the storage path to persist
// in the database. Never store the local uri itself — it only exists on the
// device that captured it, which defeats the point of syncing.
export async function uploadCapturedFile(sourceUri: string, extension: string): Promise<string> {
  const localUri = await savePersistentCopy(sourceUri, extension);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  // The bucket is private; RLS only allows a user to read/write inside a
  // folder named after their own user id (see the storage policies in
  // supabase/migrations).
  const storagePath = `${user.id}/${Crypto.randomUUID()}.${extension}`;
  const arrayBuffer = await fetch(localUri).then((res) => res.arrayBuffer());

  const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(storagePath, arrayBuffer, {
    contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
  });
  if (error) throw error;

  return storagePath;
}

const SIGNED_URL_TTL_SECONDS = 60 * 60;

// The bucket is private, so viewing a photo means asking Supabase for a
// time-limited signed URL rather than constructing a public one.
export async function getSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteStorageFile(storagePath: string): Promise<void> {
  await supabase.storage.from(PHOTOS_BUCKET).remove([storagePath]);
}
