import { contactsToCsv } from './csv';
import type { Contact } from './types';

function makeContact(overrides: Partial<Contact>): Contact {
  return {
    id: '1',
    eventId: 'e1',
    name: 'Jane Doe',
    createdAt: '2026-09-28T12:00:00.000Z',
    photos: [],
    aiStatus: 'idle',
    followupTone: 'professional',
    followupStatus: 'not_sent',
    ...overrides,
  };
}

describe('contactsToCsv', () => {
  it('includes a header row and one row per contact', () => {
    const csv = contactsToCsv([makeContact({}), makeContact({ id: '2', name: 'Sam' })]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(
      'Name,Title,Company,Email,LinkedIn URL,Company URL,Interest level,Follow-up status,Summary,Topics,Notes,Captured at',
    );
  });

  it('quotes fields containing commas', () => {
    const csv = contactsToCsv([makeContact({ company: 'Acme, Inc.' })]);
    expect(csv).toContain('"Acme, Inc."');
  });

  it('escapes embedded quotes by doubling them', () => {
    const csv = contactsToCsv([makeContact({ notes: 'Said "call me"' })]);
    expect(csv).toContain('"Said ""call me"""');
  });

  it('quotes fields containing newlines', () => {
    const csv = contactsToCsv([makeContact({ notes: 'line one\nline two' })]);
    expect(csv).toContain('"line one\nline two"');
  });

  it('joins topics with a semicolon', () => {
    const csv = contactsToCsv([makeContact({ topics: ['ai', 'internships'] })]);
    expect(csv).toContain('ai; internships');
  });

  it('renders an empty string for missing optional fields', () => {
    const csv = contactsToCsv([makeContact({})]);
    const dataRow = csv.split('\r\n')[1];
    expect(dataRow.split(',')[3]).toBe(''); // Email column
  });
});
