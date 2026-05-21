#!/usr/bin/env node
// Helpers for the /audit-heal-loop skill.
// Usage:
//   node heal-loop-helpers.cjs gen-runid                     → prints YYYY-MM-DD-HHmmss-<hash>
//   node heal-loop-helpers.cjs init <runId> <scopePath>      → creates state dir + scope.md + status.json
//   node heal-loop-helpers.cjs update <runId> <patchJSON>    → merge-patches status.json
//   node heal-loop-helpers.cjs read <runId>                  → prints status.json
//   node heal-loop-helpers.cjs list-runs                     → lists all runIds
//   node heal-loop-helpers.cjs count-findings <runId> <cyc>  → counts P0/P1/P2/P3 in cycle triage.md
//   node heal-loop-helpers.cjs ensure-cycle <runId> <cyc>    → mkdir cycle-N dir
//   node heal-loop-helpers.cjs log-event <runId> <eventJSON> → appends to log.jsonl

const fs = require("fs");
const path = require("path");
const { randomBytes } = require("crypto");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const STATE_ROOT = path.join(REPO_ROOT, ".audit-state", "heal-loop");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function runDir(runId) {
  return path.join(STATE_ROOT, runId);
}

function statusPath(runId) {
  return path.join(runDir(runId), "status.json");
}

function logPath(runId) {
  return path.join(runDir(runId), "log.jsonl");
}

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJSON(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n");
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function genRunId() {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const hash = randomBytes(3).toString("hex");
  return `${stamp}-${hash}`;
}

function logEvent(runId, event) {
  const line = JSON.stringify({ t: Date.now(), ...event }) + "\n";
  fs.appendFileSync(logPath(runId), line);
}

const CMD = {
  "gen-runid"() {
    process.stdout.write(genRunId());
  },

  init(runId, scopePath) {
    if (!runId || !scopePath) {
      throw new Error("Usage: init <runId> <scopePath>");
    }
    ensureDir(runDir(runId));
    // Copy scope to standard location if path provided
    const scopeDst = path.join(runDir(runId), "scope.md");
    if (fs.existsSync(scopePath)) {
      fs.copyFileSync(scopePath, scopeDst);
    } else {
      // Treat scopePath as inline text
      fs.writeFileSync(scopeDst, scopePath);
    }
    const status = {
      runId,
      cycle: 0,
      state: "init",
      p0_history: [],
      p1_history: [],
      cycles_completed: 0,
      started_at: Date.now(),
      finished_at: null,
      final_state: null, // "clean" | "max-cycles" | "stuck" | "build-failed" | "aborted"
    };
    writeJSON(statusPath(runId), status);
    logEvent(runId, { type: "init", scope: scopeDst });
    process.stdout.write(runId);
  },

  update(runId, patchJSON) {
    const patch = JSON.parse(patchJSON);
    const status = readJSON(statusPath(runId));
    const merged = { ...status, ...patch };
    writeJSON(statusPath(runId), merged);
    logEvent(runId, { type: "update", patch });
    process.stdout.write(JSON.stringify(merged, null, 2));
  },

  read(runId) {
    process.stdout.write(JSON.stringify(readJSON(statusPath(runId)), null, 2));
  },

  "list-runs"() {
    if (!fs.existsSync(STATE_ROOT)) {
      process.stdout.write("[]");
      return;
    }
    const runs = fs
      .readdirSync(STATE_ROOT)
      .filter((d) => fs.statSync(path.join(STATE_ROOT, d)).isDirectory())
      .sort()
      .reverse();
    process.stdout.write(JSON.stringify(runs, null, 2));
  },

  "count-findings"(runId, cycle) {
    const triage = path.join(runDir(runId), `cycle-${cycle}`, "triage.md");
    if (!fs.existsSync(triage)) {
      process.stdout.write(JSON.stringify({ P0: 0, P1: 0, P2: 0, P3: 0, total: 0 }));
      return;
    }
    const text = fs.readFileSync(triage, "utf8");
    // Count headings: ## P0, ## P1, ## P2, ## P3 sections then count finding lines starting with `- [` or `- **[`
    const counts = { P0: 0, P1: 0, P2: 0, P3: 0 };
    let current = null;
    for (const line of text.split(/\r?\n/)) {
      const h = line.match(/^##\s+(P[0-3])\b/);
      if (h) {
        current = h[1];
        continue;
      }
      if (line.match(/^##\s/)) {
        current = null;
        continue;
      }
      if (current && /^\s*-\s+(\*\*)?\[/.test(line)) {
        counts[current]++;
      }
    }
    counts.total = counts.P0 + counts.P1 + counts.P2 + counts.P3;
    process.stdout.write(JSON.stringify(counts));
  },

  "ensure-cycle"(runId, cycle) {
    const cycDir = path.join(runDir(runId), `cycle-${cycle}`);
    ensureDir(cycDir);
    process.stdout.write(cycDir);
  },

  "log-event"(runId, eventJSON) {
    logEvent(runId, JSON.parse(eventJSON));
    process.stdout.write("ok");
  },
};

const [, , cmd, ...args] = process.argv;
if (!cmd || !CMD[cmd]) {
  const known = Object.keys(CMD).join(", ");
  process.stderr.write(`Unknown command: ${cmd}\nAvailable: ${known}\n`);
  process.exit(1);
}

try {
  CMD[cmd](...args);
} catch (err) {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
}
