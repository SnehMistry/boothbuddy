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
async function savePersistentCopy(sourceUri: string, extension: string): Promise<File> {
  const dir = new Directory(Paths.document, PHOTOS_BUCKET);
  dir.create({ intermediates: true, idempotent: true });

  const destination = new File(dir, `${Crypto.randomUUID()}.${extension}`);
  const source = new File(sourceUri);
  await source.copy(destination);
  return destination;
}

// A file that uploaded with a suspiciously small body is a red flag, not a
// real photo — this is exactly how a past bug (see MIN_UPLOAD_BYTES) showed
// up: uploads "succeeded" but produced 14-byte objects in Storage.
const MIN_UPLOAD_BYTES = 1024;

// Takes a just-captured photo all the way from a volatile OS cache uri to a
// permanent Supabase Storage object, returning the storage path to persist
// in the database. Never store the local uri itself — it only exists on the
// device that captured it, which defeats the point of syncing.
export async function uploadCapturedFile(sourceUri: string, extension: string): Promise<string> {
  const file = await savePersistentCopy(sourceUri, extension);

  // Read the file's raw bytes directly rather than fetch(uri).arrayBuffer():
  // on Android, React Native's fetch/Blob polyfill silently produced an
  // empty body for file:// uris, which uploaded "successfully" as a 14-byte
  // object that rendered as a blank/black image.
  const bytes = await file.bytes();
  if (bytes.byteLength < MIN_UPLOAD_BYTES) {
    throw new Error(`Captured file is only ${bytes.byteLength} bytes — likely corrupted.`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  // The bucket is private; RLS only allows a user to read/write inside a
  // folder named after their own user id (see the storage policies in
  // supabase/migrations).
  const storagePath = `${user.id}/${Crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(storagePath, bytes, {
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
