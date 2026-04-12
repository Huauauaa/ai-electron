import { contextBridge, ipcRenderer } from "electron";

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
