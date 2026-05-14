#!/usr/bin/env node
// Generate 8-char hex run ID. Used by troop-overseer at run start.
const { randomBytes } = require("crypto");
process.stdout.write(randomBytes(4).toString("hex"));
