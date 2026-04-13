---
phase: quick-260413-heo
plan: "01"
subsystem: worker-availability
tags: [ux, layout, mobile, drag-scroll-conflict]
key_files:
  modified:
    - src/app/(worker)/my/availability/availability-editor.tsx
metrics:
  duration: ~5min
  completed: 2026-04-13
  tasks_completed: 1
  files_modified: 1
---

# Quick 260413-heo: Availability editor 7일 한 화면

**One-liner:** Drop `overflow-x-auto` + `minWidth: 480px` + shrink hour-label column to 28px so all 7 days fit in any mobile viewport, eliminating horizontal-scroll vs drag-to-select conflict on 일요일 column.

## Root cause

`availability-editor.tsx` grid had `minWidth: 480px` forcing horizontal scroll on viewports <480px. Sunday column was only reachable via left-right scroll, which competed with the touch drag gesture.

## Fix

- `CardContent` wrapper: dropped `overflow-x-auto -mx-4 px-4`
- grid `gridTemplateColumns`: `"48px repeat(7, 1fr)"` → `"28px repeat(7, minmax(0, 1fr))"`
- removed `minWidth: "480px"`
- hour label: `"{hour}시"` → `"{hour}"`, `pr-2` → `pr-1` (fits 28px column)

Vertical scroll remains (18 hours), but user confirmed current drag behavior is acceptable — the primary complaint (horizontal scroll stealing drags on 일요일) is fully resolved.

## Commit

`1a7914b` fix(quick-260413-heo): fit 7 days in viewport — drop overflow-x + minWidth (W3)
