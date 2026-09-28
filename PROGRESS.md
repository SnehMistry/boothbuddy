# Progress

Working log for picking this project back up. See `README.md` for the
overall roadmap and `PROMPT.md` for detailed feature specs.

## Final polish pass — design system overhaul + QA (part 1: design)

User asked for a full portfolio-quality visual pass on both platforms plus
a QA sweep, working autonomously. This entry covers the design half;
QA/bugs/deploy follow in a later entry once that pass is done.

### The "harsh black boxes" bug — root cause, not just a restyle
Before touching any visual design, tracked down why sections inside the AI
card had black boxes behind text in dark mode: `ThemedView`'s `type` prop
defaulted to the `background` token when omitted, and `background` in dark
mode is `#000000`. Every `<ThemedView style={styles.section}>` used as a
plain layout wrapper (no `type` set, i.e. most of them — Roles, Deadlines,
Research, Sources, etc.) was rendering pure black, sitting inside an
already-grey card. Fixed at the root: `ThemedView` now stays transparent
unless `type` is explicitly given (`src/components/themed-view.tsx`) —
one change, fixes every instance at once, rather than patching 30+ call
sites individually.

### Design tokens (`src/constants/theme.ts`)
Replaced the old 5-color theme (`text`/`background`/`backgroundElement`/
`backgroundSelected`/`textSecondary`) with the token set actually asked
for: `background`, `surface`, `surfaceMuted`, `border`, `text`,
`textMuted`, `accent`/`accentMuted`, `success`/`warning`/`danger` (each
with a `*Muted` background variant), and `hot`/`warm`/`cold` for interest
badges — light and dark. Renamed every call site rather than keeping the
old names as aliases, using `tsc`'s literal-union type checking as a
mechanical safety net: removing a token name from `Colors` makes every
stale reference a compile error, so nothing could be silently missed.

Also added one typography scale (`Typography` in the same file —
`display`/`title`/`heading`/`body`/`bodyBold`/`label`/`caption`/`link`/
`code`) driving `ThemedText`'s `type` prop, replacing the old ad hoc
`small`/`smallBold`/`subtitle` names. **Scope decision**: used the system
font (already set up via `Platform.select`) rather than adding Inter via
expo-font — a custom font needs an async load gate before first paint for
marginal gain over a well-defined system-font scale, not worth it against
everything else in this pass. Noting this as a deliberate trade-off, not
an oversight.

### New shared primitives (`src/components/`)
`badge.tsx`, `chip.tsx`, `checkbox.tsx` (real tappable checkboxes with an
Ionicons checkmark, replacing ☐/☑ unicode that rendered as whatever glyph
each platform's font happened to have for it), `card.tsx`, `button.tsx`
(primary/secondary/danger/ghost variants, one loading-spinner treatment),
`avatar.tsx` (initials circles for the timeline/table), `external-link-
row.tsx` (a `displayUrl()` helper strips protocol/www/query-string junk
like `?utm_source=...` for a clean "jobs.company.com ↗" row instead of a
raw URL dump), `skeleton.tsx` (pulsing placeholder blocks instead of a
blank screen or bare spinner during first load), `toast.tsx` (a small
per-screen "Copied!" toast via a `useToast()` hook — not a global/portal
system), and `interest-picker.tsx` (Hot/Warm/Cold as a tone-colored
grouped-pill picker: red/amber/blue with a matching icon, replacing plain
text chips that all looked identical regardless of level).

Installed `@expo/vector-icons` for real iconography (Ionicons, one
family, throughout) — **and imported it as `@expo/vector-icons/Ionicons`
directly rather than the package barrel**, which matters concretely: the
barrel import pulled in all 7 bundled icon families' font files into the
web bundle (~2MB) even though only Ionicons is used; the direct subpath
import only bundles Ionicons' font (~390KB). Confirmed via `expo export
--platform web`'s asset listing before/after.

### Every screen rewritten
`sign-in-screen.tsx` (branded logo mark, tagline, show/hide password),
`index.tsx`/`index.web.tsx` (event cards with contact/pending-followup
counts; web home gets a stats header — people met, follow-ups sent,
applications due this week, backed by a new `getOverallStats()` in
`storage.ts`), `event/[id]/index.tsx` (timeline: avatar + interest badge +
AI status icon per contact, skeleton loading), `event/[id]/index.web.tsx`
(dashboard: per-event stats row, redesigned table/panel), `event/[id]/
new-contact.tsx`, `event/[id]/end-of-day.tsx` and `followup-card.tsx`
(read-only "text area" styling for drafts with a live character counter
on the LinkedIn note, Copy/Regenerate/Open LinkedIn/Open in Gmail, and
the new Toast instead of an inline "Copied ✓" label swap), and
`contact/[id].tsx` (the main target of the "ugly things" list — see
below).

### `contact/[id].tsx` specifically
- Deadlines: `Badge` pills (tone `warning`) instead of a bullet list —
  "a highlighted date pill" as asked.
- Interest level: `InterestPicker` instead of chips on a (formerly black)
  strip.
- Topics: `Chip` tags.
- Action items / jobs: real `Checkbox` rows.
- Company URL / email / LinkedIn / research sources: `ExternalLinkRow`
  everywhere instead of raw URL text.
- Research section is now collapsible (tap the header), with confidence
  and grounded/ungrounded shown as `Badge`s instead of parenthetical text.
- Timestamp ("Captured …") now sits next to a small clock icon at
  `caption` size instead of looking like an unstyled debug line.

### Verified so far
`npx tsc --noEmit`, `npx expo lint`, and `npx expo-doctor` all fully
clean (21/21 doctor checks) — including fixing two React Compiler
"purity" lint errors surfaced by this pass itself: `useRef(...).current`
read during render in `skeleton.tsx`/`toast.tsx` (switched to `useState`'s
lazy initializer), and `Date.now()` called in a component body for the
web dashboard's "due this week" stat (moved into the existing data-load
callback, which isn't render code, instead of a `useMemo`/`useEffect` —
neither of those satisfied the rule either, since it's specifically about
avoiding impure reads in anything that runs during render). `npx expo
export --platform web` bundles cleanly.

### Also done as part of this same pass (touched the same screens anyway)
- **The confirm-dialog bug**: `Alert.alert` with 2+ buttons is a no-op on
  react-native-web (no `window.confirm`/`window.alert` call happens at
  all for that case) — every "Delete this?"/"Sign out?" confirmation was
  silently doing nothing on web. New `src/lib/confirm.ts`'s
  `confirmAction()` (native: real `Alert.alert` buttons; web:
  `window.confirm`) replaces every one of them.
- **Change password**: `change-password-modal.tsx`, wired into both the
  web sidebar and the mobile events list header (`supabase.auth.
  updateUser({ password })`).

**Not yet done**: the QA edge-case sweep (no internet, very long notes,
10+ photos, AI failure/busy, empty event, session expiry, etc.) and the
final redeploy/rebuild — tracked in the next entry once that's done.

## 2026-09-28 (later) — Gmail/LinkedIn links, delete contact/event

### Open in Gmail, LinkedIn opens in a new tab on web
`generate-followup`'s schema now returns `emailSubject` and `emailDraft`
(body) as separate fields instead of one combined string — needed so
Gmail's compose URL can pre-fill `su=`/`body=` params independently
(new `email_subject` column, migration `20260929000000_email_subject.sql`).
`FollowupCard` (shared by both platforms) gets a web-only "Open in Gmail"
button next to the email draft, using Gmail's `mail.google.com/mail/
?view=cm&fs=1&...` compose URL — no API, no OAuth, $0 — opened in a new
tab via `window.open`, falling back to `mailto:` in the same tab if the
popup gets blocked. "Open LinkedIn" now goes through the same
`openExternalLink` helper, so it opens in a new tab on web too (native is
unaffected — `Linking.openURL` either way, no tab concept there).

### Delete contact / Delete event
DB cleanup for related rows needed no new code — `contact_photos`,
`action_items`, and `job_opportunities` all already have `on delete
cascade` back to `contacts`, and `contacts.event_id` cascades from
`events`, from the very first migration. The only manual step is Supabase
Storage: photo *objects* aren't part of Postgres, so `deleteContact`/
`deleteEvent` (`storage.ts`) explicitly `storage.from('photos').remove(
[...])` every photo path before deleting the row(s), or they'd be
orphaned in the bucket with nothing left pointing at them.

UI: a red "Delete Contact" button on the shared `contact/[id]` screen
(covers phone and web's "edit" deep view), plus a matching one directly
in the web dashboard's inline contact panel (so deleting doesn't require
navigating away from the table first). "Delete Event" as a header action
next to "End of Day" on the mobile timeline, and a toolbar link on the
web dashboard. Both platforms confirm via `Alert.alert` with a
destructive-styled button before deleting anything — same pattern
already used for sign-out and photo deletion.

**Verified**: `npx tsc --noEmit` and `npx expo lint` clean, `npx expo
export --platform web` bundles, migration pushed, `generate-followup`
redeployed. Web app redeployed and the APK rebuilt after this batch.

## 2026-09-28 — EAS APK crashed on launch

First standalone build installed but crashed immediately (opens and
closes); Expo Go worked fine. User's own hypothesis was correct and
matched the exact evidence: the first build's own log said

> Resolved "preview" environment for the build...
> No environment variables with visibility "Plain text" and "Sensitive"
> found for the "preview" environment on EAS.

`src/lib/supabase.ts` `throw`s at module scope if
`EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are
missing — that module is imported before anything renders, so the throw
crashes the whole app before a single frame draws. Expo Go never hits
this because it reads `.env` directly from the project on your machine;
a cloud EAS build has no access to your local `.env` (it's gitignored,
correctly) and needs the values set as EAS environment variables
instead — a real, asymmetric gap between the two, not a config mistake.

**Fixed**:
- `eas env:set` for both values, environments `production`, `preview`,
  and `development`, `--visibility plaintext` — safe, since both are
  already meant to ship inside the compiled app (same values already
  living in the git-tracked `.env.example`'s comments explaining they're
  public). Never touched `GEMINI_API_KEY` or any service-role key here.
- `supabase.ts` no longer throws — it exports `supabaseConfigError`
  instead and falls back to placeholder client-init values, so a future
  missing-config scenario can't crash the app the same way again. Both
  root layouts (`_layout.tsx`, `_layout.web.tsx`) check it first and
  render a new `ConfigErrorScreen` instead of the sign-in/dashboard tree
  when it's set.
- Checked for other Expo-Go-vs-standalone-build discrepancies:
  `expo-doctor` found real (if minor) SDK version mismatches on 5
  packages — patch-level, but worth fixing precisely because Expo Go
  always runs its own bundled SDK version regardless of `package.json`,
  while a standalone build uses exactly what's installed, so a version
  mismatch is a genuine place the two environments can diverge. Fixed
  via `npx expo install --fix`; `expo-doctor` now reports 21/21 clean.
  Found no other native-module/plugin/architecture discrepancy — the
  `babel.config.js`/`metro.config.js`-absent default setup is unchanged
  and applies identically to both environments (bundling doesn't differ
  between Expo Go and a standalone build; only compiled-in native code
  does).
- Rebuilt the APK after all of the above.

## 2026-09-27 (later) — interest-level bug, real grounding attempt, EAS

User confirmed: "AI processing works now, great results" — the first
full end-to-end confirmation of Phase 3. Two follow-ups from that
testing, plus a new ask (EAS Build):

### Interest-level tap doing nothing
Reported: tapping Hot/Warm/Cold on the contact screen didn't move the
selection border. Reviewed `setInterestLevel` (`contact/[id].tsx`) and
`updateContact` (`storage.ts`) end to end — found no reproducible logic
bug (RLS, the CHECK constraint, and the update/refetch flow all line up
correctly for this field the same as any other). Since I can't run the
app myself to catch a timing/environment issue directly, applied the fix
that's correct regardless of the exact root cause: made the update
**optimistic** (shows the new selection immediately, matching what the
user asked for — "show immediately" — instead of waiting on a round
trip) and added error handling that **reverts and shows an Alert** on
failure, in both `contact/[id].tsx` and the web dashboard's
`handleInterestChange` (which was silently swallowing errors via
`.catch(() => {})` — if the original bug was actually a silent failure,
it's no longer silent). The event timeline's filter
(`use-contact-filter.ts`) was already reading `contact.interestLevel`
correctly — nothing to fix there; it just needed the field to actually
persist.

### Grounding — made it a real attempt, not just a label
Researched properly this time (see `_shared/gemini.ts`'s comments): the
free 500-requests/day Google Search grounding allowance is documented
specifically for the **2.5 series** (`gemini-2.5-flash` /
`-flash-lite`) — not for `gemini-flash-latest`, which resolves to a 3.x
model with no free grounding. That's almost certainly why every research
call was silently falling back to ungrounded. `generateGrounded` now
tries `gemini-2.5-flash` (then `gemini-2.5-flash-lite`) specifically for
the grounded attempt, falling back to the normal models ungrounded on
*any* failure — including the genuine possibility that this API key's
project doesn't have 2.5-series access, since Google's own docs
say access is "limited to users who have actively used them in the
past" without clarifying whether that's actually enforced for new keys.
Both Edge Functions redeployed. **This needs an on-device check**: if
research now shows "live-searched," it worked; if it still says "not
live-searched," this key doesn't have 2.5-series access and the label
was already the correct, honest behavior.

### EAS Build set up for a sideloadable APK
Added `eas.json` (a `preview` profile: `distribution: internal`,
`android.buildType: apk` — confirmed against current Expo docs, since
the default AAB output can't be installed directly) and
`app.json`'s `android.package` (`com.snehmistry.boothbuddy`, required
for any EAS Android build, wasn't set before). Free tier is 15 Android
builds/month, one at a time — plenty for this. Walking the user through
`eas login` themselves next (needs their own free Expo account), then
running the build.

## 2026-09-27 — first real signal from Gemini

User tested on-device: the API key works and the pipeline reaches Gemini
(the first actual confirmation of that, after building Phases 3-4 blind).
The failure mode was `Gemini 503: This model is currently experiencing
high demand` (`UNAVAILABLE`) — the model itself being overloaded, not a
key/auth/schema problem, which is a good sign for everything built so far.

**Fix, in `_shared/gemini.ts`** (shared by both Edge Functions, so one
change covers both):
- 503 is now retried with backoff exactly like 429 (`isRetryableStatus`).
- If a model is still 429/503 after exhausting its own retries, falls
  back once to a concrete lighter model, `gemini-3.5-flash-lite` — not a
  guessed `-latest` alias; confirmed via docs that only
  `gemini-flash-latest` is documented as an existing alias, so a lite
  "-latest" alias would have been a guess. Fallback only triggers for
  429/503 — a different error type (bad request, empty response) skips
  it, since switching models wouldn't fix those and doing it anyway would
  just obscure the real error.
- Exhausting retries on *both* models throws a new `AiBusyError`, whose
  message is pre-split into a friendly headline and a `\n\nDetails: `
  section — see `src/lib/ai-errors.ts`'s `describeAiError()`, which every
  UI error display now goes through instead of showing `ai_error`/
  `error.message` raw. `src/components/ai-error-notice.tsx` renders the
  headline plainly with the detail behind a tap-to-expand "Show details"
  (React Native has no `<details>` element) — wired into `contact/[id]`'s
  and the web dashboard's error states; Alert popups show the headline
  only, since a modal isn't a great place for a long technical string.
- Retry/backoff constants tuned to roughly "a few attempts over about a
  minute" per model (3 retries, 3s base delay, exponential) — loosely
  budgeted, not scientifically tuned to a specific edge function
  wall-clock timeout, since research alone can already chain grounded →
  ungrounded → each with primary → fallback in the worst case. Noted as a
  real trade-off in the code comments rather than solved rigorously.

Both functions redeployed. Not independently re-verified against a live
503 (would need the same on-device round trip) — this is a direct,
mechanical response to the exact error the user pasted, not a fresh
guess, so confidence is reasonably high, but flagging that it's untested
by me specifically.

## Autonomous run — 2026-09-28

User asked for the rest of the project (Phase 3 verification through
deployment and polish) to be finished in one autonomous pass, stopping only
for things that genuinely need them, batched into one final report. This
section and the ones below record that run as it happens.

### Phase 3 verification — blocked on self-testing, not on the code
Tried to verify the deployed `process-contact` function end-to-end before
moving on, as asked. Two safe self-test paths were available and both are
closed:
- **Disposable test account via public sign-up**: the project has public
  sign-ups disabled (`{"error_code":"signup_disabled"}` from `/auth/v1/signup`
  even with a throwaway `@example.com` address) — almost certainly
  intentional, since this is a single-user personal app. Didn't try to
  re-enable it, since flipping a security-relevant Auth setting on a live
  project without asking isn't a call to make unilaterally.
- **service_role key for an admin-created test user**: the sandbox's
  command classifier blocks embedding that key in a Bash command
  ("Credential Materialization") — hit this earlier in the audio-cleanup
  work too. Piping it through `jq`/`export` to avoid literally typing it
  would still expose it in the tool output, which is the same risk the
  restriction exists to prevent, so didn't route around it.
- The CLI in this environment also has no `functions invoke` or
  `functions logs` subcommand to fall back on.

What *was* verified without any real user session: the function deploys,
`supabase functions list` shows it `ACTIVE` with `verify_jwt: true`, and a
careful re-read of `process-contact/index.ts` and `_shared/gemini.ts`
against the Gemini API docs fetched while building Phase 3. No bugs found
on re-read. **This still needs one real on-device test** — see the
checklist in the final summary.

### Phase 4 — End-of-Day recap, built and deployed
Implements PROMPT.md's "Phase 4 — End-of-Day recap, full spec".

**New Edge Function** `generate-followup`: drafts a LinkedIn connection
note (hard-capped at 300 chars server-side, not just prompted), a longer
follow-up message, and an email draft (only kept if the contact has an
email on file). Pure drafting from context already on the contact — no
photos, no search grounding — so unlike `process-contact` it's a single
`generateStructured()` call with no tools-vs-schema conflict to work
around. Shares `_shared/gemini.ts` with Phase 3.

**New migration** `20260928000000_followups.sql`: adds
`linkedin_note`/`linkedin_message`/`email_draft`/`followup_tone`/
`followup_status`/`followup_generated_at` to `contacts`. Drafts are cached
like Phase 3's research (not regenerated on every screen view).

**New screen** `event/[id]/end-of-day.tsx` (linked from a header button on
the event timeline): a "Draft All Follow-ups" button that processes
contacts missing a draft **one at a time** (not `Promise.all`) per the $0
budget's rate-limit rule; per-contact cards with tone chips, Copy buttons,
Regenerate, Open LinkedIn (profile URL if known, else a LinkedIn people-
search link), and Not sent/Sent/Replied status; an event-wide "Jobs to
apply for" list sorted by best-effort-parsed deadline (unparseable
deadlines sort last rather than being dropped, since `deadline` is free
text — see Phase 3's migration notes); an event-wide action items
checklist. Both lists aggregate `action_items`/`job_opportunities` across
every contact in the event via new `getActionItemsForContacts`/
`getJobsForContacts` (`.in('contact_id', [...])`), since those tables key
on contact, not event.

**Verified**: `npx tsc --noEmit` and `npx expo lint` clean (same one
pre-existing unrelated error), `npx expo export --platform web` bundles.
Migration pushed, function deployed and `ACTIVE`. **Not yet tested
on-device**, same constraint as Phase 3 above — needs a real signed-in
session to exercise the Gemini call.

### Web dashboard — desktop layout
Per the original spec's platform split ("Mobile: capture-focused... Web:
review-focused dashboard"). Uses Expo Router's platform-specific file
convention (`.web.tsx` overrides) rather than `Platform.OS` branching
inside shared files, so mobile's screens are completely untouched by this
— `_layout.tsx`/`event/[id]/index.tsx`/`index.tsx` still render exactly as
before on iOS/Android.

- `_layout.web.tsx`: web-only root layout — a persistent left sidebar
  (`web-sidebar.tsx`: event list, + New Event, Sign Out) next to the same
  `Stack` native uses, instead of full-screen push navigation.
- `index.web.tsx`: landing pane shown before an event is selected (the
  events list itself moved into the sidebar).
- `event/[id]/index.web.tsx`: the actual "dashboard" — a contacts table
  (name/company/interest/AI status) on the left, and clicking a row opens
  a side-by-side detail panel on the right with the AI-structured card,
  research/match-confirmation, and the **same `FollowupCard` component**
  used by the mobile End-of-Day screen (extracted to
  `components/followup-card.tsx` specifically so the drafting UI isn't
  duplicated between platforms). A "New Contact" and "End of Day →" link
  reuse the existing shared routes as-is.
- Full editing (notes, photos, raw fields) stays on the existing
  `contact/[id]` screen — the web panel links out to it ("Edit notes,
  photos & raw details →") rather than re-implementing that editor, since
  the dashboard's job is reviewing/drafting, not re-capturing.

### Search — `use-contact-filter.ts`
A small shared hook (name/company substring + interest-level filter,
client-side — an event's contact list is small enough that this doesn't
need a server query) used by both the mobile timeline's new search bar and
the web table's search bar, so filtering logic isn't duplicated per
platform.

**Verified**: `npx tsc --noEmit` and `npx expo lint` clean, `npx expo
export --platform web` bundles. **Could not runtime-test the web
dashboard in a real browser** — no browser automation tool (chromium-cli,
Playwright, claude-in-chrome) is available in this environment, and
installing Playwright fresh would mean downloading Chromium binaries with
no clear time budget. Static checks (typecheck, lint, bundling) all pass,
but the sidebar/table/panel layout has not been visually confirmed to
render correctly — this needs a real look in a browser.

### Free deployment — GitHub Pages
Scanned the entire git history for secrets before making the repo public
(required for free Pages hosting on a personal account): grepped every
commit's diff content for JWT-shaped strings, `sb_secret_`/service-role
patterns, Google API key patterns, and generic `password=`/`secret=`
assignments — nothing found. `.env` was never committed (confirmed via
`git log --all --full-history -- .env`); only `.env.example` exists, and
every value in it, in every revision, is a placeholder. Repo made public
via `gh repo edit --visibility public`.

- `app.json`: added `experiments.baseUrl: "/boothbuddy"` so the exported
  build's asset/script paths resolve under the GitHub Pages subpath.
  Confirmed empirically (inspected the exported `index.html`, and checked
  the dev server's bundle request path) that this only affects
  `expo export`, not `expo start --web`, which still serves from `/`.
- `package.json`: added `gh-pages` as a dev dependency with
  `predeploy`/`deploy` scripts. `predeploy` also copies `index.html` to
  `404.html` — this app's web output is `"single"` (one client-routed
  bundle, not per-route static HTML), so a static host needs that file to
  serve the app shell for a direct hit on a nested route like
  `/event/[id]` instead of a real 404.
- Deployed via `npm run deploy`; GitHub auto-detected the `gh-pages`
  branch and enabled Pages (confirmed via `gh api repos/.../pages`).
- **Verified past what static checks alone could show**: curled the live
  URL (root loads, HTTP 200), curled a fake nested route
  (`/event/some-fake-id`) and confirmed it returns byte-identical content
  to the root via the `404.html` fallback (so client-side routing gets a
  chance to run), and confirmed the referenced JS bundle is reachable at
  its base-URL-prefixed path. **Could not go further than that** — same
  missing-browser-automation constraint as the web dashboard above, so
  the app's actual JS execution (does the sign-in screen render, does
  routing actually work once loaded) is unverified.
- Live: **https://snehmistry.github.io/boothbuddy/**

### Polish
- **Branding**: replaced the generic Expo starter icon with a custom
  conference-name-badge glyph (one SVG source,
  `scripts/gen-icons.mjs`, rendered via a temporary `sharp` install —
  `npm install --no-save sharp`, not a project dependency — into every
  platform variant). Fixed the display name to "BoothBuddy" (was
  lowercase). Removed the default template's Icon Composer (`.icon`)
  bundle for iOS — hand-authoring that format without the real Icon
  Composer tool was too risky — in favor of the plain PNG icon, and
  deleted every unused template placeholder image (react-logo*,
  expo-badge*, tabIcons/, etc.).
- **Loading states**: several screens (`contact/[id]`, `end-of-day`, the
  web dashboard, the web root layout's auth check) rendered `null` while
  their data loaded, which flashes blank inside otherwise-visible screen
  chrome. All now show a shared `LoadingView` spinner instead. Native's
  root layout didn't need this — it's already covered by the branded
  splash overlay.
- **Lint**: removed `use-color-scheme.web.ts`, the starter template's
  SSR-hydration guard for `useColorScheme`. This project's web output is
  `"single"` (a plain client-rendered SPA, never static/server-rendered),
  so the hydration mismatch that hook guards against can't happen here —
  it was also the one lint error that had persisted since before this
  session (confirmed via `git stash` early on). `npx expo lint` is now
  fully clean.

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
