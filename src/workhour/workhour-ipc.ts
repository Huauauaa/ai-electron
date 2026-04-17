import { ipcMain } from "electron";

import type {
  WorkHourListResult,
  WorkHourRefreshRequest,
  WorkHourRefreshResult,
} from "../shared/workhour-types.js";
import {
  fetchLoginPage,
  fetchWorkHourJson,
  normalizeToRecordArray,
} from "./cookie-fetch.js";
import { listWorkHourRecords, openWorkHourDatabase, upsertWorkHourRecords } from "./workhour-db.js";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseRefreshRequest(raw: unknown): WorkHourRefreshRequest {
  if (!raw || typeof raw !== "object") {
    throw new Error("请求格式错误。");
  }
  const body = raw as Partial<WorkHourRefreshRequest>;
  if (!isNonEmptyString(body.loginUrl)) {
    throw new Error("请填写 loginUrl。");
  }
  if (!isNonEmptyString(body.workHourUrl)) {
    throw new Error("请填写 workHourUrl。");
  }
  let loginUrl = body.loginUrl.trim();
  let workHourUrl = body.workHourUrl.trim();
  try {
    // Validate URLs early for clearer errors
    new URL(loginUrl);
    new URL(workHourUrl);
  } catch {
    throw new Error("loginUrl 或 workHourUrl 不是合法 URL。");
  }
  return { loginUrl, workHourUrl };
}

function getApiId(item: Record<string, unknown>): number {
  const id = item.id;
  if (typeof id === "number" && Number.isFinite(id)) {
    return id;
  }
  if (typeof id === "string" && /^\d+$/.test(id)) {
    return Number(id);
  }
  throw new Error("某条记录缺少数字字段 id。");
}

export function registerWorkHourIpc(): void {
  ipcMain.handle("workhour:list", (): WorkHourListResult => {
    openWorkHourDatabase();
    return { rows: listWorkHourRecords() };
  });

  ipcMain.handle("workhour:refresh", async (_event, raw: unknown): Promise<WorkHourRefreshResult> => {
    const { loginUrl, workHourUrl } = parseRefreshRequest(raw);
    openWorkHourDatabase();

    const jar = new Map<string, string>();
    await fetchLoginPage(loginUrl, jar);
    const json = await fetchWorkHourJson(workHourUrl, loginUrl, jar);
    const items = normalizeToRecordArray(json);

    const now = Date.now();
    const toSave: { apiId: number; payload: string; fetchedAt: number }[] = [];
    for (const item of items) {
      const apiId = getApiId(item);
      toSave.push({
        apiId,
        payload: JSON.stringify(item),
        fetchedAt: now,
      });
    }

    upsertWorkHourRecords(toSave);
    return {
      inserted: toSave.length,
      rows: listWorkHourRecords(),
    };
  });
}
