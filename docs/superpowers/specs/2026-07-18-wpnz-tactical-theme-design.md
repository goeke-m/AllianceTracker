# WPNZ Tactical Theme Rebrand Design Spec

**Date:** 2026-07-18
**Status:** Approved

## Overview

The app is rebranding from "OPNz" to "WPNZ" (custom domain `wpnz.duckdns.org` is already live as of `c4624bc`). The current UI carries a pirate theme end-to-end — gold/brown color palette, skull favicon, and pirate-flavored copy ("Voyage Log", "Captain", "Board the Ship", etc.) added in `0b1eb74`. This spec replaces that with a tactical/military theme based on the new "WPNZ WEAPONZ — Forged in War" logo (steel blue/silver metallic wordmark with a neon cyan glow on black), covering colors, the logo asset, typography, and all pirate-flavored copy.

This is a reskin only: no data model, table, column, or business-logic changes. Everything here is CSS/Tailwind config, static JSX text/emoji, `index.html`, and one new image asset.

---

## 1. Scope

- **In scope:**
  - Recolor the Tailwind `game-*` color tokens in `tailwind.config.js` to a steel-blue/silver/cyan tactical palette.
  - Rename the `game-gold` token to `game-primary` (mechanical rename across all usages) since "gold" no longer describes the color it holds.
  - Add the logo image as a real asset, used for the favicon and on `LoginPage`.
  - Update `index.html` `<title>` from "OPNz Tracker" to "WPNZ Tracker".
  - Add the "Rajdhani" Google Font for headings/nav labels only.
  - Rewrite all pirate-flavored user-facing copy and emoji (see section 4) to tactical equivalents.
- **Out of scope / unchanged:**
  - Database schema, column names (`Conductor`, `VIP`, `train_schedule` table, etc.), and any internal variable/hook/type names that happen to use pirate-adjacent words (e.g. `conductorId`, `vipId`, `sources.captain`/`sources.firstMate` fields in `TrainSchedule.tsx`). Only the rendered text changes.
  - Layout, component structure, and behavior of any page.
  - The `Out.tsx`, `KillList.tsx`, `FriendsList.tsx`, `StormPage.tsx`, `MarshallVisualizer.tsx` pages/components — confirmed to contain no pirate-specific copy, only `game-*` color classes, which will re-theme automatically via the token color changes.

## 2. Color Palette (`tailwind.config.js`)

| Token | Old hex | New hex | Description | Used for |
|---|---|---|---|---|
| `game-primary` (renamed from `game-gold`) | `#f4c430` | `#2fb6f5` | neon cyan-blue | primary accent, active nav/tab states, buttons, highlighted borders |
| `game-silver` | `#C0C0C0` | `#b8c4cc` | cool steel silver | secondary metallic accent |
| `game-dark` | `#0a0f12` | `#0a0e14` | near-black, blue-tinted | app background |
| `game-card` | `#1a1209` | `#131a22` | dark steel panel | card/panel backgrounds |
| `game-accent` | `#3d2b1a` | `#2c3a48` | steel-blue | borders/dividers |
| `game-highlight` | `#cc2200` | `#dc2626` | tactical red | errors/warnings/danger actions (delete buttons, error text) |
| `game-leadership` | `#c9a227` | `#e0a938` | command gold | rank/leadership badges (CAPTAIN→COMMAND badge, Ring 1 stat) — kept gold as an insignia accent against the blue field |
| `game-standard` | `#1a7a8a` | `#2f8fae` | steel teal | secondary info accent (R4 Rotation link, Ring 2 stat) |

The rename `game-gold` → `game-primary` touches every file listed in the grep below (18 files, 222 total `game-*` occurrences across all tokens); this is a mechanical find/replace with no behavior change. All other tokens keep their existing names — only the hex values change in `tailwind.config.js`, so every component using them re-themes automatically with zero per-component edits.

Files with `game-*` usage (all re-theme automatically from the config change, only `game-gold`→`game-primary` needs a find/replace): `TrainSchedule.tsx`, `Out.tsx`, `MarshallMap.tsx`, `KillList.tsx`, `FriendsList.tsx`, `AdminPanel.tsx`, `AllianceTech.tsx`, `DemeritManager.tsx`, `App.tsx`, `ErrorLogManager.tsx`, `LoginPage.tsx`, `EventLogImport.tsx`, `MemberManager.tsx`, `MarshallVisualizer.tsx`, `VsPointManager.tsx`, `SortableTechRow.tsx`, `NavBar.tsx`, `StormPage.tsx`.

## 3. Logo, Favicon, Typography

- Copy the tactical logo image (`C:\Users\mike.goeke\Downloads\WPNz.jpg`) into `public/logo.png`.
- `index.html`:
  - `<title>` → `WPNZ Tracker`
  - `<link rel="icon">` → point at `/logo.png` (replaces the inline skull-emoji SVG data URI).
  - Add a Google Fonts `<link>` for **Rajdhani** (weights 600/700).
- `LoginPage.tsx`: replace the `☠️ OPNz ☠️` text heading with an `<img src="/logo.png">` (sized appropriately, e.g. `h-24 mx-auto`).
- Tailwind config: extend `fontFamily.display` to `['Rajdhani', 'sans-serif']`. Apply `font-display` to page `h1`/`h2` headings and `NavBar` tab labels only; body text, buttons, and form fields keep the default system sans-serif.

## 4. Copy Rewrite

All DB fields, hook names, and internal variables referenced below (`conductor`, `vip`, `Conductor`, `VIP`, `train_schedule`) are unchanged — only the literal JSX text/emoji changes.

### `src/components/NavBar.tsx`

| Tab id | Old label / icon | New label / icon |
|---|---|---|
| `schedule` | Voyage Log / ⚓ | Ops Log / 📋 |
| `map` | Treasure Map / 🗺 | Tactical Map / 🗺️ |
| `tech` | Ship Upgrades / ⚔️ | Armory / 🔧 |
| `out` | Shore Leave / 🏝️ | Stand Down / 🎖️ |
| `admin` | Captain / ☠️ | Command / 🎯 |
| sign-out button | Abandon Ship / 🏴‍☠️ | Sign Out / 🚪 |

### `src/components/LoginPage.tsx`

| Old | New |
|---|---|
| `☠️ OPNz ☠️` heading | `<img src="/logo.png">` |
| "Pirates of the Seven Seas" | "Forged in War" |
| "Board with Google" / "Board with Discord" | "Sign In with Google" / "Sign In with Discord" |
| "Pirate's Address" label | "Email" |
| "Secret Code" label | "Password" |
| "Setting sail..." (both OAuth loading states + submit) | "Deploying..." |
| "Board the Ship" (submit button) | "Sign In" |

### `src/pages/AdminPanel.tsx`

| Old | New |
|---|---|
| "☠️ Captain's Quarters" | "🎯 Command Center" |

### `src/pages/AllianceTech.tsx`

| Old | New |
|---|---|
| "Ship Upgrades" | "Armory" |
| "Planned ship improvements in order" | "Planned armory upgrades in order" |

### `src/pages/TrainSchedule.tsx`

| Old | New |
|---|---|
| "Voyage Schedule" | "Train Schedule" |
| "Captain" label (day card + edit modal) | "Conductor" |
| "First Mate" label (day card + edit modal) | "VIP" |
| "Captain's Log" label (day card + edit modal) | "Mission Notes" |
| "Daily voyage departs ~1:00 EST · Sun–Sun view" | removed entirely |

Note: the underlying `sources.captain`/`sources.firstMate` object keys in `buildDowSources()` and the `conductorId`/`vipId` state fields are unchanged — only the rendered `<span>`/`<label>` text changes.

### `src/App.tsx`

| Old | New |
|---|---|
| "Charting the seas..." (loading state) | "Standing by..." |
| "CAPTAIN" badge | "COMMAND" badge |

## 5. Testing

No automated test framework exists in this project (`tsc` + manual verification is the established pattern). Manual verification in the running dev app:

- Confirm `tsc`/build passes after the `game-gold` → `game-primary` rename (no leftover references).
- Visually confirm every page (Ops Log/Train Schedule, Tactical Map, Armory, Kill List, Friends, Desert Storm, Canyon Storm, Stand Down, Command/Admin) renders the new steel-blue/silver/cyan palette with no leftover gold/brown.
- Confirm the favicon and browser tab title show the new logo/"WPNZ Tracker".
- Confirm `LoginPage` shows the logo image instead of the skull text heading, and all button/label copy matches section 4.
- Confirm `NavBar` shows the new tab labels/icons and the admin-only tabs still gate correctly.
- Confirm `TrainSchedule` shows "Train Schedule" as the title, "Conductor"/"VIP"/"Mission Notes" labels in both the day cards and the edit modal, and the removed departure-time line is gone.
- Confirm Rajdhani loads and is applied to headings/nav labels only (inspect computed font-family on a body paragraph vs. an `h1`).
