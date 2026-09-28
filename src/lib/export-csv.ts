import { Platform } from 'react-native';

import { contactsToCsv } from '@/lib/csv';
import type { Contact } from '@/lib/types';

function safeFileName(eventName: string): string {
  return (eventName.trim() || 'contacts').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

// Web: build a Blob and trigger a normal browser download via a throwaway
// <a download> element — no library needed, and it's the standard pattern
// since browsers don't expose a native "save file" API to web pages.
async function downloadOnWeb(fileName: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Native: write to a temp file, then hand it to the OS share sheet — the
// closest native equivalent of "download," since there's no user-visible
// Downloads folder to write into on iOS.
async function shareOnNative(fileName: string, csv: string) {
  const [{ File, Paths }, Sharing] = await Promise.all([
    import('expo-file-system'),
    import('expo-sharing'),
  ]);
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(csv);
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: fileName });
}

export async function exportContactsCsv(eventName: string, contacts: Contact[]): Promise<void> {
  const csv = contactsToCsv(contacts);
  const fileName = `boothbuddy-${safeFileName(eventName)}.csv`;
  if (Platform.OS === 'web') {
    await downloadOnWeb(fileName, csv);
  } else {
    await shareOnNative(fileName, csv);
  }
}
