# WPNZ Tracker

An alliance management web app for coordinating strategy for WPNZ Weaponz. Tracks member power rankings, training schedules, tech research queues, absences, and more — all backed by Supabase with Google and Discord OAuth.

## Features

- **Marshall Map** — 7×7 visual grid ranking members by Weighted Average Damage (WAD), with R4/R5 highlighted for strategic positions
- **Train Schedule** — Weekly conductor/VIP assignment tracker with R4 rotation, a push/save week-mode toggle, and source attribution
- **Member Manager** — Full CRUD for alliance members including rank, THP, squad type, timezone, and VS scores; automatic member sync from the lastwar.tools API on a Mon/Wed/Fri schedule, plus an admin-only manual sync button
- **Alliance Tech Queue (Armory)** — Ordered research queue with drag-to-reorder and Dev/War categorization
- **Desert Storm & Canyon Storm** — Weekly two-team roster builder with attendance tracking, rolling no-show counts, and event history
- **Stand Down Tracker** — Member absence tracking with date ranges and status badges
- **Demerits Tracker** — Log and review member infractions
- **Kill List & Friends List** — Track enemies and allies by server with notes
- **VS Points** — Weekly competition score import and averages
- **Error Log Viewer** — Owner-only view of persisted application errors for debugging

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Backend/Auth/DB:** Supabase (PostgreSQL, Row-Level Security, OAuth2)

## Getting Started

### Prerequisites

- Node.js 24+ (matches the CI build pipeline)
- A [Supabase](https://supabase.com) project

### Installation

```bash
git clone https://github.com/goeke-m/AllianceTracker.git
cd AllianceTracker
npm install
```

## Local Development

### Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)

### First-time setup

```bash
npx supabase link --project-ref YOUR_PROJECT_REF   # links CLI to production
cp .env.local.example .env.local
npx supabase start                                  # starts local Supabase
npx supabase status                                 # copy anon key → paste into .env.local
npx supabase db reset                               # applies migrations + seed data
npm install
npm run dev
```

Open http://localhost:5173 for the app, http://localhost:54323 for Supabase Studio.

### Daily workflow

| Command | Effect |
|---|---|
| `npx supabase start` | Start local Supabase instance |
| `npx supabase stop` | Stop local Supabase instance |
| `npx supabase db reset` | Wipe local DB and re-apply all migrations + seed |
| `npx supabase migration new <name>` | Create a new migration file |
| `npx supabase db push` | Push pending migrations to production (CI does this automatically) |

### Adding a migration

```bash
npx supabase migration new add_my_column
# Edit supabase/migrations/<timestamp>_add_my_column.sql
npx supabase db reset   # verify locally
git add supabase/migrations/
git commit -m "chore: add migration for my column"
git push            # CI applies it to production automatically
```

Never edit an existing migration file after it has been pushed to production.

## pg_cron (alliance member sync)

The `sync-alliance-members` Edge Function runs on a pg_cron schedule (MWF at 10:00 UTC). This is a **manual setup step** — it is not run automatically by migrations.

To set it up after a fresh database:

1. Enable the `pg_cron` and `pg_net` extensions: Supabase Dashboard → Database → Extensions
2. Deploy the Edge Function: `npx supabase functions deploy sync-alliance-members`
3. Open the Supabase SQL Editor and run the following, replacing the placeholders:

```sql
SELECT cron.schedule(
  'sync-alliance-members',
  '0 10 * * 1,3,5',
  $$
  SELECT
    net.http_post(
      url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/sync-alliance-members',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $$
);
```

Replace `<PROJECT_REF>` with your Supabase project reference ID and `<SERVICE_ROLE_KEY>` with your service role key (Project Settings → API → service_role key).

Verify: `SELECT * FROM cron.job;` should show the `sync-alliance-members` job.

### Setting an admin user

Admin status is read from the user's Supabase Auth metadata (`auth.jwt() -> 'user_metadata' ->> 'is_admin'`), not from the `members` table. After a full DB wipe (or for a new user), run this in the Supabase Dashboard → SQL Editor, replacing the UUID with the target user's `auth.users` UUID (Authentication → Users):

```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"is_admin": true}'::jsonb
WHERE id = '<USER_UUID>';
```

The user needs to sign out and back in (or otherwise refresh their session) for the updated claim to appear in their JWT.

### Production Build

```bash
npm run build    # Outputs to ./dist/
npm run preview  # Test production build locally
```

## Deployment

Deploys automatically via GitHub Actions on push to `main`. The pipeline runs `supabase db push` to apply pending migrations, then builds the Vite app and publishes to GitHub Pages.

**GitHub setup (one-time):**
1. Settings → Pages → Source: "GitHub Actions"
2. Settings → Secrets → Add: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`
3. Settings → Variables → Add: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Project Structure

```
src/
├── components/     # Reusable UI components (NavBar, LoginPage, visualizers)
├── pages/          # Full page views (MarshallMap, TrainSchedule, AllianceTech, etc.)
├── hooks/          # Custom React hooks for data fetching
└── lib/            # Supabase client, WAD algorithm, shared types
supabase/
├── migrations/     # Versioned Supabase CLI migrations (schema + RLS policies)
├── seed.sql        # Local-dev-only seed data (member rows, default settings)
└── functions/      # Supabase Edge Functions (e.g. sync-alliance-members)
```

## Admin Access

Admin features (damage log import, member management, demerits) are gated behind an `is_admin` flag set in Supabase user metadata. See "Setting an admin user" above to grant admin access to a user.

## WAD Algorithm

Member rankings use a Weighted Average Damage score:

```
WAD = latest * 0.60 + previous * 0.25 + older * 0.15
```

Scores are attendance-adjusted over the 10 most recent events.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history.
