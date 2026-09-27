# Progress

Working log for picking this project back up. See `README.md` for the
overall roadmap and `PROMPT.md` for detailed feature specs.

## Status as of 2026-09-27

### Phase 3 — AI pipeline (Gemini), built and deployed
Implements PROMPT.md's "Phase 3 — AI pipeline, full spec". User confirmed
photo uploads work on-device (camera + library, thumbnail + full-screen)
before this phase started.

**New Edge Function** `supabase/functions/process-contact/`:
- `_shared/gemini.ts`: plain-`fetch()` wrapper around the classic Gemini
  `generateContent` REST endpoint (not the `@google/genai` SDK — no bundling
  needed in Deno) using model alias `gemini-flash-latest`. Retries on HTTP
  429 with exponential backoff + jitter, per the $0 budget rule.
- `index.ts`: for one contact, (1) downloads its photos from Storage,
  base64-inlines them, and calls Gemini with `responseSchema` for strict
  JSON structuring (title, company, email, LinkedIn, summary, topics,
  roles/opportunities, deadlines, action items, memorable, interest level);
  (2) makes a **separate** research call with the `googleSearch` tool for
  grounding.
- **Important API constraint discovered while building this**: Gemini does
  not support combining `responseSchema` (structured JSON output) with
  `tools` (like `googleSearch`) in the same request on this model — that
  combo is a preview feature limited to newer model families. This is why
  structuring and research are two separate calls, not one.
- **Grounding fallback**: `generateGrounded()` tries the `googleSearch` tool
  first; if that call fails for *any* reason (quota, permission, tier
  eligibility — free-tier grounding availability shifts and isn't worth
  hardcoding assumptions about), it retries the same prompt without tools
  and marks the result `grounded: false`. The contact card UI labels
  ungrounded research as "not live-searched" per spec.
- The research call can't use `responseSchema` (see above), so it's asked
  in the prompt to reply with JSON and parsed leniently (strips markdown
  fences, falls back to using the raw text as the summary if parsing
  fails) — a malformed reply degrades gracefully instead of failing the
  whole pipeline.
- Runs as the calling user (forwards their `Authorization` header) rather
  than the service role, so RLS scopes every read/write automatically —
  no separate ownership check needed in the function.

**New migration** `20260927000000_ai_pipeline.sql`: adds structured card
columns + `ai_status`/`ai_error`/`ai_processed_at`/`research` (jsonb) to
`contacts`, and two new normalized tables, `action_items` and
`job_opportunities` (not jsonb blobs) — Phase 4's End-of-Day recap needs a
per-item checkbox aggregated across every contact at an event, which a
blob can't give cheaply. `job_opportunities.deadline` is `text`, not
`date`: AI-found deadlines are often imprecise ("Oct 15", no year), and a
real `date` column would silently drop anything unparseable.

**Client changes**: `processContact()` in `storage.ts` invokes the Edge
Function; `new-contact.tsx` fires it right after Save without awaiting (it
can take up to ~a minute with retries, and blocking Save would defeat the
capture-in-60-seconds goal) — the contact card just shows whatever
`ai_status` it lands on next time it's opened. The contact detail screen
(`contact/[id].tsx`) got a large addition: AI status bar with
Process/Reprocess/Retry, the structured card (with editable Hot/Warm/Cold
chips), action items and jobs checklists, and a research section with
Confirm/Reject match buttons. Both this screen and the event timeline poll
every 4s while a contact's `ai_status` is `processing`, so the UI updates
on its own.

**Deployed**: migration pushed and function deployed
(`supabase functions deploy process-contact`, `verify_jwt: true`) to the
live project. `npx tsc --noEmit` and `npx expo lint` both clean (same
one pre-existing unrelated error as before), and `npx expo export
--platform web` bundles successfully.

**Not yet tested end-to-end**: no on-device test yet — this whole
pipeline was built and deployed from docs/reasoning, not verified against
a real Gemini response. Likely first failure points if something's wrong:
the exact `gemini-flash-latest` model id, the `responseSchema` shape, or
the research call's lenient JSON parsing. The Supabase CLI in this
environment doesn't expose a `functions logs` subcommand — errors surface
through the app's own "Couldn't process with AI" alert (which threads the
Edge Function's real error message through), so that's the debugging
channel if the first test fails.

**Also fixed in passing**: `supabase` CLI was upgraded 2.117.0 → 2.118.0
while investigating an earlier storage cleanup issue, which invalidated
the CLI's login; user re-ran `supabase login` to restore it.

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
- Confirmed on-device: Save works and audio is gone.

### Photo upload bug fix — blank/black photos on Android
On-device testing surfaced a real bug: uploaded photos showed blank/black
in the app, and the Supabase dashboard showed the Storage objects were
only 14 bytes (should be ~100KB+ JPEGs).

**Root cause**: `uploadCapturedFile` (`src/lib/files.ts`) read the local
file with `fetch(localUri).then((res) => res.arrayBuffer())`. On Android,
React Native's `fetch`/`Blob` polyfill silently produced an empty body for
`file://` uris — the upload request "succeeded" (no error thrown) but sent
almost nothing.

**Fix**: read the file's bytes directly with the new `expo-file-system`
`File` API's `file.bytes()` (`Promise<Uint8Array>`) instead of going
through `fetch`, and pass that `Uint8Array` straight to
`supabase.storage.upload()` (it accepts `ArrayBufferView`, so no base64
round-trip or extra dependency like `base64-arraybuffer` was needed —
`.bytes()` already returns raw bytes). Also added a
`MIN_UPLOAD_BYTES = 1024` guard: `uploadCapturedFile` now throws if the
read file is smaller than that, which surfaces through the existing
"couldn't upload photo" / "some photos failed to upload" alerts in
`photo-picker.tsx` instead of silently saving a corrupt file.

**Existing broken photos**: 6 fifteen-ish-byte photos from earlier testing
are still sitting in Storage (and their `contact_photos` rows), all under
one contact. Rather than writing one-off cleanup code for a handful of
test rows, the fix is to **use the app itself**: open that contact, delete
each blank/black photo with the existing long-press → Delete (or the
full-screen viewer's Delete button) — this already removes both the DB row
and the Storage object — then re-add the photos if still wanted; they'll
upload correctly now.

**Not investigated further**: tried to script-delete the orphaned Storage
objects via `supabase storage rm` (both the old and a freshly-upgraded CLI,
2.117.0 → 2.118.0) — it accepted the command but performed no deletion
(`{"deleted":[]}`) even after adding the newly-required `--yes` flag, and
after the CLI upgrade `supabase login` needs to be re-run (auth token
wasn't carried over) before any more `supabase` CLI commands will work in
this environment. Not worth fighting further for a handful of test rows —
deleting through the app is faster and exercises the real delete path
anyway.

- **Not yet tested on-device**: add a new photo (camera and library) and
  confirm both the thumbnail and full-screen preview now show a real
  image, not blank/black.

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
