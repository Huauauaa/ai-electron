type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

function getRequiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`找不到页面元素: #${id}`);
  }
  return element as T;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

const inputEl = getRequiredElement<HTMLTextAreaElement>("input");
const outputEl = getRequiredElement<HTMLTextAreaElement>("output");
const indentEl = getRequiredElement<HTMLSelectElement>("indent");
const statusEl = getRequiredElement<HTMLDivElement>("status");

const formatBtn = getRequiredElement<HTMLButtonElement>("format-btn");
const minifyBtn = getRequiredElement<HTMLButtonElement>("minify-btn");
const clearBtn = getRequiredElement<HTMLButtonElement>("clear-btn");
const copyBtn = getRequiredElement<HTMLButtonElement>("copy-btn");
const sampleBtn = getRequiredElement<HTMLButtonElement>("sample-btn");

function setStatus(message: string, isError = false): void {
  statusEl.textContent = message;
  statusEl.className = isError ? "status" : "status ok";
}

function parseInput(): JsonValue {
  const raw = inputEl.value.trim();
  if (!raw) {
    throw new Error("请输入 JSON 内容。");
  }
  return JSON.parse(raw) as JsonValue;
}

function formatJson(): void {
  try {
    const parsed = parseInput();
    const indent = Number(indentEl.value || 2);
    outputEl.value = JSON.stringify(parsed, null, indent);
    setStatus("格式化成功。");
  } catch (error: unknown) {
    setStatus(`格式化失败：${getErrorMessage(error)}`, true);
  }
}

function minifyJson(): void {
  try {
    const parsed = parseInput();
    outputEl.value = JSON.stringify(parsed);
    setStatus("压缩成功。");
  } catch (error: unknown) {
    setStatus(`压缩失败：${getErrorMessage(error)}`, true);
  }
}

async function copyOutput(): Promise<void> {
  const content = outputEl.value;
  if (!content) {
    setStatus("没有可复制的内容。", true);
    return;
  }

  try {
    await navigator.clipboard.writeText(content);
    setStatus("输出内容已复制。");
  } catch (error: unknown) {
    setStatus(`复制失败：${getErrorMessage(error)}`, true);
  }
}

function clearAll(): void {
  inputEl.value = "";
  outputEl.value = "";
  setStatus("已清空输入与输出。");
}

function fillSample(): void {
  const sample: JsonValue = {
    name: "JSON Formatter",
    version: "1.0.0",
    enabled: true,
    features: ["format", "minify", "validate"],
    metadata: {
      createdAt: new Date().toISOString(),
      locale: "zh-CN",
    },
  };

  inputEl.value = JSON.stringify(sample);
  setStatus("示例 JSON 已填充。");
}

formatBtn.addEventListener("click", formatJson);
minifyBtn.addEventListener("click", minifyJson);
copyBtn.addEventListener("click", copyOutput);
clearBtn.addEventListener("click", clearAll);
sampleBtn.addEventListener("click", fillSample);

inputEl.addEventListener("keydown", (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "enter") {
    formatJson();
  }
});
