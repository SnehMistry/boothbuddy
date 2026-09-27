# Original project prompt

This is the original spec the user gave to kick off this project (2026-09-22),
preserved verbatim so future sessions have the full context without
depending on chat history. See the "Additional feature specs" section below
for requests made after the initial build started.

---

You are my senior engineer and teacher. I'm a CS student with very little
practical experience. Build this project with me step by step, explain what
you're doing in simple terms as you go, and stop at the end of each phase so
I can test before moving on.

## The app: "BoothBuddy" — a career fair / networking follow-up assistant

### Problem
At career fairs and networking events I talk to many people quickly. Afterward
I forget who said what. I want to capture each conversation in about 60
seconds, then that night get AI-drafted LinkedIn messages for everyone I met.

### Core user flow (per person I meet)
1. Tap "New Contact" (one big button; must be usable one-handed while standing).
2. Record a voice memo where I summarize the conversation (unstructured rambling).
3. Take a photo of their business card, booth, or badge, and/or scan a QR code
   or type a company URL.
4. Type or confirm the person's name.
5. Save. The app auto-attaches date, time, and the current event.
6. In the background, the app:
   - transcribes the voice memo
   - uses AI to turn the transcript + photo into a structured contact card
   - reads the business card image (name, title, company, email, phone,
     LinkedIn URL) and pre-fills fields
7. I can review and edit the structured card anytime.

### Structured contact card fields
- name, job title, company, email, phone, LinkedIn URL, company website
- event name, date, timestamp, booth location (optional)
- conversation summary (2 to 3 sentences)
- key topics discussed (tags)
- roles/opportunities mentioned (internships, full-time, deadlines)
- action items (e.g. "apply by Oct 15", "send resume", "email the recruiter")
- something personal/memorable (e.g. "also went to UCSD", "loves hiking")
- interest level: Hot / Warm / Cold (AI suggests, I can change)
- raw transcript and original photos kept for reference

### Events
- I can create an "Event" (name, date, location) and all contacts captured
  while it's active go under it.
- Event view: timeline of everyone I met, in order, with timestamps.

### Nightly follow-up
- "Draft Follow-ups" button on an event: for each contact, AI writes
  (a) a LinkedIn connection note under 300 characters and
  (b) a longer follow-up message for after they accept.
- Messages must reference specifics from our conversation, sound like a real
  student (not corporate or cringe), and vary between people.
- Each draft has: Copy button, Regenerate button, tone options
  (casual / professional / enthusiastic), and "Open LinkedIn" which opens
  their profile URL or a LinkedIn people search for their name + company.
- Mark contacts as "Sent" and track status: Not sent / Sent / Replied.
- NOTE: LinkedIn does not allow automated message sending through its API,
  so do NOT try to automate sending or scrape LinkedIn. Copy + open is the flow.

### Extra features (build after the core works)
- Offline-first: career fair Wi-Fi is bad. Save everything locally immediately
  and sync/process with AI when back online. Show a "pending" badge.
- Search and filter contacts (by company, tag, interest level, event).
- Follow-up reminders (e.g. notify me if I haven't messaged a Hot contact in 2 days).
- Pre-event prep: I paste a list of companies attending, AI gives me a short
  brief and 2 smart questions per company.
- Export an event to CSV.
- Optional thank-you email draft as an alternative to LinkedIn.
- Simple stats: people met per event, messages sent, replies.

### Platforms
- Mobile app (iOS + Android) AND a web app, sharing the same backend and data.
- Different UI per platform:
  - Mobile: capture-focused, big buttons, bottom tabs, fast camera/mic access.
  - Web: review-focused dashboard, sidebar, table of contacts, side-by-side
    view of contact card and drafted message, good for doing follow-ups at night.

### Tech stack (use this unless you have a strong reason not to; explain why if you change it)
- Expo (React Native) with Expo Router and TypeScript, one codebase for mobile
  and web, using platform-specific files/layouts for the different UIs.
- Supabase for auth (email login), Postgres database, and file storage
  (audio + images).
- Supabase Edge Functions for all AI calls so API keys NEVER live in the app.
- Speech-to-text: OpenAI transcription API (or suggest a cheaper alternative).
- AI structuring, business card reading (vision), and message drafting:
  Anthropic Claude API.
- expo-camera for photos and QR scanning, expo-audio for recording.
- Local storage/queue for offline mode.

### Rules
- Never commit API keys or secrets. Use a .env file, add it to .gitignore,
  and create a .env.example with placeholder values.
- Keep code clean and well commented so I can learn from it and explain it
  in interviews.
- Write a great README.md: what the app does, screenshots placeholder,
  tech stack, architecture diagram (Mermaid), setup instructions, and
  a "Features" and "Roadmap" section. This is going on my resume.
- Set up git from the start, make small meaningful commits with clear
  messages, and help me create a GitHub repo and push to it using the
  GitHub CLI (gh). Walk me through anything I need to click or log into.

### Build in phases (stop and let me test after each)
Phase 0: Check my machine has what's needed (Node, git, gh, Expo). Tell me
         exactly what to install if not. Create the project, git init,
         first commit, create GitHub repo, push.
Phase 1: Local-only MVP on mobile: create event, capture contact (name,
         voice memo, photo, QR/URL), timeline list with timestamps. No AI yet.
Phase 2: Supabase setup (walk me through creating the project and keys),
         auth, syncing data and files.
Phase 3: AI pipeline via Edge Functions: transcription, structuring into
         the contact card, business card reading.
Phase 4: Follow-up drafting screen with copy/regenerate/tone/open LinkedIn
         and sent status.
Phase 5: Web dashboard UI.
Phase 6: Extra features (offline queue, search, reminders, prep, export, stats).
Phase 7: Polish, README, and deployment: web app to Vercel or Netlify,
         mobile testing via Expo Go, and optionally an EAS build.

Start with Phase 0. Before writing code, give me a short plan and a
simple explanation of how the pieces (app, Supabase, Edge Functions, AI APIs)
connect.

---

# Additional feature specs (added after initial build)

Requests made after Phase 0/1 started that go beyond the original spec
above, or add detail to it. Update this section whenever a similarly
detailed feature request comes in — add a new dated subsection rather than
editing history away.

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
be gone and the copy throws. `uploadCapturedFile` (`src/lib/files.ts`) must
be called right after `takePictureAsync`/`launchImageLibraryAsync`/
recording `stop()` — it makes a local safety copy first, then uploads it,
and its result (a Supabase Storage path, never a local uri) is what gets
stored in state and eventually in `Contact`/`ContactPhoto`.

**Since Phase 2 (Supabase)**: `photos` maps to the `contact_photos` table
(`supabase/migrations/20260923000000_init.sql`), storing `storage_path`
(a path inside the private `photos` Storage bucket) rather than a local
file uri — a local uri only means something on the device that captured it.
Buckets are private, so displaying a photo means fetching a short-lived
signed URL (`getSignedUrl` in `src/lib/files.ts`) rather than using a plain
public URL.

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

## Typed notes (input built in Phase 2, AI use planned for Phase 3, 2026-09-24)

A contact can have typed notes as an alternative or addition to the voice
memo — fast, messy, unstructured text (e.g. "sarah recruiter google cloud
team, internship apps open oct 15, likes hiking, said email her resume").

**Data model**: `Contact.notes` (`src/lib/types.ts`), a plain optional
string, mapped to a `notes` column on the `contacts` table
(`supabase/migrations/20260924000000_add_contact_notes.sql`).

**Capture screen** (`event/[id]/new-contact.tsx`): under the voice memo
button, a small "or type notes instead" link reveals a multi-line text box.
Once revealed it stays visible — a contact can end up with a voice memo,
typed notes, or both, since they're independent fields, not mutually
exclusive alternatives.

**Contact detail screen** (`contact/[id].tsx`): notes are editable at any
time (same save-on-blur pattern as name/company URL), so notes can be added
or fixed up after the fact even if none were typed during capture.

**Phase 3 (not yet built)**: the AI structuring step must treat the voice
transcript and typed notes as two inputs to combine, not alternatives to
branch on — use whichever exist (transcript only, notes only, both, or
neither) and produce the same structured contact card fields regardless. If
neither exists, structuring still runs on whatever else is available (name,
photos, business card read).

**Superseded 2026-09-26**: see "Audio removed" below — there is no voice
transcript anymore. Typed notes are now the primary input, alongside photos,
company URL, and name.

## Audio removed — typed notes is the main input now (2026-09-26)

Voice memo recording/playback never worked reliably and has been dropped
entirely, along with all supporting code:
- `expo-audio` dependency and its `app.json` plugin config.
- Recording UI and playback UI (`new-contact.tsx`, `contact/[id].tsx`).
- `uploadCapturedFile`/storage helpers' `'audio'` bucket case (`files.ts`).
- `Contact.audioStoragePath`, the `contacts.audio_path` column, and the
  `audio` Storage bucket + its RLS policies (dropped via a new migration,
  not edited into the original one).
- Every other reference to "voice memo" / transcription in the original
  spec above and in the README is superseded by this section.

**New capture screen** (`event/[id]/new-contact.tsx`): four inputs, in this
order —
1. **Typed notes** — a big multi-line text box, always visible (not behind
   an "or type notes instead" toggle anymore), since it's now the main way
   conversation details get captured. The user dictates into it with their
   keyboard's built-in mic when they want to speak instead of type — the
   app itself does no audio capture or transcription.
2. **Photos** — multiple, labeled (unchanged from the existing
   `PhotoPicker` component).
3. **Company URL** — typed or QR-scanned (unchanged).
4. **Name** (unchanged).

## $0 budget — no paid APIs, ever (2026-09-26)

This project must not cost anything to run. This supersedes the original
spec's choice of OpenAI (speech-to-text — moot now, see above) and
Anthropic Claude (structuring/vision/drafting) as AI providers.

- **All AI calls use the Google Gemini API free tier** (Flash models —
  cheapest/fastest, sufficient for this app's needs). One provider for
  everything: contact structuring, business card/photo reading, person &
  company research, job finding, and message drafting.
- The Gemini key is a Supabase secret, `GEMINI_API_KEY`, already set on the
  project. It is used only inside Supabase Edge Functions — the app itself
  never sees it or calls Gemini directly, same reasoning as the original
  spec's "API keys never live in the app" rule.
- The free tier is rate-limited (low requests-per-minute). Edge Functions
  must: retry with exponential backoff on HTTP 429, process contacts one at
  a time (no batch/parallel AI calls), and surface a clear "AI busy,
  retrying…" state to the user instead of failing outright.
- No other paid service of any kind: no paid Supabase tier, no paid hosting,
  no paid third-party API. Free tiers only (Supabase free project, Vercel/
  Netlify free hosting, Gemini free tier).

## Phase 3 — AI pipeline, full spec (2026-09-26)

For each saved contact, a Supabase Edge Function sends Gemini everything
available for that contact — typed notes, photos, company URL, name — and
fills in the structured contact card:
name, title, company, email, LinkedIn URL, summary, topics discussed,
roles/opportunities mentioned, deadlines, action items, something
memorable, and an interest level (Hot/Warm/Cold).

- **Business card / badge / booth photo reading**: Gemini's vision input
  reads uploaded photos to fill in fields missing from the typed notes
  (name, title, company, email, LinkedIn URL, etc.).
- **Person & company research**: use Gemini's Google Search grounding tool
  if the free tier supports it (check current Gemini API docs for
  grounding availability/limits on the free tier before building this —
  don't assume). If grounding isn't available on the free tier, research
  using the model's own knowledge instead and **clearly label the result as
  ungrounded / not live-searched** so the user knows not to trust it as
  current. Either way: include a source link for every fact stated (when
  grounded), a confidence level on the person match ("high" /
  "possibly the wrong person"), and require the user to confirm or reject
  the match before it's treated as real — this carries over the match-
  confidence requirement from the original Person & Company research spec
  above, which this section supersedes with the Gemini-only implementation.
- **Job/internship finding**: as part of the same research step, find
  relevant open jobs/internships at the contact's company, with application
  links and deadlines where the search can find them.
- **Reprocessing**: a "Reprocess with AI" button on the contact card re-runs
  this whole pipeline — for when the user edits notes or adds photos after
  the first pass. Same one-at-a-time, retry-with-backoff rules apply.
- Cache results on the contact; don't silently re-run research just from
  reopening the card (carried over from the original spec).

## Phase 4 — End-of-Day recap, full spec (2026-09-26)

An "End of Day" screen per event — everything needed to act on that
night's contacts in one place:

- **Per person**: a LinkedIn connection note (under 300 characters) and a
  longer follow-up message, both referencing specifics from the actual
  conversation (from notes/photos/research, not generic). Each has: Copy,
  Regenerate, tone options (casual / professional / enthusiastic), "Open
  LinkedIn" (their profile URL if known, otherwise a LinkedIn people-search
  link for name + company — never automate LinkedIn sending or scraping),
  and a status control: Not sent / Sent / Replied.
- **Optional follow-up email draft**, generated only if an email address
  was found for that contact.
- **Jobs to apply for checklist**: every job/internship found in Phase 3
  research across the event's contacts, with links and deadlines, sorted by
  deadline, each with an Applied checkbox.
- **Action items checklist**: all action items pulled from every contact
  at the event (e.g. "send resume", "email the recruiter"), so nothing
  gets missed.

## Phases 5 & 7 simplified; most of Phase 6 skipped (2026-09-26)

- **Phase 5 (web dashboard)**: focus specifically on making the web app a
  good dashboard for the End-of-Day recap (Phase 4) — that's the primary
  "review at night" use case, more than a general contacts table.
- **Phase 6 (extras)**: skip all of it except search, and only if it's
  quick to add once Phase 5 exists. Offline queue, reminders, pre-event
  prep, CSV export, and stats are out of scope for now.
- **Phase 7 (polish/deploy)**: deploy the web app free on Vercel or
  Netlify, and polish `README.md` since it's going on the user's resume —
  no other changes to Phase 7's original scope.
