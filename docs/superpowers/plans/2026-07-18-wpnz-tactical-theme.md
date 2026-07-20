# WPNZ Tactical Theme Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app's pirate theme (colors, favicon, copy) with a tactical/military theme matching the new WPNZ logo, per `docs/superpowers/specs/2026-07-18-wpnz-tactical-theme-design.md`.

**Architecture:** Pure reskin — Tailwind color token values in `tailwind.config.js`, one mechanical class-name rename (`game-gold` → `game-primary`) across all consumers, a new logo asset + favicon/title in `index.html`, a Google Font applied via global CSS, and per-file literal text/emoji swaps. No database, hook, or component-structure changes.

**Tech Stack:** React + TypeScript + Vite + Tailwind CSS (existing stack, no new dependencies — Rajdhani is loaded via a `<link>` tag, not an npm package).

## Global Constraints

- No changes to database schema, column names, or internal variable/hook/type names (`Conductor`, `VIP`, `train_schedule`, `conductorId`, `vipId`, `sources.captain`/`sources.firstMate`) — only rendered JSX text/emoji and Tailwind class names change.
- No automated test framework exists in this repo. Verification per task is: `npx tsc --noEmit` (must exit clean, matching the established baseline) + manual visual check via `npm run dev`.
- Source logo asset: `C:\Users\mike.goeke\Downloads\WPNz 2.jpg` (verified this is the steel-blue/silver tactical logo — the other downloaded file, `WPNz.jpg`, is the pirate/gold variant and is NOT used).
- Exact hex values, copy strings, and file list are copied verbatim from the design spec — do not improvise different wording or colors.

---

## Task 1: Recolor palette + rename `game-gold` → `game-primary`

**Files:**
- Modify: `tailwind.config.js`
- Modify (mechanical rename only): all 16 files currently referencing `game-gold` — `src/pages/TrainSchedule.tsx`, `src/pages/Out.tsx`, `src/pages/MarshallMap.tsx`, `src/pages/KillList.tsx`, `src/pages/FriendsList.tsx`, `src/pages/AllianceTech.tsx`, `src/pages/AdminPanel.tsx`, `src/App.tsx`, `src/components/DemeritManager.tsx`, `src/components/ErrorLogManager.tsx`, `src/components/EventLogImport.tsx`, `src/components/MemberManager.tsx`, `src/components/NavBar.tsx`, `src/components/LoginPage.tsx`, `src/components/VsPointManager.tsx`, `src/components/StormPage.tsx`

**Interfaces:**
- Produces: Tailwind color tokens available to every later task — `game-primary` (was `game-gold`, now `#2fb6f5`), `game-silver` (`#b8c4cc`), `game-dark` (`#0a0e14`), `game-card` (`#131a22`), `game-accent` (`#2c3a48`), `game-highlight` (`#dc2626`), `game-leadership` (`#e0a938`), `game-standard` (`#2f8fae`). All later tasks use `game-primary`, never `game-gold`.

- [ ] **Step 1: Update `tailwind.config.js` with the new palette and renamed token**

Replace the file's `colors` block:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'game-primary': '#2fb6f5',
        'game-silver': '#b8c4cc',
        'game-dark': '#0a0e14',
        'game-card': '#131a22',
        'game-accent': '#2c3a48',
        'game-highlight': '#dc2626',
        'game-leadership': '#e0a938',
        'game-standard': '#2f8fae',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Run the mechanical rename across `src/`**

Run:
```bash
grep -rl "game-gold" src --include="*.tsx" --include="*.ts" | xargs sed -i 's/game-gold/game-primary/g'
```
Expected: command exits 0, no output (only the file list from `grep -rl` is piped to `sed`, nothing prints).

- [ ] **Step 3: Verify no `game-gold` references remain**

Run: `grep -rn "game-gold" src`
Expected: no output (exit code 1 — no matches found).

- [ ] **Step 4: Verify TypeScript compiles clean**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 5: Manually verify the new palette renders**

Run `npm run dev`, open the app in a browser, sign in, and confirm:
- Backgrounds are near-black with a blue tint (not brown/black).
- Active nav tab, buttons, and highlighted borders are cyan-blue (not gold).
- Error text/delete buttons are red.
- Leadership/rank badges (e.g. the top-right CAPTAIN badge, Ring 1 stat on Marshall Map) are amber/gold.
- The R4 Rotation link and Ring 2 stat on Marshall Map are steel teal.

Stop the dev server after confirming (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.js src/
git commit -m "feat: recolor theme to tactical steel-blue/cyan palette"
```

---

## Task 2: Add Rajdhani display font for headings

**Files:**
- Modify: `index.html`
- Modify: `tailwind.config.js`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: nothing from Task 1 besides the same `tailwind.config.js` file (additive change, no conflict).
- Produces: a `font-display` Tailwind utility class (`['Rajdhani', 'sans-serif']`) available for Task 4 to apply to `NavBar` tab labels. All `h1`/`h2` elements site-wide automatically render in Rajdhani via a global base-layer rule — no per-component class needed for headings.

- [ ] **Step 1: Add the Google Fonts link to `index.html`**

In the `<head>`, add these lines immediately after the existing `<link rel="icon" ...>` line:

```html
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Add the `font-display` utility to `tailwind.config.js`**

Add a `fontFamily` key alongside `colors` inside `theme.extend`:

```js
      fontFamily: {
        display: ['Rajdhani', 'sans-serif'],
      },
```

- [ ] **Step 3: Apply Rajdhani to all headings globally in `src/index.css`**

Add to the existing `@layer base` block (do not create a second `@layer base`):

```css
@layer base {
  html, body, #root {
    height: 100%;
    background-color: #0a0f12;
  }
  body {
    overscroll-behavior: none;
    -webkit-tap-highlight-color: transparent;
  }
  h1, h2 {
    font-family: 'Rajdhani', sans-serif;
  }
}
```

(Note: `background-color: #0a0f12` here is a pre-Tailwind-load fallback for the raw `html`/`body` background before the stylesheet paints; leave it as-is — Task 1 already updated the Tailwind `game-dark` token that actually paints the app background.)

- [ ] **Step 4: Verify TypeScript/build compiles clean**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 5: Manually verify the font loads and is scoped correctly**

Run `npm run dev`, open the app, sign in, and confirm:
- Any page heading (e.g. "Marshall Map", "Ship Upgrades") renders in the condensed Rajdhani font, visibly different from body text.
- Body text, buttons, and form labels remain on the default system font.
- Open browser DevTools → Network tab, confirm the Rajdhani font file loads with a 200 status (not blocked/404).

Stop the dev server after confirming (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
git add index.html tailwind.config.js src/index.css
git commit -m "feat: add Rajdhani display font for headings"
```

---

## Task 3: Logo asset, favicon, title, and LoginPage rebrand

**Files:**
- Create: `public/logo.jpg` (copied from `C:\Users\mike.goeke\Downloads\WPNz 2.jpg`)
- Modify: `index.html`
- Modify: `src/components/LoginPage.tsx`

**Interfaces:**
- Consumes: `game-primary`, `game-dark`, `game-card`, `game-accent` tokens from Task 1 (unchanged usage, just new colors).
- Produces: `/logo.jpg` as a public static asset, referenced by both the favicon and the `LoginPage` header — later tasks don't reference this file.

- [ ] **Step 1: Copy the logo image into `public/`**

Run:
```bash
cp "/c/Users/mike.goeke/Downloads/WPNz 2.jpg" "public/logo.jpg"
```
Expected: command exits 0. Verify with `ls -la public/logo.jpg` — file should exist and be a few MB.

- [ ] **Step 2: Update `index.html` title and favicon**

Replace:
```html
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>☠️</text></svg>">
    <title>OPNz Tracker</title>
```
with:
```html
    <link rel="icon" type="image/jpeg" href="/logo.jpg">
    <title>WPNZ Tracker</title>
```

- [ ] **Step 3: Replace the `LoginPage` heading with the logo image and update copy**

In `src/components/LoginPage.tsx`, replace:
```tsx
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-game-primary">☠️ OPNz ☠️</h1>
          <p className="text-gray-400 mt-2">Pirates of the Seven Seas</p>
        </div>
```
with:
```tsx
        <div className="text-center mb-8">
          <img src="/logo.jpg" alt="WPNZ" className="h-24 w-24 object-cover rounded-xl mx-auto mb-3" />
          <p className="text-gray-400 mt-2">Forged in War</p>
        </div>
```

(Note: this file's `<h1>` had `text-game-primary` from Task 1's rename — it's being removed entirely here, not just recolored.)

- [ ] **Step 4: Update the remaining LoginPage copy**

Replace each of the following in `src/components/LoginPage.tsx`:

- `{oauthLoading === 'google' ? 'Setting sail...' : 'Board with Google'}` → `{oauthLoading === 'google' ? 'Deploying...' : 'Sign In with Google'}`
- `{oauthLoading === 'discord' ? 'Setting sail...' : 'Board with Discord'}` → `{oauthLoading === 'discord' ? 'Deploying...' : 'Sign In with Discord'}`
- `Pirate's Address` → `Email`
- `Secret Code` → `Password`
- `{loading ? 'Setting sail...' : 'Board the Ship'}` → `{loading ? 'Deploying...' : 'Sign In'}`

- [ ] **Step 5: Verify TypeScript compiles clean**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 6: Manually verify the login page and favicon**

Run `npm run dev`, open the app in a browser (signed out):
- Browser tab shows the WPNZ logo as favicon and "WPNZ Tracker" as the title.
- Login page shows the logo image (not skull text) and "Forged in War" subtitle.
- OAuth buttons read "Sign In with Google" / "Sign In with Discord".
- Email/password fields (dev-only) are labeled "Email" and "Password".
- Submit button reads "Sign In", and shows "Deploying..." while a sign-in is in flight (or dev-only submit) — trigger this by clicking sign in with invalid dev creds and observing the button text flash.

Stop the dev server after confirming (Ctrl+C).

- [ ] **Step 7: Commit**

```bash
git add public/logo.jpg index.html src/components/LoginPage.tsx
git commit -m "feat: add WPNZ logo asset, favicon, and rebrand login page copy"
```

---

## Task 4: NavBar copy and icon rewrite

**Files:**
- Modify: `src/components/NavBar.tsx`

**Interfaces:**
- Consumes: `font-display` utility from Task 2, `game-primary`/`game-accent` tokens from Task 1.
- Produces: nothing consumed by later tasks (NavBar is a leaf for this plan).

- [ ] **Step 1: Update tab labels and icons**

In `src/components/NavBar.tsx`, replace the `tabs` array:

```tsx
const tabs: { id: Page; label: string; icon: string; adminOnly?: boolean }[] = [
  { id: 'schedule', label: 'Ops Log', icon: '📋' },
  { id: 'map', label: 'Tactical Map', icon: '🗺️' },
  { id: 'tech', label: 'Armory', icon: '🔧' },
  { id: 'kills', label: 'Kill List', icon: '⚔️' },
  { id: 'friends', label: 'Friends', icon: '🤝' },
  { id: 'ds', label: 'Desert Storm', icon: '🏜️' },
  { id: 'canyon', label: 'Canyon Storm', icon: '🏔️' },
  { id: 'out', label: 'Stand Down', icon: '🎖️', adminOnly: true },
  { id: 'admin', label: 'Command', icon: '🎯', adminOnly: true },
]
```

- [ ] **Step 2: Apply the display font to tab labels and update the sign-out button**

Replace the tab label `<span>`:
```tsx
            <span className="text-lg mb-0.5">{tab.icon}</span>
            <span>{tab.label}</span>
```
with:
```tsx
            <span className="text-lg mb-0.5">{tab.icon}</span>
            <span className="font-display">{tab.label}</span>
```

Replace the sign-out button:
```tsx
        <button
          onClick={onSignOut}
          className="flex-1 flex flex-col items-center py-3 text-xs font-medium text-gray-400 hover:text-game-highlight transition-colors"
        >
          <span className="text-lg mb-0.5">🏴‍☠️</span>
          <span>Abandon Ship</span>
        </button>
```
with:
```tsx
        <button
          onClick={onSignOut}
          className="flex-1 flex flex-col items-center py-3 text-xs font-medium text-gray-400 hover:text-game-highlight transition-colors"
        >
          <span className="text-lg mb-0.5">🚪</span>
          <span className="font-display">Sign Out</span>
        </button>
```

- [ ] **Step 3: Verify TypeScript compiles clean**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 4: Manually verify the nav bar**

Run `npm run dev`, sign in as an admin user, and confirm:
- Bottom nav shows: Ops Log, Tactical Map, Armory, Kill List, Friends, Desert Storm, Canyon Storm, Stand Down, Command, Sign Out — each with the new icon.
- Tab labels render in the condensed Rajdhani font.
- Sign Out still successfully signs out when clicked.
- Sign in as a non-admin (or check `isAdmin` logic) and confirm "Stand Down" and "Command" tabs are hidden.

Stop the dev server after confirming (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
git add src/components/NavBar.tsx
git commit -m "feat: rebrand NavBar labels and icons to tactical theme"
```

---

## Task 5: AdminPanel copy rewrite

**Files:**
- Modify: `src/pages/AdminPanel.tsx`

**Interfaces:**
- Consumes: `game-primary` token from Task 1.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Update the page heading**

Replace:
```tsx
      <h1 className="text-xl font-bold text-game-primary">☠️ Captain's Quarters</h1>
```
with:
```tsx
      <h1 className="text-xl font-bold text-game-primary">🎯 Command Center</h1>
```

- [ ] **Step 2: Verify TypeScript compiles clean**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Manually verify**

Run `npm run dev`, sign in as admin, navigate to the Command tab, confirm the heading reads "🎯 Command Center" in Rajdhani.

Stop the dev server after confirming (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add src/pages/AdminPanel.tsx
git commit -m "feat: rebrand AdminPanel heading to tactical theme"
```

---

## Task 6: AllianceTech copy rewrite

**Files:**
- Modify: `src/pages/AllianceTech.tsx`

**Interfaces:**
- Consumes: `game-primary`/`game-standard` tokens from Task 1.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Update the page heading and subtitle**

Replace:
```tsx
        <h1 className="text-xl font-bold text-game-primary">Ship Upgrades</h1>
```
with:
```tsx
        <h1 className="text-xl font-bold text-game-primary">Armory</h1>
```

Replace:
```tsx
      <p className="text-gray-400 text-xs mb-6">Planned ship improvements in order</p>
```
with:
```tsx
      <p className="text-gray-400 text-xs mb-6">Planned armory upgrades in order</p>
```

- [ ] **Step 2: Verify TypeScript compiles clean**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Manually verify**

Run `npm run dev`, sign in, navigate to the Armory tab, confirm the heading reads "Armory" and the subtitle reads "Planned armory upgrades in order".

Stop the dev server after confirming (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add src/pages/AllianceTech.tsx
git commit -m "feat: rebrand AllianceTech copy to tactical theme"
```

---

## Task 7: TrainSchedule copy rewrite

**Files:**
- Modify: `src/pages/TrainSchedule.tsx`

**Interfaces:**
- Consumes: `game-primary`/`game-accent`/`game-standard`/`game-highlight` tokens from Task 1.
- Produces: nothing consumed by later tasks. Internal fields `sources.captain`/`sources.firstMate`, `conductorId`, `vipId`, and the `buildDowSources` function name stay unchanged — only the rendered `<span>`/`<label>` text around them changes.

- [ ] **Step 1: Update the page title**

Replace:
```tsx
        <h1 className="text-xl font-bold text-game-primary">Voyage Schedule</h1>
```
with:
```tsx
        <h1 className="text-xl font-bold text-game-primary">Train Schedule</h1>
```

- [ ] **Step 2: Remove the departure-time subtitle line**

Delete this line entirely (it currently sits directly below the header row, before `<div className="space-y-2">`):
```tsx
      <p className="text-gray-400 text-xs mb-4">Daily voyage departs ~1:00 EST · Sun–Sun view</p>
```

- [ ] **Step 3: Rename the day-card labels**

Replace:
```tsx
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide">Captain</span>
                  <p className="text-gray-400 text-xs italic">{sources.captain}</p>
                  {entry && <p className="text-white font-medium">{getMemberName(entry.conductor)}</p>}
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide">First Mate</span>
                  <p className="text-gray-400 text-xs italic">{sources.firstMate}</p>
                  {entry && <p className="text-white font-medium">{getMemberName(entry.vip)}</p>}
                </div>
                {entry?.notes && (
                  <div className="col-span-2 mt-1">
                    <span className="text-gray-500 text-xs uppercase tracking-wide">Captain's Log</span>
                    <p className="text-gray-300 text-xs">{entry.notes}</p>
                  </div>
                )}
```
with:
```tsx
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide">Conductor</span>
                  <p className="text-gray-400 text-xs italic">{sources.captain}</p>
                  {entry && <p className="text-white font-medium">{getMemberName(entry.conductor)}</p>}
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide">VIP</span>
                  <p className="text-gray-400 text-xs italic">{sources.firstMate}</p>
                  {entry && <p className="text-white font-medium">{getMemberName(entry.vip)}</p>}
                </div>
                {entry?.notes && (
                  <div className="col-span-2 mt-1">
                    <span className="text-gray-500 text-xs uppercase tracking-wide">Mission Notes</span>
                    <p className="text-gray-300 text-xs">{entry.notes}</p>
                  </div>
                )}
```

- [ ] **Step 4: Rename the edit-modal labels**

Replace:
```tsx
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Captain</label>
```
with:
```tsx
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Conductor</label>
```

Replace:
```tsx
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">First Mate</label>
```
with:
```tsx
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">VIP</label>
```

Replace:
```tsx
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Captain's Log</label>
```
with:
```tsx
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Mission Notes</label>
```

- [ ] **Step 5: Verify TypeScript compiles clean**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 6: Manually verify**

Run `npm run dev`, sign in, navigate to the Ops Log tab (Train Schedule page), confirm:
- Title reads "Train Schedule".
- The departure-time subtitle line is gone.
- Each day card shows "Conductor" and "VIP" labels (not Captain/First Mate).
- Any day with notes shows "Mission Notes" instead of "Captain's Log".
- As admin, open the edit modal for a day and confirm the form labels read "Conductor", "VIP", and "Mission Notes".

Stop the dev server after confirming (Ctrl+C).

- [ ] **Step 7: Commit**

```bash
git add src/pages/TrainSchedule.tsx
git commit -m "feat: rebrand TrainSchedule copy to tactical theme"
```

---

## Task 8: App.tsx copy rewrite

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `game-leadership` token from Task 1.
- Produces: nothing (final task).

- [ ] **Step 1: Update the loading state text**

Replace:
```tsx
        <p className="text-game-primary animate-pulse">Charting the seas...</p>
```
with:
```tsx
        <p className="text-game-primary animate-pulse">Standing by...</p>
```

- [ ] **Step 2: Update the admin badge text**

Replace:
```tsx
          <span className="text-xs bg-game-leadership text-game-dark font-bold px-2 py-0.5 rounded">
            CAPTAIN
          </span>
```
with:
```tsx
          <span className="text-xs bg-game-leadership text-game-dark font-bold px-2 py-0.5 rounded">
            COMMAND
          </span>
```

- [ ] **Step 3: Verify TypeScript compiles clean**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 4: Manually verify**

Run `npm run dev`:
- Briefly observe the loading state (throttle network in DevTools if it's too fast to see) and confirm it reads "Standing by...".
- Sign in as an admin and confirm the top-right badge reads "COMMAND" instead of "CAPTAIN".

Stop the dev server after confirming (Ctrl+C).

- [ ] **Step 5: Final full build check**

Run: `npm run build`
Expected: exits 0, produces `dist/` output with no TypeScript or Vite errors.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: rebrand App.tsx loading and admin badge copy to tactical theme"
```
