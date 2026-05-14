#!/usr/bin/env node
// Print a human-readable status board from .audit-state/current/status.json.
// Used by /troops skill.
const fs = require("fs");
const path = require("path");

const FILE = path.join(process.cwd(), ".audit-state", "current", "status.json");

if (!fs.existsSync(FILE)) {
  process.stdout.write("No audit run in progress. Start one with /troop-overseer.\n");
  process.exit(0);
}

const s = JSON.parse(fs.readFileSync(FILE, "utf-8").replace(/^﻿/, ""));
const symbols = { pending: "⋯", in_progress: "▶", done: "✓", failed: "✗" };

process.stdout.write(`# Audit run ${s.runId}\nStarted: ${s.started_at}\n\n`);
process.stdout.write("| Troop | State | Last update |\n|---|---|---|\n");
for (const [name, t] of Object.entries(s.troops)) {
  const sym = symbols[t.state] || "?";
  process.stdout.write(`| ${name} | ${sym} ${t.state} | ${t.ts ?? "—"} |\n`);
}

const counts = { pending: 0, in_progress: 0, done: 0, failed: 0 };
for (const t of Object.values(s.troops)) counts[t.state] = (counts[t.state] || 0) + 1;
process.stdout.write(`\n**${counts.done}/${Object.keys(s.troops).length} done**, ${counts.in_progress} in progress, ${counts.pending} pending`);
if (counts.failed) process.stdout.write(`, **${counts.failed} failed**`);
process.stdout.write("\n");

// Suggest next
const order = [
  "bootstrapper", "spec-runner",
  "inspector-super-admin", "inspector-admin", "inspector-enterprise", "inspector-viewer", "inspector-conductor",
  "break-analyzer", "triage", "teardown",
];
const next = order.find((t) => s.troops[t] && s.troops[t].state === "pending");
if (next) process.stdout.write(`\nNext suggested: \`/troop-${next}\`\n`);
else process.stdout.write(`\nAll troops complete. ✓\n`);
