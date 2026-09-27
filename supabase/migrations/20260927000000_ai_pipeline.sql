-- Phase 3: AI pipeline (Gemini structuring, business card reading, person &
-- company research, job finding). See PROMPT.md "Phase 3 — AI pipeline,
-- full spec" for the requirements this schema supports.

-- Structured contact card fields, filled in by the process-contact Edge
-- Function. All nullable: a contact that hasn't been processed yet (or
-- whose processing failed) just has nulls here.
alter table public.contacts
  add column if not exists title text,
  add column if not exists company text,
  add column if not exists email text,
  add column if not exists linkedin_url text,
  add column if not exists summary text,
  add column if not exists topics text[],
  add column if not exists roles_mentioned text[],
  add column if not exists deadlines text[],
  add column if not exists memorable text,
  add column if not exists interest_level text
    check (interest_level in ('hot', 'warm', 'cold')),
  -- 'idle': never processed. 'processing': an Edge Function call is in
  -- flight. 'done': last run succeeded (fields above are populated).
  -- 'error': last run failed — see ai_error.
  add column if not exists ai_status text not null default 'idle'
    check (ai_status in ('idle', 'processing', 'done', 'error')),
  add column if not exists ai_error text,
  add column if not exists ai_processed_at timestamptz,
  -- Person & company research, cached here rather than re-run on every
  -- card view (research uses Google Search grounding when available, which
  -- has its own rate limit even on the free tier). Shape:
  -- {
  --   person: { summary, confidence: 'high'|'low' },
  --   company: { summary },
  --   sources: [{title,url}],     -- backs both summaries above
  --   grounded: boolean,          -- false = ungrounded, model's own knowledge only
  --   matchStatus: 'unconfirmed' | 'confirmed' | 'rejected'
  -- }
  add column if not exists research jsonb;

-- Action items pulled from a contact's conversation (e.g. "send resume").
-- A normalized table (not a column on contacts) because Phase 4's
-- End-of-Day recap needs a per-item "done" checkbox aggregated across every
-- contact at an event.
create table if not exists public.action_items (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  text text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- Open jobs/internships found via research, with a link and deadline where
-- available. Also normalized (not jsonb on contacts) for the same reason:
-- Phase 4's "jobs to apply for" checklist needs a per-job "applied"
-- checkbox and sorts across every contact at an event by deadline.
create table if not exists public.job_opportunities (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title text not null,
  url text,
  -- Free text, not a date column: AI-found deadlines are often imprecise
  -- ("Oct 15", "rolling", no year given) — Phase 4 does best-effort parsing
  -- for sorting rather than losing whatever the model actually said.
  deadline text,
  applied boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists action_items_contact_id_idx on public.action_items (contact_id);
create index if not exists job_opportunities_contact_id_idx on public.job_opportunities (contact_id);

alter table public.action_items enable row level security;
alter table public.job_opportunities enable row level security;

create policy "Users manage their own action items" on public.action_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own job opportunities" on public.job_opportunities
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
