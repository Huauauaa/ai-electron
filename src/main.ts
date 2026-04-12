import { app, BrowserWindow, ipcMain } from "electron";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

import type { JarRunRequest, JarRunResult } from "./preload";

const MAX_OUTPUT_CHARS = 512_000;

function truncateOutput(text: string): string {
  if (text.length <= MAX_OUTPUT_CHARS) {
    return text;
  }
  return `${text.slice(0, MAX_OUTPUT_CHARS)}\n\n…（输出已截断，共 ${text.length} 字符）`;
}

function parseStringListField(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label}必须是字符串数组。`);
  }
  return value.map((item, index) => {
    if (typeof item !== "string") {
      throw new Error(`${label}第 ${index + 1} 项必须是字符串。`);
    }
    return item;
  });
}

function registerJarRunnerIpc(): void {
  ipcMain.handle("jar:run", async (_event, raw: unknown): Promise<JarRunResult> => {
    if (!raw || typeof raw !== "object") {
      throw new Error("请求格式错误。");
    }
    const body = raw as Partial<JarRunRequest>;
    if (typeof body.jarPath !== "string") {
      throw new Error("请提供 JAR 路径字符串。");
    }
    const jarPath = body.jarPath.trim();
    if (!jarPath) {
      throw new Error("JAR 路径不能为空。");
    }
    if (!fs.existsSync(jarPath)) {
      throw new Error("找不到该路径下的文件。");
    }
    const stat = fs.statSync(jarPath);
    if (!stat.isFile()) {
      throw new Error("JAR 路径必须指向文件。");
    }

    const jvmArgs = parseStringListField(body.jvmArgs ?? [], "JVM 参数");
    const programArgs = parseStringListField(body.programArgs ?? [], "程序参数");

    const javaBinary =
      typeof body.javaBinary === "string" && body.javaBinary.trim()
        ? body.javaBinary.trim()
        : "java";
    const cwd =
      typeof body.cwd === "string" && body.cwd.trim() ? body.cwd.trim() : undefined;
    if (cwd && !fs.existsSync(cwd)) {
      throw new Error("工作目录不存在。");
    }
    if (cwd) {
      const cwdStat = fs.statSync(cwd);
      if (!cwdStat.isDirectory()) {
        throw new Error("工作目录必须是文件夹。");
      }
    }

    let timeoutMs = 0;
    if (body.timeoutMs !== undefined && body.timeoutMs !== null) {
      if (typeof body.timeoutMs !== "number" || !Number.isFinite(body.timeoutMs)) {
        throw new Error("超时时间必须是数字。");
      }
      timeoutMs = Math.max(0, Math.floor(body.timeoutMs));
    }

    const spawnArgs = [...jvmArgs, "-jar", jarPath, ...programArgs];

    return await new Promise<JarRunResult>((resolve, reject) => {
      const child = spawn(javaBinary, spawnArgs, {
        cwd,
        windowsHide: true,
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const timeoutId =
        timeoutMs > 0
          ? setTimeout(() => {
              timedOut = true;
              child.kill("SIGTERM");
            }, timeoutMs)
          : undefined;

      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk: string) => {
        stderr += chunk;
      });

      child.on("error", (error: NodeJS.ErrnoException) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (error.code === "ENOENT") {
          reject(
            new Error(
              `无法启动 Java：未找到命令「${javaBinary}」。请安装 JDK 或填写 Java 可执行文件路径。`,
            ),
          );
          return;
        }
        reject(error);
      });

      child.on("close", (code, signal) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        resolve({
          code,
          signal,
          stdout: truncateOutput(stdout),
          stderr: truncateOutput(stderr),
          timedOut,
        });
      });
    });
  });
}

function createWindow(): void {
  const preloadPath = path.join(__dirname, "preload.js");
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
    },
  });

  const indexPath = path.join(__dirname, "..", "src", "index.html");
  mainWindow.loadFile(indexPath);
}

app.whenReady().then(() => {
  registerJarRunnerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
