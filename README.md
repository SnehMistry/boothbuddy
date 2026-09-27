# BoothBuddy

A career fair / networking follow-up assistant. Capture typed notes and a
photo after each conversation in about a minute, and let AI turn it into a
structured contact card, research the person and company, find relevant open
roles, and draft personalized LinkedIn and email follow-ups — all reviewed
in a desktop dashboard at night.

**Live demo:** https://snehmistry.github.io/boothbuddy/ (requires a
Supabase account to sign in — see [Setup](#setup) to run your own)

> Status: all seven build phases are implemented and deployed. The capture
> flow (events, contacts, photos) is confirmed working on-device; the AI
> pipeline (Gemini structuring/research/drafting) is built, deployed, and
> passes static verification (typecheck, lint, bundling) but hasn't yet had
> a live on-device confirmation run. See [Roadmap](#roadmap).

## The problem

At career fairs and networking events you talk to a lot of people quickly.
Afterward it's hard to remember who said what, who to follow up with first,
and what to actually say. BoothBuddy makes capture fast (typed notes + photo,
one-handed, no audio — dictate with your keyboard's mic if you'd rather
speak) and pushes the writing work — structuring the conversation, researching
the person and company, finding open roles, and drafting follow-up
messages — onto AI, done later that night when you have time to review.

## Screenshots

_Coming soon — add screenshots of the capture flow, the AI-structured
contact card, and the web dashboard here before sharing this README
further._

## Features

- [x] Create an "Event" (career fair / networking event) and group contacts under it
- [x] Capture a contact in ~60 seconds: typed notes + photo(s) + company URL/QR + name
- [x] Timeline view of everyone met at an event, with search/filter by name, company, or interest level
- [x] AI-structured contact card: title, company, email, LinkedIn, summary, topics, opportunities mentioned, deadlines, action items, interest level
- [x] Business card / badge / booth photo reading (vision) to fill in missing fields
- [x] Person & company research with source links, a confidence level, and a match confirm/reject step
- [x] Open jobs/internships found per company, with links and deadlines
- [x] "Reprocess with AI" after editing notes or adding photos
- [x] End-of-Day recap per event: AI-drafted LinkedIn connection note + longer follow-up message, with tone options, Copy, Regenerate, and "Open LinkedIn"
- [x] Optional follow-up email draft when an email address is known
- [x] Track follow-up status: Not sent / Sent / Replied
- [x] Jobs-to-apply checklist per event, sorted by deadline, with Applied checkboxes
- [x] Action items checklist per event
- [x] Web dashboard: sidebar + contacts table + side-by-side contact/draft review, for doing follow-ups at night
- [x] Free deployment: web on GitHub Pages, backend on Supabase's free tier, AI on Gemini's free tier — $0 to run

## Tech stack

| Layer            | Choice                                              |
| ---------------- | ---------------------------------------------------- |
| App              | [Expo](https://expo.dev) (React Native) + [Expo Router](https://docs.expo.dev/router/introduction/) + TypeScript — one codebase for iOS, Android, and web, with `.web.tsx` overrides for the desktop dashboard |
| Backend          | [Supabase](https://supabase.com) free tier — Postgres database, email auth, file storage (images) |
| Server-side AI   | Supabase Edge Functions (Deno) — the app never talks to the AI API directly, so the key never lives on-device |
| AI               | Google Gemini API free tier (`gemini-flash-latest`) — contact structuring, business card/photo reading, person & company research (with Google Search grounding when available), job finding, and follow-up drafting, all in one provider to keep the project at $0 |
| Capture          | `expo-camera` (photo + QR scanning), `expo-image-picker` |
| Web hosting      | [GitHub Pages](https://pages.github.com) — free, static hosting for the exported web build |

### Why this stack

- **Expo + Expo Router** gives one TypeScript codebase for iOS, Android, and
  web, with platform-specific files (e.g. `Component.web.tsx`) where the
  mobile (capture-focused) and web (review-focused) UIs genuinely differ —
  the web dashboard's sidebar/table/side-panel layout is a completely
  separate root layout from mobile's full-screen stack, but they share every
  data model, hook, and the AI-drafting UI component.
- **Supabase** bundles Postgres + auth + file storage behind one client
  library, which is enough for this app's needs without standing up a
  separate backend server.
- **Edge Functions as an AI proxy** is the only safe way to call an AI API
  from a mobile app: any key bundled into the app binary can be extracted, so
  all AI calls happen server-side, authenticated by the user's Supabase
  session and scoped by Postgres Row Level Security.
- **Gemini free tier only** keeps the whole project at $0 to run — no paid
  APIs, no paid hosting tier. The tradeoff is low rate limits, handled with
  retry-with-backoff and one-contact-at-a-time processing in the Edge
  Functions, and Google Search grounding isn't guaranteed to be available —
  when it isn't, research falls back to the model's own knowledge and the
  UI labels it as not live-searched rather than silently guessing.
- **GitHub Pages** is free static hosting with no server to maintain; the
  export is a client-side-routed single-page app, so deployment adds one
  `experiments.baseUrl` config value and a `404.html` copy of `index.html`
  (the standard trick for direct navigation to a nested route on a static
  host).

## Architecture

```mermaid
flowchart TD
    subgraph Client["Expo App"]
        Mobile[Mobile: capture UI<br/>camera, QR, forms]
        Web[Web dashboard:<br/>sidebar + table + side panel]
    end

    subgraph Supabase["Supabase (free tier)"]
        Auth[Auth]
        DB[(Postgres: events, contacts,<br/>action_items, job_opportunities)]
        Storage[(Storage: photos)]
        Structure[Edge Function:<br/>process-contact]
        Draft[Edge Function:<br/>generate-followup]
    end

    subgraph AI["Google Gemini (free tier)"]
        Gemini[gemini-flash-latest —<br/>structuring, vision, research,<br/>job finding, drafting]
    end

    Mobile -->|photo| Storage
    Mobile -->|read / write rows| DB
    Web -->|read / write rows| DB
    Mobile -->|login| Auth
    Web -->|login| Auth
    Mobile -->|process / reprocess| Structure
    Web -->|process / reprocess| Structure
    Web -->|draft follow-up| Draft
    Mobile -->|draft follow-up| Draft
    Structure -->|structure + research| Gemini
    Draft -->|draft messages| Gemini
    Structure -->|write results| DB
    Draft -->|write results| DB
```

## Project structure

```
src/
  app/           # Expo Router screens (file-based routing) — .web.tsx overrides give the web dashboard its own screens
  components/    # Shared UI: PhotoPicker, FollowupCard, WebSidebar, themed primitives
  constants/     # Theme, spacing
  hooks/         # useSession, useTheme, useContactFilter (shared search/filter logic)
  lib/           # Supabase client, storage.ts (all DB/Storage/Edge Function calls), shared types
supabase/
  functions/     # Edge Functions: process-contact, generate-followup, _shared/gemini.ts
  migrations/    # SQL migrations, applied in order via `supabase db push`
scripts/
  gen-icons.mjs  # Regenerates the app icon/branding assets from one SVG source
```

## Setup

### Prerequisites

- Node.js 18+ and npm
- [Expo Go](https://expo.dev/go) app on your phone (for quick testing), or
  Xcode / Android Studio for simulators
- A free [Supabase](https://supabase.com) account and project
- A free [Google Gemini API key](https://aistudio.google.com/apikey)
- The [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) (`brew install supabase/tap/supabase` or see their docs) to push migrations and deploy Edge Functions

### Install and run

```bash
git clone https://github.com/SnehMistry/boothbuddy.git
cd boothbuddy
npm install
cp .env.example .env   # fill in your Supabase project URL + publishable key
npx expo start
```

Then press `i` for iOS simulator, `a` for Android emulator, `w` for web, or
scan the QR code with Expo Go on your phone.

### Set up your own Supabase backend

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push                              # creates events, contacts, action_items, job_opportunities + RLS
supabase secrets set GEMINI_API_KEY=<your-key>
supabase functions deploy process-contact
supabase functions deploy generate-followup
```

### Environment variables

See [`.env.example`](./.env.example). Client-side keys (Supabase URL and
publishable key) go in `.env` — these are safe to ship in a compiled app.
The Gemini API key is never stored in the app; it lives only as a Supabase
Edge Function secret (`GEMINI_API_KEY`, set above).

### Deploying the web dashboard

```bash
npm run deploy   # builds the web export and pushes it to the gh-pages branch
```

Then in the repo's Settings → Pages, set the source to the `gh-pages` branch
(only needed once — this repo already has it configured).

## Roadmap

Built in phases, each one runnable and testable before moving to the next:

- [x] **Phase 0** — Project scaffolding: Expo + TypeScript + Expo Router, git, GitHub repo
- [x] **Phase 1** — Local-only MVP: create event, capture contact (name, notes, photo/QR), timeline view. No AI yet.
- [x] **Phase 2** — Supabase: auth, database schema, file storage, syncing. Confirmed on-device.
- [x] **Phase 3** — AI pipeline via Gemini Edge Functions: contact structuring, business card reading, person & company research, job finding. Built and deployed; on-device confirmation pending.
- [x] **Phase 4** — End-of-Day recap: follow-up drafts (copy/regenerate/tone, "Open LinkedIn", sent status), jobs-to-apply and action-item checklists. Built and deployed; on-device confirmation pending.
- [x] **Phase 5** — Web dashboard: sidebar, contacts table, side-by-side contact/draft review.
- [x] **Phase 6** — Search/filter by name, company, and interest level (the one extra kept in scope).
- [x] **Phase 7** — Polish (custom icon/branding, loading states, clean lint), deployment (web to GitHub Pages, mobile via Expo Go/EAS).
