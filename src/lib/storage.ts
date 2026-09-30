import * as Crypto from 'expo-crypto';

import { isDueWithinDays } from '@/lib/deadlines';
import { supabase } from '@/lib/supabase';
import type {
  ActionItem,
  AiStatus,
  BoothEvent,
  Contact,
  ContactPhoto,
  ContactResearch,
  FollowupStatus,
  FollowupTone,
  InterestLevel,
  JobKind,
  JobOpportunity,
  PhotoLabel,
  Profile,
} from '@/lib/types';

type EventRow = {
  id: string;
  name: string;
  date: string;
  location: string | null;
  created_at: string;
};

type ContactRow = {
  id: string;
  event_id: string;
  name: string;
  company_url: string | null;
  notes: string | null;
  created_at: string;
  title: string | null;
  company: string | null;
  email: string | null;
  linkedin_url: string | null;
  summary: string | null;
  topics: string[] | null;
  roles_mentioned: string[] | null;
  deadlines: string[] | null;
  memorable: string | null;
  interest_level: InterestLevel | null;
  ai_status: AiStatus;
  ai_error: string | null;
  ai_processed_at: string | null;
  research: ContactResearch | null;
  linkedin_note: string | null;
  linkedin_message: string | null;
  email_subject: string | null;
  email_draft: string | null;
  followup_tone: FollowupTone;
  followup_status: FollowupStatus;
  followup_generated_at: string | null;
};

type ActionItemRow = {
  id: string;
  contact_id: string;
  text: string;
  done: boolean;
  created_at: string;
};

type JobOpportunityRow = {
  id: string;
  contact_id: string;
  title: string;
  fit_reason: string | null;
  kind: JobKind | null;
  url: string | null;
  deadline: string | null;
  applied: boolean;
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  school: string | null;
  major: string | null;
  year_in_school: string | null;
  graduation: string | null;
  work_authorization: string | null;
  interests: string | null;
  updated_at: string;
};

type ContactPhotoRow = {
  id: string;
  contact_id: string;
  storage_path: string;
  label: PhotoLabel | null;
  created_at: string;
};

function eventFromRow(row: EventRow): BoothEvent {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    location: row.location ?? undefined,
    createdAt: row.created_at,
  };
}

function photoFromRow(row: ContactPhotoRow): ContactPhoto {
  return {
    id: row.id,
    storagePath: row.storage_path,
    label: row.label ?? undefined,
    createdAt: row.created_at,
  };
}

function contactFromRow(row: ContactRow, photos: ContactPhoto[]): Contact {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    createdAt: row.created_at,
    companyUrl: row.company_url ?? undefined,
    notes: row.notes ?? undefined,
    photos,
    aiStatus: row.ai_status,
    aiError: row.ai_error ?? undefined,
    aiProcessedAt: row.ai_processed_at ?? undefined,
    title: row.title ?? undefined,
    company: row.company ?? undefined,
    email: row.email ?? undefined,
    linkedinUrl: row.linkedin_url ?? undefined,
    summary: row.summary ?? undefined,
    topics: row.topics ?? undefined,
    rolesMentioned: row.roles_mentioned ?? undefined,
    deadlines: row.deadlines ?? undefined,
    memorable: row.memorable ?? undefined,
    interestLevel: row.interest_level ?? undefined,
    research: row.research ?? undefined,
    linkedinNote: row.linkedin_note ?? undefined,
    linkedinMessage: row.linkedin_message ?? undefined,
    emailSubject: row.email_subject ?? undefined,
    emailDraft: row.email_draft ?? undefined,
    followupTone: row.followup_tone,
    followupStatus: row.followup_status,
    followupGeneratedAt: row.followup_generated_at ?? undefined,
  };
}

function actionItemFromRow(row: ActionItemRow): ActionItem {
  return {
    id: row.id,
    contactId: row.contact_id,
    text: row.text,
    done: row.done,
    createdAt: row.created_at,
  };
}

function jobFromRow(row: JobOpportunityRow): JobOpportunity {
  return {
    id: row.id,
    contactId: row.contact_id,
    title: row.title,
    fitReason: row.fit_reason ?? undefined,
    kind: row.kind ?? undefined,
    url: row.url ?? undefined,
    deadline: row.deadline ?? undefined,
    applied: row.applied,
    createdAt: row.created_at,
  };
}

function profileFromRow(row: ProfileRow): Profile {
  return {
    school: row.school ?? '',
    major: row.major ?? '',
    yearInSchool: row.year_in_school ?? '',
    graduation: row.graduation ?? '',
    workAuthorization: row.work_authorization ?? '',
    interests: row.interests ?? '',
    updatedAt: row.updated_at,
  };
}

// The signed-in user's profile, or undefined if they've never saved one.
// RLS scopes `profiles` to the caller's own row, so no user_id filter is
// needed.
export async function getProfile(): Promise<Profile | undefined> {
  const { data, error } = await supabase.from('profiles').select('*').maybeSingle();
  if (error) throw error;
  return data ? profileFromRow(data as ProfileRow) : undefined;
}

// Upsert rather than update: the first save creates the row. user_id
// defaults to auth.uid() server-side, but upsert needs it explicitly to
// know which row to conflict on.
export async function saveProfile(profile: Profile): Promise<Profile> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      user_id: userData.user.id,
      school: profile.school.trim() || null,
      major: profile.major.trim() || null,
      year_in_school: profile.yearInSchool.trim() || null,
      graduation: profile.graduation.trim() || null,
      work_authorization: profile.workAuthorization.trim() || null,
      interests: profile.interests.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return profileFromRow(data as ProfileRow);
}

export async function getEvents(): Promise<BoothEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as EventRow[]).map(eventFromRow);
}

export type EventWithStats = BoothEvent & { contactCount: number; pendingFollowups: number };

// One extra query (every contact's event_id + followup_status, grouped
// client-side) rather than one query per event — for the events list's
// "N contacts, M follow-ups pending" line and the web dashboard's stats
// header.
export async function getEventsWithStats(): Promise<EventWithStats[]> {
  const [events, contactRows] = await Promise.all([
    getEvents(),
    supabase.from('contacts').select('event_id, followup_status'),
  ]);
  if (contactRows.error) throw contactRows.error;

  const statsByEvent = new Map<string, { contactCount: number; pendingFollowups: number }>();
  for (const row of contactRows.data as { event_id: string; followup_status: FollowupStatus }[]) {
    const stats = statsByEvent.get(row.event_id) ?? { contactCount: 0, pendingFollowups: 0 };
    stats.contactCount += 1;
    if (row.followup_status === 'not_sent') stats.pendingFollowups += 1;
    statsByEvent.set(row.event_id, stats);
  }

  return events.map((event) => ({
    ...event,
    ...(statsByEvent.get(event.id) ?? { contactCount: 0, pendingFollowups: 0 }),
  }));
}

export type OverallStats = {
  peopleMet: number;
  followupsSent: number;
  applicationsDueThisWeek: number;
};

// For the web dashboard's stats header. "Due this week" only counts jobs
// with a deadline that actually parses as a real date — AI-found deadlines
// are free text ("rolling", "ASAP") and those don't belong in a date-range
// count, not even as a false negative.
export async function getOverallStats(): Promise<OverallStats> {
  const [{ data: contacts, error: contactsError }, { data: jobs, error: jobsError }] = await Promise.all([
    supabase.from('contacts').select('followup_status'),
    supabase.from('job_opportunities').select('deadline, applied'),
  ]);
  if (contactsError) throw contactsError;
  if (jobsError) throw jobsError;

  const peopleMet = contacts.length;
  const followupsSent = contacts.filter(
    (c) => c.followup_status === 'sent' || c.followup_status === 'replied',
  ).length;

  const now = Date.now();
  const applicationsDueThisWeek = jobs.filter(
    (job) => !job.applied && isDueWithinDays(job.deadline, 7, now),
  ).length;

  return { peopleMet, followupsSent, applicationsDueThisWeek };
}

export async function getEvent(id: string): Promise<BoothEvent | undefined> {
  const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? eventFromRow(data as EventRow) : undefined;
}

export async function createEvent(input: {
  name: string;
  date: string;
  location?: string;
}): Promise<BoothEvent> {
  const { data, error } = await supabase
    .from('events')
    .insert({ name: input.name, date: input.date, location: input.location ?? null })
    .select()
    .single();
  if (error) throw error;
  return eventFromRow(data as EventRow);
}

// Deletes the event and (via "on delete cascade" FKs) every contact,
// photo row, action item, and job under it — but Storage objects aren't
// part of Postgres, so their cleanup has to happen explicitly here first,
// or they'd be orphaned in the bucket forever with nothing pointing at
// them.
export async function deleteEvent(eventId: string): Promise<void> {
  const contacts = await getContactsForEvent(eventId);
  const photoPaths = contacts.flatMap((contact) => contact.photos.map((photo) => photo.storagePath));
  if (photoPaths.length > 0) {
    await supabase.storage.from('photos').remove(photoPaths);
  }
  const { error } = await supabase.from('events').delete().eq('id', eventId);
  if (error) throw error;
}

async function getPhotosForContacts(contactIds: string[]): Promise<Map<string, ContactPhoto[]>> {
  const byContact = new Map<string, ContactPhoto[]>();
  if (contactIds.length === 0) return byContact;

  const { data, error } = await supabase
    .from('contact_photos')
    .select('*')
    .in('contact_id', contactIds);
  if (error) throw error;

  for (const row of data as ContactPhotoRow[]) {
    const existing = byContact.get(row.contact_id) ?? [];
    existing.push(photoFromRow(row));
    byContact.set(row.contact_id, existing);
  }
  return byContact;
}

export async function getContactsForEvent(eventId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const rows = data as ContactRow[];
  const photosByContact = await getPhotosForContacts(rows.map((row) => row.id));
  return rows.map((row) => contactFromRow(row, photosByContact.get(row.id) ?? []));
}

export async function getContact(id: string): Promise<Contact | undefined> {
  const { data: row, error } = await supabase.from('contacts').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!row) return undefined;

  const photosByContact = await getPhotosForContacts([id]);
  return contactFromRow(row as ContactRow, photosByContact.get(id) ?? []);
}

// A fresh capture only has these fields — everything else on Contact is
// filled in later by AI processing (Phase 3) and defaults server-side.
export type NewContactInput = Pick<Contact, 'eventId' | 'name' | 'photos' | 'companyUrl' | 'notes'>;

export async function createContact(input: NewContactInput): Promise<Contact> {
  // Generate ids client-side (rather than letting Postgres default them) so
  // a photo's id matches the id PhotoPicker already used for its instant
  // local preview, taken before this contact ever reaches the database.
  const contactId = Crypto.randomUUID();
  const { data: row, error } = await supabase
    .from('contacts')
    .insert({
      id: contactId,
      event_id: input.eventId,
      name: input.name,
      company_url: input.companyUrl ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  let photos: ContactPhoto[] = [];
  if (input.photos.length > 0) {
    const { data: photoRows, error: photoError } = await supabase
      .from('contact_photos')
      .insert(
        input.photos.map((photo) => ({
          id: photo.id,
          contact_id: contactId,
          storage_path: photo.storagePath,
          label: photo.label ?? null,
        })),
      )
      .select();
    if (photoError) throw photoError;
    photos = (photoRows as ContactPhotoRow[]).map(photoFromRow);
  }

  return contactFromRow(row as ContactRow, photos);
}

export async function updateContact(
  id: string,
  patch: Partial<Omit<Contact, 'id' | 'eventId' | 'createdAt' | 'photos'>>,
): Promise<Contact | undefined> {
  const updates: Record<string, unknown> = {};
  if (patch.name !== undefined) updates.name = patch.name;
  if (patch.company !== undefined) updates.company = patch.company ?? null;
  if (patch.companyUrl !== undefined) updates.company_url = patch.companyUrl ?? null;
  if (patch.linkedinUrl !== undefined) updates.linkedin_url = patch.linkedinUrl ?? null;
  if (patch.notes !== undefined) updates.notes = patch.notes ?? null;
  if (patch.interestLevel !== undefined) updates.interest_level = patch.interestLevel ?? null;
  if (patch.followupStatus !== undefined) updates.followup_status = patch.followupStatus;

  const { error } = await supabase.from('contacts').update(updates).eq('id', id);
  if (error) throw error;

  return getContact(id);
}

// Deletes the contact and (via "on delete cascade" FKs) its
// contact_photos/action_items/job_opportunities rows — but, same as
// deleteEvent, the actual Storage objects need removing explicitly first.
export async function deleteContact(contact: Contact): Promise<void> {
  if (contact.photos.length > 0) {
    await supabase.storage.from('photos').remove(contact.photos.map((photo) => photo.storagePath));
  }
  const { error } = await supabase.from('contacts').delete().eq('id', contact.id);
  if (error) throw error;
}

export async function addPhotoToContact(
  contactId: string,
  photo: ContactPhoto,
): Promise<Contact | undefined> {
  // photo.id was already generated client-side by PhotoPicker for its
  // instant local preview — insert with that same id rather than letting
  // Postgres assign a different one.
  const { error } = await supabase.from('contact_photos').insert({
    id: photo.id,
    contact_id: contactId,
    storage_path: photo.storagePath,
    label: photo.label ?? null,
  });
  if (error) throw error;
  return getContact(contactId);
}

export async function removePhotoFromContact(
  contactId: string,
  photo: ContactPhoto,
): Promise<Contact | undefined> {
  const { error } = await supabase.from('contact_photos').delete().eq('id', photo.id);
  if (error) throw error;
  return getContact(contactId);
}

export async function setContactPhotoLabel(
  contactId: string,
  photoId: string,
  label: PhotoLabel | undefined,
): Promise<Contact | undefined> {
  const { error } = await supabase
    .from('contact_photos')
    .update({ label: label ?? null })
    .eq('id', photoId);
  if (error) throw error;
  return getContact(contactId);
}

// The user confirming/rejecting the AI's person match — the only part of
// `research` the user edits directly, so it gets its own function rather
// than going through updateContact's flat patch model.
export async function setResearchMatchStatus(
  contact: Contact,
  matchStatus: ContactResearch['matchStatus'],
): Promise<Contact | undefined> {
  if (!contact.research) return contact;
  const { error } = await supabase
    .from('contacts')
    .update({ research: { ...contact.research, matchStatus } })
    .eq('id', contact.id);
  if (error) throw error;
  return getContact(contact.id);
}

// The user picking which company this contact actually works at — either
// confirming the AI's pick, or choosing one of its alternatives for an
// ambiguous name. Picking an alternative also adopts its website as the
// company URL (if none was typed), so the next AI refresh has an
// unambiguous anchor instead of guessing from the name again.
export async function confirmCompany(
  contact: Contact,
  choice: { name: string; description?: string; website?: string },
): Promise<Contact | undefined> {
  if (!contact.research) return contact;
  const current = contact.research.company;
  const isSwitch = choice.name !== current.name;
  const company = {
    ...current,
    name: choice.name,
    description: isSwitch ? choice.description : (choice.description ?? current.description),
    // A different company's careers page/sponsorship info no longer
    // applies — cleared until the user refreshes with AI.
    ...(isSwitch ? { website: choice.website, careersUrl: undefined, sponsorship: undefined } : {}),
    confidence: 'high' as const,
    alternatives: [],
    userConfirmed: true,
  };
  const updates: Record<string, unknown> = {
    company: choice.name,
    research: { ...contact.research, company },
  };
  if (!contact.companyUrl && choice.website) updates.company_url = choice.website;
  const { error } = await supabase.from('contacts').update(updates).eq('id', contact.id);
  if (error) throw error;
  return getContact(contact.id);
}

export async function getActionItemsForContact(contactId: string): Promise<ActionItem[]> {
  const { data, error } = await supabase
    .from('action_items')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as ActionItemRow[]).map(actionItemFromRow);
}

// For the Phase 4 End-of-Day recap, which aggregates every contact's action
// items/jobs across a whole event — action_items/job_opportunities only
// store contact_id, not event_id, so the caller passes the event's contact
// ids (from getContactsForEvent) rather than this module doing a join.
export async function getActionItemsForContacts(contactIds: string[]): Promise<ActionItem[]> {
  if (contactIds.length === 0) return [];
  const { data, error } = await supabase
    .from('action_items')
    .select('*')
    .in('contact_id', contactIds)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as ActionItemRow[]).map(actionItemFromRow);
}

export async function setActionItemDone(id: string, done: boolean): Promise<void> {
  const { error } = await supabase.from('action_items').update({ done }).eq('id', id);
  if (error) throw error;
}

export async function getJobsForContact(contactId: string): Promise<JobOpportunity[]> {
  const { data, error } = await supabase
    .from('job_opportunities')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as JobOpportunityRow[]).map(jobFromRow);
}

export async function getJobsForContacts(contactIds: string[]): Promise<JobOpportunity[]> {
  if (contactIds.length === 0) return [];
  const { data, error } = await supabase
    .from('job_opportunities')
    .select('*')
    .in('contact_id', contactIds)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as JobOpportunityRow[]).map(jobFromRow);
}

export async function setJobApplied(id: string, applied: boolean): Promise<void> {
  const { error } = await supabase.from('job_opportunities').update({ applied }).eq('id', id);
  if (error) throw error;
}

export type UpcomingDeadline = JobOpportunity & {
  contactName: string;
  eventId: string;
  eventName: string;
};

type UpcomingDeadlineRow = JobOpportunityRow & {
  contacts: { name: string; event_id: string; events: { name: string } | null } | null;
};

// A cross-event view for the Deadlines tab — every not-yet-applied job
// found by AI, wherever it was found, sorted soonest-first. RLS already
// scopes job_opportunities to the signed-in user, so no explicit user_id
// filter is needed here.
export async function getUpcomingDeadlines(): Promise<UpcomingDeadline[]> {
  const { data, error } = await supabase
    .from('job_opportunities')
    .select('*, contacts(name, event_id, events(name))')
    .eq('applied', false)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as UpcomingDeadlineRow[]).map((row) => ({
    ...jobFromRow(row),
    contactName: row.contacts?.name ?? 'Unknown',
    eventId: row.contacts?.event_id ?? '',
    eventName: row.contacts?.events?.name ?? '',
  }));
}

// FunctionsHttpError's body is the JSON { error: message } every Edge
// Function in this app returns on failure — surface that instead of the
// generic "Edge Function returned a non-2xx status code".
async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const context = (error as { context?: Response }).context;
    const detail = await context?.json?.().catch(() => null);
    throw new Error(detail?.error ?? error.message);
  }
  return data as T;
}

// Kicks off the Phase 3 Edge Function: structures the contact card, reads
// photos, and researches the person/company. Can take a while (multiple
// Gemini calls with retry-with-backoff on the free tier's rate limit), so
// callers should not block navigation on this — see new-contact.tsx, which
// fires it after Save without awaiting.
//
// The returned contact's `photos` is always empty — processing never
// touches photos, so callers should merge these fields onto a contact they
// already loaded rather than treating this as the full record.
export async function processContact(contactId: string): Promise<{
  contact: Contact;
  actionItems: ActionItem[];
  jobs: JobOpportunity[];
}> {
  const data = await invokeFunction<{
    contact: ContactRow;
    actionItems: ActionItemRow[];
    jobs: JobOpportunityRow[];
  }>('process-contact', { contactId });

  return {
    contact: contactFromRow(data.contact, []),
    actionItems: data.actionItems.map(actionItemFromRow),
    jobs: data.jobs.map(jobFromRow),
  };
}

// Kicks off the Phase 4 Edge Function: drafts a LinkedIn note, a longer
// LinkedIn message, and (if an email is on file) a follow-up email. Cheaper
// and faster than processContact — one Gemini call, no photos, no search —
// so callers can reasonably await this one directly.
export async function generateFollowup(
  contactId: string,
  tone?: FollowupTone,
): Promise<Contact> {
  const data = await invokeFunction<{ contact: ContactRow }>('generate-followup', {
    contactId,
    tone,
  });
  return contactFromRow(data.contact, []);
}

// "Refresh with my profile": re-runs the whole AI pipeline (card, company
// identity, research, tailored job suggestions) and — only if drafts
// already existed — redrafts the follow-up in the same tone, so both pick
// up profile edits. Sequential, never parallel, per the free tier's rate
// limit rule.
export async function refreshWithProfile(contact: Contact): Promise<{
  contact: Contact;
  actionItems: ActionItem[];
  jobs: JobOpportunity[];
}> {
  const result = await processContact(contact.id);
  if (!contact.linkedinNote) return result;
  const redrafted = await generateFollowup(contact.id, contact.followupTone);
  return { ...result, contact: { ...result.contact, ...redrafted } };
}
