import { contextBridge, ipcRenderer } from "electron";

import type {
  WorkHourListResult,
  WorkHourRefreshRequest,
  WorkHourRefreshResult,
} from "./shared/workhour-types.js";

export type JarRunRequest = {
  jarPath: string;
  jvmArgs: string[];
  programArgs: string[];
  javaBinary?: string;
  cwd?: string;
  timeoutMs?: number;
};

export type JarRunResult = {
  code: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

contextBridge.exposeInMainWorld("jarRunner", {
  runJar: (request: JarRunRequest): Promise<JarRunResult> =>
    ipcRenderer.invoke("jar:run", request),
});

contextBridge.exposeInMainWorld("workHourTool", {
  list: (): Promise<WorkHourListResult> => ipcRenderer.invoke("workhour:list"),
  refresh: (request: WorkHourRefreshRequest): Promise<WorkHourRefreshResult> =>
    ipcRenderer.invoke("workhour:refresh", request),
});
