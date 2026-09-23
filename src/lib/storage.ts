import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import type { BoothEvent, Contact, ContactPhoto, PhotoLabel } from '@/lib/types';

// Phase 1 is local-only: everything lives in AsyncStorage as two JSON lists.
// Phase 2 replaces this module with Supabase calls behind the same function
// names, so screens won't need to change.
const EVENTS_KEY = 'boothbuddy:events';
const CONTACTS_KEY = 'boothbuddy:contacts';

async function readList<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T[]) : [];
}

async function writeList<T>(key: string, items: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

export async function getEvents(): Promise<BoothEvent[]> {
  const events = await readList<BoothEvent>(EVENTS_KEY);
  return events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getEvent(id: string): Promise<BoothEvent | undefined> {
  const events = await readList<BoothEvent>(EVENTS_KEY);
  return events.find((event) => event.id === id);
}

export async function createEvent(input: {
  name: string;
  date: string;
  location?: string;
}): Promise<BoothEvent> {
  const events = await readList<BoothEvent>(EVENTS_KEY);
  const event: BoothEvent = {
    id: Crypto.randomUUID(),
    name: input.name,
    date: input.date,
    location: input.location,
    createdAt: new Date().toISOString(),
  };
  await writeList(EVENTS_KEY, [...events, event]);
  return event;
}

export async function getContactsForEvent(eventId: string): Promise<Contact[]> {
  const contacts = await readList<Contact>(CONTACTS_KEY);
  return contacts
    .filter((contact) => contact.eventId === eventId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getContact(id: string): Promise<Contact | undefined> {
  const contacts = await readList<Contact>(CONTACTS_KEY);
  return contacts.find((contact) => contact.id === id);
}

export async function createContact(input: Omit<Contact, 'id' | 'createdAt'>): Promise<Contact> {
  const contacts = await readList<Contact>(CONTACTS_KEY);
  const contact: Contact = {
    ...input,
    id: Crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await writeList(CONTACTS_KEY, [...contacts, contact]);
  return contact;
}

export async function updateContact(
  id: string,
  patch: Partial<Omit<Contact, 'id' | 'eventId' | 'createdAt'>>,
): Promise<Contact | undefined> {
  const contacts = await readList<Contact>(CONTACTS_KEY);
  const index = contacts.findIndex((contact) => contact.id === id);
  if (index === -1) return undefined;

  const updated = { ...contacts[index], ...patch };
  contacts[index] = updated;
  await writeList(CONTACTS_KEY, contacts);
  return updated;
}

async function updateContactPhotos(
  contactId: string,
  transform: (photos: ContactPhoto[]) => ContactPhoto[],
): Promise<Contact | undefined> {
  const contacts = await readList<Contact>(CONTACTS_KEY);
  const index = contacts.findIndex((contact) => contact.id === contactId);
  if (index === -1) return undefined;

  const updated = { ...contacts[index], photos: transform(contacts[index].photos) };
  contacts[index] = updated;
  await writeList(CONTACTS_KEY, contacts);
  return updated;
}

export async function addPhotoToContact(
  contactId: string,
  photo: ContactPhoto,
): Promise<Contact | undefined> {
  return updateContactPhotos(contactId, (photos) => [...photos, photo]);
}

export async function removePhotoFromContact(
  contactId: string,
  photoId: string,
): Promise<Contact | undefined> {
  return updateContactPhotos(contactId, (photos) => photos.filter((p) => p.id !== photoId));
}

export async function setContactPhotoLabel(
  contactId: string,
  photoId: string,
  label: PhotoLabel | undefined,
): Promise<Contact | undefined> {
  return updateContactPhotos(contactId, (photos) =>
    photos.map((p) => (p.id === photoId ? { ...p, label } : p)),
  );
}
