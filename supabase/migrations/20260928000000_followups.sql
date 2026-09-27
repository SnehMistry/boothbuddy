-- Phase 4: End-of-Day recap. See PROMPT.md "Phase 4 — End-of-Day recap,
-- full spec". Follow-up drafts are cached on the contact (like Phase 3's
-- research) rather than regenerated on every screen view, and are
-- independent of ai_status — drafting can run even for a contact that
-- hasn't been through (or failed) Phase 3 structuring, just with less
-- context to draw on.

alter table public.contacts
  add column if not exists linkedin_note text,
  add column if not exists linkedin_message text,
  add column if not exists email_draft text,
  add column if not exists followup_tone text not null default 'casual'
    check (followup_tone in ('casual', 'professional', 'enthusiastic')),
  add column if not exists followup_status text not null default 'not_sent'
    check (followup_status in ('not_sent', 'sent', 'replied')),
  add column if not exists followup_generated_at timestamptz;
