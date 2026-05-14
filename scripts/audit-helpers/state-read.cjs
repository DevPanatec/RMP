#!/usr/bin/env node
// Read a key from .audit-state/current/status.json. Returns "null" if missing.
// Usage:
//   node state-read.js                       → full JSON to stdout
//   node state-read.js runId                 → runId field
//   node state-read.js troops.bootstrapper   → nested path
const fs = require("fs");
const path = require("path");

const FILE = path.join(process.cwd(), ".audit-state", "current", "status.json");

function readState() {
  if (!fs.existsSync(FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf-8").replace(/^﻿/, ""));
  } catch {
    return null;
  }
}

function getPath(obj, p) {
  if (!p) return obj;
  return p.split(".").reduce((o, k) => (o == null ? null : o[k]), obj);
}

const state = readState();
const arg = process.argv[2];
const val = getPath(state, arg);
process.stdout.write(val == null ? "null" : (typeof val === "object" ? JSON.stringify(val) : String(val)));
