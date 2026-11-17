# Family Schedule

A single-screen web app for coordinating family shifts by day. A carousel shows the days with three fixed shifts (Day, Afternoon and Night); for each shift you pick a person and adjust that day's hours. Changes sync in real time across devices.

## Features

- Carousel with 30 past days and 30 future days; today is centered and past days are dimmed.
- "+" button at the end to add the next day (persisted in the database).
- Three fixed shifts per day: Day, Afternoon and Night. New shifts cannot be created or deleted.
- Per-day, per-shift editable hours with start and end time fields.
- One person selector per shift; only one person can be assigned.
- Day status: Covered, Partially covered or Uncovered.
- Settings panel with the list of people.
- Change log for assignments (including person-to-person changes), new people and new shifts.
- Responsive layout: gear menu on mobile, floating buttons on desktop.
- No login or roles: intended to be shared through a private, trusted link.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript.
- Plain CSS, no UI frameworks.
- Supabase (Postgres + Realtime) as the database.
- Vercel for deployment.

## Getting started

Requirements: Node.js 22 or newer, npm and a Supabase project.

1. Install dependencies:

```bash
npm install
```

2. Create the tables by running `supabase/schema.sql` in the Supabase SQL Editor.

3. Copy `.env.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

4. Start the development server:

```bash
npm run dev
```

On Windows, if `npm` is blocked by the PowerShell execution policy, use `npm.cmd`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | Type checking |

## Deployment

Detailed steps for Supabase and Vercel are in [`deploy.md`](deploy.md).

## Structure

```
app/            pages, agenda component and styles
lib/            Supabase client
supabase/       SQL schema
deploy.md       deployment guide
```

## Security

The app has no authentication. Reads and writes are open through RLS so the family link works without accounts: anyone with the URL can view and change shifts. Do not share the link outside the trusted group.
