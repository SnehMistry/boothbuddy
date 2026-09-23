// "BoothEvent" (not "Event") to avoid clashing with the built-in DOM Event type.
export type BoothEvent = {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  location?: string;
  createdAt: string; // ISO timestamp
};

export type Contact = {
  id: string;
  eventId: string;
  name: string;
  createdAt: string; // ISO timestamp; also the timeline sort key
  audioUri?: string;
  photoUri?: string;
  companyUrl?: string; // filled by typing, or by scanning a QR code
};
