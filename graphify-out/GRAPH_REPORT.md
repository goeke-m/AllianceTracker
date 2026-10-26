# Graph Report - AllianceTracker  (2026-10-26)

## Corpus Check
- 100 files · ~154,373 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 516 nodes · 800 edges · 85 communities (25 shown, 60 thin omitted)
- Extraction: 94% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 43 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a69682b8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- TrainSchedule.tsx
- Supabase CLI Migrations — Design Spec
- Supabase CLI Migrations Implementation Plan
- App.tsx
- types.ts
- dependencies
- DemeritManager.tsx
- logError
- compilerOptions
- devDependencies
- MemberManager.tsx
- heropower.ts
- AllianceTech.tsx
- compilerOptions
- useAllianceTech hook (src/hooks/useAllianceTech.ts)
- Marshall Grid Layout fix (changelog entry)
- StormConfig type
- build job (npm run build)
- Owner Account UUID (edac282d-fd53-4353-8af8-c6b7c3f7480d)
- SortableTechRow component
- Language Persistence (localStorage + user_metadata.locale)
- Alliance Member Sync API fix (changelog entry)
- Alliance Tech Queue introduced (changelog entry)
- Authentication initial release (changelog entry)
- Average VS Score Column (changelog entry)
- Backend Migration PocketBase to Supabase (changelog entry)
- Captain & First Mate Source Attribution (changelog entry)
- CI Node Version bumped to 24 (changelog entry)
- Core Application initial release (changelog entry)
- Custom Domain wpnz.duckdns.org (changelog entry)
- Damage Log Filtering (changelog entry)
- Damage Logs Moved to Marshall Map (changelog entry)
- Demerits Tracker (changelog entry)
- Eastern Timezone for Imported Logs (changelog entry)
- Email/Password Login Hidden in Production (changelog entry)
- Favicon added (changelog entry)
- Kill List & Friends List (changelog entry)
- Marshall Map initial release (changelog entry)
- Member Deletion FK Cleanup (changelog entry)
- Member Manager initial release (changelog entry)
- Member Name Now Editable (changelog entry)
- OOTO Tracker / Shore Leave (changelog entry)
- Pirate/Nautical Theme (changelog entry)
- R4 Rotation Info Panel (changelog entry)
- R4 Rotation Update (changelog entry)
- SSO Authentication via Google/Discord (changelog entry)
- Train Schedule Today Detection fix (changelog entry)
- Voyage Schedule initial release (changelog entry)
- Voyage Schedule Week View (changelog entry)
- VS Points Tracker (changelog entry)
- CLAUDE.md graphify usage rules
- Alliance Member Auto-Sync — Design Spec
- sync-alliance-members Edge Function
- demoteCurrent() function
- @dnd-kit Library Choice (rationale over framer-motion / native HTML5 DnD)
- Alliance Tech Queue — Drag-and-Drop Reorder Design Spec
- Optimistic Drag-Reorder Update Flow
- reorderUpcoming() function
- Member Timezone Field Design Spec
- TIMEZONES static list const
- buildDowSources(mode) function
- error_logs RLS Design: open insert, admin-gated select (rationale)
- ErrorLogManager component
- Rolling 6-Week No-Show Count
- i18next / react-i18next integration
- Locale JSON Resource Files (en/ko/pt-BR/es)
- GitHub Actions deploy.yml (migrate + build + deploy)
- Pirate-to-Tactical Copy Rewrite
- Team A/B Side-by-Side Grid Layout
- Member Picker Search Filter
- 'requested' role value on storm_roster
- TrainEntry.boardingHour field
- WPNZ Weaponz Logo
- Demerits Tracker feature (README)
- Kill List & Friends List feature (README)
- Stand Down Tracker feature (README)
- VS Points feature (README)
- req.md — Marshall Visualizer Technical Brief
- Season Participation Tracker — Design
- MarshallVisualizer.tsx
- File Structure

## God Nodes (most connected - your core abstractions)
1. `logError()` - 24 edges
2. `Member` - 22 edges
3. `supabase` - 19 edges
4. `useAuth()` - 13 edges
5. `compilerOptions` - 13 edges
6. `formatNumber()` - 11 edges
7. `TrainSchedule()` - 10 edges
8. `StormPage()` - 9 edges
9. `Season Participation Tracker — Design` - 9 edges
10. `Supabase CLI Migrations Implementation Plan` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Infrastructure as Code (Pulumi/Terraform/Supabase CLI)` --semantically_similar_to--> `Supabase CLI Migrations — Design Spec`  [INFERRED] [semantically similar]
  req.md → docs/superpowers/specs/2026-07-18-supabase-migrations-design.md
- `RLS Permissions (Admin full control vs R1-R3 view-only)` --semantically_similar_to--> `Train Schedule — Push/Save Week Label Toggle Design Spec`  [INFERRED] [semantically similar]
  req.md → docs/superpowers/specs/2026-06-24-train-schedule-week-mode-toggle-design.md
- `RLS Permissions (Admin full control vs R1-R3 view-only)` --semantically_similar_to--> `Desert Storm Event Tracking — Design Spec`  [INFERRED] [semantically similar]
  req.md → docs/superpowers/specs/2026-07-18-desert-storm-tracking-design.md
- `Desert Storm & Canyon Storm Event Tracking (changelog entry)` --references--> `Storm Events Tracking Implementation Plan`  [INFERRED]
  CHANGELOG.md → docs/superpowers/plans/2026-07-18-storm-events-tracking.md
- `Supabase CLI Migrations (changelog entry)` --references--> `Supabase CLI Migrations Implementation Plan`  [INFERRED]
  CHANGELOG.md → docs/superpowers/plans/2026-07-18-supabase-migrations.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Desert Storm / Canyon Storm Feature Evolution** — docs_superpowers_plans_2026_07_18_storm_events_tracking_plan, docs_superpowers_plans_2026_07_20_storm_layout_and_default_attendance_plan, docs_superpowers_plans_2026_07_20_storm_roster_sort_and_member_search_plan, docs_superpowers_plans_2026_07_22_storm_requested_not_selected_plan [INFERRED 0.90]
- **Supabase CLI Migration Consolidation (scripts/*.sql superseded)** — docs_superpowers_plans_2026_07_18_supabase_migrations_plan, docs_superpowers_plans_2026_05_08_alliance_member_auto_sync_plan, docs_superpowers_plans_2026_06_21_member_timezone_field_plan, docs_superpowers_plans_2026_06_24_train_schedule_week_mode_toggle_plan, docs_superpowers_plans_2026_07_06_error_logging_plan, docs_superpowers_plans_2026_07_18_storm_events_tracking_plan [EXTRACTED 1.00]
- **GitHub Actions Deploy Pipeline (migrate -> build -> deploy)** — github_workflows_deploy_migrate_job, github_workflows_deploy_build_job, github_workflows_deploy_deploy_job [EXTRACTED 1.00]
- **Storm Event Tracking Feature Evolution (DS/Canyon shared architecture and iterations)** — docs_superpowers_specs_2026_07_18_desert_storm_tracking_design_doc, docs_superpowers_specs_2026_07_18_canyon_storm_tracking_design_doc, docs_superpowers_specs_2026_07_20_storm_layout_and_default_attendance_design_doc, docs_superpowers_specs_2026_07_20_storm_roster_sort_and_member_search_design_doc, docs_superpowers_specs_2026_07_22_storm_requested_not_selected_design_doc [INFERRED 0.85]
- **Owner-Only Admin Gating Pattern (single hardcoded owner UUID reused across features)** — docs_superpowers_specs_2026_05_08_alliance_member_auto_sync_design_owner_account, docs_superpowers_specs_2026_05_08_alliance_member_auto_sync_design_sync_now_button, docs_superpowers_specs_2026_07_06_error_logging_design_owner_constant, docs_superpowers_specs_2026_07_06_error_logging_design_viewer [INFERRED 0.85]
- **Ad-hoc scripts/*.sql to Versioned Supabase Migrations Provenance** — docs_superpowers_specs_2026_07_18_supabase_migrations_design_doc, docs_superpowers_specs_2026_05_08_alliance_member_auto_sync_design_game_uid, docs_superpowers_specs_2026_06_21_member_timezone_design_timezone_field, docs_superpowers_specs_2026_07_06_error_logging_design_table, docs_superpowers_specs_2026_06_24_train_schedule_week_mode_toggle_design_settings_table, docs_superpowers_specs_2026_07_18_desert_storm_tracking_design_events_table [INFERRED 0.85]

## Communities (85 total, 60 thin omitted)

### Community 0 - "TrainSchedule.tsx"
Cohesion: 0.13
Nodes (20): useAuth(), useScheduleSettings(), useTrainSchedule(), PBUser, TrainEntry, WeekMode, getActiveVsDateStr(), getWeekDates() (+12 more)

### Community 1 - "Supabase CLI Migrations — Design Spec"
Cohesion: 0.06
Nodes (43): game_uid Column (Stable Player Identity), pg_cron MWF 10:00 UTC Schedule, Member Reconciliation Logic (match by game_uid/name), Timezone Field (renamed from Availability), Train Schedule — Push/Save Week Label Toggle Design Spec, train_schedule_settings table, Push/Save Week Segmented Toggle UI, logError() helper (+35 more)

### Community 2 - "Supabase CLI Migrations Implementation Plan"
Cohesion: 0.07
Nodes (40): Alliance Member Auto-Sync (changelog entry), Alliance Tech Queue Drag-and-Drop Reorder (changelog entry), Desert Storm & Canyon Storm Event Tracking (changelog entry), Error Logging (changelog entry), Member Timezone Field (changelog entry), Supabase CLI Migrations (changelog entry), Train Schedule Week Mode Toggle (changelog entry), WPNZ Tactical Theme Rebrand (changelog entry) (+32 more)

### Community 3 - "App.tsx"
Cohesion: 0.12
Nodes (18): App(), LANGUAGE_OPTIONS, LanguageSwitcher(), LoginPage(), LoginPageProps, NavBar(), NavBarProps, tabs (+10 more)

### Community 4 - "types.ts"
Cohesion: 0.09
Nodes (35): EventLogImportProps, Field, SeasonStatsManager(), SeasonStatsManagerProps, SortDir, SortKey, AddingTo, attendanceLabel() (+27 more)

### Community 5 - "dependencies"
Cohesion: 0.07
Nodes (26): @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, i18next, dependencies, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+18 more)

### Community 6 - "DemeritManager.tsx"
Cohesion: 0.22
Nodes (7): DemeritManager(), DemeritManagerProps, formatDate(), FormState, SortDir, SortKey, Demerit

### Community 7 - "logError"
Cohesion: 0.08
Nodes (34): EventLogImport(), useMarshallData(), useOoto(), logError(), supabase, supabaseAnonKey, supabaseUrl, DamageLog (+26 more)

### Community 8 - "compilerOptions"
Cohesion: 0.10
Nodes (19): DOM, DOM.Iterable, ES2020, src, compilerOptions, allowImportingTsExtensions, isolatedModules, jsx (+11 more)

### Community 9 - "devDependencies"
Cohesion: 0.09
Nodes (23): autoprefixer, devDependencies, autoprefixer, postcss, supabase, tailwindcss, tsx, @types/react (+15 more)

### Community 10 - "MemberManager.tsx"
Cohesion: 0.07
Nodes (35): ErrorLogManager(), formatTimestamp(), EditState, formatPower(), MemberManager(), MemberManagerProps, memberToEditState(), RANK_COLORS (+27 more)

### Community 11 - "heropower.ts"
Cohesion: 0.11
Nodes (22): cells(), cellText(), decodeEntities(), HeroPowerMatch, HeroPowerRow, HeroPowerUpdate, matchHeroPower(), normalize() (+14 more)

### Community 12 - "AllianceTech.tsx"
Cohesion: 0.25
Nodes (8): SortableTechRow(), SortableTechRowProps, useAllianceTech(), AllianceTechQueueItem, AllianceTech(), DEVELOPMENT_TECHS, PickerState, WAR_TECHS

### Community 13 - "compilerOptions"
Cohesion: 0.22
Nodes (8): vite.config.ts, compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 14 - "useAllianceTech hook (src/hooks/useAllianceTech.ts)"
Cohesion: 0.50
Nodes (4): Sync Now Button (MemberManager), useAllianceTech hook (src/hooks/useAllianceTech.ts), useScheduleSettings hook, Error Logging Design Spec

### Community 15 - "Marshall Grid Layout fix (changelog entry)"
Cohesion: 1.00
Nodes (3): Marshall Grid Layout fix (changelog entry), Marshall Map feature (README), WAD (Weighted Average Damage) Algorithm

### Community 16 - "StormConfig type"
Cohesion: 0.67
Nodes (3): CANYON_STORM_CONFIG, DESERT_STORM_CONFIG, StormConfig type

### Community 17 - "build job (npm run build)"
Cohesion: 0.67
Nodes (3): build job (npm run build), deploy job (GitHub Pages), migrate job (supabase db push)

### Community 83 - "Season Participation Tracker — Design"
Cohesion: 0.20
Nodes (9): Code layout, Data model, Error handling, Goal, Out of scope, Season Participation Tracker — Design, Seasons, Testing (+1 more)

### Community 84 - "MarshallVisualizer.tsx"
Cohesion: 0.24
Nodes (7): CellDef, COLORS, GRID_LAYOUT, MarshallVisualizer(), MarshallVisualizerProps, MG, MemberWithWAD

### Community 85 - "File Structure"
Cohesion: 0.25
Nodes (7): File Structure, Global Constraints, Season Participation Tracker Implementation Plan, Task 1: Migration, type, and season constant, Task 2: Shared member sort + season stats helpers (TDD), Task 3: Locale strings, Task 4: SeasonStatsManager component and admin tab

## Ambiguous Edges - Review These
- `Multi-Language Support Implementation Plan` → `WPNZ Tactical Theme Rebrand Implementation Plan`  [AMBIGUOUS]
  docs/superpowers/plans/2026-07-18-multi-language-support.md · relation: shares_data_with
- `WPNZ Logo Asset (public/logo.png)` → `index.html (WPNZ Tracker app shell)`  [AMBIGUOUS]
  index.html · relation: references

## Knowledge Gaps
- **212 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+207 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **60 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Multi-Language Support Implementation Plan` and `WPNZ Tactical Theme Rebrand Implementation Plan`?**
  _Edge tagged AMBIGUOUS (relation: shares_data_with) - confidence is low._
- **What is the exact relationship between `WPNZ Logo Asset (public/logo.png)` and `index.html (WPNZ Tracker app shell)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `logError()` connect `logError` to `TrainSchedule.tsx`, `types.ts`, `DemeritManager.tsx`, `MemberManager.tsx`, `AllianceTech.tsx`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `Member` connect `types.ts` to `TrainSchedule.tsx`, `MemberManager.tsx`, `DemeritManager.tsx`, `logError`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `supabase` connect `logError` to `TrainSchedule.tsx`, `App.tsx`, `types.ts`, `DemeritManager.tsx`, `MemberManager.tsx`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _212 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `TrainSchedule.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13105413105413105 - nodes in this community are weakly interconnected._