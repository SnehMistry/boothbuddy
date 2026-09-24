import * as Crypto from 'expo-crypto';

import { supabase } from '@/lib/supabase';
import type { BoothEvent, Contact, ContactPhoto, PhotoLabel } from '@/lib/types';

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
  audio_path: string | null;
  company_url: string | null;
  notes: string | null;
  created_at: string;
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
    audioStoragePath: row.audio_path ?? undefined,
    companyUrl: row.company_url ?? undefined,
    notes: row.notes ?? undefined,
    photos,
  };
}

export async function getEvents(): Promise<BoothEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as EventRow[]).map(eventFromRow);
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

export async function createContact(input: Omit<Contact, 'id' | 'createdAt'>): Promise<Contact> {
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
      audio_path: input.audioStoragePath ?? null,
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
  if (patch.companyUrl !== undefined) updates.company_url = patch.companyUrl ?? null;
  if (patch.audioStoragePath !== undefined) updates.audio_path = patch.audioStoragePath ?? null;
  if (patch.notes !== undefined) updates.notes = patch.notes ?? null;

  const { error } = await supabase.from('contacts').update(updates).eq('id', id);
  if (error) throw error;

  return getContact(id);
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
