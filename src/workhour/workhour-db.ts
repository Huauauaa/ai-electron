import path from "path";
import { app } from "electron";
import { DatabaseSync } from "node:sqlite";

import type { WorkHourRecordRow } from "../shared/workhour-types.js";

let db: DatabaseSync | null = null;

function getDbPath(): string {
  return path.join(app.getPath("userData"), "workhour.sqlite");
}

export function openWorkHourDatabase(): DatabaseSync {
  if (db) {
    return db;
  }
  try {
    const dbPath = getDbPath();
    const database = new DatabaseSync(dbPath);
    database.exec(`
      CREATE TABLE IF NOT EXISTS work_hour_records (
        api_id INTEGER PRIMARY KEY,
        payload TEXT NOT NULL,
        fetched_at INTEGER NOT NULL
      );
    `);
    db = database;
    return database;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `无法打开本地 SQLite（node:sqlite）：${message}。请使用内置 Node 22+ 的 Electron（如 37+）。`,
    );
  }
}

export function upsertWorkHourRecords(rows: { apiId: number; payload: string; fetchedAt: number }[]): void {
  const database = openWorkHourDatabase();
  const stmt = database.prepare(
    `INSERT OR REPLACE INTO work_hour_records (api_id, payload, fetched_at) VALUES (?, ?, ?)`,
  );
  for (const row of rows) {
    stmt.run(row.apiId, row.payload, row.fetchedAt);
  }
}

export function listWorkHourRecords(): WorkHourRecordRow[] {
  const database = openWorkHourDatabase();
  const stmt = database.prepare(
    `SELECT api_id, payload, fetched_at FROM work_hour_records ORDER BY fetched_at DESC, api_id DESC`,
  );
  const raw = stmt.all() as { api_id: number; payload: string; fetched_at: number }[];
  return raw.map((r) => ({
    api_id: r.api_id,
    payload: r.payload,
    fetched_at: r.fetched_at,
  }));
}
