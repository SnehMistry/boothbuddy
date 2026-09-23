import { Directory, File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';

// Camera photos and audio recordings are written to a temporary cache
// location that the OS can clear at any time. This copies them into the
// app's persistent document directory so a contact's media survives
// after the app restarts.
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
