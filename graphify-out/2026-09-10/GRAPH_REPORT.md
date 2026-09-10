# Graph Report - .  (2026-08-07)

## Corpus Check
- 90 files · ~147,588 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 449 nodes · 680 edges · 82 communities (22 shown, 60 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 41 edges (avg confidence: 0.86)
- Token cost: 388,287 input · 0 output

## Community Hubs (Navigation)
- Nav & Alliance Tech UI
- Train Schedule Sync Spec
- Changelog Feature Index
- App Shell & Login
- Error Logs & Storm Page
- Frontend Dependencies
- Demerits Manager UI
- Marshall Visualizer Grid
- TypeScript Compiler Config
- Build Tooling Dependencies
- Member Manager UI
- Member Sync Edge Function
- Language Switcher UI
- Vite/TS Node Config
- Sync & Schedule Hooks
- Marshall Map & WAD Algorithm
- Storm Event Configs
- Deploy Pipeline Jobs
- Owner UUID Constant
- Tech Row & Game Colors
- Language Persistence
- Sync API Fix
- Tech Queue Launch
- Auth Initial Release
- VS Score Column
- PocketBase→Supabase Migration
- Captain/First Mate Attribution
- CI Node Version Bump
- Core App Launch
- Custom Domain Setup
- Damage Log Filtering
- Damage Logs Relocation
- Demerits Tracker Launch
- Eastern Timezone Import Fix
- Hidden Login in Prod
- Favicon Addition
- Kill/Friends List Launch
- Marshall Map Launch
- Member Deletion FK Cleanup
- Member Manager Launch
- Editable Member Name
- OOTO/Shore Leave Tracker
- Pirate/Nautical Theme
- R4 Rotation Panel
- R4 Rotation Update
- SSO Auth Providers
- Train Schedule Date Fix
- Voyage Schedule Launch
- Voyage Schedule Week View
- VS Points Tracker
- Graphify Usage Rules
- Auto-Sync Design Spec
- sync-alliance-members Function
- R4 Demotion Logic
- dnd-kit Choice Rationale
- Drag-Reorder Design Spec
- Optimistic Reorder Flow
- Queue Reorder Function
- Timezone Field Design Spec
- Timezone List Constant
- DOW Source Builder
- Error Log RLS Rationale
- Error Log Manager Component
- No-Show Rolling Count
- i18next Integration
- Locale Resource Files
- GitHub Actions Deploy Workflow
- Tactical Copy Rewrite
- Team Grid Layout
- Member Picker Search
- Storm Requested Role
- Boarding Hour Field
- WPNZ Logo Asset
- Demerits Feature (README)
- Kill/Friends List (README)
- Stand Down Tracker (README)
- VS Points Feature (README)
- Marshall Visualizer Tech Brief

## God Nodes (most connected - your core abstractions)
1. `logError()` - 23 edges
2. `supabase` - 18 edges
3. `Member` - 17 edges
4. `useAuth()` - 13 edges
5. `compilerOptions` - 13 edges
6. `TrainSchedule()` - 10 edges
7. `StormPage()` - 9 edges
8. `formatNumber()` - 9 edges
9. `Supabase CLI Migrations Implementation Plan` - 9 edges
10. `Error Logging Implementation Plan` - 8 edges

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

## Communities (82 total, 60 thin omitted)

### Community 0 - "Nav & Alliance Tech UI"
Cohesion: 0.08
Nodes (39): NavBar(), NavBarProps, tabs, useScheduleSettings(), getWeekDates(), useTrainSchedule(), logError(), supabase (+31 more)

### Community 1 - "Train Schedule Sync Spec"
Cohesion: 0.06
Nodes (43): game_uid Column (Stable Player Identity), pg_cron MWF 10:00 UTC Schedule, Member Reconciliation Logic (match by game_uid/name), Timezone Field (renamed from Availability), Train Schedule — Push/Save Week Label Toggle Design Spec, train_schedule_settings table, Push/Save Week Segmented Toggle UI, logError() helper (+35 more)

### Community 2 - "Changelog Feature Index"
Cohesion: 0.07
Nodes (40): Alliance Member Auto-Sync (changelog entry), Alliance Tech Queue Drag-and-Drop Reorder (changelog entry), Desert Storm & Canyon Storm Event Tracking (changelog entry), Error Logging (changelog entry), Member Timezone Field (changelog entry), Supabase CLI Migrations (changelog entry), Train Schedule Week Mode Toggle (changelog entry), WPNZ Tactical Theme Rebrand (changelog entry) (+32 more)

### Community 3 - "App Shell & Login"
Cohesion: 0.09
Nodes (28): App(), LoginPage(), LoginPageProps, SortableTechRow(), SortableTechRowProps, useAllianceTech(), useAuth(), useOoto() (+20 more)

### Community 4 - "Error Logs & Storm Page"
Cohesion: 0.12
Nodes (26): ErrorLogManager(), formatTimestamp(), AddingTo, attendanceLabel(), attendancePillClass(), compareMembersByRankThenName(), formatWeekStart(), rankNum() (+18 more)

### Community 5 - "Frontend Dependencies"
Cohesion: 0.08
Nodes (25): @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, i18next, dependencies, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 6 - "Demerits Manager UI"
Cohesion: 0.10
Nodes (18): DemeritManager(), DemeritManagerProps, formatDate(), FormState, SortDir, SortKey, EventLogImportProps, MemberManagerProps (+10 more)

### Community 7 - "Marshall Visualizer Grid"
Cohesion: 0.15
Nodes (17): EventLogImport(), CellDef, COLORS, GRID_LAYOUT, MarshallVisualizer(), MarshallVisualizerProps, MG, useMarshallData() (+9 more)

### Community 8 - "TypeScript Compiler Config"
Cohesion: 0.10
Nodes (19): DOM, DOM.Iterable, ES2020, src, compilerOptions, allowImportingTsExtensions, isolatedModules, jsx (+11 more)

### Community 9 - "Build Tooling Dependencies"
Cohesion: 0.11
Nodes (19): autoprefixer, devDependencies, autoprefixer, postcss, supabase, tailwindcss, @types/react, @types/react-dom (+11 more)

### Community 10 - "Member Manager UI"
Cohesion: 0.18
Nodes (13): EditState, formatPower(), MemberManager(), memberToEditState(), RANK_COLORS, rankNum(), RANKS, SortDir (+5 more)

### Community 11 - "Member Sync Edge Function"
Cohesion: 0.24
Nodes (9): corsHeaders, ApiMember, DbMember, mapRank(), NameMatch, RankValue, reconcile(), ReconcileResult (+1 more)

### Community 12 - "Language Switcher UI"
Cohesion: 0.31
Nodes (7): LANGUAGE_OPTIONS, LanguageSwitcher(), useLanguage(), detectInitialLanguage(), isSupportedLanguage(), SUPPORTED_LANGUAGES, SupportedLanguage

### Community 13 - "Vite/TS Node Config"
Cohesion: 0.22
Nodes (8): vite.config.ts, compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 14 - "Sync & Schedule Hooks"
Cohesion: 0.50
Nodes (4): Sync Now Button (MemberManager), useAllianceTech hook (src/hooks/useAllianceTech.ts), useScheduleSettings hook, Error Logging Design Spec

### Community 15 - "Marshall Map & WAD Algorithm"
Cohesion: 1.00
Nodes (3): Marshall Grid Layout fix (changelog entry), Marshall Map feature (README), WAD (Weighted Average Damage) Algorithm

### Community 16 - "Storm Event Configs"
Cohesion: 0.67
Nodes (3): CANYON_STORM_CONFIG, DESERT_STORM_CONFIG, StormConfig type

### Community 17 - "Deploy Pipeline Jobs"
Cohesion: 0.67
Nodes (3): build job (npm run build), deploy job (GitHub Pages), migrate job (supabase db push)

## Ambiguous Edges - Review These
- `Multi-Language Support Implementation Plan` → `WPNZ Tactical Theme Rebrand Implementation Plan`  [AMBIGUOUS]
  docs/superpowers/plans/2026-07-18-multi-language-support.md · relation: shares_data_with
- `WPNZ Logo Asset (public/logo.png)` → `index.html (WPNZ Tracker app shell)`  [AMBIGUOUS]
  index.html · relation: references

## Knowledge Gaps
- **186 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+181 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **60 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Multi-Language Support Implementation Plan` and `WPNZ Tactical Theme Rebrand Implementation Plan`?**
  _Edge tagged AMBIGUOUS (relation: shares_data_with) - confidence is low._
- **What is the exact relationship between `WPNZ Logo Asset (public/logo.png)` and `index.html (WPNZ Tracker app shell)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `logError()` connect `Nav & Alliance Tech UI` to `App Shell & Login`, `Error Logs & Storm Page`, `Demerits Manager UI`, `Marshall Visualizer Grid`, `Member Manager UI`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `Member` connect `Demerits Manager UI` to `Nav & Alliance Tech UI`, `Member Manager UI`, `Error Logs & Storm Page`, `Marshall Visualizer Grid`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `supabase` connect `Nav & Alliance Tech UI` to `App Shell & Login`, `Error Logs & Storm Page`, `Demerits Manager UI`, `Marshall Visualizer Grid`, `Member Manager UI`, `Language Switcher UI`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _186 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Nav & Alliance Tech UI` be split into smaller, more focused modules?**
  _Cohesion score 0.07619738751814223 - nodes in this community are weakly interconnected._