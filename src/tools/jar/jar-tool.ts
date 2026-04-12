import { getErrorMessage, getRequiredElement } from "../../shared/dom.js";

const jarPathEl = getRequiredElement<HTMLInputElement>("jar-path");
const jarJavaEl = getRequiredElement<HTMLInputElement>("jar-java");
const jarCwdEl = getRequiredElement<HTMLInputElement>("jar-cwd");
const jarJvmArgsEl = getRequiredElement<HTMLTextAreaElement>("jar-jvm-args");
const jarProgramArgsEl = getRequiredElement<HTMLTextAreaElement>("jar-program-args");
const jarTimeoutEl = getRequiredElement<HTMLInputElement>("jar-timeout");
const jarOutputEl = getRequiredElement<HTMLTextAreaElement>("jar-output");
const jarRunBtn = getRequiredElement<HTMLButtonElement>("jar-run-btn");
const jarClearBtn = getRequiredElement<HTMLButtonElement>("jar-clear-btn");
const statusJarEl = getRequiredElement<HTMLDivElement>("status-jar");

function setStatus(message: string, isError = false): void {
  statusJarEl.textContent = message;
  statusJarEl.className = isError ? "status" : "status ok";
}

function parseMultilineArgs(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parseJarTimeoutMs(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) {
    return 0;
  }
  const seconds = Number(trimmed);
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error("超时时间必须是大于等于 0 的数字（秒）。");
  }
  return Math.floor(seconds * 1000);
}

function formatJarRunOutput(result: {
  code: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}): string {
  const lines = [
    `退出码：${result.code === null ? "未知" : String(result.code)}`,
    `信号：${result.signal ?? "无"}`,
    result.timedOut ? "状态：已触发超时并尝试终止进程" : "状态：进程已结束",
    "",
    "---- stdout ----",
    result.stdout.trim() ? result.stdout : "(空)",
    "",
    "---- stderr ----",
    result.stderr.trim() ? result.stderr : "(空)",
  ];
  return lines.join("\n");
}

async function runJarTool(): Promise<void> {
  if (!window.jarRunner) {
    setStatus("当前页面未注入 JAR 运行能力，请使用 Electron 启动应用。", true);
    return;
  }

  const jarPath = jarPathEl.value.trim();
  if (!jarPath) {
    setStatus("请填写 JAR 路径。", true);
    return;
  }

  let timeoutMs = 0;
  try {
    timeoutMs = parseJarTimeoutMs(jarTimeoutEl.value);
  } catch (error: unknown) {
    setStatus(getErrorMessage(error), true);
    return;
  }

  const jvmArgs = parseMultilineArgs(jarJvmArgsEl.value);
  const programArgs = parseMultilineArgs(jarProgramArgsEl.value);
  const javaBinary = jarJavaEl.value.trim();
  const cwd = jarCwdEl.value.trim();

  jarRunBtn.disabled = true;
  setStatus("正在运行…");

  try {
    const result = await window.jarRunner.runJar({
      jarPath,
      jvmArgs,
      programArgs,
      javaBinary: javaBinary || undefined,
      cwd: cwd || undefined,
      timeoutMs,
    });
    jarOutputEl.value = formatJarRunOutput(result);
    if (result.timedOut) {
      setStatus("已结束：触发超时。", true);
    } else if (result.code !== 0) {
      setStatus(`已结束：退出码 ${result.code}。`, true);
    } else {
      setStatus("运行完成。");
    }
  } catch (error: unknown) {
    jarOutputEl.value = "";
    setStatus(getErrorMessage(error), true);
  } finally {
    jarRunBtn.disabled = false;
  }
}

function clearJarForm(): void {
  jarPathEl.value = "";
  jarJavaEl.value = "";
  jarCwdEl.value = "";
  jarJvmArgsEl.value = "";
  jarProgramArgsEl.value = "";
  jarTimeoutEl.value = "";
  jarOutputEl.value = "";
  setStatus("表单已清空。");
}

export function initJarTool(): void {
  jarRunBtn.addEventListener("click", () => {
    void runJarTool();
  });
  jarClearBtn.addEventListener("click", clearJarForm);
}
