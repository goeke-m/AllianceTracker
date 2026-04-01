# OPNz Tracker

An alliance management web app for coordinating strategy in Navy Pirates of New Zealand. Tracks member power rankings, training schedules, tech research queues, absences, and more — all backed by Supabase with Google and Discord OAuth.

## Features

- **Marshall Map** — 7×7 visual grid ranking members by Weighted Average Damage (WAD), with R4/R5 highlighted for strategic positions
- **Voyage Schedule** — Weekly captain/first mate assignment tracker with R4 rotation and source attribution
- **Member Manager** — Full CRUD for alliance members including rank, THP, squad type, and VS scores
- **Alliance Tech Queue** — Ordered research queue with drag-to-reorder and Dev/War categorization
- **Shore Leave Tracker** — Member absence tracking with date ranges and status badges
- **Demerits Tracker** — Log and review member infractions
- **Kill List & Friends List** — Track enemies and allies by server with notes
- **VS Points** — Weekly competition score import and averages

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Backend/Auth/DB:** Supabase (PostgreSQL, Row-Level Security, OAuth2)

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### Installation

```bash
git clone https://github.com/goeke-m/OPNzTracker.git
cd OPNzTracker
npm install
```

### Environment Setup

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Database Setup

Run the SQL scripts in `/scripts/` against your Supabase project in this order:

1. `rls-policies.sql` — Row-Level Security policies
2. `seed-members.sql` — Initial member data (optional)
3. `demerits-migration.sql`
4. `alliance-tech-migration.sql`
5. `alliance-tech-queue-migration.sql`
6. `vs-points-migration.sql`
7. `set-admin.sql` — Grant admin role to your user

### Development

```bash
npm run dev
# Runs at http://localhost:5173
# Email/password login is available in dev mode
```

### Production Build

```bash
npm run build    # Outputs to ./dist/
npm run preview  # Test production build locally
```

## Deployment

The app deploys as a static site. Connect the repository to [Vercel](https://vercel.com) for automatic deploys on push. Set the environment variables in your Vercel project settings.

## Project Structure

```
src/
├── components/     # Reusable UI components (NavBar, LoginPage, visualizers)
├── pages/          # Full page views (MarshallMap, TrainSchedule, AllianceTech, etc.)
├── hooks/          # Custom React hooks for data fetching
└── lib/            # Supabase client, WAD algorithm, shared types
scripts/            # Supabase SQL migrations and seed data
```

## Admin Access

Admin features (damage log import, member management, demerits) are gated behind an `is_admin` flag set in Supabase user metadata. Run `scripts/set-admin.sql` to grant admin access to a user.

## WAD Algorithm

Member rankings use a Weighted Average Damage score:

```
WAD = latest * 0.60 + previous * 0.25 + older * 0.15
```

Scores are attendance-adjusted over the 10 most recent events.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history.
