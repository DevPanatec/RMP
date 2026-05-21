# Triage cycle 2 — 2026-05-15

Verify-only cycle. Single auditor re-read every cycle-1 finding against the
post-worker code. Result: **21/21 fixed, 0 new regressions**.

## Stats
- P0 fixed: 7 / 7
- P1 fixed: 14 / 14
- NEW P0: 0
- NEW P1: 0
- NEW total: 0

## P0
(none)

## P1
(none)

## P2 (deferred — outside --severity scope, unchanged from cycle 1)
- BKND-13/14/15 minor polish
- FRNT-08/09/10/11 minor a11y + UX polish
- FRNT-13 CSS split maintainability
- XCUT-06 .env.example docs
- XCUT-08 server-side aggregation v2
- XCUT-13 KPI client-side compute
- XCUT-18/19 bulk ops + export

## Notes
- Constants drift (XCUT-01 P0) was resolved via **runtime parity check**, not full extraction. Banner surfaces in drawer + console warn if backend pricing diverges from frontend mirror. Refactor to single source remains a future cleanup task (P2).
- Convex generated types (`_generated/api.d.ts`, `internal.d.ts`) need `npx convex dev` to pick up new `getPlanConstants` query + `recomputeStorageDaily` internal mutation. Vite build passes regardless since they live server-side.
