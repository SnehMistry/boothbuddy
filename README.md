# BoothBuddy

A career fair / networking follow-up assistant. Capture a 60-second voice memo
and a photo after each conversation, and let AI turn it into a structured
contact card and draft LinkedIn follow-up messages that night.

> 🚧 Status: early development (Phase 0 — project scaffolding). See
> [Roadmap](#roadmap) below for what's built vs. planned.

## The problem

At career fairs and networking events you talk to a lot of people quickly.
Afterward it's hard to remember who said what, who to follow up with first,
and what to actually say. BoothBuddy makes capture fast (voice + photo,
one-handed) and pushes the writing work — drafting personalized follow-up
messages — onto AI, done later that night when you have time to review.

## Screenshots

_Coming soon — screenshots will be added once the core capture flow (Phase 1)
is working._

## Features

- [ ] Create an "Event" (career fair / networking event) and group contacts under it
- [ ] Capture a contact in ~60 seconds: voice memo + photo + name
- [ ] Auto-transcribe voice memos
- [ ] AI-structured contact card: name, title, company, contact info, summary,
      topics, opportunities mentioned, action items, interest level
- [ ] Business card / badge photo reading (vision) to pre-fill fields
- [ ] Timeline view of everyone met at an event
- [ ] AI-drafted LinkedIn connection note + longer follow-up message per contact,
      with tone options and regenerate
- [ ] Track follow-up status: Not sent / Sent / Replied
- [ ] Offline-first capture with background sync
- [ ] Search & filter contacts by company, tag, interest level, event
- [ ] Follow-up reminders for "Hot" contacts
- [ ] Pre-event prep briefs from a pasted company list
- [ ] CSV export per event
- [ ] Web dashboard for reviewing contacts and drafting follow-ups at night

## Tech stack

| Layer            | Choice                                              |
| ---------------- | ---------------------------------------------------- |
| App              | [Expo](https://expo.dev) (React Native) + [Expo Router](https://docs.expo.dev/router/introduction/) + TypeScript — one codebase for iOS, Android, and web |
| Backend          | [Supabase](https://supabase.com) — Postgres database, email auth, file storage (audio + images) |
| Server-side AI   | Supabase Edge Functions — the app never talks to AI APIs directly, so API keys never live on-device |
| Speech-to-text   | OpenAI transcription API |
| Structuring & drafting | Anthropic Claude API — turns transcripts into contact cards, reads business cards (vision), and drafts follow-up messages |
| Capture          | `expo-camera` (photo + QR scanning), `expo-audio` (voice memo recording) |

### Why this stack

- **Expo + Expo Router** gives one TypeScript codebase for iOS, Android, and
  web, with platform-specific files (e.g. `Component.web.tsx`) where the
  mobile (capture-focused) and web (review-focused) UIs genuinely differ.
- **Supabase** bundles Postgres + auth + file storage behind one client
  library, which is enough for this app's needs without standing up a
  separate backend server.
- **Edge Functions as an AI proxy** is the only safe way to call paid AI APIs
  from a mobile app: any key bundled into the app binary can be extracted, so
  all AI calls happen server-side, authenticated by the user's Supabase
  session.

## Architecture

```mermaid
flowchart TD
    subgraph Client["Expo App (iOS / Android / Web)"]
        UI[Capture UI: camera, mic, forms]
        Local[(Local queue<br/>offline-first)]
    end

    subgraph Supabase["Supabase"]
        Auth[Auth]
        DB[(Postgres:<br/>events, contacts)]
        Storage[(Storage:<br/>audio + images)]
        Edge[Edge Functions]
    end

    subgraph AI["AI Providers"]
        STT[OpenAI<br/>speech-to-text]
        Claude[Anthropic Claude<br/>structuring, vision, drafting]
    end

    UI -->|record / photo| Local
    Local -->|sync when online| Storage
    UI -->|read / write rows| DB
    UI -->|login| Auth
    Storage -->|triggers processing| Edge
    Edge -->|transcribe| STT
    Edge -->|structure + draft| Claude
    Edge -->|write results| DB
```

## Project structure

```
src/
  app/           # Expo Router screens (file-based routing) — one file = one screen
  components/    # Shared UI components, with .web.tsx variants where platforms differ
  constants/     # Theme, config constants
  hooks/         # Shared React hooks
```

## Setup

### Prerequisites

- Node.js 18+ and npm
- [Expo Go](https://expo.dev/go) app on your phone (for quick testing), or
  Xcode / Android Studio for simulators
- A [Supabase](https://supabase.com) account (added in Phase 2)

### Install and run

```bash
git clone <this-repo-url>
cd boothbuddy
npm install
cp .env.example .env   # fill in real values once Supabase is set up (Phase 2)
npx expo start
```

Then press `i` for iOS simulator, `a` for Android emulator, `w` for web, or
scan the QR code with Expo Go on your phone.

### Environment variables

See [`.env.example`](./.env.example). Client-side keys (Supabase URL/anon
key) go in `.env`. AI provider keys (OpenAI, Anthropic) are never stored in
the app — they live only in Supabase Edge Function secrets.

## Roadmap

Built in phases, each one runnable and testable before moving to the next:

- [x] **Phase 0** — Project scaffolding: Expo + TypeScript + Expo Router, git, GitHub repo
- [ ] **Phase 1** — Local-only MVP: create event, capture contact (name, voice memo, photo/QR), timeline view. No AI yet.
- [ ] **Phase 2** — Supabase: auth, database schema, file storage, syncing
- [ ] **Phase 3** — AI pipeline via Edge Functions: transcription, contact structuring, business card reading
- [ ] **Phase 4** — Follow-up drafting screen: copy/regenerate/tone, "Open LinkedIn", sent status
- [ ] **Phase 5** — Web dashboard UI
- [ ] **Phase 6** — Offline queue, search/filter, reminders, pre-event prep, CSV export, stats
- [ ] **Phase 7** — Polish, deployment (web to Vercel/Netlify, mobile via EAS)
