# Progress

Working log for picking this project back up. See `README.md` for the
overall roadmap and `PROMPT.md` for detailed feature specs.

## Status as of 2026-09-26

### Phase 2 confirmed working
User confirmed on-device: events/contacts sync to Supabase (Postgres +
Storage) and the same data shows up on the web build. Phase 2 is checked
off in `README.md`.

### Change 1 — audio removed completely
Voice memo recording/playback didn't work reliably and has been dropped
for good, per `PROMPT.md`'s "Audio removed" section:
- Removed the `expo-audio` dependency, its `app.json` plugin config, the
  recording UI (`new-contact.tsx`) and playback UI (`contact/[id].tsx`).
- `src/lib/files.ts` no longer takes a `bucket` parameter at all — `photos`
  is the only Storage bucket now, so the parameter was dead weight, not
  just a smaller enum.
- `Contact.audioStoragePath` and the `contacts.audio_path` column are gone
  (migration `20260926000000_remove_audio.sql`, applied to the live
  Supabase project via `supabase db push`).
- **Known loose end**: that migration does NOT drop the `audio` Storage
  bucket itself. Postgres refuses direct `DELETE`/`DROP` against
  `storage.objects`/`storage.buckets` ("Direct deletion from storage
  tables is not allowed. Use the Storage API instead."), and the bucket
  still has one leftover test recording that the `supabase` CLI's
  experimental `storage rm` command silently failed to delete (returned
  `{"deleted":[]}` with no error — looks like a CLI bug, not investigated
  further). The app no longer reads or writes this bucket either way, so
  it's harmless to leave. To actually remove it: Supabase dashboard →
  Storage → delete the one file in `audio/`, then delete the `audio`
  bucket.
- The capture screen (`event/[id]/new-contact.tsx`) now shows notes as an
  always-visible big text box (no more "or type notes instead" toggle) —
  it's the main input, per the updated spec.
- Verified: `npx tsc --noEmit` clean, `npx expo lint` clean (one
  pre-existing, unrelated error in `use-color-scheme.web.ts` predates this
  change — confirmed via `git stash`), and `npx expo export --platform web`
  bundles successfully.
- **Not yet tested on-device** — next step is to run the app on the Samsung
  device, create a contact with notes + photos + company URL + name, and
  confirm Save/sync still works with audio gone.

## Status as of 2026-09-23

### Done and verified on-device
- **Phase 0**: Expo + TypeScript + Expo Router project scaffolded, git
  initialized, pushed to a private GitHub repo
  (https://github.com/SnehMistry/boothbuddy).
- **Phase 1**: create an event, capture a contact (voice memo + photo/QR +
  name), timeline view, contact detail view, multi-photo support with
  labels. User confirmed a full on-device retest passed on a Samsung S23 FE
  (including the stuck-Save bug fix — see git history on
  `045693d` for the root cause writeup).
- **Phase 2, part 1 — Supabase project**: real Supabase project created
  (`boothbuddy`, us-west-2). Schema pushed via `supabase db push`
  (`supabase/migrations/20260923000000_init.sql`): `events`, `contacts`,
  `contact_photos` tables, all RLS-enabled with "own your rows" policies;
  two private Storage buckets (`audio`, `photos`) scoped to
  `{user_id}/...` paths.
- **Phase 2, part 2 — auth**: email + password sign-in (not the originally
  planned magic-link — Supabase's free tier blocks editing the magic-link
  email template without custom SMTP, so there was no way to show a typed
  code to the user; see commit `865c0fa`). User confirmed sign up, sign in,
  sign out, and the friendly error messages all work on-device.
- **Phase 2, part 3 — data sync**: `src/lib/storage.ts` and
  `src/lib/files.ts` rewritten to read/write Supabase (Postgres + Storage)
  instead of AsyncStorage/local files. See commit `db57fc7` for the full
  design (signed URLs for private-bucket display, client-generated ids so
  local photo previews match their eventual DB row, etc.).

### NOT yet verified on-device
Part 3 (the data-sync rewrite) has only been checked with `tsc`, `expo
lint`, and a web-bundle smoke test (curl against every route) — **no actual
on-device test yet**. This is the next thing to do.

**Important**: because `storage.ts` no longer touches AsyncStorage at all,
any events/contacts created during Phase 1 testing (before this rewrite)
are no longer visible in the app — they lived in local AsyncStorage, which
nothing reads anymore. This is expected, not a bug. Old local test data is
harmless and can be ignored (or the app reinstalled for a clean slate).

### Exact next steps
1. `cd ~/boothbuddy && npx expo start`, open on the Samsung device.
2. Sign in (or sign up again if starting fresh).
3. Create an event, then a contact: record a voice memo, take 2-3 photos
   (mix of camera and library), scan/type a company URL, name it, Save.
4. Confirm the contact appears in the timeline, and opening it shows the
   photos and lets the voice memo play back (both now come from Supabase
   Storage via signed URLs, not local files).
5. **The real test of "syncing"**: open the Supabase dashboard →
   Table Editor, confirm rows exist in `events`, `contacts`, and
   `contact_photos`; check the Storage section for the uploaded files.
   Then force-quit the app, or better, delete and reinstall it (or open on
   a different device/Expo Go instance signed into the same account) and
   confirm the same event/contact/photos/audio show up — this is the part
   Phase 1 could never do.
6. Try removing a photo (X badge and long-press) and confirm it disappears
   from both the `contact_photos` table and the Storage bucket in the
   dashboard.
7. Once confirmed, check off Phase 2 in `README.md`'s roadmap (left
   unchecked on purpose, pending this test).
8. Move to **Phase 3**: AI pipeline via Edge Functions (transcription,
   contact structuring, business card reading), which should also pick up
   the **person & company research** feature spec'd in `PROMPT.md` — not
   started yet, no code exists for it.

## Repo state (as of 2026-09-23 section above)
Everything up to that point was committed and pushed to `main` as of commit
`db57fc7`. See the top of this file for what's changed since.
