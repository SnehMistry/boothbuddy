// "BoothEvent" (not "Event") to avoid clashing with the built-in DOM Event type.
export type BoothEvent = {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  location?: string;
  createdAt: string; // ISO timestamp
};

export const PHOTO_LABELS = ['business_card', 'booth', 'badge', 'other'] as const;
export type PhotoLabel = (typeof PHOTO_LABELS)[number];

export const PHOTO_LABEL_TITLES: Record<PhotoLabel, string> = {
  business_card: 'Business card',
  booth: 'Booth',
  badge: 'Badge',
  other: 'Other',
};

export type ContactPhoto = {
  id: string;
  uri: string;
  label?: PhotoLabel;
  createdAt: string;
};

export type Contact = {
  id: string;
  eventId: string;
  name: string;
  createdAt: string; // ISO timestamp; also the timeline sort key
  audioUri?: string;
  photos: ContactPhoto[];
  companyUrl?: string; // filled by typing, or by scanning a QR code
};
