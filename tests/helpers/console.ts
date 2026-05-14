import { Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

export type CapturedEvent = {
  type: "console" | "pageerror" | "requestfailed";
  level?: string;
  text: string;
  url?: string;
  timestamp: number;
};

// Attach listeners that capture console messages, page errors, and failed
// network requests to a per-test JSON file. Dumps at the end via dump().

export function attachConsoleRecorder(page: Page) {
  const events: CapturedEvent[] = [];

  page.on("console", (msg) => {
    events.push({
      type: "console",
      level: msg.type(),
      text: msg.text(),
      url: msg.location().url,
      timestamp: Date.now(),
    });
  });
  page.on("pageerror", (err) => {
    events.push({
      type: "pageerror",
      text: `${err.name}: ${err.message}\n${err.stack ?? ""}`,
      timestamp: Date.now(),
    });
  });
  page.on("requestfailed", (req) => {
    events.push({
      type: "requestfailed",
      text: `${req.method()} ${req.url()} — ${req.failure()?.errorText ?? "unknown"}`,
      url: req.url(),
      timestamp: Date.now(),
    });
  });

  return {
    events,
    dump(role: string, project = "headless") {
      const dir = path.join(process.cwd(), "audit", project, role);
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, "_console.json");
      fs.writeFileSync(file, JSON.stringify(events, null, 2));
      return file;
    },
  };
}
