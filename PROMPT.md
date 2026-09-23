# Feature specs for future sessions

This file tracks feature requests the user has made that go beyond what's in
`README.md`'s roadmap description, so a future session (human or AI) doesn't
lose the detail behind why something is built the way it is, or what's still
planned. Update this file whenever a similarly detailed feature request comes
in — add a new dated section rather than editing history away.

## Multiple photos per contact (built in Phase 1, 2026-09-22)

A contact can have any number of photos, not just one — business card,
badge, booth, brochure, etc.

**Data model** (`src/lib/types.ts`): `Contact.photos` is a `ContactPhoto[]`,
where each `ContactPhoto` has `id`, `uri`, an optional `label` (one of
`business_card | booth | badge | other`, see `PhotoLabel`), and `createdAt`.
This replaced an earlier single `photoUri?: string` field.

**UI**: `src/components/photo-picker.tsx` is a shared component used by both
the capture screen (`event/[id]/new-contact.tsx`) and the contact detail
screen (`contact/[id].tsx`), since "add more photos later" (from the detail
screen) and "add photos during capture" are the same underlying behavior.
It renders a horizontal row of thumbnails with an X badge to delete
(long-press also deletes) and a `+` tile to add more. Tapping a thumbnail
opens a full-screen viewer with label chips (tap to set/unset) and
Delete/Close buttons. Adding a photo prompts Take Photo vs. Choose from
Library (`expo-image-picker`, multi-select enabled).

**Critical rule — copy to permanent storage immediately on capture, not at
Save time.** This was a real bug (see PROGRESS.md history): Android can
evict a camera/picker temp file from its cache within seconds, so if the
app waits until the user taps Save to copy the file, the source may already
be gone and the copy throws. `savePersistentCopy` (`src/lib/files.ts`) must
be called right after `takePictureAsync`/`launchImageLibraryAsync`/
recording `stop()`, and its result (not the original temp uri) is what gets
stored in state and eventually in `Contact`/`ContactPhoto`.

**When Phase 2 (Supabase) lands**: `photos` should map to a `contact_photos`
table (or a JSON column, if simplicity wins) with the same fields plus
`storage_path` pointing at a Supabase Storage object instead of a local
file uri. Keep the label enum.

## Person & Company research (planned for Phase 3 — not yet built)

After a contact is saved and processed, a Supabase Edge Function calls the
Claude API with its web search tool to find public professional info about
the person and their company, using whatever's available: name, company,
title, company URL, and anything read off the business card photo.

**Output** — a "Research" section on the contact card:
- **Person**: likely current role, team, background, public posts/talks,
  things in common with the user (school, hometown, skills)
- **Company**: what they do, recent news, open internship/new-grad roles,
  application links and deadlines
- 2-3 conversation hooks to use in the follow-up message
- A source link for every fact stated

**Match confidence**: names collide across people, so the research result
must include a confidence level ("high" / "possibly the wrong person") for
the person match, and the user must be able to confirm or reject the match
before it's treated as real.

**Constraints**:
- Public professional info only. Never scrape LinkedIn (against its terms)
  — instead provide a LinkedIn *search* link for the person.
- Research runs automatically in the background after a contact is
  processed, but there's also a manual "Research again" button.
- Cache results (store them on the contact) and don't re-run research
  unless the user explicitly asks — this calls a paid API with web search,
  so avoid silently re-running it (e.g. don't re-research just because the
  user reopened the contact card).

**Downstream**: once the user confirms a research match, Phase 4's
follow-up message drafting should feed the confirmed research in as context
so drafts can reference specifics (e.g. a recent company launch, a shared
alma mater) rather than staying generic.
