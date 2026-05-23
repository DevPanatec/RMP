# enterprise findings — run ef5f474f

## P0

(none — enterprise role gates fully compliant)

## P1

- [P1-ENT-1] **Tab lock visual unclear** — Calendario / Mantenimiento / Inventario / Reportes tabs lack a clear lock icon (candado) or disabled visual treatment for enterprise role. Enterprise is read-only but blocked tabs aren't visually distinguished. **Impact**: UX confusion — user doesn't know which tabs are restricted vs. accessible. **Fix**: Apply candado lock-icon treatment used in viewer role to enterprise's blocked tabs in `AdminDashboard.jsx`.

## P2

- [P2-ENT-1] **Empty state copy implies write capability** — "Comienza agregando empleados" empty-state copy contradicts read-only design. **Impact**: Cosmetic UX mismatch. **Fix**: Change copy to "Ver empleados" or "No hay empleados visibles" for enterprise role.
- [P2-ENT-2] **"Modo Lectura" yellow badge wastes header space** — Persistent yellow badge in app-bar could auto-hide on scroll or use a smaller pill. **Impact**: Cosmetic. **Fix**: Reduce badge size or convert to a tooltip-on-hover indicator.

## Notes

- Screenshots analyzed: 9 viewports (enterprise/*.png across all)
- P0 STATUS: **EXCELLENT** — useCanWrite() hook properly applied. ZERO CRUD buttons visible. No cross-org data leaks.
- Previous audit P0s (unlocked tabs + visible CRUD buttons): **RESOLVED** ✓
- Role gate: server-side `requireWriteRole` working as designed.
