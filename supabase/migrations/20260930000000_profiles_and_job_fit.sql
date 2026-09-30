-- "My profile" (who the user is: school, major, year, graduation date,
-- work authorization, interests) and richer job suggestions tailored to it.
-- Both Edge Functions read the caller's profile row and feed it into every
-- Gemini prompt, so research, job suggestions, and follow-up drafts are
-- written for *this* student rather than a generic one.

-- One row per user. Free-text columns on purpose: "3rd year", "Dec 2027",
-- and an F-1/CPT/OPT explanation are all read by a language model, not
-- parsed by code, so structure here would only get in the way.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  school text,
  major text,
  year_in_school text,
  graduation text,
  work_authorization text,
  interests text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users manage their own profile" on public.profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Job suggestions are now AI suggestions tailored to the profile, not
-- scraped listings: `fit_reason` says why this role fits the student, and
-- `kind` groups it (internship / co-op / new grad). `url` is now always a
-- real company careers page (checked reachable server-side), never a
-- model-invented posting link — see process-contact.
alter table public.job_opportunities
  add column if not exists fit_reason text,
  add column if not exists kind text
    check (kind in ('internship', 'co_op', 'new_grad', 'other'));
