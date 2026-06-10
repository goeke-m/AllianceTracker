# Alliance Tech Queue — Drag-and-Drop Reorder Design Spec

**Date:** 2026-06-10
**Status:** Approved

## Overview

Replace the ▲▼ up/down buttons on the "Up Next" list of the Alliance Tech page (`src/pages/AllianceTech.tsx`) with a modern drag-and-drop reorder interaction, using `@dnd-kit`. The pinned "Currently Upgrading" card and its existing controls are unchanged except where noted below.

---

## 1. Scope

- **In scope:** the "Up Next" list (queue items at index 1+) becomes a drag-and-drop sortable list, admin-only.
- **Out of scope / unchanged:**
  - The pinned "Currently Upgrading" card (index 0) stays a separate, non-draggable card at the top.
  - The ✓ "mark complete" button on the current item.
  - The picker modal for adding new techs.
  - Non-admin view (read-only list, no handles or drag).

## 2. Library

Add `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` as dependencies.

Rationale: actively maintained, accessible (keyboard + screen reader support), good touch support via `PointerSensor`, modular (~10kb total), and provides smooth reorder animations via `useSortable` + CSS transforms without extra libraries. Alternatives considered: framer-motion's `<Reorder>` (simpler API but a much heavier dependency not otherwise used in this project) and the native HTML5 Drag and Drop API (poor/inconsistent mobile touch support — not viable for a mobile-first PWA).

## 3. Interaction & Layout

- **"Currently Upgrading" card** (pinned, index 0): unchanged layout. Keeps:
  - Disabled ▲ button (visual placeholder, as today).
  - Active ▼ button — swaps position with item at index 1 (`demoteCurrent`). This is a simple, separate swap mechanism independent of the new drag list.
  - ✓ complete button.
- **"Up Next" list** (index 1+):
  - Each row's ▲▼ buttons are replaced by a single drag handle (⠿, `cursor-grab`) on the right edge of the row.
  - Rows are wrapped in `@dnd-kit`'s `<DndContext>` + `<SortableContext>` (vertical list strategy), using `PointerSensor` so the handle works with both mouse and touch.
  - While dragging: the active row gets a lift effect (slight scale + shadow), and other rows animate out of the way via `useSortable`'s built-in transform/transition. A dashed-border placeholder marks the drop target.
  - Position numbers (`#2`, `#3`, ...) update live as items reorder.
- **Non-admin view:** unchanged — static list, no handles, no drag context mounted.

## 4. Data Layer (`src/hooks/useAllianceTech.ts`)

### Removed
- `moveUp(index)`
- `moveDown(index)`

### Added
- **`demoteCurrent(): Promise<void>`**
  - Swaps `position` between `queue[0]` and `queue[1]` (no-op if `queue.length < 2`).
  - Same two-update pattern as the old `moveDown(0)`.
  - Powers the retained ▼ button on the pinned card.

- **`reorderUpcoming(orderedIds: string[]): Promise<void>`**
  - `orderedIds` is the new order of item IDs for `queue[1..]` (the "Up Next" items), as produced by the drag-end handler.
  - `queue[0]` (the pinned current item) and its `position` value are untouched.
  - Writes sequential `position` values starting at `queue[0].position + 1` for each ID in `orderedIds`, in order — one `update` call per item (queue sizes are small, so no batching needed).
  - After all updates succeed, calls `fetchData()` to refresh from the server.

### Optimistic update flow (in `AllianceTech.tsx`)
1. On drag end, compute the reordered `upcoming` array locally and update component state immediately so the UI reflects the new order with no delay.
2. Call `reorderUpcoming` with the new ID order.
3. On success: `fetchData()` (called inside `reorderUpcoming`) reconciles state with the server.
4. On error: revert the optimistic local order and show the error via the existing `saveError` state (same pattern as `handleMove`'s catch block).

## 5. Component Changes (`src/pages/AllianceTech.tsx`)

- Import `DndContext`, `closestCenter`, `PointerSensor`, `useSensor`, `useSensors` from `@dnd-kit/core`; `SortableContext`, `verticalListSortingStrategy`, `arrayMove`, `useSortable` from `@dnd-kit/sortable`; `CSS` from `@dnd-kit/utilities`.
- Extract each "Up Next" row into a new `SortableTechRow` component (in the same file or a new `src/components/SortableTechRow.tsx`) that:
  - Calls `useSortable({ id: item.id })`.
  - Renders the same content as the current row (position number, tech name, category badge).
  - Renders the ⠿ handle (only when `isAdmin`), wired to the `listeners`/`attributes` from `useSortable` so only the handle initiates drag.
  - Applies the `transform`/`transition` styles from `useSortable` to the row's wrapper for the lift/placeholder animation.
- The "Up Next" container:
  - When `isAdmin`: wrap the row list in `<DndContext sensors={...} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>` and `<SortableContext items={upcomingIds} strategy={verticalListSortingStrategy}>`.
  - When not admin: render the same rows without the DnD wrappers and without handles (plain static list, as today).
- `handleDragEnd`: on a valid drop with a changed position, use `arrayMove` to compute the new `upcoming` order, update local state, and call `reorderUpcoming` with the new ID list (try/catch + revert per the optimistic flow above).
- The pinned card's ▼ button now calls `demoteCurrent()` (via a `handleDemote` wrapper using the existing `saving`/`saveError` state pattern).

## 6. Testing

- Manual verification in the running dev app, including a mobile viewport:
  - Drag to reorder multiple "Up Next" items via the handle; confirm order persists after a page refresh.
  - Confirm the pinned card's ▼ demote button still swaps the current item with item #2.
  - Confirm ✓ complete still advances the queue correctly.
  - Confirm non-admin users see a static, non-interactive "Up Next" list (no handles).
  - Confirm dragging on the handle does not also trigger page scroll on touch.
