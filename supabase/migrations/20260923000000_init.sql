-- BoothBuddy initial schema: events, contacts, contact photos.
--
-- Every table has a `user_id` column and Row Level Security (RLS) enabled,
-- so Postgres itself enforces "you can only ever see your own data" even if
-- application code has a bug — the database is the last line of defense,
-- not the app.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  date date not null,
  location text,
  created_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  -- Denormalized from events.user_id so RLS policies below don't need a
  -- join on every row check.
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  audio_path text,
  company_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_photos (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  storage_path text not null,
  label text check (label in ('business_card', 'booth', 'badge', 'other')),
  created_at timestamptz not null default now()
);

create index if not exists contacts_event_id_idx on public.contacts (event_id);
create index if not exists contact_photos_contact_id_idx on public.contact_photos (contact_id);

alter table public.events enable row level security;
alter table public.contacts enable row level security;
alter table public.contact_photos enable row level security;

-- One "owns their rows" policy per table, covering every operation.
-- WITH CHECK guards inserts/updates; USING guards selects/deletes/updates.
create policy "Users manage their own events" on public.events
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own contacts" on public.contacts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own contact photos" on public.contact_photos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Storage: two private buckets. Files are stored at "{user_id}/{filename}",
-- and the policies below check that prefix against auth.uid() so a user can
-- only read/write inside their own folder.
insert into storage.buckets (id, name, public)
values ('audio', 'audio', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy "Users manage their own audio files" on storage.objects
  for all
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users manage their own photo files" on storage.objects
  for all
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
