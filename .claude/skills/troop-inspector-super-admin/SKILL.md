---
name: troop-inspector-super-admin
description: Visually analyze all super_admin screenshots across viewports against the Fluent rubric + role gates. Reads screenshots with Read tool (PNG support), writes findings-raw/super-admin.md. super_admin role check focus - Organizaciones tab present, OrgSwitcher functional, all tabs unlocked. Must run after spec-runner.
allowed-tools: Read, Write, Bash, Glob, Grep
disable-model-invocation: false
---

# Mission

!`cat .audit-state/current/missions/inspector-super-admin.md 2>/dev/null || echo "(no mission)"`

## Audit rubric

!`cat .claude/skills/_audit-rubric.md`

## Steps

1. **Claim**: `node scripts/audit-helpers/state-write.cjs claim inspector-super-admin`.
2. **Glob screenshots**: `audit/*/super_admin/*.png` across all viewports.
3. **Read EACH PNG** with the Read tool (it supports visual analysis). Note layout issues, button visibility, contrast, overflow.
4. **Read console JSON**: `audit/*/super_admin/_console.json` for errors specific to this role.
5. **Read tabs JSON**: `audit/*/super_admin/_tabs.json` to confirm which tabs were clickable.
6. **Apply rubric per finding**, focus on super_admin-specific checks:
   - Org switcher visible + functional
   - Organizaciones tab visible (exclusive)
   - All 10 tabs accessible (no locked)
   - Sidebar Activity/Alerts tabs visible with badges (commit 890bed5)
   - Cross-org data visibility is BY DESIGN for super_admin (not a leak)
7. **Write** `.audit-state/current/findings-raw/super-admin.md` with structured P0/P1/P2 bullets + screenshot paths.
8. **Mark done**: `node scripts/audit-helpers/state-write.cjs done inspector-super-admin`.
9. Report count of findings to user.

## Gates

- Don't modify screenshots or test results.
- Don't write to AUDIT_FINDINGS.md (triage's job).
