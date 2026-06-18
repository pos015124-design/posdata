import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DROIDBOT_DB_PATH || path.join(process.cwd(), "data", "app.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  // Ensure directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _db = new Database(DB_PATH);
  _db.pragma("busy_timeout = 5000");
  _db.pragma("journal_mode = WAL");

  _db.exec(`
    CREATE TABLE IF NOT EXISTS download_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL DEFAULT 'unknown' CHECK(platform IN ('android', 'ios', 'desktop', 'unknown')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  return _db;
}
