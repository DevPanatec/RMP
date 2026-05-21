# /audit-heal-loop

Self-healing code audit cycle. Spawn auditors → fix findings → re-audit until clean.

## TL;DR

```bash
# Auditá la implementación X contra el plan
/audit-heal-loop super-admin panel vs propuestas/PLAN_SUPER_ADMIN_PANEL.html

# Solo diagnóstico, sin worker
/audit-heal-loop new feature X --no-fix

# Continuar un run abandonado
/audit-heal-loop --resume 2026-05-15-143022-abc123
```

## Cuándo usar

- Implementaste algo grande y querés validar que no se te escapó nada
- Tenés un plan/spec y querés verificar que el code matchea
- PR review automático (busca gaps, los arregla, valida con build)
- Refactor cross-cut donde es fácil olvidar un caso

## Cuándo NO usar

- Cambios chiquitos (un archivo, una función) — overkill
- UI E2E testing — usá `/troops` family
- Cambios destructivos pendientes de design — usá plan mode primero

## Flags

| Flag | Default | Notas |
|---|---|---|
| `--auditors N` | 3 | 1-5. Más = más cobertura pero más tokens |
| `--max-cycles N` | 3 | 1-5. Si el worker queda stuck antes, igual para |
| `--severity P0,P1` | P0 | Qué arregla el worker. P0 = bloqueantes. P0,P1 = bloqueantes + importantes |
| `--no-fix` | false | Solo audit + triage, no worker. Diagnostic mode |
| `--worker-mode serial` | serial | `parallel` deshabilitado en v1 (riesgo merge conflict) |

## Estructura de output

```
.audit-state/heal-loop/<runId>/
├── scope.md
├── status.json
├── cycle-1/
│   ├── audit-1.md, audit-2.md, audit-3.md  ← raw findings por auditor
│   ├── triage.md                            ← merged P0/P1/P2/P3
│   ├── worker-log.md                        ← fixes aplicados
│   └── build-error.log                      ← si build falló
├── cycle-2/...
├── FINAL_REPORT.md
└── log.jsonl
```

## Stop criteria (en orden)

1. **CLEAN** — P0 == 0 (y P1 == 0 si está en `--severity`)
2. **MAX-CYCLES** — alcanzó el límite sin clean
3. **STUCK** — P0 count no bajó vs cycle anterior (worker atascado)
4. **BUILD-FAILED** — `npm run build` rompió post-worker. Revierte + halt
5. **ABORTED** — user canceló

## Sanity gates (pausa pa' aprobar)

- Editar `convex/schema.ts`
- Patch >5 archivos en un batch
- `git reset --hard` / revert con cambios uncommitted
- Tocar `CLAUDE.md`, `package.json`, `.env.local`, `.mcp.json`
- Worker stuck 2 cycles
- Build fail antes de revertir

## Limitaciones conocidas (v1)

- **Worker mode parallel deshabilitado** — riesgo merge conflict. Serial es ~3-5min más lento pero seguro.
- **No commitea** — usuario decide. Reduces blast radius.
- **No revierte commits previos** — solo cambios in-progress del propio cycle.
- **Auditor severity bias** — si dos auditores discrepan, gana el más severo (conservador).
- **Requiere `npm run build`** — sin build script no hay guard.

## Diferencias vs `/troop-*` family

| | `/troop-*` | `/audit-heal-loop` |
|---|---|---|
| Target | Playwright UI E2E | Cualquier código |
| Infra | ALLOW_E2E, Convex, Clerk, screenshots | Solo el repo |
| Runtime | ~10 min full cycle | ~3-8 min depends scope |
| Auto-fix | Manual one-by-one | Bulk en cycle |
| Loop | No, single-shot | Sí hasta cero P0 |

## Ejemplo end-to-end

```bash
/audit-heal-loop super-admin panel implementation vs propuestas/PLAN_SUPER_ADMIN_PANEL.html --severity P0,P1
```

Salida esperada:
```
Starting heal-loop run 2026-05-15-143022-abc123.
Cycle 1: spawned 3 auditors... triage in 4m12s.
  P0: 28  P1: 12  P2: 6
  Top: backend gating gaps (rutas/asignaciones/cleaning/...)
Cycle 1 worker: 28 P0 fixes applied across 10 files.
  Build: PASS (12.3s)
Cycle 2: spawned 3 auditors... triage in 3m48s.
  P0: 0  P1: 0  P2: 6 ✓ CLEAN
Done — 2 cycles · 14 files modified · 40 findings resolved.
Report: .audit-state/heal-loop/2026-05-15-143022-abc123/FINAL_REPORT.md
```

## Troubleshooting

**Auditores tardan demasiado** — Cap los scope. Si scope es enorme, separá en runs más chicos.

**Worker se atasca (stuck)** — El finding repetido necesita intervención manual. Lee el `triage.md` del cycle stuck, arregla a mano, después corre `/audit-heal-loop --resume <runId>`.

**Build rompe siempre** — Algún auditor está reportando fixes incorrectos. Lee `cycle-N/triage.md` y `cycle-N/build-error.log`, ajustá manualmente.

**Re-correr el mismo audit sin cambios** — `--resume <runId>` solo si terminó incomplete. Si terminó clean, mejor un nuevo run pa' baseline.

## Roadmap

- v1.1 — `npm test` integrado post-build
- v1.2 — Slack notify al terminar loop largo
- v1.3 — Worker parallel mode con git worktrees
- v1.4 — Auditor caching (mismo scope → reuse findings)
- v2.0 — Routine schedulable via CronCreate (audit semanal automático)
