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

// storagePath (not a local uri): the file's path inside the Supabase
// Storage "photos" bucket, e.g. "{userId}/{uuid}.jpg". It's the only
// reference to the photo that's meaningful on every device — a local file
// uri only exists on the device that captured it.
export type ContactPhoto = {
  id: string;
  storagePath: string;
  label?: PhotoLabel;
  createdAt: string;
};

export const INTEREST_LEVELS = ['hot', 'warm', 'cold'] as const;
export type InterestLevel = (typeof INTEREST_LEVELS)[number];

export const AI_STATUSES = ['idle', 'processing', 'done', 'error'] as const;
export type AiStatus = (typeof AI_STATUSES)[number];

export type ResearchSource = {
  title: string;
  url: string;
};

export const MATCH_STATUSES = ['unconfirmed', 'confirmed', 'rejected'] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

// Person & company research produced by the process-contact Edge Function.
// `grounded` is false when Gemini's Google Search grounding wasn't
// available/successful and the summaries come from the model's own
// knowledge instead — the UI must label that clearly, per PROMPT.md.
export type ContactResearch = {
  person: { summary: string; confidence: 'high' | 'low' };
  company: { summary: string };
  sources: ResearchSource[];
  grounded: boolean;
  matchStatus: MatchStatus;
};

export type ActionItem = {
  id: string;
  contactId: string;
  text: string;
  done: boolean;
  createdAt: string;
};

export type JobOpportunity = {
  id: string;
  contactId: string;
  title: string;
  url?: string;
  deadline?: string; // free text — see the migration for why it's not a date column
  applied: boolean;
  createdAt: string;
};

export const FOLLOWUP_TONES = ['casual', 'professional', 'enthusiastic'] as const;
export type FollowupTone = (typeof FOLLOWUP_TONES)[number];

export const FOLLOWUP_STATUSES = ['not_sent', 'sent', 'replied'] as const;
export type FollowupStatus = (typeof FOLLOWUP_STATUSES)[number];

export type Contact = {
  id: string;
  eventId: string;
  name: string;
  createdAt: string; // ISO timestamp; also the timeline sort key
  photos: ContactPhoto[];
  companyUrl?: string; // filled by typing, or by scanning a QR code
  notes?: string; // typed notes about the conversation — the main text input

  // AI-structured card fields (Phase 3) — all unset until processed once.
  aiStatus: AiStatus;
  aiError?: string;
  aiProcessedAt?: string;
  title?: string;
  company?: string;
  email?: string;
  linkedinUrl?: string;
  summary?: string;
  topics?: string[];
  rolesMentioned?: string[];
  deadlines?: string[];
  memorable?: string;
  interestLevel?: InterestLevel;
  research?: ContactResearch;

  // Follow-up drafts (Phase 4) — unset until generated once.
  linkedinNote?: string;
  linkedinMessage?: string;
  emailDraft?: string;
  followupTone: FollowupTone;
  followupStatus: FollowupStatus;
  followupGeneratedAt?: string;
};
