import { getErrorMessage, getRequiredElement } from "../../shared/dom.js";

const LS_LOGIN = "workhour.loginUrl";
const LS_WORK = "workhour.workHourUrl";

type PayloadRow = Record<string, unknown>;

const TABLE_COLUMNS: { key: string; label: string }[] = [
  { key: "id", label: "id" },
  { key: "hrId", label: "hrId" },
  { key: "dataSource", label: "dataSource" },
  { key: "attendanceDate", label: "attendanceDate" },
  { key: "clockInDate", label: "clockInDate" },
  { key: "clockInTime", label: "clockInTime" },
  { key: "clockInType", label: "clockInType" },
  { key: "earlyClockInTime", label: "earlyClockInTime" },
  { key: "lateClockInTime", label: "lateClockInTime" },
  { key: "earlyClockTag", label: "earlyClockTag" },
  { key: "lateClockTag", label: "lateClockTag" },
  { key: "clockInReason", label: "clockInReason" },
  { key: "earlyClockInReason", label: "earlyClockInReason" },
  { key: "fetched_at", label: "同步时间" },
];

const loginUrlEl = getRequiredElement<HTMLInputElement>("workhour-login-url");
const workHourUrlEl = getRequiredElement<HTMLInputElement>("workhour-api-url");
const refreshBtn = getRequiredElement<HTMLButtonElement>("workhour-refresh-btn");
const tableHeadEl = getRequiredElement<HTMLTableSectionElement>("workhour-table-head");
const tableBodyEl = getRequiredElement<HTMLTableSectionElement>("workhour-table-body");
const statusWorkhourEl = getRequiredElement<HTMLDivElement>("status-workhour");

function setStatus(message: string, isError = false): void {
  statusWorkhourEl.textContent = message;
  statusWorkhourEl.className = isError ? "status" : "status ok";
}

function loadUrlsFromStorage(): void {
  try {
    const login = localStorage.getItem(LS_LOGIN);
    const work = localStorage.getItem(LS_WORK);
    if (login) {
      loginUrlEl.value = login;
    }
    if (work) {
      workHourUrlEl.value = work;
    }
  } catch {
    /* ignore */
  }
}

function saveUrlsToStorage(): void {
  try {
    localStorage.setItem(LS_LOGIN, loginUrlEl.value.trim());
    localStorage.setItem(LS_WORK, workHourUrlEl.value.trim());
  } catch {
    /* ignore */
  }
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function formatFetchedAt(ms: number): string {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}

function renderTable(
  rows: { api_id: number; payload: string; fetched_at: number }[],
): void {
  tableHeadEl.innerHTML = "";
  tableBodyEl.innerHTML = "";

  const headerRow = document.createElement("tr");
  for (const col of TABLE_COLUMNS) {
    const th = document.createElement("th");
    th.textContent = col.label;
    headerRow.appendChild(th);
  }
  tableHeadEl.appendChild(headerRow);

  if (rows.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = TABLE_COLUMNS.length;
    td.className = "workhour-empty";
    td.textContent = "暂无数据。填写 URL 后点击「刷新拉取」。";
    tr.appendChild(td);
    tableBodyEl.appendChild(tr);
    return;
  }

  for (const row of rows) {
    let parsed: PayloadRow;
    try {
      parsed = JSON.parse(row.payload) as PayloadRow;
    } catch {
      parsed = {};
    }
    const tr = document.createElement("tr");
    for (const col of TABLE_COLUMNS) {
      const td = document.createElement("td");
      if (col.key === "fetched_at") {
        td.textContent = formatFetchedAt(row.fetched_at);
      } else {
        td.textContent = formatCell(parsed[col.key]);
      }
      tr.appendChild(td);
    }
    tableBodyEl.appendChild(tr);
  }
}

async function loadList(): Promise<void> {
  if (!window.workHourTool) {
    setStatus("当前页面未注入工时工具，请使用 Electron 启动应用。", true);
    return;
  }
  try {
    const result = await window.workHourTool.list();
    renderTable(result.rows);
    setStatus(`已加载本地记录 ${result.rows.length} 条。`);
  } catch (error: unknown) {
    setStatus(`加载失败：${getErrorMessage(error)}`, true);
  }
}

async function refreshFromRemote(): Promise<void> {
  if (!window.workHourTool) {
    setStatus("当前页面未注入工时工具，请使用 Electron 启动应用。", true);
    return;
  }

  const loginUrl = loginUrlEl.value.trim();
  const workHourUrl = workHourUrlEl.value.trim();
  if (!loginUrl || !workHourUrl) {
    setStatus("请填写登录页 URL 与工时接口 URL。", true);
    return;
  }

  saveUrlsToStorage();
  refreshBtn.disabled = true;
  setStatus("正在请求登录页并拉取接口…");

  try {
    const result = await window.workHourTool.refresh({ loginUrl, workHourUrl });
    renderTable(result.rows);
    setStatus(`已写入 ${result.inserted} 条，当前本地共 ${result.rows.length} 条。`);
  } catch (error: unknown) {
    setStatus(`刷新失败：${getErrorMessage(error)}`, true);
  } finally {
    refreshBtn.disabled = false;
  }
}

export function initWorkHourTool(): void {
  loadUrlsFromStorage();
  refreshBtn.addEventListener("click", () => {
    void refreshFromRemote();
  });
  void loadList();
}
