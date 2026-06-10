# Tech Queue Drag-and-Drop Reorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ▲▼ up/down buttons on the Alliance Tech "Up Next" list with `@dnd-kit`-based drag-and-drop reordering, using a dedicated drag handle.

**Architecture:** The pinned "Currently Upgrading" card stays as-is (keeping its ▼ "demote" button, now powered by a new `demoteCurrent` hook function). The "Up Next" list (`queue[1..]`) is wrapped in `@dnd-kit`'s `DndContext`/`SortableContext`; each row becomes a new `SortableTechRow` component with a ⠿ drag handle. Reordering is optimistic (local state updates instantly) and persisted via a new `reorderUpcoming` hook function that rewrites sequential `position` values for the "Up Next" items.

**Tech Stack:** React 18 + TypeScript (strict, isolatedModules), Tailwind, Supabase JS client, `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (new).

**Reference spec:** `docs/superpowers/specs/2026-06-10-tech-queue-drag-reorder-design.md`

---

### Task 1: Install `@dnd-kit` packages

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install the packages**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: `package.json` gains `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` under `dependencies`, and `package-lock.json` is updated accordingly.

- [ ] **Step 2: Verify the build still passes**

```bash
npm run build
```

Expected: `tsc` and `vite build` both succeed (no source files have changed yet, so this just confirms the install didn't break anything).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @dnd-kit for tech queue drag-and-drop reorder"
```

---

### Task 2: Add `demoteCurrent` and `reorderUpcoming` to the tech queue hook

**Files:**
- Modify: `src/hooks/useAllianceTech.ts`

This task is additive — `moveUp`/`moveDown` are kept for now so the existing `AllianceTech.tsx` (which still calls them) keeps building. They're removed in Task 5 once nothing references them.

While here, also fix a loading-state bug shared with `useMarshallData.ts` (see `git show 6801ffd`): `fetchData` currently calls `setLoading(true)` on *every* refresh, including after `addItem`/`completeTop`/the new reorder actions. That would flash the whole page back to the "Loading..." screen after every drag. Fix it the same way `useMarshallData` was fixed: only show the loading spinner on the very first fetch.

- [ ] **Step 1: Replace the full file contents**

Replace all of `src/hooks/useAllianceTech.ts` with:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AllianceTechQueueItem } from '../lib/types'

export function useAllianceTech() {
  const [queue, setQueue] = useState<AllianceTechQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initialized = useRef(false)

  const fetchData = useCallback(async () => {
    if (!initialized.current) setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('alliance_tech_queue')
        .select('*')
        .eq('completed', false)
        .order('position', { ascending: true })
      if (fetchError) throw fetchError
      setQueue((data ?? []) as AllianceTechQueueItem[])
    } catch (err) {
      setError((err as { message?: string }).message ?? 'Failed to load tech queue')
    } finally {
      setLoading(false)
      initialized.current = true
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function addItem(techName: string, category: 'development' | 'war'): Promise<void> {
    const maxPos = queue.length > 0 ? Math.max(...queue.map((q: AllianceTechQueueItem) => q.position)) : 0
    const { error: insertError } = await supabase
      .from('alliance_tech_queue')
      .insert({ position: maxPos + 1, tech_name: techName, category })
    if (insertError) throw insertError
    await fetchData()
  }

  async function completeTop(): Promise<void> {
    if (queue.length === 0) return
    const { error: updateError } = await supabase
      .from('alliance_tech_queue')
      .update({ completed: true })
      .eq('id', queue[0].id)
    if (updateError) throw updateError
    await fetchData()
  }

  async function moveUp(index: number): Promise<void> {
    if (index === 0) return
    const a = queue[index - 1]
    const b = queue[index]
    await supabase.from('alliance_tech_queue').update({ position: b.position }).eq('id', a.id)
    await supabase.from('alliance_tech_queue').update({ position: a.position }).eq('id', b.id)
    await fetchData()
  }

  async function moveDown(index: number): Promise<void> {
    if (index === queue.length - 1) return
    const a = queue[index]
    const b = queue[index + 1]
    await supabase.from('alliance_tech_queue').update({ position: b.position }).eq('id', a.id)
    await supabase.from('alliance_tech_queue').update({ position: a.position }).eq('id', b.id)
    await fetchData()
  }

  async function demoteCurrent(): Promise<void> {
    if (queue.length < 2) return
    const a = queue[0]
    const b = queue[1]
    const { error: err1 } = await supabase
      .from('alliance_tech_queue')
      .update({ position: b.position })
      .eq('id', a.id)
    if (err1) throw err1
    const { error: err2 } = await supabase
      .from('alliance_tech_queue')
      .update({ position: a.position })
      .eq('id', b.id)
    if (err2) throw err2
    await fetchData()
  }

  async function reorderUpcoming(orderedIds: string[]): Promise<void> {
    if (queue.length < 2) return
    const basePosition = queue[0].position
    const results = await Promise.all(
      orderedIds.map((id, i) =>
        supabase
          .from('alliance_tech_queue')
          .update({ position: basePosition + i + 1 })
          .eq('id', id)
      )
    )
    const failed = results.find(r => r.error)
    if (failed?.error) throw failed.error
    await fetchData()
  }

  return {
    queue,
    loading,
    error,
    addItem,
    completeTop,
    moveUp,
    moveDown,
    demoteCurrent,
    reorderUpcoming,
    refresh: fetchData,
  }
}
```

- [ ] **Step 2: Verify the build still passes**

```bash
npm run build
```

Expected: succeeds. `AllianceTech.tsx` hasn't changed yet, so it still uses `moveUp`/`moveDown`, both of which are still exported.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAllianceTech.ts
git commit -m "feat: add demoteCurrent and reorderUpcoming to tech queue hook

Also fixes the same loading-flash bug as 6801ffd: fetchData only
sets loading=true on the initial fetch, so refreshes after queue
mutations no longer unmount the page."
```

---

### Task 3: Create the `SortableTechRow` component

**Files:**
- Create: `src/components/SortableTechRow.tsx`

Note on the design spec's "dashed-border placeholder": this implementation uses `@dnd-kit`'s standard pattern instead — the dragged row drops to 50% opacity and gains a shadow/lift while the other rows animate (via `transform`/`transition` from `useSortable`) into their new positions to make room. This is the same feedback pattern used by Notion/Trello-style sortable lists and needs no extra placeholder element.

- [ ] **Step 1: Create the file**

```tsx
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { AllianceTechQueueItem } from '../lib/types'

interface SortableTechRowProps {
  item: AllianceTechQueueItem
  displayNumber: number
  isAdmin: boolean
}

export function SortableTechRow({ item, displayNumber, isAdmin }: SortableTechRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-4 py-3 bg-game-card ${isDragging ? 'shadow-lg rounded-lg relative z-10' : ''}`}
    >
      <span className="text-xs text-gray-600 w-5 text-right shrink-0">{displayNumber}</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-white">{item.tech_name}</span>
        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded capitalize ${
          item.category === 'war'
            ? 'bg-game-highlight/20 text-game-highlight'
            : 'bg-game-standard/20 text-game-standard'
        }`}>
          {item.category}
        </span>
      </div>
      {isAdmin && (
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="shrink-0 w-6 h-6 flex items-center justify-center text-gray-500 hover:text-white cursor-grab active:cursor-grabbing touch-none"
        >
          ⠿
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify the build still passes**

```bash
npm run build
```

Expected: succeeds. The new component isn't used anywhere yet, but it type-checks and bundles on its own.

- [ ] **Step 3: Commit**

```bash
git add src/components/SortableTechRow.tsx
git commit -m "feat: add SortableTechRow component with drag handle"
```

---

### Task 4: Wire drag-and-drop into `AllianceTech.tsx`

**Files:**
- Modify: `src/pages/AllianceTech.tsx`

This is the integration step: add the `DndContext`/`SortableContext`, swap the "Up Next" row markup for `SortableTechRow`, add optimistic local state for the reordered list, replace `handleMove` with `handleDemote` (current card) and `handleDragEnd` (drag-and-drop), and remove the old ▲▼ buttons from the "Up Next" rows.

The `DndContext`/`SortableContext` wrap the list unconditionally (for both admins and non-admins). Non-admins simply never render the drag handle, so `useSortable`'s `listeners` are never attached to anything and dragging can never start — this avoids duplicating the row-rendering markup for the two roles.

- [ ] **Step 1: Replace the full file contents**

Replace all of `src/pages/AllianceTech.tsx` with:

```tsx
import { useEffect, useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { useAllianceTech } from '../hooks/useAllianceTech'
import { useAuth } from '../hooks/useAuth'
import { SortableTechRow } from '../components/SortableTechRow'
import type { AllianceTechQueueItem } from '../lib/types'

// ─── Static tech lists ────────────────────────────────────────────────────────

function levels(name: string, max: number): string[] {
  return Array.from({ length: max }, (_, i) => `${name} Lv ${i + 1}`)
}

const DEVELOPMENT_TECHS: string[] = [
  ...levels('Auto Rally', 10),
  ...levels('Great Helper', 10),
  ...levels('Quick Construction', 10),
  ...levels('Quick Gathering', 10),
  ...levels('Iron Output', 10),
  ...levels('Food Output', 10),
  ...levels('Coin Output', 10),
  ...levels('Quick Research', 10),
  ...levels('Senior Scientist', 10),
  ...levels('Iron Protection', 10),
  ...levels('Food Protection', 10),
  ...levels('Coin Protection', 10),
  ...levels('Quick Crafting', 10),
  ...levels('Expert Blacksmith', 10),
  ...levels('Veteran Craftsman', 10),
]

const WAR_TECHS: string[] = [
  ...levels('Garrison HP', 10),
  ...levels('Garrison Attack', 10),
  ...levels('Garrison Defense', 10),
  ...levels('Drill Ground Expansion', 10),
  ...levels('Rallied HP', 10),
  ...levels('Rallied Attack', 10),
  ...levels('Rallied Defense', 10),
  ...levels('Expert Nurse', 10),
  ...levels('World Interception', 10),
  ...levels('Rapid Siege', 10),
  ...levels('Quick Garrison', 10),
  ...levels('Troop Movement', 10),
  ...levels('Unit Load Capacity', 10),
  ...levels('Quick Training', 10),
  ...levels('Expert Trainer', 10),
]

// ─── Component ────────────────────────────────────────────────────────────────

interface PickerState {
  category: 'development' | 'war' | null
  search: string
}

export function AllianceTech() {
  const { isAdmin } = useAuth()
  const { queue, loading, error, addItem, completeTop, demoteCurrent, reorderUpcoming } = useAllianceTech()
  const [picker, setPicker] = useState<PickerState | null>(null)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [localUpcoming, setLocalUpcoming] = useState<AllianceTechQueueItem[] | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  useEffect(() => {
    setLocalUpcoming(null)
  }, [queue])

  async function handleSelect(techName: string, category: 'development' | 'war') {
    setSaving(true)
    setSaveError(null)
    try {
      await addItem(techName, category)
      setPicker(null)
    } catch (err) {
      setSaveError((err as { message?: string }).message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleComplete() {
    setCompleting(true)
    setSaveError(null)
    try {
      await completeTop()
    } catch (err) {
      setSaveError((err as { message?: string }).message ?? 'Failed to complete')
    } finally {
      setCompleting(false)
    }
  }

  async function handleDemote() {
    setSaving(true)
    setSaveError(null)
    try {
      await demoteCurrent()
    } catch (err) {
      setSaveError((err as { message?: string }).message ?? 'Reorder failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 pb-24 flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-400 animate-pulse">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 pb-24">
        <p className="text-game-highlight text-sm">{error}</p>
      </div>
    )
  }

  const filteredTechs =
    picker?.category === 'development'
      ? DEVELOPMENT_TECHS
      : picker?.category === 'war'
      ? WAR_TECHS
      : []

  const displayTechs = picker?.search
    ? filteredTechs.filter(t => t.toLowerCase().includes(picker.search.toLowerCase()))
    : filteredTechs

  const [current, ...rest] = queue
  const upcoming = localUpcoming ?? rest

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = upcoming.findIndex(item => item.id === active.id)
    const newIndex = upcoming.findIndex(item => item.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(upcoming, oldIndex, newIndex)
    setLocalUpcoming(reordered)
    setSaveError(null)

    try {
      await reorderUpcoming(reordered.map(item => item.id))
    } catch (err) {
      setLocalUpcoming(null)
      setSaveError((err as { message?: string }).message ?? 'Reorder failed')
    }
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-game-gold">Ship Upgrades</h1>
        {isAdmin && (
          <button
            onClick={() => { setPicker({ category: null, search: '' }); setSaveError(null) }}
            className="text-xs text-game-standard border border-game-standard rounded px-3 py-1 hover:bg-game-standard hover:text-white transition-colors"
          >
            + Add
          </button>
        )}
      </div>
      <p className="text-gray-400 text-xs mb-6">Planned ship improvements in order</p>

      {queue.length === 0 ? (
        <p className="text-gray-500 italic text-sm text-center py-8">No techs queued</p>
      ) : (
        <div className="space-y-3">
          {/* Currently upgrading */}
          <div className="bg-game-card border-l-4 border-game-standard rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Currently Upgrading</p>
                <p className="text-lg font-bold text-white leading-tight">{current.tech_name}</p>
                <span className="inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded capitalize bg-game-standard text-white">
                  {current.category}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isAdmin && (
                  <>
                    <div className="flex flex-col gap-0.5">
                      <button
                        disabled={true}
                        className="w-6 h-5 flex items-center justify-center text-gray-700 rounded text-xs cursor-not-allowed"
                      >▲</button>
                      <button
                        disabled={saving || queue.length < 2}
                        onClick={handleDemote}
                        className="w-6 h-5 flex items-center justify-center text-gray-400 hover:text-white rounded text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >▼</button>
                    </div>
                    <button
                      onClick={handleComplete}
                      disabled={completing}
                      className="w-8 h-8 rounded-full border-2 border-green-500 flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white transition-colors disabled:opacity-50"
                      title="Mark complete"
                    >
                      ✓
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="bg-game-card border border-game-accent/30 rounded-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-game-accent/20">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Up Next</p>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={upcoming.map(item => item.id)} strategy={verticalListSortingStrategy}>
                  <div className="divide-y divide-game-accent/10">
                    {upcoming.map((item, i) => (
                      <SortableTechRow key={item.id} item={item} displayNumber={i + 2} isAdmin={isAdmin} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      )}

      {saveError && (
        <p className="mt-4 text-game-highlight text-sm">{saveError}</p>
      )}

      {/* Picker modal */}
      {picker && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-game-card border border-game-accent rounded-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
              <h2 className="text-game-gold font-bold">Add to Queue</h2>
              <button
                onClick={() => setPicker(null)}
                className="text-gray-400 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>

            {!picker.category ? (
              <div className="px-5 pb-6 space-y-3">
                <p className="text-xs text-gray-400">Choose category:</p>
                <button
                  onClick={() => setPicker(p => p && ({ ...p, category: 'development' }))}
                  className="w-full bg-game-dark border border-game-accent rounded-xl p-4 text-left hover:border-game-standard transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚙️</span>
                    <div>
                      <div className="font-semibold text-white">Development</div>
                      <div className="text-xs text-gray-400">{DEVELOPMENT_TECHS.length} technologies</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setPicker(p => p && ({ ...p, category: 'war' }))}
                  className="w-full bg-game-dark border border-game-accent rounded-xl p-4 text-left hover:border-game-highlight transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚔️</span>
                    <div>
                      <div className="font-semibold text-white">War</div>
                      <div className="text-xs text-gray-400">{WAR_TECHS.length} technologies</div>
                    </div>
                  </div>
                </button>
              </div>
            ) : (
              <>
                <div className="px-5 pb-3 shrink-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPicker(p => p && ({ ...p, category: null, search: '' }))}
                      className="text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      ← Back
                    </button>
                    <span className="text-xs text-gray-500 capitalize">{picker.category}</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={picker.search}
                    onChange={e => setPicker(p => p && ({ ...p, search: e.target.value }))}
                    className="w-full bg-game-dark border border-game-accent rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600"
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto px-5 pb-5 space-y-1">
                  {displayTechs.length === 0 ? (
                    <p className="text-gray-500 text-sm italic py-4 text-center">No results</p>
                  ) : (
                    displayTechs.map(tech => (
                      <button
                        key={tech}
                        disabled={saving}
                        onClick={() => handleSelect(tech, picker.category as 'development' | 'war')}
                        className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-white hover:bg-game-dark transition-colors disabled:opacity-50"
                      >
                        {tech}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}

            {saveError && (
              <p className="px-5 pb-4 text-game-highlight text-sm shrink-0">{saveError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify the build passes**

```bash
npm run build
```

Expected: succeeds with no TypeScript errors. (`moveUp`/`moveDown` are no longer referenced by this file but are still exported by the hook, so this doesn't break anything yet.)

- [ ] **Step 3: Commit**

```bash
git add src/pages/AllianceTech.tsx
git commit -m "feat: replace up/down buttons with drag-and-drop in tech queue"
```

---

### Task 5: Remove dead `moveUp`/`moveDown` from the hook

**Files:**
- Modify: `src/hooks/useAllianceTech.ts:51-67` (the `moveUp`/`moveDown` functions) and the return statement

- [ ] **Step 1: Remove `moveUp` and `moveDown`**

In `src/hooks/useAllianceTech.ts`, delete these two functions entirely:

```ts
  async function moveUp(index: number): Promise<void> {
    if (index === 0) return
    const a = queue[index - 1]
    const b = queue[index]
    await supabase.from('alliance_tech_queue').update({ position: b.position }).eq('id', a.id)
    await supabase.from('alliance_tech_queue').update({ position: a.position }).eq('id', b.id)
    await fetchData()
  }

  async function moveDown(index: number): Promise<void> {
    if (index === queue.length - 1) return
    const a = queue[index]
    const b = queue[index + 1]
    await supabase.from('alliance_tech_queue').update({ position: b.position }).eq('id', a.id)
    await supabase.from('alliance_tech_queue').update({ position: a.position }).eq('id', b.id)
    await fetchData()
  }

```

- [ ] **Step 2: Update the return statement**

Change:

```ts
  return {
    queue,
    loading,
    error,
    addItem,
    completeTop,
    moveUp,
    moveDown,
    demoteCurrent,
    reorderUpcoming,
    refresh: fetchData,
  }
```

to:

```ts
  return {
    queue,
    loading,
    error,
    addItem,
    completeTop,
    demoteCurrent,
    reorderUpcoming,
    refresh: fetchData,
  }
```

- [ ] **Step 3: Verify the build passes**

```bash
npm run build
```

Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useAllianceTech.ts
git commit -m "chore: remove unused moveUp/moveDown from tech queue hook"
```

---

### Task 6: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Expected: Vite prints a local URL (e.g. `http://localhost:5173`) with no startup errors.

- [ ] **Step 2: Load the app and check for console errors**

Open the printed URL in a browser, log in, and navigate to the "Ship Upgrades" tech page. Open the browser console and confirm there are no errors (in particular, no `@dnd-kit` warnings about missing `id`s or duplicate sortable items).

- [ ] **Step 3: Confirm read-only behavior for non-admins**

If logged in as a non-admin (or temporarily check `isAdmin` logic), confirm the "Up Next" list renders with no ⠿ handles and items cannot be dragged.

- [ ] **Step 4: Manually test drag-and-drop as an admin**

As an admin, with at least 3 items in the queue:
- Use the browser's device toolbar to emulate a mobile viewport (e.g. iPhone 14).
- Press and drag a row by its ⠿ handle to a new position. Confirm the row lifts (shadow) and other rows animate smoothly to make room.
- Drop it. Confirm the new order is reflected immediately (no "Loading..." flash) and the position numbers (`#2`, `#3`, ...) update correctly.
- Refresh the page and confirm the new order persisted.

- [ ] **Step 5: Confirm the pinned card controls still work**

- Click ✓ on "Currently Upgrading" and confirm the next item in "Up Next" is promoted to the pinned card.
- Click ▼ on "Currently Upgrading" (with 2+ items in the queue) and confirm it swaps with the first "Up Next" item.

- [ ] **Step 6: Stop the dev server**

```bash
# Ctrl+C in the terminal running `npm run dev`
```

This task has no commit — it's verification only. If any step fails, fix the issue in the relevant task's file and re-run `npm run build` plus the affected manual checks before moving on.
