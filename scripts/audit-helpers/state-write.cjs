#!/usr/bin/env node
// Atomically update .audit-state/current/status.json.
// Usage:
//   node state-write.js init <runId>
//     → creates fresh status.json with all troops pending
//   node state-write.js claim <troop>
//     → sets troops.<troop>.state = "in_progress", returns "ok" or "blocked:<reason>"
//   node state-write.js done <troop>
//     → sets troops.<troop>.state = "done"
//   node state-write.js failed <troop> <msg>
//     → sets troops.<troop>.state = "failed", troops.<troop>.error = <msg>
//   node state-write.js set <troop>.<key> <value>
//     → sets arbitrary nested key
// Atomic write: writes to .tmp then renames.

const fs = require("fs");
const path = require("path");

const DIR = path.join(process.cwd(), ".audit-state", "current");
const FILE = path.join(DIR, "status.json");
const LOG = path.join(DIR, "log.jsonl");

const TROOPS = [
  "overseer",
  "bootstrapper",
  "spec-runner",
  "inspector-super-admin",
  "inspector-admin",
  "inspector-enterprise",
  "inspector-viewer",
  "inspector-conductor",
  "break-analyzer",
  "triage",
  "teardown",
];

// Each troop's dependencies (must be `done` before claim allowed)
const DEPS = {
  bootstrapper: [],
  "spec-runner": ["bootstrapper"],
  "inspector-super-admin": ["spec-runner"],
  "inspector-admin": ["spec-runner"],
  "inspector-enterprise": ["spec-runner"],
  "inspector-viewer": ["spec-runner"],
  "inspector-conductor": ["spec-runner"],
  "break-analyzer": ["spec-runner"],
  triage: [
    "inspector-super-admin",
    "inspector-admin",
    "inspector-enterprise",
    "inspector-viewer",
    "inspector-conductor",
    "break-analyzer",
  ],
  teardown: ["triage"],
};

function read() {
  if (!fs.existsSync(FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf-8").replace(/^﻿/, ""));
  } catch {
    return null;
  }
}

function writeAtomic(obj) {
  fs.mkdirSync(DIR, { recursive: true });
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, FILE);
}

function logEvent(event) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.appendFileSync(LOG, JSON.stringify({ ts: new Date().toISOString(), ...event }) + "\n");
}

function nowIso() { return new Date().toISOString(); }

function init(runId) {
  const obj = {
    runId,
    started_at: nowIso(),
    troops: Object.fromEntries(
      TROOPS.map((t) => [t, { state: "pending", ts: null }]),
    ),
  };
  obj.troops.overseer = { state: "done", ts: nowIso() };
  writeAtomic(obj);
  logEvent({ kind: "init", runId });
  process.stdout.write(`initialized ${runId}\n`);
}

function claim(troop) {
  const s = read();
  if (!s) { console.error("No run in progress. Run /troop-overseer first."); process.exit(2); }
  if (!s.troops[troop]) { console.error(`Unknown troop: ${troop}`); process.exit(2); }
  const cur = s.troops[troop];
  if (cur.state === "in_progress") { console.error(`Already claimed by another session at ${cur.ts}`); process.exit(3); }
  if (cur.state === "done") { console.error("Already done."); process.exit(4); }
  const deps = DEPS[troop] || [];
  const blocked = deps.filter((d) => s.troops[d] && s.troops[d].state !== "done");
  if (blocked.length) { console.error(`Blocked by: ${blocked.join(", ")}`); process.exit(5); }
  s.troops[troop] = { state: "in_progress", ts: nowIso() };
  writeAtomic(s);
  logEvent({ kind: "claim", troop });
  process.stdout.write("ok\n");
}

function done(troop) {
  const s = read();
  if (!s) { console.error("No run."); process.exit(2); }
  s.troops[troop] = { ...(s.troops[troop] || {}), state: "done", ts: nowIso() };
  writeAtomic(s);
  logEvent({ kind: "done", troop });
  process.stdout.write("ok\n");
}

function failed(troop, msg) {
  const s = read();
  if (!s) { console.error("No run."); process.exit(2); }
  s.troops[troop] = { ...(s.troops[troop] || {}), state: "failed", ts: nowIso(), error: msg };
  writeAtomic(s);
  logEvent({ kind: "failed", troop, error: msg });
  process.stdout.write("ok\n");
}

const [, , cmd, ...rest] = process.argv;
switch (cmd) {
  case "init":   init(rest[0]); break;
  case "claim":  claim(rest[0]); break;
  case "done":   done(rest[0]); break;
  case "failed": failed(rest[0], rest.slice(1).join(" ")); break;
  default:
    console.error("Usage: state-write.js {init <runId>|claim <troop>|done <troop>|failed <troop> <msg>}");
    process.exit(1);
}
