-- Typed notes are an alternative (or addition) to the voice memo: raw,
-- unstructured text the user can type fast instead of, or alongside,
-- recording. Phase 3's AI structuring step combines this with the voice
-- transcript, using whichever of the two (or both) exist.
alter table public.contacts
  add column if not exists notes text;
