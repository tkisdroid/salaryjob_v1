---
quick_id: 260413-heo
plan: "01"
tasks: 1
---

# Quick 260413-heo — Availability editor: 7일 한 화면

## Root cause
`availability-editor.tsx:353-360` — grid has `minWidth: 480px` + `overflow-x-auto` wrapper. On mobile viewports <480px this forces horizontal scroll, which competes with the drag-to-select gesture (especially on 일요일 column at far right).

## Task 1

**Files:** `src/app/(worker)/my/availability/availability-editor.tsx`

**Action:**
- `CardContent` (line 353): drop `overflow-x-auto -mx-4 px-4` — no longer needed
- grid container (line 354-360): remove `minWidth: "480px"`, change `gridTemplateColumns` from `"48px repeat(7, 1fr)"` to `"28px repeat(7, minmax(0, 1fr))"` so 7 day columns compress to fit any viewport
- hour label cell (line 383): shrink padding `pr-2` → `pr-1`, keep `text-[10px]`; label stays "6시" (fits in 28px)
- day header cell (line 370): keep as-is (text sizing already small)

**Verify:**
- On 320px viewport width: all 7 columns visible, no horizontal scrollbar, no dragging to reach 일요일
- Drag still works vertically and horizontally within viewport
- Hour labels still readable

**Done:**
- No `overflow-x-auto` remains on the grid CardContent
- No `minWidth` style on grid
- `gridTemplateColumns` uses `minmax(0, 1fr)` to guarantee compression
