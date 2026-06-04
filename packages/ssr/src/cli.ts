#!/usr/bin/env node
import { listen } from "./index.js";

const args = new Map<string, string>();

for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index]?.replace(/^--/, "");
  const value = process.argv[index + 1];

  if (key && value) {
    args.set(key, value);
  }
}

const entry = args.get("entry");

if (!entry) {
  console.error(
    "Usage: inertia-node-ssr --entry dist/ssr.js [--host 127.0.0.1] [--port 13714]",
  );
  process.exit(1);
}

await listen({
  entry,
  host: args.get("host") ?? "127.0.0.1",
  port: Number(args.get("port") ?? 13714),
});
