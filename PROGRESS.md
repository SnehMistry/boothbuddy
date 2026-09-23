# Progress

Working log for picking this project back up. See `README.md` for the
overall roadmap and `PROMPT.md` for detailed feature specs.

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

## Repo state
Everything above is committed and pushed to `main` as of commit `db57fc7`.
Nothing is stashed or uncommitted.
