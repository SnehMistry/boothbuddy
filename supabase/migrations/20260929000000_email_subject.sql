-- Splits the email follow-up draft into a subject and body instead of one
-- combined string, so the web dashboard's "Open in Gmail" button can
-- pre-fill Gmail's compose URL subject/body params separately.
alter table public.contacts
  add column if not exists email_subject text;
