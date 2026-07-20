# Supabase CLI Migrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manual `scripts/*.sql` execution with Supabase CLI-managed migrations, local Docker-based dev, and a GitHub Actions pipeline that migrates then deploys to GitHub Pages on every push to `main`.

**Architecture:** `supabase db pull` captures the complete current production schema as a single baseline migration. All future schema changes get individual migration files via `supabase migration new`. GitHub Actions runs `supabase db push` before the Vite build/deploy on every push to `main`.

**Tech Stack:** Supabase CLI, Docker Desktop, GitHub Actions, GitHub Pages, Vite

## Global Constraints

- Migration tool: Supabase CLI only — no third-party migration runners
- Base schema: one file (`20260101000000_base_schema.sql`) pulled from remote via `supabase db pull` — do NOT create individual migration files for changes already captured in the pull (ALTER TABLE renames, ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS, CREATE POLICY) — they are already in the pulled schema and would break a fresh `supabase db reset`
- Seed data: `supabase/seed.sql` only — applied by `supabase db reset` locally; never run in CI
- GitHub repo: `goeke-m/AllianceTracker` — Pages URL is `https://goeke-m.github.io/AllianceTracker/` — Vite `base` must be `/AllianceTracker/`
- GitHub Actions: `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` as **secrets**; `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as **variables** (not secrets — anon key is safe to expose)
- `scripts/` directory must be deleted in the final task — all content is superseded by migrations
- `supabase/config.toml` IS committed; `supabase/.branches/` and `supabase/.temp/` are NOT committed (add to `.gitignore`)

---

### Task 1: Initialize Supabase CLI

**Files:**
- Create: `supabase/config.toml` (via `supabase init`)
- Modify: `.gitignore`

**Interfaces:**
- Produces: linked Supabase CLI project — subsequent tasks depend on this link

**Prerequisites (verify before starting):**
- Supabase CLI installed. Check: `supabase --version`. Install if missing:
  - Mac: `brew install supabase/tap/supabase`
  - Windows: `scoop install supabase` or download from https://github.com/supabase/cli/releases
- Docker Desktop installed and running (required for `supabase start` in Task 2)
- `SUPABASE_ACCESS_TOKEN` set in your shell environment:
  - Get it from: https://app.supabase.com → Account (top-right) → Access Tokens → Generate new token
  - Mac/Linux: `export SUPABASE_ACCESS_TOKEN=your_token`
  - Windows PowerShell: `$env:SUPABASE_ACCESS_TOKEN = "your_token"`
- Your project ref (find it: Supabase Dashboard → Project Settings → General → Reference ID)
  - Looks like: `abcdefghijklmnop` (20 chars)

- [ ] **Step 1: Run `supabase init`**

From the repo root (`C:\Users\mike.goeke\Repos\AllianceTracker`):

```bash
supabase init
```

Expected output:
```
Finished supabase init.
```

This creates `supabase/config.toml`. Do NOT run `supabase start` yet.

- [ ] **Step 2: Link to production project**

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

Expected: prompts for your database password (find it: Supabase Dashboard → Project Settings → Database → Database password). Enter it.

Expected output:
```
Finished supabase link.
```

- [ ] **Step 3: Add Supabase local dev dirs to .gitignore**

Open `.gitignore` and add these lines at the end:

```
# Supabase local dev state
supabase/.branches
supabase/.temp
supabase/.env
```

- [ ] **Step 4: Commit**

```bash
git add supabase/config.toml .gitignore
git commit -m "chore: initialize supabase cli"
```

---

### Task 2: Pull base schema and verify local reset

**Files:**
- Create: `supabase/migrations/20260101000000_base_schema.sql`

**Interfaces:**
- Consumes: linked project from Task 1
- Produces: `supabase/migrations/20260101000000_base_schema.sql` — the single source of truth for the full DB schema

**Why one migration file:** `supabase db pull` generates a migration representing the **complete current state** of the production DB — all tables (members, damage_logs, storm_events, etc.), all columns in their current form (including game_uid, Timezone already renamed), all RLS policies, and all constraints. Creating separate ALTER TABLE / CREATE POLICY files on top would fail or conflict on a fresh reset. One file is correct.

- [ ] **Step 1: Pull the remote schema**

```bash
supabase db pull
```

Expected output:
```
Schema written to supabase/migrations/YYYYMMDDHHMMSS_remote_schema.sql
```

The file will have a timestamp-based name. Note the exact filename.

- [ ] **Step 2: Rename the file to the canonical baseline name**

```bash
# Mac/Linux
mv supabase/migrations/YYYYMMDDHHMMSS_remote_schema.sql supabase/migrations/20260101000000_base_schema.sql

# Windows PowerShell
Rename-Item supabase/migrations/YYYYMMDDHHMMSS_remote_schema.sql 20260101000000_base_schema.sql
```

- [ ] **Step 3: Start local Supabase**

```bash
supabase start
```

This takes 1-3 minutes on first run (downloads Docker images). Expected output ends with:

```
         API URL: http://localhost:54321
     GraphQL URL: http://localhost:54321/graphql/v1
  S3 Storage URL: http://localhost:54321/storage/v1/s3
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJ...
service_role key: eyJ...
```

Save the `anon key` value — you'll need it in Task 4.

- [ ] **Step 4: Apply all migrations to local DB**

```bash
supabase db reset
```

Expected output:
```
Resetting database...
Initializing schema...
Applying migration 20260101000000_base_schema.sql...
Seeding data supabase/seed.sql...  ← will show only after Task 3
Finished supabase db reset.
```

If `seed.sql` doesn't exist yet, `db reset` skips seeding — that's fine for this task.

- [ ] **Step 5: Verify all tables exist in local Studio**

Open http://localhost:54323 → Table Editor in the left sidebar.

Verify these tables are present: `members`, `damage_logs`, `train_schedule`, `ooto`, `kill_list`, `friends_list`, `demerits`, `vs_points`, `alliance_tech_status`, `alliance_tech_queue`, `train_schedule_settings`, `error_logs`, `storm_events`, `storm_roster`.

If any table is missing, open the migration file and check for errors — the pull may have missed a table that was created in a non-standard schema.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260101000000_base_schema.sql
git commit -m "chore: add base schema migration from remote pull"
```

---

### Task 3: Create seed.sql

**Files:**
- Create: `supabase/seed.sql`

**Interfaces:**
- Consumes: `supabase/migrations/20260101000000_base_schema.sql` (tables must exist before seeding)
- Produces: `supabase/seed.sql` — applied automatically by `supabase db reset`

**Note:** `seed.sql` is applied by `supabase db reset` in local dev only. It is never run in CI or against production. The seed data here is used to bootstrap a fresh local environment.

- [ ] **Step 1: Create `supabase/seed.sql`**

Create the file with these two sections. The first section is the member INSERT statements copied verbatim from `scripts/seed-members.sql`. The second section is the `train_schedule_settings` default row that was previously embedded in `scripts/train-schedule-settings-migration.sql`.

```sql
-- Member seed data
-- Applied by: supabase db reset (local dev only)
-- ON CONFLICT: upsert by name — updates stats if member already exists
INSERT INTO members (id, name, "Rank", "THP", "S1_Power", "S1_Type", "S2_Power", "S2_Type", "Strike_Team", "Timezone", created_at, updated_at)
VALUES
```

Then copy all the `(gen_random_uuid(), ...)` rows from `scripts/seed-members.sql` (everything between `VALUES` and the `ON CONFLICT` clause), followed by:

```sql
ON CONFLICT (name) DO UPDATE SET
  "Rank"        = EXCLUDED."Rank",
  "THP"         = EXCLUDED."THP",
  "S1_Power"    = EXCLUDED."S1_Power",
  "S1_Type"     = EXCLUDED."S1_Type",
  "S2_Power"    = EXCLUDED."S2_Power",
  "S2_Type"     = EXCLUDED."S2_Type",
  "Strike_Team" = EXCLUDED."Strike_Team",
  updated_at    = NOW();

-- Train schedule settings default row
INSERT INTO train_schedule_settings (key, mode)
VALUES ('week_mode', 'push')
ON CONFLICT (key) DO NOTHING;
```

- [ ] **Step 2: Run `supabase db reset` to verify seeding**

```bash
supabase db reset
```

Expected output now includes:
```
Seeding data supabase/seed.sql...
Finished supabase db reset.
```

- [ ] **Step 3: Verify seed data in Studio**

Open http://localhost:54323 → Table Editor:
- `members` table: should have ~50+ rows
- `train_schedule_settings` table: should have 1 row with `key = 'week_mode'` and `mode = 'push'`

- [ ] **Step 4: Commit**

```bash
git add supabase/seed.sql
git commit -m "chore: add seed.sql with member data and schedule settings default"
```

---

### Task 4: GitHub Actions workflow and Vite base path

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `vite.config.ts`

**Interfaces:**
- Consumes: `supabase/migrations/` directory (pushed to production by the `migrate` job)
- Produces: GitHub Pages deployment at `https://goeke-m.github.io/AllianceTracker/`

**Manual setup required before this task can pass end-to-end (do these first):**

1. **Enable GitHub Pages:** GitHub → `goeke-m/AllianceTracker` → Settings → Pages → Source: "GitHub Actions" → Save

2. **Add repository secrets** (Settings → Secrets and variables → Actions → Secrets → New repository secret):
   - `SUPABASE_ACCESS_TOKEN`: your Supabase personal access token (from app.supabase.com → Account → Access Tokens)
   - `SUPABASE_PROJECT_REF`: your project reference ID (Supabase Dashboard → Project Settings → General → Reference ID)

3. **Add repository variables** (Settings → Secrets and variables → Actions → Variables → New repository variable):
   - `VITE_SUPABASE_URL`: your production Supabase URL (e.g. `https://abcdefghijklmnop.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY`: your production anon key (Supabase Dashboard → Project Settings → API → Project API Keys → anon/public)

- [ ] **Step 1: Add `base` to `vite.config.ts`**

Current content of `vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

Updated content:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/AllianceTracker/',
})
```

- [ ] **Step 2: Verify local build still works**

```bash
npm run build
```

Expected: `dist/` directory is created with no errors. Check `dist/index.html` — asset paths should start with `/AllianceTracker/assets/`.

- [ ] **Step 3: Create `.github/workflows/deploy.yml`**

Create the directory and file:

```bash
# Mac/Linux
mkdir -p .github/workflows

# Windows PowerShell
New-Item -ItemType Directory -Force .github/workflows
```

File content:

```yaml
name: Deploy

on:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - name: Push database migrations
        run: supabase db push --project-ref $SUPABASE_PROJECT_REF
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}

  build:
    needs: migrate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ vars.VITE_SUPABASE_ANON_KEY }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    permissions:
      pages: write
      id-token: write
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 4: Commit and push**

```bash
git add .github/workflows/deploy.yml vite.config.ts
git commit -m "chore: add github actions deploy workflow and vite base path"
git push origin main
```

**Note on migration safety:** `supabase db pull` automatically inserts the base schema migration into the remote DB's `supabase_migrations.schema_migrations` table. This means `supabase db push` in CI will skip `20260101000000_base_schema.sql` (already marked applied) and only push genuinely new migrations. The production DB will not be touched by the base schema migration.

- [ ] **Step 5: Verify the workflow runs**

Open GitHub → `goeke-m/AllianceTracker` → Actions tab.

You should see a "Deploy" workflow running. Wait for it to complete (2-5 minutes). Verify:
- `migrate` job: exits 0 (green). If it fails, check that `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` secrets are set correctly.
- `build` job: exits 0 (green). If it fails, check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` variables are set.
- `deploy` job: exits 0 (green). The page URL appears in the job summary.

- [ ] **Step 6: Verify the deployed app**

Open `https://goeke-m.github.io/AllianceTracker/` in a browser. The app should load and be able to log in.

---

### Task 5: Local dev documentation and cleanup

**Files:**
- Create: `.env.local.example`
- Delete: `scripts/` directory (all 13 files)
- Modify: `README.md` (add or update local dev section)

- [ ] **Step 1: Create `.env.local.example`**

```bash
# Local Supabase instance (from: supabase start → supabase status)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<copy anon key from: supabase status>
```

Full file content:

```
# Local development environment — copy to .env.local and fill in values
# The .env.local file is gitignored; this file documents the required keys.
#
# Setup:
#   1. supabase start
#   2. supabase status  ← copy "anon key" value below
#   3. supabase db reset  ← applies all migrations + seed data

VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<copy anon key from: supabase status>
```

- [ ] **Step 2: Update README.md with local dev workflow**

Add the following section to `README.md` (create the file if it doesn't exist). Add it after any existing content:

```markdown
## Local Development

### Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)

### First-time setup

```bash
supabase link --project-ref YOUR_PROJECT_REF   # links CLI to production
cp .env.local.example .env.local
supabase start                                  # starts local Supabase
supabase status                                 # copy anon key → paste into .env.local
supabase db reset                               # applies migrations + seed data
npm install
npm run dev
```

Open http://localhost:5173 for the app, http://localhost:54323 for Supabase Studio.

### Daily workflow

| Command | Effect |
|---|---|
| `supabase start` | Start local Supabase instance |
| `supabase stop` | Stop local Supabase instance |
| `supabase db reset` | Wipe local DB and re-apply all migrations + seed |
| `supabase migration new <name>` | Create a new migration file |
| `supabase db push` | Push pending migrations to production (CI does this automatically) |

### Adding a migration

```bash
supabase migration new add_my_column
# Edit supabase/migrations/<timestamp>_add_my_column.sql
supabase db reset   # verify locally
git add supabase/migrations/
git commit -m "chore: add migration for my column"
git push            # CI applies it to production automatically
```

Never edit an existing migration file after it has been pushed to production.

## pg_cron (alliance member sync)

The `sync-alliance-members` Edge Function runs on a pg_cron schedule (MWF at 10:00 UTC). This is a **manual setup step** — it is not run automatically by migrations.

To set it up after a fresh database:

1. Enable the `pg_cron` and `pg_net` extensions: Supabase Dashboard → Database → Extensions
2. Deploy the Edge Function: `supabase functions deploy sync-alliance-members`
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
```

- [ ] **Step 3: Delete the `scripts/` directory**

All SQL scripts have been superseded — the base schema is captured in `supabase/migrations/20260101000000_base_schema.sql`, the seed data is in `supabase/seed.sql`, and pg-cron is now documented in README.

```bash
# Mac/Linux
rm -rf scripts/

# Windows PowerShell
Remove-Item -Recurse -Force scripts/
```

- [ ] **Step 4: Commit**

```bash
git add .env.local.example README.md
git rm -r scripts/
git commit -m "chore: add local dev docs, delete scripts dir superseded by migrations"
```

- [ ] **Step 5: Push and verify clean deploy**

```bash
git push origin main
```

Watch the Actions tab — the Deploy workflow should complete successfully with the scripts/ removal causing no issues (it's not referenced anywhere).
