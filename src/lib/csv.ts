import type { Contact } from '@/lib/types';

// RFC 4180-ish escaping: wrap in quotes and double up any quote characters
// whenever the field contains a quote, comma, or newline.
function csvField(value: string | undefined | null): string {
  const text = value ?? '';
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

const CSV_COLUMNS = [
  'Name',
  'Title',
  'Company',
  'Email',
  'LinkedIn URL',
  'Company URL',
  'Interest level',
  'Follow-up status',
  'Summary',
  'Topics',
  'Notes',
  'Captured at',
] as const;

// One event's contacts as a CSV string — used for both the web "download"
// and native "share sheet" export actions, so the format only lives here.
export function contactsToCsv(contacts: Contact[]): string {
  const rows = contacts.map((contact) =>
    [
      contact.name,
      contact.title,
      contact.company,
      contact.email,
      contact.linkedinUrl,
      contact.companyUrl,
      contact.interestLevel,
      contact.followupStatus,
      contact.summary,
      contact.topics?.join('; '),
      contact.notes,
      contact.createdAt,
    ]
      .map(csvField)
      .join(','),
  );
  return [CSV_COLUMNS.join(','), ...rows].join('\r\n');
}
