---
name: troop-break-analyzer
description: Analyze break.spec.ts adversarial results - WCAG contrast, keyboard nav, XSS, race conditions, logout cleanup, network leaks. Writes findings-raw/security.md. Must run after spec-runner.
allowed-tools: Read, Write, Bash, Glob
disable-model-invocation: false
---

# Mission

!`cat .audit-state/current/missions/break-analyzer.md 2>/dev/null || echo "(no mission)"`

## Audit rubric

!`cat .claude/skills/_audit-rubric.md`

## Steps

1. **Claim**: `node scripts/audit-helpers/state-write.cjs claim break-analyzer`.
2. **Read break artifacts**:
   - `audit/break/wcag-contrast.json` — ratios <4.5 (text) or <3.0 (large) = P0
   - `audit/break/keyboard-nav.json` — focus rings invisible (outline:none) = P0
   - `audit/break/logout-cleanup.json` — localStorage keys persisting = P1 (or P0 if sensitive)
   - `audit/break/xss-attempt.json` — xssFired=true = P0 CRITICAL; xssFired=false = positive finding
   - `audit/break/rapid-click.json` — verify if duplicates created (cross-ref `npx convex data vehiculos`)
   - `audit/break/network-sniff.json` — sensitive matches in non-Clerk responses
   - `audit/break/direct-url-probes.json` — role bypass via URL = P0
   - `audit/break/server-gate-viewer.json` — window.convex exposed = P1
3. **Apply rubric**, treat WCAG/a11y findings as P0 (gov tender requirement).
4. **Write** `.audit-state/current/findings-raw/security.md`. Include POSITIVE findings section (things that DON'T break — XSS escaped, rapid click no dup, etc).
5. **Mark done**: `node scripts/audit-helpers/state-write.cjs done break-analyzer`.
6. Report findings count.

## Gates

- Don't write to AUDIT_FINDINGS.md.
- If XSS actually fires (xssFired=true), flag P0 + alert user immediately in output.
