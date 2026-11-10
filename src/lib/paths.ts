import fs from "node:fs";
import path from "node:path";

export function dataDir(): string {
  const dir = process.env.RADAR_DATA_DIR || "./data";
  const resolved = path.resolve(dir);
  fs.mkdirSync(resolved, { recursive: true });
  return resolved;
}

export function dbPath(): string {
  return path.join(dataDir(), "radar.db");
}

export function imagesDir(): string {
  const dir = path.join(dataDir(), "images");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function scoutProfileDir(): string {
  const dir = path.join(dataDir(), "scout-profile");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function logPath(): string {
  return path.join(dataDir(), "radar.log");
}
