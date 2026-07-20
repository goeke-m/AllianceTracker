# Canyon Storm Event Tracking — Design Spec

**Date:** 2026-07-18  
**Status:** Approved

---

## Overview

A new page in AllianceTracker for managing weekly Canyon Storm (CS) event participation. Structurally identical to the Desert Storm page but with no substitutes and two attendance statuses. Shares the same database tables, hook, and UI components as Desert Storm via a config-driven approach.

See also: `2026-07-18-desert-storm-tracking-design.md`

---

## Differences from Desert Storm

| Property | Desert Storm | Canyon Storm |
|---|---|---|
| Participants per team | 20 | 20 |
| Substitutes per team | 10 | **0 (no subs)** |
| Max roster per team | 30 | **20** |
| Attendance statuses | present / no_show / subbed_in | **present / no_show** |
| Nav tab label | "Desert Storm" | "Canyon Storm" |
| `event_type` value | `'ds'` | `'canyon'` |

Everything else is identical: admin-only writes, rolling 6-week no-show count, Sunday reset at 00:00 server time, full member list for picker, Total Team Power, history view.

---

## Shared Architecture

Canyon Storm reuses all infrastructure built for Desert Storm:

- **Database:** Same `storm_events` and `storm_roster` tables, filtered by `event_type = 'canyon'`
- **Hook:** `useStormEvent('canyon')` — same hook, different event type argument
- **Page component:** `StormPage` with Canyon config passed as props
- **Thin wrapper:** `src/pages/CanyonStorm.tsx` — passes config, renders `StormPage`

---

## Canyon Storm Config Object

```ts
const CANYON_STORM_CONFIG: StormConfig = {
  eventType: 'canyon',
  label: 'Canyon Storm',
  participantCap: 20,
  substituteCap: 0,
  attendanceStatuses: ['present', 'no_show'],
}
```

---

## Files to Create / Modify

| File | Action |
|---|---|
| `src/pages/CanyonStorm.tsx` | Create — thin wrapper passing Canyon config to `StormPage` |
| `src/components/NavBar.tsx` | Modify — add Canyon Storm tab (`'canyon'` page id) |
| `src/App.tsx` | Modify — add Canyon Storm page route |
| `src/lib/types.ts` | Modify — extend `Page` union with `'canyon'` |

All shared infrastructure (tables, hook, `StormPage`, types) is defined in the Desert Storm implementation plan.
