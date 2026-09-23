# Progress

Working log for picking this project back up. See `README.md` for the
overall roadmap and `PROMPT.md` for detailed feature specs.

## Status as of 2026-09-22

### Done
- **Phase 0**: Expo + TypeScript + Expo Router project scaffolded, git
  initialized, pushed to a private GitHub repo
  (https://github.com/SnehMistry/boothbuddy).
- **Phase 1 core flow**: create an event, capture a contact (voice memo +
  photo/QR + name), timeline view, contact detail view. Local-only storage
  via AsyncStorage (`src/lib/storage.ts`).
- **Multiple photos per contact** (pulled forward from a later ask into
  Phase 1 — see `PROMPT.md`): a contact can now have any number of labeled
  photos via a shared `PhotoPicker` component
  (`src/components/photo-picker.tsx`), used on both the capture screen and
  the contact detail screen.
- **Bug fix**: photo/audio files are now copied to permanent storage
  *immediately* on capture (see below), not deferred to Save time.

### Known bug — fixed in code, NOT yet re-tested on device
User hit this on a Samsung S23 FE via Expo Go:

> New Contact → recorded voice memo → took a photo → typed URL + name →
> Save got stuck on "Saving…" forever, with:
> `Error: Call to function 'FileSystemFile.copy' has been rejected.
> Caused by: java.nio.file.NoSuchFileException: .../Camera/....jpg`

**Root cause**: the camera (and audio recorder) write to a temporary OS
cache location. Android can evict files from that cache within seconds. The
original code waited until the user tapped Save to copy the photo/audio
into permanent storage — by which point, after typing a URL and a name,
Android had already deleted the temp file, so the copy failed. Because that
failure wasn't caught, `saving` state never reset and the button stayed
stuck.

**Fix applied**:
1. Photos are copied to permanent storage the instant they're captured
   (inside `PhotoPicker`, right after `takePictureAsync` /
   `launchImageLibraryAsync`), not at Save time.
2. Audio is copied to permanent storage the instant recording stops
   (`handleStopRecording` in `new-contact.tsx`), not at Save time.
3. Every capture/copy step is wrapped in try/catch with a user-facing
   `Alert` on failure, and state is always reset so nothing gets stuck.
4. `handleSave` no longer does any file copying at all — by the time it
   runs, `audioUri` and every photo's `uri` already point at permanent
   files. `createContact` is wrapped in try/catch too, with an error alert
   that reassures the user their voice memo/photos are safe even if the
   contact record write fails.
5. If one photo in a multi-select batch fails to copy, the others still
   get added (`PhotoPicker.pickFromLibrary` counts failures per-asset
   instead of aborting the whole batch).

**Verification done so far**: `npx tsc --noEmit` and `npx expo lint` are
clean (aside from one pre-existing, unrelated lint warning in the
create-expo-app template's `use-color-scheme.web.ts`, not our code). All
routes were smoke-tested via `npx expo start --web` + curl to confirm they
bundle and server-render without throwing.

**NOT yet done**: an actual on-device retest of the original repro steps
on the Samsung S23 FE. This needs to happen before Phase 1 is considered
verified-complete.

### Exact next steps
1. `cd ~/boothbuddy && npx expo start`, open on the Samsung device via Expo
   Go.
2. Repeat the exact repro: New Contact → record a voice memo → take a
   photo → type a company URL → type a name → Save. Confirm it saves
   successfully this time (no stuck button, no crash).
3. Additionally test the new multi-photo behavior: add 2-3 photos (mix of
   camera and "Choose from Library"), tap a thumbnail to view it
   full-screen, set a label, delete one via the X badge, delete one via
   long-press. Reopen the contact from the timeline and confirm all photos
   and labels persisted, and that "Add Photo" still works from the detail
   screen.
4. Force-quit and reopen the app; confirm everything (event, contact,
   photos, audio playback) is still there.
5. Once confirmed, check off Phase 1 in `README.md`'s roadmap (currently
   left unchecked on purpose, pending this retest).
6. Move to **Phase 2**: Supabase project setup (auth, database schema,
   file storage), walking the user through creating the Supabase project
   and keys, then wiring `src/lib/storage.ts` and `src/lib/files.ts` up to
   it behind the same function signatures so screens don't need to change.
7. Phase 3 should also pick up the **person & company research** feature
   spec'd in `PROMPT.md` (Claude API + web search, run in an Edge
   Function) — not started yet, no code exists for it.

## Repo state
All of the above (multi-photo feature + bug fix + PROMPT.md + this file)
is committed and pushed to `main`. Nothing is stashed or uncommitted.
