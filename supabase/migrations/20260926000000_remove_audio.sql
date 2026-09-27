-- Audio (voice memo) support has been dropped from the app — see PROMPT.md
-- "Audio removed" (2026-09-26). Typed notes are now the primary text input.
--
-- The "audio" Storage bucket itself is NOT dropped here: Postgres blocks
-- direct DELETE/DROP against storage.objects/storage.buckets ("Direct
-- deletion from storage tables is not allowed. Use the Storage API
-- instead."), and this bucket had one leftover test recording in it. Delete
-- the bucket manually from the Supabase dashboard (Storage tab) once it's
-- empty, or leave it — the app no longer reads or writes to it either way.

drop policy if exists "Users manage their own audio files" on storage.objects;

alter table public.contacts drop column if exists audio_path;
