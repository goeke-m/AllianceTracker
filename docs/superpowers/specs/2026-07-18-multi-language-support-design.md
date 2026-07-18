# Multi-Language Support Design Spec

**Date:** 2026-07-18
**Status:** Approved

## Overview

The alliance is now international. Add UI translation support for English (default), Korean, Brazilian Portuguese, and Latin American Spanish, with a manual switcher that persists per-user across devices.

This is a UI-chrome translation effort only — user-generated data (member names, notes, kill-list/friends-list entries, demerit text, error log messages, etc.) is never translated or altered.

## 1. Scope

- **In scope:**
  - New `react-i18next` + `i18next` dependency and configuration.
  - Locale resource files for `en`, `ko`, `pt-BR`, `es` covering every hardcoded UI string in the app (nav labels, buttons, headers, table columns, form labels/placeholders, validation/error messages, empty states, loading text).
  - A language switcher in the top profile bar (`App.tsx`).
  - Persisting the chosen language to `localStorage` (fast, instant paint) and to the user's Supabase `user_metadata.locale` (source of truth across devices), following the same pattern already used for `is_admin`.
  - Locale-aware date/number formatting for the existing `.toLocaleDateString()` / `.toLocaleString()` call sites.
  - Machine-translated strings for the initial pass (to be refined later by fluent members).
- **Out of scope:**
  - Translating any user-entered data.
  - A translation-management UI (translations are edited directly in JSON files).
  - Server-side rendering or SEO locale routing (this is a client-only SPA behind auth).
  - New Supabase tables — the language preference reuses the existing `user_metadata` mechanism.

## 2. Dependency & Configuration

Add `i18next` and `react-i18next` to `package.json`.

### `src/lib/i18n.ts`

Initializes i18next with:
- `resources`: imports of the four locale JSON files (see below).
- `fallbackLng: 'en'`.
- `supportedLngs: ['en', 'ko', 'pt-BR', 'es']`.
- `interpolation.escapeValue: false` (React already escapes).

This module is imported once, early, in `src/main.tsx`.

## 3. Locale Files

`src/locales/{en,ko,pt-BR,es}.json` — flat, namespaced keys grouped by feature area, mirroring the existing `pages`/`components` split:

```
common      — Save, Cancel, Delete, Edit, Loading, Confirm, error/empty-state boilerplate shared across managers
login       — LoginPage strings
nav         — NavBar tab labels + "Abandon Ship" sign-out button
profileBar  — top bar (CAPTAIN badge, setup-required / loading screens in App.tsx)
schedule    — TrainSchedule
map         — MarshallMap
tech        — AllianceTech
kills       — KillList
friends     — FriendsList
out         — Out (Shore Leave)
admin       — AdminPanel tab labels
members     — MemberManager
demerits    — DemeritManager
vsPoints    — VsPointManager
errorLog    — ErrorLogManager
```

Every component currently rendering a hardcoded string switches to `useTranslation()` + `t('namespace.key')`. Strings that embed dynamic values (e.g. counts, names) use i18next interpolation (`t('members.count', { count })`) so pluralization is handled per-language automatically rather than string-concatenated in JS.

## 4. Language Detection & Persistence

Mirrors the existing `is_admin` storage pattern (`user_metadata`, read via `useAuth`).

1. **Boot:** `src/lib/i18n.ts` initializes with whatever language is cached in `localStorage` (key: `opnz-language`), so the app paints in the right language immediately, before the Supabase session resolves.
2. **Session resolves:** `useAuth` (or a small new `useLanguage` hook alongside it) reads `session.user.user_metadata?.locale`. If present and different from the current i18next language, it wins and overwrites both i18next's active language and the `localStorage` cache — this is what makes the preference follow the user across devices/browsers.
3. **New user, no preference anywhere:** fall back to `navigator.language`, mapped to the closest supported code (e.g. `pt` → `pt-BR`, `ko-KR` → `ko`, anything unmatched → `en`).
4. **User changes language via the switcher:** call `i18n.changeLanguage(code)` immediately (instant UI update), write `code` to `localStorage`, and fire `supabase.auth.updateUser({ data: { locale: code } })` in the background (fire-and-forget, same tolerance-for-failure posture as `logError` in `src/lib/errorLog.ts` — a failed sync just means it falls back to local-only for that session, it must not block or error visibly).

## 5. Switcher UI

New component `src/components/LanguageSwitcher.tsx`: a small globe-icon button that opens a dropdown listing English / 한국어 / Português / Español. Mounted in the top profile bar in `App.tsx`, next to the existing email/CAPTAIN badge — not the bottom `NavBar`, since that bar's tabs are already `flex-1` and full-width.

## 6. Locale-Aware Formatting

Update the existing no-arg `.toLocaleDateString()` / `.toLocaleString()` call sites to pass the current i18next language (mapped to its BCP-47 tag) instead of relying on the browser default:

| File | Call |
|---|---|
| `src/pages/MarshallMap.tsx:230` | `.toLocaleDateString()` |
| `src/components/ErrorLogManager.tsx:6` | `.toLocaleString(undefined, {...})` |
| `src/components/VsPointManager.tsx:272` | `.toLocaleString()` |
| `src/components/MemberManager.tsx:414,446` | `.toLocaleString(undefined, {...})` |

A small shared helper (e.g. `src/lib/locale.ts` exporting `formatDate`/`formatNumber` that read the active i18next language) replaces the ad-hoc `undefined` arguments at each site.

## 7. Migration Approach

Since this touches every page/component, it's done as one app-wide pass rather than phased:

1. Set up i18next config, locale file skeletons, and the switcher first (infrastructure).
2. Extract strings feature-by-feature into the locale JSON files, one file/namespace at a time, replacing hardcoded text with `t()` calls as each is done — this keeps each step independently verifiable (`tsc` + manual check of that one page) rather than one giant unreviewable diff.
3. Machine-translate each namespace's `en.json` content into `ko`/`pt-BR`/`es` as it's extracted.

## 8. Testing

No automated test framework exists in this project (`tsc` + manual verification is the established pattern, per the error-logging spec). Manual verification in the running dev app:

- Switch language via the new switcher and confirm every visible page's UI text updates immediately, with no leftover hardcoded English.
- Reload the page and confirm the chosen language persists (via `localStorage`) before the Supabase session resolves.
- Sign in as the same user on a different browser profile and confirm the language follows via `user_metadata.locale`.
- Confirm a brand-new user (no stored preference) lands on a reasonable default based on browser language.
- Confirm date/number formatting (Marshall Map event dates, VS points, WAD averages, error log timestamps) renders using the active language's locale, not the browser's.
- Confirm `npm run build` (`tsc` + vite build) passes with no type errors introduced by the `t()` migration.
