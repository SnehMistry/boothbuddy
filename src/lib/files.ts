import { Directory, File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';

export function extensionFromUri(uri: string, fallback: string) {
  const match = uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
  return match ? match[1] : fallback;
}

// Camera photos and audio recordings are written to a temporary cache
// location that the OS can clear at any moment — Android in particular
// will reclaim it within seconds. Callers must call this immediately after
// capture, not wait until the user taps Save, or the source file may
// already be gone.
export async function savePersistentCopy(
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
