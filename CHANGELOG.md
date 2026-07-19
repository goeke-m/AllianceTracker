# Changelog

All notable changes to WPNZ Tracker (formerly OPNz Tracker) are documented here.

## 2026-07-18

### Added
- **WPNZ Tactical Theme Rebrand** — Full UI rebrand from the pirate theme to a tactical/military theme matching the new "WPNZ Weaponz — Forged in War" logo:
  - Recolored the Tailwind palette to steel-blue/silver/cyan and renamed the `game-gold` color token to `game-primary`
  - Added the Rajdhani display font for headings and nav labels
  - New logo, favicon, and browser tab title ("WPNZ Tracker")
  - Rewrote pirate-flavored copy across the app: Voyage Schedule → Train Schedule, Treasure Map → Tactical Map, Ship Upgrades → Armory, Captain's Quarters → Command Center, Captain/First Mate → Conductor/VIP, Board the Ship → Sign In, Abandon Ship → Sign Out, and more
- **Desert Storm & Canyon Storm Event Tracking** — Two new pages for managing weekly Desert Storm and Canyon Storm event rosters, sharing a config-driven architecture (`storm_events`/`storm_roster` tables, `useStormEvent` hook, shared `StormPage` component):
  - Admins build two-team rosters (participants + substitutes for Desert Storm; participants only for Canyon Storm), record per-member attendance (present/no-show/subbed-in), and view a rolling 6-event no-show count per member
  - All users can view current and historical rosters read-only; history view shows Total Team Power and attendance summaries per past week
- **Custom Domain** — App is now served at `wpnz.duckdns.org`

### Changed
- **Supabase CLI Migrations** — Replaced the manual `scripts/*.sql` workflow with Supabase CLI-managed, versioned migrations under `supabase/migrations/`, applied automatically in CI on push to `main` via `supabase db push`. Local dev now uses `supabase start`/`supabase db reset` for a full local Postgres instance. Deployment moved from Vercel to GitHub Actions → GitHub Pages.
- **CI Node Version** — Bumped the build pipeline's Node.js version to 24.

## 2026-07-06

### Added
- **Error Logging** — Failed user-triggered actions (Supabase save/delete/fetch errors already shown as red banners) are now persisted to a new `error_logs` table via a shared `logError` helper, wired into every existing catch block across the app. A read-only "Errors" tab in Command Center (formerly Captain's Quarters), visible only to the site owner account, lists timestamp/user/context/message for each logged failure.

## 2026-06-24

### Added
- **Train Schedule Week Mode Toggle** — Admins can toggle the Train Schedule (formerly Voyage Schedule) between "Push Week" and "Save Week" rulesets from a header control; the setting is shared/persisted server-side and changes the displayed Conductor/VIP (formerly Captain/First Mate) source-attribution wording (e.g. "VS scorer" vs. "donator") for the relevant days.

## 2026-06-21

### Changed
- **Member Timezone Field** — Replaced the unused free-text `Availability` field on the member list with a `Timezone` field backed by a fixed dropdown of 20 labeled UTC offsets covering the alliance's global member spread.

## 2026-06-10

### Changed
- **Alliance Tech Queue Drag-and-Drop Reorder** — Replaced the ▲▼ up/down buttons on the Armory's (formerly Ship Upgrades) "Up Next" queue with a drag-and-drop reorder interaction (via `@dnd-kit`), including touch support and live-updating position numbers. The pinned "Currently Upgrading" card is unchanged.

## 2026-05-20

### Fixed
- **Alliance Member Sync API** — Switched to the direct alliance-members endpoint after lastwar.tools removed the `/queue/submit` endpoint the sync relied on.

## 2026-05-08

### Added
- **Alliance Member Auto-Sync** — Members now sync automatically from the lastwar.tools API on a Mon/Wed/Fri morning schedule (pg_cron), matched by a stable `game_uid` so name changes don't create duplicates. An admin-only "Sync Now" button in the Member Manager triggers an on-demand sync and shows an added/updated/removed summary.

## 2026-04-29

### Fixed
- **Member Deletion FK Cleanup** — Deleting a member now clears any `train_schedule` foreign-key references (Conductor/VIP assignments) to that member first, preventing an orphaned-reference failure.

## 2026-04-16

### Changed
- **R4 Rotation Update** — Replaced GatitoTriste with BeastMachine in the weekly captain rotation order.

## 2026-03-17

### Added
- **R4 Rotation Info Panel** — Added a modal panel on the Voyage Schedule showing the ordered list of R4/R5 members who rotate as weekly captains. Toggle button sits next to the page title.
- **Damage Log Filtering** — Damage logs in the Marshall Map admin section can now be filtered by member using clickable pill buttons with a clear-all option.

## 2026-03-16

### Added
- **Captain & First Mate Source Attribution** — The Voyage Schedule now shows the expected source/criteria for each day's captain and first mate (e.g., "Weekly top VS scorer") alongside the assigned member.

## 2026-03-12

### Added
- **Kill List & Friends List** — Two new pages for tracking enemies/targets (⚔️ Kill List) and allies (🤝 Friends). Both support add/edit/delete with searchable, sortable tables including name, server, and reason fields.
- **Alliance Tech Queue** — Converted the Ship Upgrades page from a simple current/next system to a persistent ordered queue. Techs can be added, reordered (▲▼), and marked complete. Updated tech names and level counts to reflect the current game state, including new entries (Auto Rally, Great Helper, Quick Construction).

## 2026-03-11

### Fixed
- **Train Schedule "Today" Detection** — Corrected a timezone bug where the current-day highlight used UTC instead of local Eastern time, causing it to show the wrong day after 7 PM EST.

### Changed
- **Member Name Now Editable** — Member names can now be changed directly from the admin panel member manager (previously read-only).
- **Voyage Schedule Week View** — Schedule now shows the current Sunday-to-Sunday week instead of a rolling 7-day window.

## 2026-03-10

### Fixed
- **Eastern Timezone for Imported Logs** — Date-only timestamps in uploaded event logs are now treated as midnight Eastern time (`T00:00:00-05:00`) to ensure consistent ordering regardless of the uploader's timezone.

## 2026-03-09

### Added
- **Average VS Score Column** — Member list now displays each member's average VS score, calculated from the `vs_points` table, with sort support.
- **Demerits Tracker** — Admins can log infractions by member with date and notes in Captain's Quarters.
- **VS Points Tracker** — Admins can record weekly VS point totals per member with JSON bulk-import support.
- **Favicon** — Added application favicon.

### Fixed
- **Marshall Grid Layout** — Replaced the ring-based cell calculation with an explicit 7×7 grid layout. Cells are now color-coded by role: R4/R5 (blue), inner ranks 1–13 (green), outer ranks 14+ (brown). Legend updated accordingly.
- **Email/Password Login Hidden in Production** — Sign-in form with email and password is now only visible in local development (`import.meta.env.DEV`); production uses OAuth only.

## 2026-03-08

### Added
- **Pirate/Nautical Theme** — Full UI rebrand:
  - App name: "OPNz Tracker" → "☠️ OPNz ☠️" with tagline "Pirates of the Seven Seas"
  - Train Schedule → Voyage Log, Marshall Map → Treasure Map, Alliance Tech → Ship Upgrades, Admin → Captain's Quarters
  - Conductor → Captain, VIP → First Mate, Out of Office → Shore Leave
  - Buttons: "Sign In" → "Board the Ship", "Sign Out" → "Abandon Ship 🏴‍☠️"
- **SSO Authentication** — Added OAuth login via Google and Discord. Email/password login retained for local development only.
- **OOTO Tracker** — New "Shore Leave" page to track member absences with date ranges and notes. Entries are categorized as Active (now out), Upcoming, or Past with color-coded status badges.
- **Damage Logs Moved to Marshall Map** — Damage log management (event log import, log viewing) relocated from the Admin Panel into the Marshall Map page under a dedicated tab.

### Changed
- **Backend: PocketBase → Supabase** — Migrated all data access from PocketBase/Fly.io to Supabase. Auth, member data, train schedule, and marshall data all updated. RLS policies added.

## 2026-03-07 — Initial Release

### Added
- **Core Application** — React + TypeScript + Vite with Tailwind CSS and Supabase.
- **Marshall Map** — Visual 7×7 grid of alliance member positions with WAD (Weighted Attack Damage) ranking. Event log import for damage tracking.
- **Voyage Schedule** — Weekly schedule for assigning train captain (conductor) and first mate (VIP) with notes per day.
- **Member Manager** — Admin panel for adding, editing, and deleting alliance members.
- **Authentication** — Email/password login backed by Supabase Auth.
