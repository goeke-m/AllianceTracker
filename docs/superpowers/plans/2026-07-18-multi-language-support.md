# Multi-Language Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add English/Korean/Brazilian-Portuguese/Latin-American-Spanish UI translation to every page and component, with a NavBar-adjacent switcher whose choice persists to the user's Supabase profile.

**Architecture:** `react-i18next` + `i18next`, initialized once in `src/lib/i18n.ts` with all four locale JSON files loaded as static resources (no lazy-loading — the app is small). Every component reads strings via `useTranslation()`'s `t()`. Language selection is detected from `localStorage` → `user_metadata.locale` → browser language → `en`, and a `useLanguage` hook keeps all three in sync when the user changes it.

**Tech Stack:** React 18, TypeScript, Vite, `i18next`, `react-i18next`, existing Supabase client (`src/lib/supabase.ts`).

**Spec:** `docs/superpowers/specs/2026-07-18-multi-language-support-design.md`

## Global Constraints

- No automated test framework exists in this project — verification is `npm run build` (tsc + vite build) plus manual walkthrough in the running dev app, per the established pattern (see `docs/superpowers/specs/2026-07-06-error-logging-design.md`).
- Only new dependencies: `i18next`, `react-i18next`.
- Every component that adds `const { t } = useTranslation()`: **first check whether the file already uses `t` as a local identifier** (e.g. `.map((t) => ...)` where `t` means "tab" or "tech item" — this exact collision exists in `AdminPanel.tsx` and `NavBar.tsx` today). If so, rename that local variable (e.g. to `tab`, `tech`, `item`) before adding the hook — never alias the translation function instead.
- Never translate user-generated or stored data: member names, ranks (`R1`-`R5`), squad types (`Tank`/`Air`/`Missile`), timezone labels, kill-list/friends-list entries, demerit notes, VS point values, tech queue item names, the R4 rotation roster, or any Supabase/Postgres error message text (`error.message`). Only static UI chrome (labels, buttons, headers, placeholders, validation copy) is translated.
- Locale files live at `src/locales/{en,ko,pt-BR,es}.json`, namespaced by feature area, and are the only place translated text is authored.
- Supported language codes are exactly `'en' | 'ko' | 'pt-BR' | 'es'`, exported as `SupportedLanguage` from `src/lib/i18n.ts` — every task reuses this type, never redefines it.
- Language persistence: `localStorage` key `opnz-language`, plus `supabase.auth.updateUser({ data: { locale: code } })` — mirrors the existing `is_admin` storage pattern in `user_metadata` (see `src/hooks/useAuth.ts`).
- The dev-only "Setup Required" screen in `App.tsx` (shown when Supabase env vars are missing) is explicitly **out of scope** for translation — it's a developer configuration screen, never seen by alliance members in production.

---

### Task 1: i18next infrastructure

**Files:**
- Modify: `package.json` (add dependencies)
- Create: `src/lib/i18n.ts`
- Create: `src/locales/en.json`, `src/locales/ko.json`, `src/locales/pt-BR.json`, `src/locales/es.json`
- Modify: `src/main.tsx`
- Test: manual verification (no automated test suite in this project)

**Interfaces:**
- Produces: `SUPPORTED_LANGUAGES` (readonly array), `SupportedLanguage` (union type), default export `i18n` instance — all from `src/lib/i18n.ts`. Every later task imports `SupportedLanguage` from here.

- [ ] **Step 1: Install dependencies**

Run: `npm install i18next react-i18next`

- [ ] **Step 2: Create empty locale file skeletons**

Create `src/locales/en.json`:
```json
{}
```

Create `src/locales/ko.json`:
```json
{}
```

Create `src/locales/pt-BR.json`:
```json
{}
```

Create `src/locales/es.json`:
```json
{}
```

- [ ] **Step 3: Create the i18n config**

Create `src/lib/i18n.ts`:
```ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en.json'
import ko from '../locales/ko.json'
import ptBR from '../locales/pt-BR.json'
import es from '../locales/es.json'

export const SUPPORTED_LANGUAGES = ['en', 'ko', 'pt-BR', 'es'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

const STORAGE_KEY = 'opnz-language'

function isSupportedLanguage(value: string): value is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
}

function detectInitialLanguage(): SupportedLanguage {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && isSupportedLanguage(stored)) return stored

  const browserLang = navigator.language
  if (browserLang.startsWith('ko')) return 'ko'
  if (browserLang.startsWith('pt')) return 'pt-BR'
  if (browserLang.startsWith('es')) return 'es'
  return 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ko: { translation: ko },
    'pt-BR': { translation: ptBR },
    es: { translation: es },
  },
  lng: detectInitialLanguage(),
  fallbackLng: 'en',
  supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
  interpolation: { escapeValue: false },
  initImmediate: false,
})

export default i18n
```

`initImmediate: false` forces synchronous initialization (all resources are passed in directly, nothing to load over the network), so `i18n.language` and `t()` are correct before the first render — no flash of missing/wrong-language text.

- [ ] **Step 4: Wire the config into app startup**

Modify `src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './lib/i18n'
import { App } from './App'

const root = document.getElementById('root')!
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

(Only change: the new `import './lib/i18n'` line, placed before `import { App } from './App'` so i18next is configured before any component renders.)

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: succeeds with no type errors. The app's visible behavior is unchanged (no component consumes `t()` yet).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/i18n.ts src/locales/en.json src/locales/ko.json src/locales/pt-BR.json src/locales/es.json src/main.tsx
git commit -m "feat(i18n): add i18next infrastructure"
```

---

### Task 2: Locale-aware date/number formatting

**Files:**
- Create: `src/lib/locale.ts`
- Modify: `src/pages/MarshallMap.tsx:230`
- Modify: `src/components/ErrorLogManager.tsx:6-8`
- Modify: `src/components/VsPointManager.tsx:272`
- Modify: `src/components/MemberManager.tsx:414,446`
- Test: manual verification

**Interfaces:**
- Consumes: `i18n` default export from `src/lib/i18n.ts` (Task 1).
- Produces: `formatDate`, `formatDateTime`, `formatNumber` from `src/lib/locale.ts` — used by this task's four call sites only (no other task depends on these).

- [ ] **Step 1: Create the formatting helper**

Create `src/lib/locale.ts`:
```ts
import i18n from './i18n'

const LOCALE_TAGS: Record<string, string> = {
  en: 'en-US',
  ko: 'ko-KR',
  'pt-BR': 'pt-BR',
  es: 'es-419',
}

function activeLocaleTag(): string {
  return LOCALE_TAGS[i18n.language] ?? 'en-US'
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString(activeLocaleTag(), options)
}

export function formatDateTime(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleString(activeLocaleTag(), options)
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return value.toLocaleString(activeLocaleTag(), options)
}
```

`es-419` is the Unicode CLDR tag for "Spanish, Latin America and the Caribbean" — matches the Latin American Spanish requirement precisely (as opposed to `es-ES`).

- [ ] **Step 2: Update `MarshallMap.tsx`**

In `src/pages/MarshallMap.tsx`, add the import:
```ts
import { formatDate } from '../lib/locale'
```

Replace (line 230):
```tsx
<span>#{i + 1} {new Date(log.event_date).toLocaleDateString()}</span>
```
with:
```tsx
<span>#{i + 1} {formatDate(log.event_date)}</span>
```

- [ ] **Step 3: Update `ErrorLogManager.tsx`**

In `src/components/ErrorLogManager.tsx`, add the import:
```ts
import { formatDateTime } from '../lib/locale'
```

Replace (line 6):
```ts
return new Date(iso).toLocaleString(undefined, {
```
with:
```ts
return formatDateTime(iso, {
```
(keep the rest of that call — the options object argument — unchanged; this only swaps `new Date(iso).toLocaleString(undefined,` for `formatDateTime(iso,`).

- [ ] **Step 4: Update `VsPointManager.tsx`**

In `src/components/VsPointManager.tsx`, add the import:
```ts
import { formatNumber } from '../lib/locale'
```

Replace (line 272):
```tsx
<td className="px-3 py-2 text-gray-300">{r.points.toLocaleString()}</td>
```
with:
```tsx
<td className="px-3 py-2 text-gray-300">{formatNumber(r.points)}</td>
```

- [ ] **Step 5: Update `MemberManager.tsx`**

In `src/components/MemberManager.tsx`, add the import:
```ts
import { formatNumber } from '../lib/locale'
```

Replace both occurrences (lines 414 and 446) of:
```tsx
{avgVsMap[m.id] != null ? avgVsMap[m.id].toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'}
```
with:
```tsx
{avgVsMap[m.id] != null ? formatNumber(avgVsMap[m.id], { maximumFractionDigits: 0 }) : '—'}
```

- [ ] **Step 6: Verify**

Run: `npm run build`
Expected: succeeds with no type errors.

Manual check: run `npm run dev`, open Marshall Map / Error Log (as owner) / VS Points / Member Manager, confirm dates and numbers render exactly as before (still `en-US` formatting, since no language has been switched yet).

- [ ] **Step 7: Commit**

```bash
git add src/lib/locale.ts src/pages/MarshallMap.tsx src/components/ErrorLogManager.tsx src/components/VsPointManager.tsx src/components/MemberManager.tsx
git commit -m "feat(i18n): format dates/numbers using the active language's locale"
```

---

### Task 3: Language switcher mechanism

**Files:**
- Create: `src/hooks/useLanguage.ts`
- Create: `src/components/LanguageSwitcher.tsx`
- Modify: `src/App.tsx`
- Test: manual verification

**Interfaces:**
- Consumes: `i18n`, `SUPPORTED_LANGUAGES`, `SupportedLanguage` from `src/lib/i18n.ts` (Task 1); `supabase` from `src/lib/supabase.ts`.
- Produces: `useLanguage()` hook returning `{ language: SupportedLanguage, setLanguage: (code: SupportedLanguage) => void }`; `<LanguageSwitcher />` component. No later task depends on these directly (App.tsx just renders the switcher), but Task 4 adds `t()` calls to the same `App.tsx` region this task touches.

- [ ] **Step 1: Create the language hook**

Create `src/hooks/useLanguage.ts`:
```ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import i18n, { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../lib/i18n'

const STORAGE_KEY = 'opnz-language'

function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
}

export function useLanguage() {
  const [language, setLanguageState] = useState<SupportedLanguage>(i18n.language as SupportedLanguage)

  useEffect(() => {
    function syncFromSession(locale: unknown) {
      if (isSupportedLanguage(locale) && locale !== i18n.language) {
        i18n.changeLanguage(locale)
        localStorage.setItem(STORAGE_KEY, locale)
        setLanguageState(locale)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      syncFromSession(session?.user.user_metadata?.locale)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncFromSession(session?.user.user_metadata?.locale)
    })

    return () => subscription.unsubscribe()
  }, [])

  function setLanguage(code: SupportedLanguage) {
    i18n.changeLanguage(code)
    localStorage.setItem(STORAGE_KEY, code)
    setLanguageState(code)
    supabase.auth.updateUser({ data: { locale: code } }).catch(() => {
      // Best-effort profile sync — localStorage already holds the preference for this browser.
    })
  }

  return { language, setLanguage }
}
```

This mirrors `useAuth`'s session-read + `onAuthStateChange` pattern. A profile locale, once found, always wins over whatever `localStorage`/browser-detection picked at boot — that's what makes the preference follow the user across devices.

- [ ] **Step 2: Create the switcher component**

Create `src/components/LanguageSwitcher.tsx`:
```tsx
import { useState } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import type { SupportedLanguage } from '../lib/i18n'

const LANGUAGE_OPTIONS: { code: SupportedLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
  { code: 'pt-BR', label: 'Português' },
  { code: 'es', label: 'Español' },
]

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-gray-400 hover:text-white px-2 py-1"
        aria-label="Change language"
      >
        🌐
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-game-card border border-game-accent rounded-lg overflow-hidden z-50">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              onClick={() => {
                setLanguage(opt.code)
                setOpen(false)
              }}
              className={`block w-full text-left px-3 py-2 text-xs whitespace-nowrap ${
                language === opt.code ? 'text-game-gold' : 'text-gray-300 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

Language names are shown in their own language regardless of the active UI language (standard convention for language pickers), so these labels are hardcoded here rather than pulled from the locale JSON files.

- [ ] **Step 3: Mount the switcher in the top profile bar**

In `src/App.tsx`, add the import:
```ts
import { LanguageSwitcher } from './components/LanguageSwitcher'
```

Replace:
```tsx
      <div className="fixed top-0 left-0 right-0 bg-game-card border-b border-game-accent px-4 py-2 flex items-center justify-between z-40">
        <span className="text-xs text-gray-400 truncate">{user.email}</span>
        {isAdmin && (
          <span className="text-xs bg-game-leadership text-game-dark font-bold px-2 py-0.5 rounded">
            CAPTAIN
          </span>
        )}
      </div>
```
with:
```tsx
      <div className="fixed top-0 left-0 right-0 bg-game-card border-b border-game-accent px-4 py-2 flex items-center justify-between z-40">
        <span className="text-xs text-gray-400 truncate">{user.email}</span>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <span className="text-xs bg-game-leadership text-game-dark font-bold px-2 py-0.5 rounded">
              CAPTAIN
            </span>
          )}
          <LanguageSwitcher />
        </div>
      </div>
```

(The `CAPTAIN` text itself is translated in Task 4 — this step only adds the switcher next to it.)

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: succeeds with no type errors.

Manual check: run `npm run dev`, sign in, click the 🌐 icon in the top bar, confirm the dropdown lists English / 한국어 / Português / Español and closes on selection. Reload the page and confirm the same language is still selected (via `localStorage`, since no locale JSON keys exist yet nothing visibly changes text-wise, but there should be no console errors). If you have a second browser profile signed in as the same account, confirm that switching the language in one and reloading the other eventually reflects the change (via `user_metadata.locale`).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useLanguage.ts src/components/LanguageSwitcher.tsx src/App.tsx
git commit -m "feat(i18n): add language switcher with profile-synced persistence"
```

---

### Task 4: `common` / `nav` / `login` / `profileBar` namespaces

**Files:**
- Modify: `src/locales/en.json`, `src/locales/ko.json`, `src/locales/pt-BR.json`, `src/locales/es.json`
- Modify: `src/components/NavBar.tsx`
- Modify: `src/components/LoginPage.tsx`
- Modify: `src/App.tsx`
- Test: manual verification

**Interfaces:**
- Produces: the `common.*` namespace — reused by every subsequent task (Tasks 5–16). No later task adds new `common.*` keys; they're all defined here.

- [ ] **Step 1: Add the `common`, `nav`, `login`, `profileBar` namespaces to `src/locales/en.json`**

Replace the file's `{}` with:
```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "saving": "Saving...",
    "edit": "Edit",
    "delete": "Delete",
    "deleteShort": "Del",
    "deletingIndicator": "...",
    "loading": "Loading...",
    "clear": "Clear",
    "selectMemberPlaceholder": "— Select member —",
    "member": "Member",
    "name": "Name",
    "server": "Server",
    "reason": "Reason",
    "date": "Date",
    "add": "Add",
    "addButton": "+ Add",
    "rank": "Rank",
    "import": "Import",
    "importing": "Importing...",
    "saveFailed": "Save failed",
    "deleteFailed": "Delete failed",
    "searchMemberPlaceholder": "Search member...",
    "emptyNoMembersMatch": "No members match the filter.",
    "nameServerRequired": "Name and server are required.",
    "emptyNoMatch": "No entries match the filter.",
    "playerNamePlaceholder": "Player name",
    "serverNamePlaceholder": "Server name",
    "optionalReasonPlaceholder": "Optional reason",
    "nameRequiredLabel": "Name *",
    "serverRequiredLabel": "Server *",
    "searchNameOrServerPlaceholder": "Search name or server..."
  },
  "nav": {
    "schedule": "Voyage Log",
    "map": "Treasure Map",
    "tech": "Ship Upgrades",
    "kills": "Kill List",
    "friends": "Friends",
    "out": "Shore Leave",
    "admin": "Captain",
    "signOut": "Abandon Ship"
  },
  "login": {
    "tagline": "Pirates of the Seven Seas",
    "settingSail": "Setting sail...",
    "googleButton": "Board with Google",
    "discordButton": "Board with Discord",
    "orDivider": "or",
    "emailLabel": "Pirate's Address",
    "emailPlaceholder": "your@email.com",
    "passwordLabel": "Secret Code",
    "passwordPlaceholder": "••••••••",
    "submitButton": "Board the Ship"
  },
  "profileBar": {
    "loadingText": "Charting the seas...",
    "captainBadge": "CAPTAIN"
  }
}
```

- [ ] **Step 2: Add the same namespaces to `src/locales/ko.json`**

```json
{
  "common": {
    "save": "저장",
    "cancel": "취소",
    "saving": "저장 중...",
    "edit": "수정",
    "delete": "삭제",
    "deleteShort": "삭제",
    "deletingIndicator": "...",
    "loading": "로딩 중...",
    "clear": "지우기",
    "selectMemberPlaceholder": "— 멤버 선택 —",
    "member": "멤버",
    "name": "이름",
    "server": "서버",
    "reason": "사유",
    "date": "날짜",
    "add": "추가",
    "addButton": "+ 추가",
    "rank": "순위",
    "import": "가져오기",
    "importing": "가져오는 중...",
    "saveFailed": "저장 실패",
    "deleteFailed": "삭제 실패",
    "searchMemberPlaceholder": "멤버 검색...",
    "emptyNoMembersMatch": "필터와 일치하는 멤버가 없습니다.",
    "nameServerRequired": "이름과 서버는 필수입니다.",
    "emptyNoMatch": "필터와 일치하는 항목이 없습니다.",
    "playerNamePlaceholder": "플레이어 이름",
    "serverNamePlaceholder": "서버 이름",
    "optionalReasonPlaceholder": "사유 (선택 사항)",
    "nameRequiredLabel": "이름 *",
    "serverRequiredLabel": "서버 *",
    "searchNameOrServerPlaceholder": "이름 또는 서버 검색..."
  },
  "nav": {
    "schedule": "항해 일지",
    "map": "보물 지도",
    "tech": "함선 업그레이드",
    "kills": "킬 리스트",
    "friends": "친구 목록",
    "out": "휴가",
    "admin": "선장",
    "signOut": "배 버리기"
  },
  "login": {
    "tagline": "칠대양의 해적",
    "settingSail": "출항 중...",
    "googleButton": "Google로 승선",
    "discordButton": "Discord로 승선",
    "orDivider": "또는",
    "emailLabel": "해적의 주소",
    "emailPlaceholder": "your@email.com",
    "passwordLabel": "비밀 암호",
    "passwordPlaceholder": "••••••••",
    "submitButton": "승선하기"
  },
  "profileBar": {
    "loadingText": "항해 준비 중...",
    "captainBadge": "선장"
  }
}
```

- [ ] **Step 3: Add the same namespaces to `src/locales/pt-BR.json`**

```json
{
  "common": {
    "save": "Salvar",
    "cancel": "Cancelar",
    "saving": "Salvando...",
    "edit": "Editar",
    "delete": "Excluir",
    "deleteShort": "Exc",
    "deletingIndicator": "...",
    "loading": "Carregando...",
    "clear": "Limpar",
    "selectMemberPlaceholder": "— Selecionar membro —",
    "member": "Membro",
    "name": "Nome",
    "server": "Servidor",
    "reason": "Motivo",
    "date": "Data",
    "add": "Adicionar",
    "addButton": "+ Adicionar",
    "rank": "Posição",
    "import": "Importar",
    "importing": "Importando...",
    "saveFailed": "Falha ao salvar",
    "deleteFailed": "Falha ao excluir",
    "searchMemberPlaceholder": "Buscar membro...",
    "emptyNoMembersMatch": "Nenhum membro corresponde ao filtro.",
    "nameServerRequired": "Nome e servidor são obrigatórios.",
    "emptyNoMatch": "Nenhuma entrada corresponde ao filtro.",
    "playerNamePlaceholder": "Nome do jogador",
    "serverNamePlaceholder": "Nome do servidor",
    "optionalReasonPlaceholder": "Motivo opcional",
    "nameRequiredLabel": "Nome *",
    "serverRequiredLabel": "Servidor *",
    "searchNameOrServerPlaceholder": "Buscar nome ou servidor..."
  },
  "nav": {
    "schedule": "Diário de Bordo",
    "map": "Mapa do Tesouro",
    "tech": "Melhorias do Navio",
    "kills": "Lista de Abates",
    "friends": "Amigos",
    "out": "Licença",
    "admin": "Capitão",
    "signOut": "Abandonar o Navio"
  },
  "login": {
    "tagline": "Piratas dos Sete Mares",
    "settingSail": "Zarpando...",
    "googleButton": "Embarcar com Google",
    "discordButton": "Embarcar com Discord",
    "orDivider": "ou",
    "emailLabel": "Endereço do Pirata",
    "emailPlaceholder": "your@email.com",
    "passwordLabel": "Código Secreto",
    "passwordPlaceholder": "••••••••",
    "submitButton": "Embarcar no Navio"
  },
  "profileBar": {
    "loadingText": "Traçando o rumo...",
    "captainBadge": "CAPITÃO"
  }
}
```

- [ ] **Step 4: Add the same namespaces to `src/locales/es.json`**

```json
{
  "common": {
    "save": "Guardar",
    "cancel": "Cancelar",
    "saving": "Guardando...",
    "edit": "Editar",
    "delete": "Eliminar",
    "deleteShort": "Elim",
    "deletingIndicator": "...",
    "loading": "Cargando...",
    "clear": "Limpiar",
    "selectMemberPlaceholder": "— Seleccionar miembro —",
    "member": "Miembro",
    "name": "Nombre",
    "server": "Servidor",
    "reason": "Motivo",
    "date": "Fecha",
    "add": "Agregar",
    "addButton": "+ Agregar",
    "rank": "Rango",
    "import": "Importar",
    "importing": "Importando...",
    "saveFailed": "Error al guardar",
    "deleteFailed": "Error al eliminar",
    "searchMemberPlaceholder": "Buscar miembro...",
    "emptyNoMembersMatch": "Ningún miembro coincide con el filtro.",
    "nameServerRequired": "El nombre y el servidor son obligatorios.",
    "emptyNoMatch": "Ninguna entrada coincide con el filtro.",
    "playerNamePlaceholder": "Nombre del jugador",
    "serverNamePlaceholder": "Nombre del servidor",
    "optionalReasonPlaceholder": "Motivo opcional",
    "nameRequiredLabel": "Nombre *",
    "serverRequiredLabel": "Servidor *",
    "searchNameOrServerPlaceholder": "Buscar nombre o servidor..."
  },
  "nav": {
    "schedule": "Registro de Viaje",
    "map": "Mapa del Tesoro",
    "tech": "Mejoras del Barco",
    "kills": "Lista de Bajas",
    "friends": "Amigos",
    "out": "Permiso",
    "admin": "Capitán",
    "signOut": "Abandonar el Barco"
  },
  "login": {
    "tagline": "Piratas de los Siete Mares",
    "settingSail": "Zarpando...",
    "googleButton": "Abordar con Google",
    "discordButton": "Abordar con Discord",
    "orDivider": "o",
    "emailLabel": "Dirección del Pirata",
    "emailPlaceholder": "your@email.com",
    "passwordLabel": "Código Secreto",
    "passwordPlaceholder": "••••••••",
    "submitButton": "Abordar el Barco"
  },
  "profileBar": {
    "loadingText": "Trazando el rumbo...",
    "captainBadge": "CAPITÁN"
  }
}
```

- [ ] **Step 5: Wire up `NavBar.tsx`**

Current full file (`src/components/NavBar.tsx`):
```tsx
import type { Page } from '../lib/types'

interface NavBarProps {
  current: Page
  isAdmin: boolean
  onNavigate: (page: Page) => void
  onSignOut: () => void
}

const tabs: { id: Page; label: string; icon: string; adminOnly?: boolean }[] = [
  { id: 'schedule', label: 'Voyage Log', icon: '⚓' },
  { id: 'map', label: 'Treasure Map', icon: '🗺' },
  { id: 'tech', label: 'Ship Upgrades', icon: '⚔️' },
  { id: 'kills', label: 'Kill List', icon: '⚔️' },
  { id: 'friends', label: 'Friends', icon: '🤝' },
  { id: 'out', label: 'Shore Leave', icon: '🏝️', adminOnly: true },
  { id: 'admin', label: 'Captain', icon: '☠️', adminOnly: true },
]

export function NavBar({ current, isAdmin, onNavigate, onSignOut }: NavBarProps) {
  const visibleTabs = isAdmin ? tabs : tabs.filter((t) => !t.adminOnly)

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-game-card border-t border-game-accent z-50">
      <div className="flex items-center">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
              current === tab.id
                ? 'text-game-gold border-t-2 border-game-gold -mt-px'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="text-lg mb-0.5">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
        <button
          onClick={onSignOut}
          className="flex-1 flex flex-col items-center py-3 text-xs font-medium text-gray-400 hover:text-game-highlight transition-colors"
        >
          <span className="text-lg mb-0.5">🏴‍☠️</span>
          <span>Abandon Ship</span>
        </button>
      </div>
    </nav>
  )
}
```

Replace it entirely with:
```tsx
import { useTranslation } from 'react-i18next'
import type { Page } from '../lib/types'

interface NavBarProps {
  current: Page
  isAdmin: boolean
  onNavigate: (page: Page) => void
  onSignOut: () => void
}

const tabs: { id: Page; icon: string; adminOnly?: boolean }[] = [
  { id: 'schedule', icon: '⚓' },
  { id: 'map', icon: '🗺' },
  { id: 'tech', icon: '⚔️' },
  { id: 'kills', icon: '⚔️' },
  { id: 'friends', icon: '🤝' },
  { id: 'out', icon: '🏝️', adminOnly: true },
  { id: 'admin', icon: '☠️', adminOnly: true },
]

export function NavBar({ current, isAdmin, onNavigate, onSignOut }: NavBarProps) {
  const { t } = useTranslation()
  const visibleTabs = isAdmin ? tabs : tabs.filter((tab) => !tab.adminOnly)

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-game-card border-t border-game-accent z-50">
      <div className="flex items-center">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
              current === tab.id
                ? 'text-game-gold border-t-2 border-game-gold -mt-px'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="text-lg mb-0.5">{tab.icon}</span>
            <span>{t(`nav.${tab.id}`)}</span>
          </button>
        ))}
        <button
          onClick={onSignOut}
          className="flex-1 flex flex-col items-center py-3 text-xs font-medium text-gray-400 hover:text-game-highlight transition-colors"
        >
          <span className="text-lg mb-0.5">🏴‍☠️</span>
          <span>{t('nav.signOut')}</span>
        </button>
      </div>
    </nav>
  )
}
```

Note the label moved out of the `tabs` array (module-level constants can't call the `useTranslation()` hook) and into a `t(\`nav.${tab.id}\`)` lookup at render time, and the old `.filter((t) => ...)` loop variable — which shadowed the translation function name — is renamed to `tab`.

- [ ] **Step 6: Wire up `LoginPage.tsx`**

In `src/components/LoginPage.tsx`, add the import:
```ts
import { useTranslation } from 'react-i18next'
```

Add the hook as the first line of the component body:
```tsx
export function LoginPage({ onSignIn, onSignInWithOAuth }: LoginPageProps) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
```

Replace each of the following (exact matches from the current file):

| Line | Current | Replacement |
|---|---|---|
| 37 | `<p className="text-gray-400 mt-2">Pirates of the Seven Seas</p>` | `<p className="text-gray-400 mt-2">{t('login.tagline')}</p>` |
| 54 | `{oauthLoading === 'google' ? 'Setting sail...' : 'Board with Google'}` | `{oauthLoading === 'google' ? t('login.settingSail') : t('login.googleButton')}` |
| 66 | `{oauthLoading === 'discord' ? 'Setting sail...' : 'Board with Discord'}` | `{oauthLoading === 'discord' ? t('login.settingSail') : t('login.discordButton')}` |
| 74 | `<span className="text-xs text-gray-500">or</span>` | `<span className="text-xs text-gray-500">{t('login.orDivider')}</span>` |
| 80-82 | `<label className="block text-sm font-medium text-gray-300 mb-1">\n                    Pirate's Address\n                  </label>` | `<label className="block text-sm font-medium text-gray-300 mb-1">\n                    {t('login.emailLabel')}\n                  </label>` |
| 89 | `placeholder="your@email.com"` | `placeholder={t('login.emailPlaceholder')}` |
| 94-96 | `<label className="block text-sm font-medium text-gray-300 mb-1">\n                    Secret Code\n                  </label>` | `<label className="block text-sm font-medium text-gray-300 mb-1">\n                    {t('login.passwordLabel')}\n                  </label>` |
| 103 | `placeholder="••••••••"` | `placeholder={t('login.passwordPlaceholder')}` |
| 118 | `{loading ? 'Setting sail...' : 'Board the Ship'}` | `{loading ? t('login.settingSail') : t('login.submitButton')}` |

The brand title `☠️ OPNz ☠️` (line 36) is left as-is — it's the app's name, not translated.

- [ ] **Step 7: Wire up `App.tsx`**

Add the import:
```ts
import { useTranslation } from 'react-i18next'
```

Add the hook right after the existing `useState` call (must be unconditional, before the early returns):
```tsx
export function App() {
  const { user, isAdmin, loading, signIn, signInWithOAuth, signOut } = useAuth()
  const [page, setPage] = useState<Page>('schedule')
  const { t } = useTranslation()
```

Replace:
```tsx
        <p className="text-game-gold animate-pulse">Charting the seas...</p>
```
with:
```tsx
        <p className="text-game-gold animate-pulse">{t('profileBar.loadingText')}</p>
```

Replace:
```tsx
            <span className="text-xs bg-game-leadership text-game-dark font-bold px-2 py-0.5 rounded">
              CAPTAIN
            </span>
```
with:
```tsx
            <span className="text-xs bg-game-leadership text-game-dark font-bold px-2 py-0.5 rounded">
              {t('profileBar.captainBadge')}
            </span>
```

The "Setup Required" screen (`SUPABASE_CONFIGURED` branch) is intentionally left untranslated per the Global Constraints.

- [ ] **Step 8: Verify**

Run: `npm run build`
Expected: succeeds with no type errors.

Manual check: run `npm run dev`. On the login screen and bottom nav bar, switch the language via the 🌐 switcher (it's visible once signed in — for the login screen itself, temporarily switch by editing `localStorage.opnz-language` in devtools and reloading, or verify after signing in and switching, then signing out) and confirm every string covered above changes with the language, with no leftover hardcoded English.

- [ ] **Step 9: Commit**

```bash
git add src/locales/en.json src/locales/ko.json src/locales/pt-BR.json src/locales/es.json src/components/NavBar.tsx src/components/LoginPage.tsx src/App.tsx
git commit -m "feat(i18n): translate nav bar, login page, and top profile bar"
```

---

### Task 5: `schedule` namespace (`TrainSchedule.tsx`)

**Files:**
- Modify: `src/locales/en.json`, `src/locales/ko.json`, `src/locales/pt-BR.json`, `src/locales/es.json`
- Modify: `src/pages/TrainSchedule.tsx`
- Test: manual verification

**Interfaces:**
- Consumes: `common.*` (Task 4).
- Produces: `schedule.*` namespace, used only by this file.

- [ ] **Step 1: Add the `schedule` namespace to `src/locales/en.json`**

Add this key alongside the existing `common`/`nav`/`login`/`profileBar` keys:
```json
"schedule": {
  "dow": { "Sun": "Sun", "Mon": "Mon", "Tue": "Tue", "Wed": "Wed", "Thu": "Thu", "Fri": "Fri", "Sat": "Sat" },
  "metricVsScorer": "VS scorer",
  "metricDonator": "donator",
  "sourceWeeklyTop": "Weekly top {{metric}}",
  "sourceTopSat": "Top {{metric}} (Sat)",
  "sourceDsTopScorer": "DS top scorer",
  "sourceCanyonTopScorer": "Canyon top scorer",
  "sourceAllianceMvp": "Alliance MVP",
  "sourceTopMon": "Top {{metric}} (Mon)",
  "sourceR4Rotation": "R4 rotation",
  "sourceTopTue": "Top {{metric}} (Tue)",
  "sourceTopWed": "Top {{metric}} (Wed)",
  "sourceTopThu": "Top {{metric}} (Thu)",
  "sourceTopFri": "Top {{metric}} (Fri)",
  "weekModeUpdateFailed": "Failed to update week mode",
  "title": "Voyage Schedule",
  "pushWeek": "Push Week",
  "saveWeek": "Save Week",
  "r4RotationTitleAttr": "View R4 rotation list",
  "r4RotationLabel": "R4 Rotation",
  "subtitle": "Daily voyage departs ~1:00 EST · Sun–Sun view",
  "today": "TODAY",
  "setEntry": "+ Set",
  "captainColumnLabel": "Captain",
  "firstMateColumnLabel": "First Mate",
  "captainsLogLabel": "Captain's Log",
  "notesPlaceholder": "e.g. R4/VS Previous Day"
}
```

- [ ] **Step 2: Add the `schedule` namespace to `src/locales/ko.json`**

```json
"schedule": {
  "dow": { "Sun": "일", "Mon": "월", "Tue": "화", "Wed": "수", "Thu": "목", "Fri": "금", "Sat": "토" },
  "metricVsScorer": "VS 득점자",
  "metricDonator": "기부자",
  "sourceWeeklyTop": "주간 최고 {{metric}}",
  "sourceTopSat": "최고 {{metric}} (토)",
  "sourceDsTopScorer": "DS 최고 득점자",
  "sourceCanyonTopScorer": "캐년 최고 득점자",
  "sourceAllianceMvp": "연맹 MVP",
  "sourceTopMon": "최고 {{metric}} (월)",
  "sourceR4Rotation": "R4 순환",
  "sourceTopTue": "최고 {{metric}} (화)",
  "sourceTopWed": "최고 {{metric}} (수)",
  "sourceTopThu": "최고 {{metric}} (목)",
  "sourceTopFri": "최고 {{metric}} (금)",
  "weekModeUpdateFailed": "주간 모드 업데이트 실패",
  "title": "항해 일정",
  "pushWeek": "주간 밀기",
  "saveWeek": "주간 저장",
  "r4RotationTitleAttr": "R4 순환 목록 보기",
  "r4RotationLabel": "R4 순환",
  "subtitle": "매일 오후 1시(EST)경 출항 · 일–일 보기",
  "today": "오늘",
  "setEntry": "+ 설정",
  "captainColumnLabel": "선장",
  "firstMateColumnLabel": "1등 항해사",
  "captainsLogLabel": "선장 일지",
  "notesPlaceholder": "예: R4/VS 전날"
}
```

- [ ] **Step 3: Add the `schedule` namespace to `src/locales/pt-BR.json`**

```json
"schedule": {
  "dow": { "Sun": "Dom", "Mon": "Seg", "Tue": "Ter", "Wed": "Qua", "Thu": "Qui", "Fri": "Sex", "Sat": "Sáb" },
  "metricVsScorer": "pontuador de VS",
  "metricDonator": "doador",
  "sourceWeeklyTop": "Melhor {{metric}} da semana",
  "sourceTopSat": "Melhor {{metric}} (Sáb)",
  "sourceDsTopScorer": "Melhor pontuador DS",
  "sourceCanyonTopScorer": "Melhor pontuador do Cânion",
  "sourceAllianceMvp": "MVP da Aliança",
  "sourceTopMon": "Melhor {{metric}} (Seg)",
  "sourceR4Rotation": "Rodízio R4",
  "sourceTopTue": "Melhor {{metric}} (Ter)",
  "sourceTopWed": "Melhor {{metric}} (Qua)",
  "sourceTopThu": "Melhor {{metric}} (Qui)",
  "sourceTopFri": "Melhor {{metric}} (Sex)",
  "weekModeUpdateFailed": "Falha ao atualizar o modo semanal",
  "title": "Cronograma de Viagem",
  "pushWeek": "Avançar Semana",
  "saveWeek": "Salvar Semana",
  "r4RotationTitleAttr": "Ver lista de rodízio R4",
  "r4RotationLabel": "Rodízio R4",
  "subtitle": "Viagem diária parte por volta de 1h (EST) · Visualização Dom–Dom",
  "today": "HOJE",
  "setEntry": "+ Definir",
  "captainColumnLabel": "Capitão",
  "firstMateColumnLabel": "Imediato",
  "captainsLogLabel": "Diário do Capitão",
  "notesPlaceholder": "ex.: R4/VS dia anterior"
}
```

- [ ] **Step 4: Add the `schedule` namespace to `src/locales/es.json`**

```json
"schedule": {
  "dow": { "Sun": "Dom", "Mon": "Lun", "Tue": "Mar", "Wed": "Mié", "Thu": "Jue", "Fri": "Vie", "Sat": "Sáb" },
  "metricVsScorer": "anotador de VS",
  "metricDonator": "donador",
  "sourceWeeklyTop": "Mejor {{metric}} de la semana",
  "sourceTopSat": "Mejor {{metric}} (Sáb)",
  "sourceDsTopScorer": "Mejor anotador DS",
  "sourceCanyonTopScorer": "Mejor anotador del Cañón",
  "sourceAllianceMvp": "MVP de la Alianza",
  "sourceTopMon": "Mejor {{metric}} (Lun)",
  "sourceR4Rotation": "Rotación R4",
  "sourceTopTue": "Mejor {{metric}} (Mar)",
  "sourceTopWed": "Mejor {{metric}} (Mié)",
  "sourceTopThu": "Mejor {{metric}} (Jue)",
  "sourceTopFri": "Mejor {{metric}} (Vie)",
  "weekModeUpdateFailed": "Error al actualizar el modo semanal",
  "title": "Horario de Viaje",
  "pushWeek": "Avanzar Semana",
  "saveWeek": "Guardar Semana",
  "r4RotationTitleAttr": "Ver lista de rotación R4",
  "r4RotationLabel": "Rotación R4",
  "subtitle": "El viaje diario zarpa ~1:00 EST · Vista Dom–Dom",
  "today": "HOY",
  "setEntry": "+ Definir",
  "captainColumnLabel": "Capitán",
  "firstMateColumnLabel": "Primer Oficial",
  "captainsLogLabel": "Diario del Capitán",
  "notesPlaceholder": "ej. R4/VS día anterior"
}
```

- [ ] **Step 5: Wire up `TrainSchedule.tsx`**

Add imports at the top of `src/pages/TrainSchedule.tsx`:
```ts
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
```

`DOW` (line 8, `['Sun', 'Mon', ...]`) and `R4_ROTATION` (lines 10-22, the member nickname roster) are **not translated** — `DOW` is used as an internal record key and `R4_ROTATION` is member data. Only the *displayed* day abbreviation changes, via a new `schedule.dow.*` lookup.

Replace `buildDowSources` (lines 24-35):
```ts
function buildDowSources(mode: WeekMode): Record<string, { captain: string; firstMate: string }> {
  const metric = mode === 'push' ? 'VS scorer' : 'donator'
  return {
    Sun: { captain: `Weekly top ${metric}`, firstMate: `Top ${metric} (Sat)` },
    Mon: { captain: 'DS top scorer', firstMate: 'Canyon top scorer' },
    Tue: { captain: 'Alliance MVP', firstMate: `Top ${metric} (Mon)` },
    Wed: { captain: 'R4 rotation', firstMate: `Top ${metric} (Tue)` },
    Thu: { captain: 'R4 rotation', firstMate: `Top ${metric} (Wed)` },
    Fri: { captain: 'R4 rotation', firstMate: `Top ${metric} (Thu)` },
    Sat: { captain: 'R4 rotation', firstMate: `Top ${metric} (Fri)` },
  }
}
```
with:
```ts
function buildDowSources(mode: WeekMode, t: TFunction): Record<string, { captain: string; firstMate: string }> {
  const metric = mode === 'push' ? t('schedule.metricVsScorer') : t('schedule.metricDonator')
  return {
    Sun: { captain: t('schedule.sourceWeeklyTop', { metric }), firstMate: t('schedule.sourceTopSat', { metric }) },
    Mon: { captain: t('schedule.sourceDsTopScorer'), firstMate: t('schedule.sourceCanyonTopScorer') },
    Tue: { captain: t('schedule.sourceAllianceMvp'), firstMate: t('schedule.sourceTopMon', { metric }) },
    Wed: { captain: t('schedule.sourceR4Rotation'), firstMate: t('schedule.sourceTopTue', { metric }) },
    Thu: { captain: t('schedule.sourceR4Rotation'), firstMate: t('schedule.sourceTopWed', { metric }) },
    Fri: { captain: t('schedule.sourceR4Rotation'), firstMate: t('schedule.sourceTopThu', { metric }) },
    Sat: { captain: t('schedule.sourceR4Rotation'), firstMate: t('schedule.sourceTopFri', { metric }) },
  }
}
```

Add the hook as the first line of the component body, and pass `t` into `buildDowSources`:
```tsx
export function TrainSchedule() {
  const { t } = useTranslation()
  const { isAdmin } = useAuth()
```
```ts
  const dowSources = buildDowSources(weekMode, t)
```
(replaces the existing `const dowSources = buildDowSources(weekMode)` line)

Replace each of the following (exact matches from the current file):

| Line(s) | Current | Replacement |
|---|---|---|
| 96 | `setSaveError(err instanceof Error ? err.message : 'Save failed')` | `setSaveError(err instanceof Error ? err.message : t('common.saveFailed'))` |
| 110 | `setSaveError(err instanceof Error ? err.message : 'Delete failed')` | `setSaveError(err instanceof Error ? err.message : t('common.deleteFailed'))` |
| 128 | `setModeError(err instanceof Error ? err.message : 'Failed to update week mode')` | `setModeError(err instanceof Error ? err.message : t('schedule.weekModeUpdateFailed'))` |
| 138 | `<p className="text-gray-400 animate-pulse">Charting the seas...</p>` | `<p className="text-gray-400 animate-pulse">{t('profileBar.loadingText')}</p>` |
| 154 | `<h1 className="text-xl font-bold text-game-gold">Voyage Schedule</h1>` | `<h1 className="text-xl font-bold text-game-gold">{t('schedule.title')}</h1>` |
| 159 | `const label = mode === 'push' ? 'Push Week' : 'Save Week'` | `const label = mode === 'push' ? t('schedule.pushWeek') : t('schedule.saveWeek')` |
| 182 | `title="View R4 rotation list"` | `title={t('schedule.r4RotationTitleAttr')}` |
| 184 | `<span>R4 Rotation</span>` | `<span>{t('schedule.r4RotationLabel')}</span>` |
| 190 | `<p className="text-gray-400 text-xs mb-4">Daily voyage departs ~1:00 EST · Sun–Sun view</p>` | `<p className="text-gray-400 text-xs mb-4">{t('schedule.subtitle')}</p>` |
| 206 | `<span className="text-game-gold font-bold text-sm w-8">{getDow(date)}</span>` | `<span className="text-game-gold font-bold text-sm w-8">{t(\`schedule.dow.${getDow(date)}\`)}</span>` |
| 209-211 | `<span className="text-xs bg-game-gold text-game-dark font-bold px-1.5 py-0.5 rounded">\n                      TODAY\n                    </span>` | `<span className="text-xs bg-game-gold text-game-dark font-bold px-1.5 py-0.5 rounded">\n                      {t('schedule.today')}\n                    </span>` |
| 219 | `{entry ? 'Edit' : '+ Set'}` | `{entry ? t('common.edit') : t('schedule.setEntry')}` |
| 227 | `<span className="text-gray-500 text-xs uppercase tracking-wide">Captain</span>` | `<span className="text-gray-500 text-xs uppercase tracking-wide">{t('schedule.captainColumnLabel')}</span>` |
| 232 | `<span className="text-gray-500 text-xs uppercase tracking-wide">First Mate</span>` | `<span className="text-gray-500 text-xs uppercase tracking-wide">{t('schedule.firstMateColumnLabel')}</span>` |
| 238 | `<span className="text-gray-500 text-xs uppercase tracking-wide">Captain's Log</span>` | `<span className="text-gray-500 text-xs uppercase tracking-wide">{t('schedule.captainsLogLabel')}</span>` |
| 253 | `<h2 className="text-game-gold font-bold">R4 Rotation</h2>` | `<h2 className="text-game-gold font-bold">{t('schedule.r4RotationLabel')}</h2>` |
| 276 | `{getDow(editState.date)} {formatDate(editState.date)}` | `{t(\`schedule.dow.${getDow(editState.date)}\`)} {formatDate(editState.date)}` |
| 285 | `<label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Captain</label>` | `<label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">{t('schedule.captainColumnLabel')}</label>` |
| 291 | `<option value="">— Select member —</option>` | `<option value="">{t('common.selectMemberPlaceholder')}</option>` |
| 299 | `<label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">First Mate</label>` | `<label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">{t('schedule.firstMateColumnLabel')}</label>` |
| 305 | `<option value="">— Select member —</option>` | `<option value="">{t('common.selectMemberPlaceholder')}</option>` |
| 313 | `<label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Captain's Log</label>` | `<label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">{t('schedule.captainsLogLabel')}</label>` |
| 318 | `placeholder="e.g. R4/VS Previous Day"` | `placeholder={t('schedule.notesPlaceholder')}` |
| 333 | `Delete` | `{t('common.delete')}` |
| 341 | `Cancel` | `{t('common.cancel')}` |
| 348 | `{saving ? 'Saving...' : 'Save'}` | `{saving ? t('common.saving') : t('common.save')}` |

- [ ] **Step 6: Verify**

Run: `npm run build`
Expected: succeeds with no type errors.

Manual check: run `npm run dev`, open Voyage Schedule, switch through all four languages, and confirm the day headers, captain/first-mate source hints, push/save toggle, R4 rotation modal, and edit modal all translate with no leftover hardcoded English.

- [ ] **Step 7: Commit**

```bash
git add src/locales/en.json src/locales/ko.json src/locales/pt-BR.json src/locales/es.json src/pages/TrainSchedule.tsx
git commit -m "feat(i18n): translate voyage schedule page"
```

---

### Task 6: `map` namespace (`MarshallMap.tsx` + `MarshallVisualizer.tsx`)

**Files:**
- Modify: `src/locales/en.json`, `src/locales/ko.json`, `src/locales/pt-BR.json`, `src/locales/es.json`
- Modify: `src/pages/MarshallMap.tsx`
- Modify: `src/components/MarshallVisualizer.tsx`
- Test: manual verification

**Interfaces:**
- Consumes: `common.*` (Task 4).
- Produces: `map.*` namespace, used only by these two files.

- [ ] **Step 1: Add the `map` namespace to `src/locales/en.json`**

```json
"map": {
  "loadingMap": "Loading map...",
  "retry": "Retry",
  "title": "Marshall Map",
  "refresh": "Refresh",
  "emptyState": "No members yet. Ask your admin to add members and import damage data.",
  "ring3Heading": "Ring 3+ ({{count}} members)",
  "colRankLabel": "Rank",
  "colWad": "WAD",
  "ring1Label": "Ring 1",
  "ring2Label": "Ring 2",
  "ring3Label": "Ring 3+",
  "adminBadge": "ADMIN",
  "dataManagement": "Data Management",
  "tabImport": "Import",
  "tabLogs": "Logs",
  "damageLogsHeading": "Damage Logs ({{count}} entries)",
  "clearFilter": "Clear filter",
  "moreLogsCount": "+{{count}} more",
  "noDamageLogs": "No damage logs. Use the Import tab to add data.",
  "marshallCellLabel": "MARSHALL",
  "legendR45": "R4/R5",
  "legendInner": "Inner (ranks 1–13)",
  "legendOuter": "Outer (ranks 14+)"
}
```

- [ ] **Step 2: Add the `map` namespace to `src/locales/ko.json`**

```json
"map": {
  "loadingMap": "지도 불러오는 중...",
  "retry": "다시 시도",
  "title": "원수 지도",
  "refresh": "새로고침",
  "emptyState": "아직 멤버가 없습니다. 관리자에게 멤버 추가와 피해량 데이터 가져오기를 요청하세요.",
  "ring3Heading": "링 3+ ({{count}}명)",
  "colRankLabel": "순위",
  "colWad": "WAD",
  "ring1Label": "링 1",
  "ring2Label": "링 2",
  "ring3Label": "링 3+",
  "adminBadge": "관리자",
  "dataManagement": "데이터 관리",
  "tabImport": "가져오기",
  "tabLogs": "로그",
  "damageLogsHeading": "피해 로그 ({{count}}건)",
  "clearFilter": "필터 지우기",
  "moreLogsCount": "+{{count}}개 더보기",
  "noDamageLogs": "피해 로그가 없습니다. 가져오기 탭에서 데이터를 추가하세요.",
  "marshallCellLabel": "원수",
  "legendR45": "R4/R5",
  "legendInner": "내부 (순위 1–13)",
  "legendOuter": "외부 (순위 14+)"
}
```

- [ ] **Step 3: Add the `map` namespace to `src/locales/pt-BR.json`**

```json
"map": {
  "loadingMap": "Carregando mapa...",
  "retry": "Tentar novamente",
  "title": "Mapa do Marechal",
  "refresh": "Atualizar",
  "emptyState": "Ainda não há membros. Peça ao administrador para adicionar membros e importar dados de dano.",
  "ring3Heading": "Anel 3+ ({{count}} membros)",
  "colRankLabel": "Posição",
  "colWad": "WAD",
  "ring1Label": "Anel 1",
  "ring2Label": "Anel 2",
  "ring3Label": "Anel 3+",
  "adminBadge": "ADMIN",
  "dataManagement": "Gerenciamento de Dados",
  "tabImport": "Importar",
  "tabLogs": "Registros",
  "damageLogsHeading": "Registros de Dano ({{count}} entradas)",
  "clearFilter": "Limpar filtro",
  "moreLogsCount": "+{{count}} mais",
  "noDamageLogs": "Nenhum registro de dano. Use a aba Importar para adicionar dados.",
  "marshallCellLabel": "MARECHAL",
  "legendR45": "R4/R5",
  "legendInner": "Interno (posições 1–13)",
  "legendOuter": "Externo (posições 14+)"
}
```

- [ ] **Step 4: Add the `map` namespace to `src/locales/es.json`**

```json
"map": {
  "loadingMap": "Cargando mapa...",
  "retry": "Reintentar",
  "title": "Mapa del Mariscal",
  "refresh": "Actualizar",
  "emptyState": "Aún no hay miembros. Pide a tu administrador que agregue miembros e importe datos de daño.",
  "ring3Heading": "Anillo 3+ ({{count}} miembros)",
  "colRankLabel": "Rango",
  "colWad": "WAD",
  "ring1Label": "Anillo 1",
  "ring2Label": "Anillo 2",
  "ring3Label": "Anillo 3+",
  "adminBadge": "ADMIN",
  "dataManagement": "Gestión de Datos",
  "tabImport": "Importar",
  "tabLogs": "Registros",
  "damageLogsHeading": "Registros de Daño ({{count}} entradas)",
  "clearFilter": "Limpiar filtro",
  "moreLogsCount": "+{{count}} más",
  "noDamageLogs": "No hay registros de daño. Usa la pestaña Importar para agregar datos.",
  "marshallCellLabel": "MARISCAL",
  "legendR45": "R4/R5",
  "legendInner": "Interior (rangos 1–13)",
  "legendOuter": "Exterior (rangos 14+)"
}
```

- [ ] **Step 5: Wire up `MarshallMap.tsx`**

Add the import and hook:
```ts
import { useTranslation } from 'react-i18next'
```
```tsx
const { t } = useTranslation()
```

Read the file first (`src/pages/MarshallMap.tsx`, 253 lines) to locate current line numbers precisely (Task 2 already added a `formatDate` import/call in this file, which may have shifted a couple of lines), then apply this table. Each row gives the literal text to find and its replacement — column/table headers reuse `common.name` where noted:

| Original text | Replacement |
|---|---|
| `Loading map...` | `{t('map.loadingMap')}` |
| `Retry` | `{t('map.retry')}` |
| `Marshall Map` | `{t('map.title')}` |
| `Refresh` | `{t('map.refresh')}` |
| `No members yet. Ask your admin to add members and import damage data.` | `{t('map.emptyState')}` |
| `Ring 3+ ({ring3.length} members)` (heading built from `ring3.length`) | `{t('map.ring3Heading', { count: ring3.length })}` |
| `Name` (column header) | `{t('common.name')}` |
| `Rank` (column header) | `{t('map.colRankLabel')}` |
| `WAD` (column header) | `{t('map.colWad')}` |
| `Ring 1` | `{t('map.ring1Label')}` |
| `Ring 2` | `{t('map.ring2Label')}` |
| `Ring 3+` | `{t('map.ring3Label')}` |
| `ADMIN` | `{t('map.adminBadge')}` |
| `Data Management` | `{t('map.dataManagement')}` |
| `Import` (tab label) | `{t('common.import')}` |
| `Logs` (tab label) | `{t('map.tabLogs')}` |
| `Damage Logs ({damageLogs.length} entries)` | `{t('map.damageLogsHeading', { count: damageLogs.length })}` |
| `Clear filter` | `{t('map.clearFilter')}` |
| `...` (clearing-in-progress ellipsis) | `{t('common.deletingIndicator')}` |
| `Clear` | `{t('common.clear')}` |
| `+{logs.length - 5} more` | `{t('map.moreLogsCount', { count: logs.length - 5 })}` |
| `No damage logs. Use the Import tab to add data.` | `{t('map.noDamageLogs')}` |

Wrap the `#{i + 1} {formatDate(log.event_date)}` line (touched in Task 2) unchanged — no translation needed there beyond what Task 2 already did.

- [ ] **Step 6: Wire up `MarshallVisualizer.tsx`**

Add the import and hook (same pattern):
```ts
import { useTranslation } from 'react-i18next'
```
```tsx
const { t } = useTranslation()
```

Replace:

| Original text | Replacement |
|---|---|
| `MARSHALL` (default member name shown in the marshall cell when no member is assigned) | `{t('map.marshallCellLabel')}` |
| `MARSHALL` (marshall cell label, second occurrence) | `{t('map.marshallCellLabel')}` |
| `R4/R5` | `{t('map.legendR45')}` |
| `Inner (ranks 1–13)` | `{t('map.legendInner')}` |
| `Outer (ranks 14+)` | `{t('map.legendOuter')}` |

- [ ] **Step 7: Verify**

Run: `npm run build`
Expected: succeeds with no type errors.

Manual check: open Marshall Map (as both admin and non-admin, if possible) in all four languages, confirm the grid legend, ring headings, admin data-management tabs, and damage log list all translate.

- [ ] **Step 8: Commit**

```bash
git add src/locales/en.json src/locales/ko.json src/locales/pt-BR.json src/locales/es.json src/pages/MarshallMap.tsx src/components/MarshallVisualizer.tsx
git commit -m "feat(i18n): translate marshall map page"
```

---

### Task 7: `tech` namespace (`AllianceTech.tsx` + `SortableTechRow.tsx`)

**Files:**
- Modify: `src/locales/en.json`, `src/locales/ko.json`, `src/locales/pt-BR.json`, `src/locales/es.json`
- Modify: `src/pages/AllianceTech.tsx`
- Modify: `src/components/SortableTechRow.tsx`
- Test: manual verification

**Interfaces:**
- Consumes: `common.*`, `nav.tech` (Task 4).
- Produces: `tech.*` namespace, used only by these two files.

- [ ] **Step 1: Add the `tech` namespace to `src/locales/en.json`**

```json
"tech": {
  "saveFailedDefault": "Save failed",
  "completeFailedDefault": "Failed to complete",
  "reorderFailedDefault": "Reorder failed",
  "subtitle": "Planned ship improvements in order",
  "emptyQueue": "No techs queued",
  "currentlyUpgrading": "Currently Upgrading",
  "markComplete": "Mark complete",
  "upNext": "Up Next",
  "addToQueue": "Add to Queue",
  "chooseCategory": "Choose category:",
  "development": "Development",
  "technologiesCount": "{{count}} technologies",
  "war": "War",
  "back": "← Back",
  "searchPlaceholder": "Search...",
  "noResults": "No results",
  "dragToReorder": "Drag to reorder"
}
```

- [ ] **Step 2: Add the `tech` namespace to `src/locales/ko.json`**

```json
"tech": {
  "saveFailedDefault": "저장 실패",
  "completeFailedDefault": "완료 처리 실패",
  "reorderFailedDefault": "순서 변경 실패",
  "subtitle": "계획된 함선 개선 순서",
  "emptyQueue": "대기 중인 기술 없음",
  "currentlyUpgrading": "업그레이드 중",
  "markComplete": "완료 표시",
  "upNext": "다음 순서",
  "addToQueue": "대기열에 추가",
  "chooseCategory": "카테고리 선택:",
  "development": "개발",
  "technologiesCount": "기술 {{count}}개",
  "war": "전쟁",
  "back": "← 뒤로",
  "searchPlaceholder": "검색...",
  "noResults": "결과 없음",
  "dragToReorder": "드래그하여 순서 변경"
}
```

- [ ] **Step 3: Add the `tech` namespace to `src/locales/pt-BR.json`**

```json
"tech": {
  "saveFailedDefault": "Falha ao salvar",
  "completeFailedDefault": "Falha ao concluir",
  "reorderFailedDefault": "Falha ao reordenar",
  "subtitle": "Melhorias planejadas do navio, em ordem",
  "emptyQueue": "Nenhuma tecnologia na fila",
  "currentlyUpgrading": "Em Andamento",
  "markComplete": "Marcar como concluído",
  "upNext": "A Seguir",
  "addToQueue": "Adicionar à Fila",
  "chooseCategory": "Escolha a categoria:",
  "development": "Desenvolvimento",
  "technologiesCount": "{{count}} tecnologias",
  "war": "Guerra",
  "back": "← Voltar",
  "searchPlaceholder": "Pesquisar...",
  "noResults": "Nenhum resultado",
  "dragToReorder": "Arraste para reordenar"
}
```

- [ ] **Step 4: Add the `tech` namespace to `src/locales/es.json`**

```json
"tech": {
  "saveFailedDefault": "Error al guardar",
  "completeFailedDefault": "Error al completar",
  "reorderFailedDefault": "Error al reordenar",
  "subtitle": "Mejoras planificadas del barco, en orden",
  "emptyQueue": "No hay tecnologías en cola",
  "currentlyUpgrading": "En Progreso",
  "markComplete": "Marcar como completado",
  "upNext": "Siguiente",
  "addToQueue": "Agregar a la Cola",
  "chooseCategory": "Elige categoría:",
  "development": "Desarrollo",
  "technologiesCount": "{{count}} tecnologías",
  "war": "Guerra",
  "back": "← Atrás",
  "searchPlaceholder": "Buscar...",
  "noResults": "Sin resultados",
  "dragToReorder": "Arrastra para reordenar"
}
```

- [ ] **Step 5: Wire up `AllianceTech.tsx`**

Add the import and hook (`const { t } = useTranslation()`), same pattern as prior tasks.

`DEVELOPMENT_TECHS` and `WAR_TECHS` (module-level tech name/level lists near the top of the file) are **not translated** — they're game content data, not UI chrome.

Read the file first (344 lines) to confirm current line positions, then replace:

| Original text | Replacement |
|---|---|
| `Save failed` (catch-block default) | `t('tech.saveFailedDefault')` |
| `Failed to complete` (catch-block default) | `t('tech.completeFailedDefault')` |
| `Reorder failed` (both catch-block defaults) | `t('tech.reorderFailedDefault')` |
| `Loading...` | `{t('common.loading')}` |
| `Ship Upgrades` (page heading) | `{t('nav.tech')}` |
| `+ Add` | `{t('common.addButton')}` |
| `Planned ship improvements in order` | `{t('tech.subtitle')}` |
| `No techs queued` | `{t('tech.emptyQueue')}` |
| `Currently Upgrading` | `{t('tech.currentlyUpgrading')}` |
| `Mark complete` | `{t('tech.markComplete')}` |
| `Up Next` | `{t('tech.upNext')}` |
| `Add to Queue` | `{t('tech.addToQueue')}` |
| `Choose category:` | `{t('tech.chooseCategory')}` |
| `Development` | `{t('tech.development')}` |
| `{count} technologies` (both occurrences, development and war counts) | `{t('tech.technologiesCount', { count })}` (substitute the actual count variable in scope at each site) |
| `War` | `{t('tech.war')}` |
| `← Back` | `{t('tech.back')}` |
| `Search...` | `placeholder={t('tech.searchPlaceholder')}` |
| `No results` | `{t('tech.noResults')}` |

- [ ] **Step 6: Wire up `SortableTechRow.tsx`**

Add the import and hook, then replace:

| Original text | Replacement |
|---|---|
| `Drag to reorder` (aria-label) | `aria-label={t('tech.dragToReorder')}` |

- [ ] **Step 7: Verify**

Run: `npm run build`
Expected: succeeds with no type errors.

Manual check: open Ship Upgrades (Alliance Tech) in all four languages — queue view, add-to-queue category picker, search, and drag handles — confirm translation with no leftover English, and confirm the actual tech names (from `DEVELOPMENT_TECHS`/`WAR_TECHS`) are unaffected.

- [ ] **Step 8: Commit**

```bash
git add src/locales/en.json src/locales/ko.json src/locales/pt-BR.json src/locales/es.json src/pages/AllianceTech.tsx src/components/SortableTechRow.tsx
git commit -m "feat(i18n): translate alliance tech queue page"
```

---

### Task 8: `kills` namespace (`KillList.tsx`)

**Files:**
- Modify: `src/locales/en.json`, `src/locales/ko.json`, `src/locales/pt-BR.json`, `src/locales/es.json`
- Modify: `src/pages/KillList.tsx`
- Test: manual verification

**Interfaces:**
- Consumes: `common.*` (Task 4).
- Produces: `kills.*` namespace, used only by this file.

- [ ] **Step 1: Add the `kills` namespace to `src/locales/en.json`**

```json
"kills": {
  "title": "Kill List",
  "emptyNoEntries": "No entries on the kill list.",
  "entryTitleSuffix": "Kill List Entry"
}
```

- [ ] **Step 2: Add the `kills` namespace to `src/locales/ko.json`**

```json
"kills": {
  "title": "킬 리스트",
  "emptyNoEntries": "킬 리스트에 항목이 없습니다.",
  "entryTitleSuffix": "킬 리스트 항목"
}
```

- [ ] **Step 3: Add the `kills` namespace to `src/locales/pt-BR.json`**

```json
"kills": {
  "title": "Lista de Abates",
  "emptyNoEntries": "Nenhuma entrada na lista de abates.",
  "entryTitleSuffix": "Entrada da Lista de Abates"
}
```

- [ ] **Step 4: Add the `kills` namespace to `src/locales/es.json`**

```json
"kills": {
  "title": "Lista de Bajas",
  "emptyNoEntries": "No hay entradas en la lista de bajas.",
  "entryTitleSuffix": "Entrada de la Lista de Bajas"
}
```

- [ ] **Step 5: Wire up `KillList.tsx`**

Add the import and hook. Read the file first (264 lines), then replace:

| Original text | Replacement |
|---|---|
| `Name and server are required.` | `t('common.nameServerRequired')` |
| `⚔️ Kill List ({count}{ / total})` — the literal `Kill List` inside this composite heading | `{t('kills.title')}` (keep the `⚔️` emoji and the count/total interpolation code as-is around it) |
| `+ Add` | `{t('common.addButton')}` |
| `Search name or server...` | `placeholder={t('common.searchNameOrServerPlaceholder')}` |
| `Clear` | `{t('common.clear')}` |
| `Loading...` | `{t('common.loading')}` |
| `Name` (column header) | `{t('common.name')}` |
| `Server` (column header) | `{t('common.server')}` |
| `Reason` (column header) | `{t('common.reason')}` |
| `No entries on the kill list.` | `{t('kills.emptyNoEntries')}` |
| `No entries match the filter.` | `{t('common.emptyNoMatch')}` |
| `Edit` (row button) | `{t('common.edit')}` |
| `Del` (row button) | `{t('common.deleteShort')}` |
| `...` (delete-in-progress) | `{t('common.deletingIndicator')}` |
| `{Edit/Add} Kill List Entry` modal title | `{editing ? t('common.edit') : t('common.add')} {t('kills.entryTitleSuffix')}` (adapt to the actual conditional variable name in scope) |
| `Name *` | `{t('common.nameRequiredLabel')}` |
| `Player name` | `placeholder={t('common.playerNamePlaceholder')}` |
| `Server *` | `{t('common.serverRequiredLabel')}` |
| `Server name` | `placeholder={t('common.serverNamePlaceholder')}` |
| `Reason` (form label) | `{t('common.reason')}` |
| `Optional reason` | `placeholder={t('common.optionalReasonPlaceholder')}` |
| `Cancel` | `{t('common.cancel')}` |
| `Saving...` | `{t('common.saving')}` |
| `Save` | `{t('common.save')}` |

- [ ] **Step 6: Verify**

Run: `npm run build`
Expected: succeeds with no type errors.

Manual check: open Kill List in all four languages — list view, search, add/edit modal, empty states — confirm translation, and confirm actual entered kill-list names/servers/reasons (user data) are never altered.

- [ ] **Step 7: Commit**

```bash
git add src/locales/en.json src/locales/ko.json src/locales/pt-BR.json src/locales/es.json src/pages/KillList.tsx
git commit -m "feat(i18n): translate kill list page"
```

---

### Task 9: `friends` namespace (`FriendsList.tsx`)

**Files:**
- Modify: `src/locales/en.json`, `src/locales/ko.json`, `src/locales/pt-BR.json`, `src/locales/es.json`
- Modify: `src/pages/FriendsList.tsx`
- Test: manual verification

**Interfaces:**
- Consumes: `common.*` (Task 4).
- Produces: `friends.*` namespace, used only by this file.

`FriendsList.tsx` is structurally identical to `KillList.tsx` (Task 8) — same layout, same form fields, different domain noun. This task follows the exact same pattern.

- [ ] **Step 1: Add the `friends` namespace to `src/locales/en.json`**

```json
"friends": {
  "title": "Friends List",
  "emptyNoEntries": "No entries on the friends list.",
  "entryTitleSuffix": "Friends List Entry"
}
```

- [ ] **Step 2: Add the `friends` namespace to `src/locales/ko.json`**

```json
"friends": {
  "title": "친구 목록",
  "emptyNoEntries": "친구 목록에 항목이 없습니다.",
  "entryTitleSuffix": "친구 목록 항목"
}
```

- [ ] **Step 3: Add the `friends` namespace to `src/locales/pt-BR.json`**

```json
"friends": {
  "title": "Lista de Amigos",
  "emptyNoEntries": "Nenhuma entrada na lista de amigos.",
  "entryTitleSuffix": "Entrada da Lista de Amigos"
}
```

- [ ] **Step 4: Add the `friends` namespace to `src/locales/es.json`**

```json
"friends": {
  "title": "Lista de Amigos",
  "emptyNoEntries": "No hay entradas en la lista de amigos.",
  "entryTitleSuffix": "Entrada de la Lista de Amigos"
}
```

- [ ] **Step 5: Wire up `FriendsList.tsx`**

Add the import and hook. Read the file first (264 lines), then replace using the same table as Task 8's Step 5, substituting the `friends.*` namespace for `kills.*`:

| Original text | Replacement |
|---|---|
| `Name and server are required.` | `t('common.nameServerRequired')` |
| `🤝 Friends List ({count}{ / total})` — the literal `Friends List` inside this composite heading | `{t('friends.title')}` (keep the `🤝` emoji and count/total interpolation as-is) |
| `+ Add` | `{t('common.addButton')}` |
| `Search name or server...` | `placeholder={t('common.searchNameOrServerPlaceholder')}` |
| `Clear` | `{t('common.clear')}` |
| `Loading...` | `{t('common.loading')}` |
| `Name` (column header) | `{t('common.name')}` |
| `Server` (column header) | `{t('common.server')}` |
| `Reason` (column header) | `{t('common.reason')}` |
| `No entries on the friends list.` | `{t('friends.emptyNoEntries')}` |
| `No entries match the filter.` | `{t('common.emptyNoMatch')}` |
| `Edit` (row button) | `{t('common.edit')}` |
| `Del` (row button) | `{t('common.deleteShort')}` |
| `...` (delete-in-progress) | `{t('common.deletingIndicator')}` |
| `{Edit/Add} Friends List Entry` modal title | `{editing ? t('common.edit') : t('common.add')} {t('friends.entryTitleSuffix')}` (adapt to the actual conditional variable name in scope) |
| `Name *` | `{t('common.nameRequiredLabel')}` |
| `Player name` | `placeholder={t('common.playerNamePlaceholder')}` |
| `Server *` | `{t('common.serverRequiredLabel')}` |
| `Server name` | `placeholder={t('common.serverNamePlaceholder')}` |
| `Reason` (form label) | `{t('common.reason')}` |
| `Optional reason` | `placeholder={t('common.optionalReasonPlaceholder')}` |
| `Cancel` | `{t('common.cancel')}` |
| `Saving...` | `{t('common.saving')}` |
| `Save` | `{t('common.save')}` |

- [ ] **Step 6: Verify**

Run: `npm run build`
Expected: succeeds with no type errors.

Manual check: open Friends List in all four languages, same checks as Task 8.

- [ ] **Step 7: Commit**

```bash
git add src/locales/en.json src/locales/ko.json src/locales/pt-BR.json src/locales/es.json src/pages/FriendsList.tsx
git commit -m "feat(i18n): translate friends list page"
```

---

### Task 10: `out` namespace (`Out.tsx`)

**Files:**
- Modify: `src/locales/en.json`, `src/locales/ko.json`, `src/locales/pt-BR.json`, `src/locales/es.json`
- Modify: `src/pages/Out.tsx`
- Test: manual verification

**Interfaces:**
- Consumes: `common.*` (Task 4).
- Produces: `out.*` namespace, used only by this file.

- [ ] **Step 1: Add the `out` namespace to `src/locales/en.json`**

```json
"out": {
  "validationRequired": "Member, start date, and end date are required.",
  "validationEndBeforeStart": "End date must be on or after start date.",
  "title": "Out",
  "subtitle": "Members currently offline or inaccessible",
  "sectionActive": "Currently Out",
  "emptyActive": "Nobody out right now",
  "sectionUpcoming": "Upcoming",
  "hidePast": "▾ Hide past",
  "showPast": "▸ Show past ({{count}})",
  "modalEditTitle": "Edit Entry",
  "modalAddTitle": "Add Entry",
  "startDateLabel": "Start Date",
  "endDateLabel": "End Date",
  "notesLabel": "Notes",
  "optionalHint": "(optional)",
  "notesPlaceholder": "Reason / details (optional)",
  "badgeActive": "OUT",
  "badgeUpcoming": "SOON",
  "badgePast": "DONE"
}
```

- [ ] **Step 2: Add the `out` namespace to `src/locales/ko.json`**

```json
"out": {
  "validationRequired": "멤버, 시작일, 종료일은 필수입니다.",
  "validationEndBeforeStart": "종료일은 시작일과 같거나 이후여야 합니다.",
  "title": "휴가",
  "subtitle": "현재 오프라인이거나 연락이 안 되는 멤버",
  "sectionActive": "현재 휴가 중",
  "emptyActive": "현재 휴가 중인 멤버 없음",
  "sectionUpcoming": "예정",
  "hidePast": "▾ 지난 항목 숨기기",
  "showPast": "▸ 지난 항목 보기 ({{count}})",
  "modalEditTitle": "항목 수정",
  "modalAddTitle": "항목 추가",
  "startDateLabel": "시작일",
  "endDateLabel": "종료일",
  "notesLabel": "메모",
  "optionalHint": "(선택 사항)",
  "notesPlaceholder": "사유 / 세부 사항 (선택 사항)",
  "badgeActive": "휴가 중",
  "badgeUpcoming": "예정",
  "badgePast": "완료"
}
```

- [ ] **Step 3: Add the `out` namespace to `src/locales/pt-BR.json`**

```json
"out": {
  "validationRequired": "Membro, data de início e data de término são obrigatórios.",
  "validationEndBeforeStart": "A data de término deve ser igual ou posterior à data de início.",
  "title": "Licença",
  "subtitle": "Membros atualmente offline ou inacessíveis",
  "sectionActive": "Em Licença Agora",
  "emptyActive": "Ninguém em licença no momento",
  "sectionUpcoming": "Próximas",
  "hidePast": "▾ Ocultar passadas",
  "showPast": "▸ Mostrar passadas ({{count}})",
  "modalEditTitle": "Editar Entrada",
  "modalAddTitle": "Adicionar Entrada",
  "startDateLabel": "Data de Início",
  "endDateLabel": "Data de Término",
  "notesLabel": "Notas",
  "optionalHint": "(opcional)",
  "notesPlaceholder": "Motivo / detalhes (opcional)",
  "badgeActive": "FORA",
  "badgeUpcoming": "EM BREVE",
  "badgePast": "CONCLUÍDO"
}
```

- [ ] **Step 4: Add the `out` namespace to `src/locales/es.json`**

```json
"out": {
  "validationRequired": "Se requieren miembro, fecha de inicio y fecha de fin.",
  "validationEndBeforeStart": "La fecha de fin debe ser igual o posterior a la fecha de inicio.",
  "title": "Permiso",
  "subtitle": "Miembros actualmente desconectados o inaccesibles",
  "sectionActive": "Actualmente de Permiso",
  "emptyActive": "Nadie de permiso en este momento",
  "sectionUpcoming": "Próximos",
  "hidePast": "▾ Ocultar pasados",
  "showPast": "▸ Mostrar pasados ({{count}})",
  "modalEditTitle": "Editar Entrada",
  "modalAddTitle": "Agregar Entrada",
  "startDateLabel": "Fecha de Inicio",
  "endDateLabel": "Fecha de Fin",
  "notesLabel": "Notas",
  "optionalHint": "(opcional)",
  "notesPlaceholder": "Motivo / detalles (opcional)",
  "badgeActive": "FUERA",
  "badgeUpcoming": "PRONTO",
  "badgePast": "HECHO"
}
```

- [ ] **Step 5: Wire up `Out.tsx`**

Add the import and hook. Read the file first (354 lines), then replace:

| Original text | Replacement |
|---|---|
| `Member, start date, and end date are required.` | `t('out.validationRequired')` |
| `End date must be on or after start date.` | `t('out.validationEndBeforeStart')` |
| `Save failed` (catch-block default) | `t('common.saveFailed')` |
| `Delete failed` (catch-block default) | `t('common.deleteFailed')` |
| `Loading...` | `{t('common.loading')}` |
| `Out` (page title) | `{t('out.title')}` |
| `+ Add` | `{t('common.addButton')}` |
| `Members currently offline or inaccessible` | `{t('out.subtitle')}` |
| `Currently Out` | `{t('out.sectionActive')}` |
| `Nobody out right now` | `{t('out.emptyActive')}` |
| `Upcoming` | `{t('out.sectionUpcoming')}` |
| `▾ Hide past` | `{t('out.hidePast')}` |
| `▸ Show past ({count})` | `{t('out.showPast', { count: past.length })}` |
| `Edit Entry` | `{t('out.modalEditTitle')}` |
| `Add Entry` | `{t('out.modalAddTitle')}` |
| `Member` (modal label) | `{t('common.member')}` |
| `— Select member —` | `{t('common.selectMemberPlaceholder')}` |
| `Start Date` | `{t('out.startDateLabel')}` |
| `End Date` | `{t('out.endDateLabel')}` |
| `Notes` | `{t('out.notesLabel')}` |
| `(optional)` | `{t('out.optionalHint')}` |
| `Reason / details (optional)` | `placeholder={t('out.notesPlaceholder')}` |
| `Delete` (modal button) | `{t('common.delete')}` |
| `Cancel` | `{t('common.cancel')}` |
| `Saving...` | `{t('common.saving')}` |
| `Save` | `{t('common.save')}` |
| `OUT` (badge) | `{t('out.badgeActive')}` |
| `SOON` (badge) | `{t('out.badgeUpcoming')}` |
| `DONE` (badge) | `{t('out.badgePast')}` |
| `Edit` (row button) | `{t('common.edit')}` |

- [ ] **Step 6: Verify**

Run: `npm run build`
Expected: succeeds with no type errors.

Manual check: open Shore Leave (as admin) in all four languages — active/upcoming/past sections, badges, add/edit modal — confirm translation.

- [ ] **Step 7: Commit**

```bash
git add src/locales/en.json src/locales/ko.json src/locales/pt-BR.json src/locales/es.json src/pages/Out.tsx
git commit -m "feat(i18n): translate shore leave (out) page"
```

---

### Task 11: `admin` namespace (`AdminPanel.tsx`)

**Files:**
- Modify: `src/locales/en.json`, `src/locales/ko.json`, `src/locales/pt-BR.json`, `src/locales/es.json`
- Modify: `src/pages/AdminPanel.tsx`
- Test: manual verification

**Interfaces:**
- Consumes: `common.*` (Task 4).
- Produces: `admin.*` namespace, used only by this file.

- [ ] **Step 1: Add the `admin` namespace to `src/locales/en.json`**

```json
"admin": {
  "title": "☠️ Captain's Quarters",
  "tabMembers": "Members",
  "tabDemerits": "Demerits",
  "tabVsPoints": "VS Points",
  "tabErrors": "Errors"
}
```

- [ ] **Step 2: Add the `admin` namespace to `src/locales/ko.json`**

```json
"admin": {
  "title": "☠️ 선장실",
  "tabMembers": "멤버",
  "tabDemerits": "감점",
  "tabVsPoints": "VS 포인트",
  "tabErrors": "오류"
}
```

- [ ] **Step 3: Add the `admin` namespace to `src/locales/pt-BR.json`**

```json
"admin": {
  "title": "☠️ Camarote do Capitão",
  "tabMembers": "Membros",
  "tabDemerits": "Advertências",
  "tabVsPoints": "Pontos VS",
  "tabErrors": "Erros"
}
```

- [ ] **Step 4: Add the `admin` namespace to `src/locales/es.json`**

```json
"admin": {
  "title": "☠️ Camarote del Capitán",
  "tabMembers": "Miembros",
  "tabDemerits": "Amonestaciones",
  "tabVsPoints": "Puntos VS",
  "tabErrors": "Errores"
}
```

- [ ] **Step 5: Wire up `AdminPanel.tsx`**

Current full file (`src/pages/AdminPanel.tsx`):
```tsx
import { useState } from 'react'
import { MemberManager } from '../components/MemberManager'
import { DemeritManager } from '../components/DemeritManager'
import { VsPointManager } from '../components/VsPointManager'
import { ErrorLogManager } from '../components/ErrorLogManager'
import { useMarshallData } from '../hooks/useMarshallData'
import { useAuth } from '../hooks/useAuth'
import { OWNER_USER_ID } from '../lib/constants'

type AdminTab = 'members' | 'demerits' | 'vs points' | 'errors'

export function AdminPanel() {
  const { members, loading, error, refresh } = useMarshallData()
  const { user } = useAuth()
  const [tab, setTab] = useState<AdminTab>('members')

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold text-game-gold">☠️ Captain's Quarters</h1>

      {loading && (
        <div className="text-center py-8 text-game-gold animate-pulse">Loading...</div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-game-highlight text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="flex gap-1 border-b border-game-accent">
            {(['members', 'demerits', 'vs points'] as AdminTab[])
              .concat(user?.id === OWNER_USER_ID ? ['errors'] : [])
              .map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${
                    tab === t
                      ? 'border-game-gold text-game-gold'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {t}
                </button>
              ))}
          </div>

          {tab === 'members' && <MemberManager members={members} onRefresh={refresh} syncUserId={user?.id} />}
          {tab === 'demerits' && <DemeritManager members={members} />}
          {tab === 'vs points' && <VsPointManager members={members} />}
          {tab === 'errors' && user?.id === OWNER_USER_ID && <ErrorLogManager />}
        </>
      )}
    </div>
  )
}
```

Replace it entirely with:
```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MemberManager } from '../components/MemberManager'
import { DemeritManager } from '../components/DemeritManager'
import { VsPointManager } from '../components/VsPointManager'
import { ErrorLogManager } from '../components/ErrorLogManager'
import { useMarshallData } from '../hooks/useMarshallData'
import { useAuth } from '../hooks/useAuth'
import { OWNER_USER_ID } from '../lib/constants'

type AdminTab = 'members' | 'demerits' | 'vs points' | 'errors'

const TAB_LABEL_KEYS: Record<AdminTab, string> = {
  members: 'admin.tabMembers',
  demerits: 'admin.tabDemerits',
  'vs points': 'admin.tabVsPoints',
  errors: 'admin.tabErrors',
}

export function AdminPanel() {
  const { t } = useTranslation()
  const { members, loading, error, refresh } = useMarshallData()
  const { user } = useAuth()
  const [tab, setTab] = useState<AdminTab>('members')

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold text-game-gold">{t('admin.title')}</h1>

      {loading && (
        <div className="text-center py-8 text-game-gold animate-pulse">{t('common.loading')}</div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-game-highlight text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="flex gap-1 border-b border-game-accent">
            {(['members', 'demerits', 'vs points'] as AdminTab[])
              .concat(user?.id === OWNER_USER_ID ? ['errors'] : [])
              .map((tabId) => (
                <button
                  key={tabId}
                  onClick={() => setTab(tabId)}
                  className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                    tab === tabId
                      ? 'border-game-gold text-game-gold'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {t(TAB_LABEL_KEYS[tabId])}
                </button>
              ))}
          </div>

          {tab === 'members' && <MemberManager members={members} onRefresh={refresh} syncUserId={user?.id} />}
          {tab === 'demerits' && <DemeritManager members={members} />}
          {tab === 'vs points' && <VsPointManager members={members} />}
          {tab === 'errors' && user?.id === OWNER_USER_ID && <ErrorLogManager />}
        </>
      )}
    </div>
  )
}
```

Two things changed beyond simple string swaps: the tab loop's parameter was renamed from `t` to `tabId` (it shadowed the translation function), and the `capitalize` CSS class was dropped from the tab button (each language now supplies its own correctly-cased label directly, so CSS text-transform is no longer needed — and would be wrong for Korean anyway, which has no letter case).

- [ ] **Step 6: Verify**

Run: `npm run build`
Expected: succeeds with no type errors.

Manual check: open Captain's Quarters as the owner account in all four languages, confirm the title, loading state, and all four tab labels (Members/Demerits/VS Points/Errors) translate correctly, and confirm tab switching still works.

- [ ] **Step 7: Commit**

```bash
git add src/locales/en.json src/locales/ko.json src/locales/pt-BR.json src/locales/es.json src/pages/AdminPanel.tsx
git commit -m "feat(i18n): translate captain's quarters admin panel"
```

---

### Task 12: `members` namespace (`MemberManager.tsx`)

**Files:**
- Modify: `src/locales/en.json`, `src/locales/ko.json`, `src/locales/pt-BR.json`, `src/locales/es.json`
- Modify: `src/components/MemberManager.tsx`
- Test: manual verification

**Interfaces:**
- Consumes: `common.*` (Task 4).
- Produces: `members.*` namespace (this task adds the top-level object; Task 13 adds a sibling `members.eventLogImport` nested object into the same file).

- [ ] **Step 1: Add the `members` namespace to `src/locales/en.json`**

```json
"members": {
  "title": "Members ({{displayed}} / {{total}})",
  "syncButton": "Sync Now",
  "syncingLabel": "Syncing…",
  "searchPlaceholder": "Search name...",
  "strikeTeamButton": "Strike Team",
  "clearFiltersButton": "Clear filters",
  "thp": "THP",
  "sq1Power": "Sq1 Power",
  "sq1Type": "Sq1 Type",
  "sq2Power": "Sq2 Power",
  "sq2Type": "Sq2 Type",
  "strike": "Strike",
  "avgVs": "Avg VS",
  "timezone": "Timezone",
  "emptyState": "No members match the current filters.",
  "powerPlaceholder": "Power"
}
```

- [ ] **Step 2: Add the `members` namespace to `src/locales/ko.json`**

```json
"members": {
  "title": "멤버 ({{displayed}} / {{total}})",
  "syncButton": "지금 동기화",
  "syncingLabel": "동기화 중…",
  "searchPlaceholder": "이름 검색...",
  "strikeTeamButton": "타격대",
  "clearFiltersButton": "필터 지우기",
  "thp": "THP",
  "sq1Power": "편대1 전투력",
  "sq1Type": "편대1 유형",
  "sq2Power": "편대2 전투력",
  "sq2Type": "편대2 유형",
  "strike": "타격대",
  "avgVs": "평균 VS",
  "timezone": "시간대",
  "emptyState": "현재 필터와 일치하는 멤버가 없습니다.",
  "powerPlaceholder": "전투력"
}
```

- [ ] **Step 3: Add the `members` namespace to `src/locales/pt-BR.json`**

```json
"members": {
  "title": "Membros ({{displayed}} / {{total}})",
  "syncButton": "Sincronizar Agora",
  "syncingLabel": "Sincronizando…",
  "searchPlaceholder": "Buscar nome...",
  "strikeTeamButton": "Equipe de Ataque",
  "clearFiltersButton": "Limpar filtros",
  "thp": "THP",
  "sq1Power": "Poder Esq1",
  "sq1Type": "Tipo Esq1",
  "sq2Power": "Poder Esq2",
  "sq2Type": "Tipo Esq2",
  "strike": "Ataque",
  "avgVs": "VS Médio",
  "timezone": "Fuso Horário",
  "emptyState": "Nenhum membro corresponde aos filtros atuais.",
  "powerPlaceholder": "Poder"
}
```

- [ ] **Step 4: Add the `members` namespace to `src/locales/es.json`**

```json
"members": {
  "title": "Miembros ({{displayed}} / {{total}})",
  "syncButton": "Sincronizar Ahora",
  "syncingLabel": "Sincronizando…",
  "searchPlaceholder": "Buscar nombre...",
  "strikeTeamButton": "Equipo de Ataque",
  "clearFiltersButton": "Limpiar filtros",
  "thp": "THP",
  "sq1Power": "Poder Esc1",
  "sq1Type": "Tipo Esc1",
  "sq2Power": "Poder Esc2",
  "sq2Type": "Tipo Esc2",
  "strike": "Ataque",
  "avgVs": "VS Promedio",
  "timezone": "Zona Horaria",
  "emptyState": "Ningún miembro coincide con los filtros actuales.",
  "powerPlaceholder": "Poder"
}
```

- [ ] **Step 5: Wire up `MemberManager.tsx`**

Add the import and hook (Task 2 already added a `formatNumber` import to this file — keep it).

`SQUAD_TYPES`, `TIMEZONES`, and `RANKS` (module-level constant arrays near the top of the file) are **not translated** — they're stored directly in `Member.S1_Type`/`S2_Type`/`Timezone`/`Rank` and displayed verbatim elsewhere; translating just their `<option>` labels without a separate display-mapping layer would desync the shown label from the stored value. Leave every reference to these three arrays untouched.

Replace:

| Original text | Replacement |
|---|---|
| `Members ({displayed.length} / {members.length})` | `{t('members.title', { displayed: displayed.length, total: members.length })}` (adapt variable names to whatever the actual displayed-count expressions are in scope) |
| `Sync Now` | `{t('members.syncButton')}` |
| `Syncing…` | `{t('members.syncingLabel')}` |
| `Player name` (add-member form) | `placeholder={t('common.playerNamePlaceholder')}` |
| `Add` (add-member submit button) | `{t('common.add')}` |
| `Search name...` | `placeholder={t('members.searchPlaceholder')}` |
| `Strike Team` | `{t('members.strikeTeamButton')}` |
| `Clear filters` | `{t('members.clearFiltersButton')}` |
| `Rank` (column header) | `{t('common.rank')}` |
| `Member` (column header) | `{t('common.member')}` |
| `THP` (column header) | `{t('members.thp')}` |
| `Sq1 Power` | `{t('members.sq1Power')}` |
| `Sq1 Type` | `{t('members.sq1Type')}` |
| `Sq2 Power` | `{t('members.sq2Power')}` |
| `Sq2 Type` | `{t('members.sq2Type')}` |
| `Strike` (column header) | `{t('members.strike')}` |
| `Avg VS` | `{t('members.avgVs')}` |
| `Timezone` (column header) | `{t('members.timezone')}` |
| `No members match the current filters.` | `{t('members.emptyState')}` |
| `Name` (edit-row input placeholder) | `placeholder={t('common.name')}` |
| `THP` (edit-row input placeholder) | `placeholder={t('members.thp')}` |
| `Power` (edit-row input placeholder, both occurrences) | `placeholder={t('members.powerPlaceholder')}` |
| `Save` | `{t('common.save')}` |
| `Cancel` | `{t('common.cancel')}` |
| `Edit` | `{t('common.edit')}` |
| `Del` | `{t('common.deleteShort')}` |
| `...` (delete-in-progress) | `{t('common.deletingIndicator')}` |

- [ ] **Step 6: Verify**

Run: `npm run build`
Expected: succeeds with no type errors.

Manual check: open Members (as owner) in all four languages — table headers, filters, add form, inline edit row — confirm translation, and confirm squad-type/timezone/rank dropdown values are unaffected.

- [ ] **Step 7: Commit**

```bash
git add src/locales/en.json src/locales/ko.json src/locales/pt-BR.json src/locales/es.json src/components/MemberManager.tsx
git commit -m "feat(i18n): translate member manager"
```

---

### Task 13: `members.eventLogImport` namespace (`EventLogImport.tsx`)

**Files:**
- Modify: `src/locales/en.json`, `src/locales/ko.json`, `src/locales/pt-BR.json`, `src/locales/es.json`
- Modify: `src/components/EventLogImport.tsx`
- Test: manual verification

**Interfaces:**
- Consumes: `common.*` (Task 4), the existing `members` object (Task 12) — this task adds a nested `eventLogImport` object inside it.

- [ ] **Step 1: Add `eventLogImport` inside the existing `members` object in `src/locales/en.json`**

Add this key alongside the other `members.*` keys added in Task 12 (inside the same `"members": { ... }` object):
```json
"eventLogImport": {
  "title": "Import Damage Log (JSON)",
  "invalidJson": "Invalid JSON. Paste a JSON array of damage entries.",
  "unnamedEntry": "(unnamed entry)",
  "invalidDamageSuffix": "{{name}} (invalid damage)",
  "importFailedFallback": "Import failed",
  "importedCount_one": "Imported {{count}} damage log.",
  "importedCount_other": "Imported {{count}} damage logs.",
  "skippedSuffix": " Skipped (no match): {{list}}",
  "placeholderIntro": "Paste Gemini JSON output here, e.g.:"
}
```

- [ ] **Step 2: Add `eventLogImport` inside the existing `members` object in `src/locales/ko.json`**

```json
"eventLogImport": {
  "title": "피해 로그 가져오기 (JSON)",
  "invalidJson": "잘못된 JSON입니다. 피해 항목의 JSON 배열을 붙여넣으세요.",
  "unnamedEntry": "(이름 없는 항목)",
  "invalidDamageSuffix": "{{name}} (잘못된 피해량)",
  "importFailedFallback": "가져오기 실패",
  "importedCount_other": "피해 로그 {{count}}건을 가져왔습니다.",
  "skippedSuffix": " 건너뜀 (일치 항목 없음): {{list}}",
  "placeholderIntro": "여기에 Gemini JSON 출력을 붙여넣으세요, 예:"
}
```

(Korean has no grammatical plural distinction, so only `_other` is needed — i18next's pluralization for `ko` always resolves to `other`.)

- [ ] **Step 3: Add `eventLogImport` inside the existing `members` object in `src/locales/pt-BR.json`**

```json
"eventLogImport": {
  "title": "Importar Registro de Dano (JSON)",
  "invalidJson": "JSON inválido. Cole um array JSON de entradas de dano.",
  "unnamedEntry": "(entrada sem nome)",
  "invalidDamageSuffix": "{{name}} (dano inválido)",
  "importFailedFallback": "Falha na importação",
  "importedCount_one": "{{count}} registro de dano importado.",
  "importedCount_other": "{{count}} registros de dano importados.",
  "skippedSuffix": " Ignorados (sem correspondência): {{list}}",
  "placeholderIntro": "Cole a saída JSON do Gemini aqui, ex.:"
}
```

- [ ] **Step 4: Add `eventLogImport` inside the existing `members` object in `src/locales/es.json`**

```json
"eventLogImport": {
  "title": "Importar Registro de Daño (JSON)",
  "invalidJson": "JSON inválido. Pega un array JSON de entradas de daño.",
  "unnamedEntry": "(entrada sin nombre)",
  "invalidDamageSuffix": "{{name}} (daño inválido)",
  "importFailedFallback": "Error al importar",
  "importedCount_one": "Se importó {{count}} registro de daño.",
  "importedCount_other": "Se importaron {{count}} registros de daño.",
  "skippedSuffix": " Omitidos (sin coincidencia): {{list}}",
  "placeholderIntro": "Pega aquí la salida JSON de Gemini, por ejemplo:"
}
```

- [ ] **Step 5: Wire up `EventLogImport.tsx`**

Add the import and hook. Read the file first, then replace:

| Original text | Replacement |
|---|---|
| `Import Damage Log (JSON)` | `{t('members.eventLogImport.title')}` |
| `Invalid JSON. Paste a JSON array of damage entries.` | `t('members.eventLogImport.invalidJson')` |
| `(unnamed entry)` | `t('members.eventLogImport.unnamedEntry')` |
| `${name} (invalid damage)` | `t('members.eventLogImport.invalidDamageSuffix', { name })` |
| `Import failed` (catch-block default) | `t('members.eventLogImport.importFailedFallback')` |
| `Imported ${logs.length} damage log${logs.length === 1 ? '' : 's'}.` | `t('members.eventLogImport.importedCount', { count: logs.length })` (i18next picks `_one`/`_other` automatically based on `count`) |
| ` Skipped (no match): ${...}` | `t('members.eventLogImport.skippedSuffix', { list })` (substitute whatever the actual joined-names expression is) |
| `Paste Gemini JSON output here, e.g.:` (intro line only — leave the JSON sample body below it untranslated, it's a literal code example) | `{t('members.eventLogImport.placeholderIntro')}` |
| `Importing...` | `{t('common.importing')}` |
| `Import` (submit button) | `{t('common.import')}` |

- [ ] **Step 6: Verify**

Run: `npm run build`
Expected: succeeds with no type errors.

Manual check: open Member Manager's damage-log import panel in all four languages, paste both a valid and an invalid JSON payload, and confirm all status/result messages translate (including the singular/plural "damage log(s)" count in English/Portuguese/Spanish).

- [ ] **Step 7: Commit**

```bash
git add src/locales/en.json src/locales/ko.json src/locales/pt-BR.json src/locales/es.json src/components/EventLogImport.tsx
git commit -m "feat(i18n): translate damage log import panel"
```

---

### Task 14: `demerits` namespace (`DemeritManager.tsx`)

**Files:**
- Modify: `src/locales/en.json`, `src/locales/ko.json`, `src/locales/pt-BR.json`, `src/locales/es.json`
- Modify: `src/components/DemeritManager.tsx`
- Test: manual verification

**Interfaces:**
- Consumes: `common.*` (Task 4).
- Produces: `demerits.*` namespace, used only by this file.

- [ ] **Step 1: Add the `demerits` namespace to `src/locales/en.json`**

```json
"demerits": {
  "heading": "Demerits ({{count}})",
  "colNote": "Note",
  "emptyNone": "No demerits recorded.",
  "modalTitleAdd": "Add Demerit",
  "notePlaceholder": "Reason / details",
  "validationRequired": "Member, date, and note are required."
}
```

- [ ] **Step 2: Add the `demerits` namespace to `src/locales/ko.json`**

```json
"demerits": {
  "heading": "감점 ({{count}})",
  "colNote": "메모",
  "emptyNone": "기록된 감점이 없습니다.",
  "modalTitleAdd": "감점 추가",
  "notePlaceholder": "사유 / 세부 사항",
  "validationRequired": "멤버, 날짜, 메모는 필수입니다."
}
```

- [ ] **Step 3: Add the `demerits` namespace to `src/locales/pt-BR.json`**

```json
"demerits": {
  "heading": "Advertências ({{count}})",
  "colNote": "Nota",
  "emptyNone": "Nenhuma advertência registrada.",
  "modalTitleAdd": "Adicionar Advertência",
  "notePlaceholder": "Motivo / detalhes",
  "validationRequired": "Membro, data e nota são obrigatórios."
}
```

- [ ] **Step 4: Add the `demerits` namespace to `src/locales/es.json`**

```json
"demerits": {
  "heading": "Amonestaciones ({{count}})",
  "colNote": "Nota",
  "emptyNone": "No hay amonestaciones registradas.",
  "modalTitleAdd": "Agregar Amonestación",
  "notePlaceholder": "Motivo / detalles",
  "validationRequired": "Se requieren miembro, fecha y nota."
}
```

- [ ] **Step 5: Wire up `DemeritManager.tsx`**

Add the import and hook. Read the file first, then replace:

| Original text | Replacement |
|---|---|
| `Demerits ({count})` | `{t('demerits.heading', { count })}` (substitute the actual filtered-count expression in scope) |
| `+ Add` | `{t('common.addButton')}` |
| `Search member...` | `placeholder={t('common.searchMemberPlaceholder')}` |
| `Clear` | `{t('common.clear')}` |
| `Loading...` | `{t('common.loading')}` |
| `Member` (column header) | `{t('common.member')}` |
| `Date` (column header) | `{t('common.date')}` |
| `Note` (column header) | `{t('demerits.colNote')}` |
| `No demerits recorded.` | `{t('demerits.emptyNone')}` |
| `No members match the filter.` | `{t('common.emptyNoMembersMatch')}` |
| `...` (delete-in-progress) | `{t('common.deletingIndicator')}` |
| `Del` | `{t('common.deleteShort')}` |
| `Add Demerit` | `{t('demerits.modalTitleAdd')}` |
| `Member` (form label) | `{t('common.member')}` |
| `— Select member —` | `{t('common.selectMemberPlaceholder')}` |
| `Date` (form label) | `{t('common.date')}` |
| `Note` (form label) | `{t('demerits.colNote')}` |
| `Reason / details` | `placeholder={t('demerits.notePlaceholder')}` |
| `Member, date, and note are required.` | `t('demerits.validationRequired')` |
| `Cancel` | `{t('common.cancel')}` |
| `Saving...` | `{t('common.saving')}` |
| `Save` | `{t('common.save')}` |

- [ ] **Step 6: Verify**

Run: `npm run build`
Expected: succeeds with no type errors.

Manual check: open Demerits (as owner) in all four languages — list, search, add modal, empty states — confirm translation.

- [ ] **Step 7: Commit**

```bash
git add src/locales/en.json src/locales/ko.json src/locales/pt-BR.json src/locales/es.json src/components/DemeritManager.tsx
git commit -m "feat(i18n): translate demerits manager"
```

---

### Task 15: `vsPoints` namespace (`VsPointManager.tsx`)

**Files:**
- Modify: `src/locales/en.json`, `src/locales/ko.json`, `src/locales/pt-BR.json`, `src/locales/es.json`
- Modify: `src/components/VsPointManager.tsx`
- Test: manual verification

**Interfaces:**
- Consumes: `common.*` (Task 4).
- Produces: `vsPoints.*` namespace, used only by this file.

- [ ] **Step 1: Add the `vsPoints` namespace to `src/locales/en.json`**

```json
"vsPoints": {
  "heading": "VS Points ({{count}})",
  "importButton": "↑ Import JSON",
  "importNoValidRows": "No valid rows found.",
  "importSkippedSuffix": "Skipped: ",
  "importSuccess": "Imported {{count}} row(s).",
  "invalidJsonFile": "Invalid JSON file.",
  "jsonFormatLabel": "JSON format: ",
  "colWeekEnding": "Week Ending",
  "colPoints": "Points",
  "emptyNone": "No VS points recorded.",
  "modalTitleAdd": "Add VS Points",
  "pointsPlaceholder": "e.g. 5000",
  "validationRequired": "Member, week ending, and points are required."
}
```

- [ ] **Step 2: Add the `vsPoints` namespace to `src/locales/ko.json`**

```json
"vsPoints": {
  "heading": "VS 포인트 ({{count}})",
  "importButton": "↑ JSON 가져오기",
  "importNoValidRows": "유효한 행을 찾을 수 없습니다.",
  "importSkippedSuffix": "건너뜀: ",
  "importSuccess": "{{count}}개 행을 가져왔습니다.",
  "invalidJsonFile": "잘못된 JSON 파일입니다.",
  "jsonFormatLabel": "JSON 형식: ",
  "colWeekEnding": "주 종료일",
  "colPoints": "포인트",
  "emptyNone": "기록된 VS 포인트가 없습니다.",
  "modalTitleAdd": "VS 포인트 추가",
  "pointsPlaceholder": "예: 5000",
  "validationRequired": "멤버, 주 종료일, 포인트는 필수입니다."
}
```

- [ ] **Step 3: Add the `vsPoints` namespace to `src/locales/pt-BR.json`**

```json
"vsPoints": {
  "heading": "Pontos VS ({{count}})",
  "importButton": "↑ Importar JSON",
  "importNoValidRows": "Nenhuma linha válida encontrada.",
  "importSkippedSuffix": "Ignoradas: ",
  "importSuccess": "{{count}} linha(s) importada(s).",
  "invalidJsonFile": "Arquivo JSON inválido.",
  "jsonFormatLabel": "Formato JSON: ",
  "colWeekEnding": "Fim da Semana",
  "colPoints": "Pontos",
  "emptyNone": "Nenhum ponto VS registrado.",
  "modalTitleAdd": "Adicionar Pontos VS",
  "pointsPlaceholder": "ex.: 5000",
  "validationRequired": "Membro, fim da semana e pontos são obrigatórios."
}
```

- [ ] **Step 4: Add the `vsPoints` namespace to `src/locales/es.json`**

```json
"vsPoints": {
  "heading": "Puntos VS ({{count}})",
  "importButton": "↑ Importar JSON",
  "importNoValidRows": "No se encontraron filas válidas.",
  "importSkippedSuffix": "Omitidas: ",
  "importSuccess": "Se importaron {{count}} fila(s).",
  "invalidJsonFile": "Archivo JSON inválido.",
  "jsonFormatLabel": "Formato JSON: ",
  "colWeekEnding": "Fin de Semana",
  "colPoints": "Puntos",
  "emptyNone": "No hay puntos VS registrados.",
  "modalTitleAdd": "Agregar Puntos VS",
  "pointsPlaceholder": "ej. 5000",
  "validationRequired": "Se requieren miembro, fin de semana y puntos."
}
```

- [ ] **Step 5: Wire up `VsPointManager.tsx`**

Add the import and hook (Task 2 already added a `formatNumber` import to this file — keep it). Read the file first, then replace:

| Original text | Replacement |
|---|---|
| `Member, week ending, and points are required.` | `t('vsPoints.validationRequired')` |
| `VS Points ({count})` | `{t('vsPoints.heading', { count })}` (substitute the actual filtered-count expression in scope) |
| `Importing...` | `{t('common.importing')}` |
| `↑ Import JSON` | `{t('vsPoints.importButton')}` |
| `+ Add` | `{t('common.addButton')}` |
| `No valid rows found.` | `t('vsPoints.importNoValidRows')` |
| `Skipped: ` | `t('vsPoints.importSkippedSuffix')` |
| `Imported ${count} row(s).` | `t('vsPoints.importSuccess', { count })` |
| `Invalid JSON file.` | `t('vsPoints.invalidJsonFile')` |
| `JSON format: ` | `{t('vsPoints.jsonFormatLabel')}` (keep the literal JSON example that follows it untranslated) |
| `Search member...` | `placeholder={t('common.searchMemberPlaceholder')}` |
| `Clear` | `{t('common.clear')}` |
| `Loading...` | `{t('common.loading')}` |
| `Member` (column header) | `{t('common.member')}` |
| `Week Ending` (column header) | `{t('vsPoints.colWeekEnding')}` |
| `Points` (column header) | `{t('vsPoints.colPoints')}` |
| `No VS points recorded.` | `{t('vsPoints.emptyNone')}` |
| `No members match the filter.` | `{t('common.emptyNoMembersMatch')}` |
| `...` (delete-in-progress) | `{t('common.deletingIndicator')}` |
| `Del` | `{t('common.deleteShort')}` |
| `Add VS Points` | `{t('vsPoints.modalTitleAdd')}` |
| `Member` (form label) | `{t('common.member')}` |
| `— Select member —` | `{t('common.selectMemberPlaceholder')}` |
| `Week Ending` (form label) | `{t('vsPoints.colWeekEnding')}` |
| `Points` (form label) | `{t('vsPoints.colPoints')}` |
| `e.g. 5000` | `placeholder={t('vsPoints.pointsPlaceholder')}` |
| `Cancel` | `{t('common.cancel')}` |
| `Saving...` | `{t('common.saving')}` |
| `Save` | `{t('common.save')}` |

- [ ] **Step 6: Verify**

Run: `npm run build`
Expected: succeeds with no type errors.

Manual check: open VS Points (as owner) in all four languages — list, JSON import (valid and invalid payloads), add modal — confirm translation.

- [ ] **Step 7: Commit**

```bash
git add src/locales/en.json src/locales/ko.json src/locales/pt-BR.json src/locales/es.json src/components/VsPointManager.tsx
git commit -m "feat(i18n): translate vs points manager"
```

---

### Task 16: `errorLog` namespace (`ErrorLogManager.tsx`)

**Files:**
- Modify: `src/locales/en.json`, `src/locales/ko.json`, `src/locales/pt-BR.json`, `src/locales/es.json`
- Modify: `src/components/ErrorLogManager.tsx`
- Test: manual verification

**Interfaces:**
- Consumes: `common.*` (Task 4).
- Produces: `errorLog.*` namespace, used only by this file.

- [ ] **Step 1: Add the `errorLog` namespace to `src/locales/en.json`**

```json
"errorLog": {
  "heading": "Errors ({{count}})",
  "refreshButton": "Refresh",
  "colWhen": "When",
  "colUser": "User",
  "colContext": "Context",
  "colMessage": "Message",
  "emptyNone": "No errors logged.",
  "unknownUser": "unknown"
}
```

- [ ] **Step 2: Add the `errorLog` namespace to `src/locales/ko.json`**

```json
"errorLog": {
  "heading": "오류 ({{count}})",
  "refreshButton": "새로고침",
  "colWhen": "시간",
  "colUser": "사용자",
  "colContext": "컨텍스트",
  "colMessage": "메시지",
  "emptyNone": "기록된 오류가 없습니다.",
  "unknownUser": "알 수 없음"
}
```

- [ ] **Step 3: Add the `errorLog` namespace to `src/locales/pt-BR.json`**

```json
"errorLog": {
  "heading": "Erros ({{count}})",
  "refreshButton": "Atualizar",
  "colWhen": "Quando",
  "colUser": "Usuário",
  "colContext": "Contexto",
  "colMessage": "Mensagem",
  "emptyNone": "Nenhum erro registrado.",
  "unknownUser": "desconhecido"
}
```

- [ ] **Step 4: Add the `errorLog` namespace to `src/locales/es.json`**

```json
"errorLog": {
  "heading": "Errores ({{count}})",
  "refreshButton": "Actualizar",
  "colWhen": "Cuándo",
  "colUser": "Usuario",
  "colContext": "Contexto",
  "colMessage": "Mensaje",
  "emptyNone": "No hay errores registrados.",
  "unknownUser": "desconocido"
}
```

- [ ] **Step 5: Wire up `ErrorLogManager.tsx`**

Add the import and hook (Task 2 already added a `formatDateTime` import to this file — keep it). Read the file first, then replace:

| Original text | Replacement |
|---|---|
| `Errors ({count})` | `{t('errorLog.heading', { count })}` (substitute the actual count expression in scope) |
| `Refresh` | `{t('errorLog.refreshButton')}` |
| `Loading...` | `{t('common.loading')}` |
| `When` (column header) | `{t('errorLog.colWhen')}` |
| `User` (column header) | `{t('errorLog.colUser')}` |
| `Context` (column header) | `{t('errorLog.colContext')}` |
| `Message` (column header) | `{t('errorLog.colMessage')}` |
| `No errors logged.` | `{t('errorLog.emptyNone')}` |
| `unknown` (fallback user label) | `t('errorLog.unknownUser')` |

- [ ] **Step 6: Verify**

Run: `npm run build`
Expected: succeeds with no type errors.

Manual check: open the Errors tab (as owner) in all four languages, confirm column headers, refresh button, and empty state translate. The logged error `context`/`message` values themselves stay in English (they're raw system data, not UI chrome).

- [ ] **Step 7: Commit**

```bash
git add src/locales/en.json src/locales/ko.json src/locales/pt-BR.json src/locales/es.json src/components/ErrorLogManager.tsx
git commit -m "feat(i18n): translate error log viewer"
```

---

### Task 17: Full-app verification pass

**Files:**
- None (verification only — fixes discovered here should be applied to whichever locale JSON/component file has the bug, not a new file).
- Test: manual verification

**Interfaces:**
- Consumes: everything from Tasks 1–16.

- [ ] **Step 1: Full build check**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 2: Full manual walkthrough — English**

Run `npm run dev`, sign in, and click through every page (Voyage Schedule, Marshall Map, Ship Upgrades, Kill List, Friends List, Shore Leave, Captain's Quarters and its four tabs) confirming everything reads correctly in English (the baseline — nothing should look different from before this project started).

- [ ] **Step 3: Full manual walkthrough — Korean, Portuguese, Spanish**

Switch the language via the 🌐 switcher and repeat the same walkthrough for `한국어`, `Português`, and `Español`. For each language, confirm:
- No leftover hardcoded English strings remain on any page.
- Interpolated counts/names render correctly (e.g. "Ring 3+ (12 members)" style headings, the damage-log-import singular/plural count).
- Dates (Marshall Map event dates, error log timestamps) and numbers (VS points, average VS) format using that language's locale (Task 2).
- Member names, kill/friends list entries, demerit notes, tech names, ranks, squad types, and timezone labels are unchanged regardless of language (never translated).

- [ ] **Step 4: Cross-device persistence check**

Switch to a non-English language, then sign out and back in (or open a second browser/incognito profile signed in as the same account). Confirm the chosen language is restored via `user_metadata.locale` rather than falling back to English or the browser default.

- [ ] **Step 5: New-user default check**

In a private/incognito window with no prior `localStorage` value, sign in with a test account that has no `user_metadata.locale` set yet, and confirm the app lands on a reasonable default (English, unless the browser's language is set to Korean/Portuguese/Spanish, in which case it should match).

- [ ] **Step 6: Fix any gaps found**

If any hardcoded string, missing key, or mistranslation surfaces during Steps 2–5, fix it directly in the relevant `src/locales/*.json` file or component (this is expected — treat it the same as any other bug found during verification, not a new task).

- [ ] **Step 7: Final commit (only if Step 6 found anything to fix)**

```bash
git add -A
git commit -m "fix(i18n): address gaps found in full-app verification pass"
```
