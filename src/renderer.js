"use strict";
function getRequiredElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`找不到页面元素: #${id}`);
    }
    return element;
}
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
const inputEl = getRequiredElement("input");
const outputEl = getRequiredElement("output");
const indentEl = getRequiredElement("indent");
const statusEl = getRequiredElement("status");
const formatBtn = getRequiredElement("format-btn");
const minifyBtn = getRequiredElement("minify-btn");
const clearBtn = getRequiredElement("clear-btn");
const copyBtn = getRequiredElement("copy-btn");
const sampleBtn = getRequiredElement("sample-btn");
function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.className = isError ? "status" : "status ok";
}
function parseInput() {
    const raw = inputEl.value.trim();
    if (!raw) {
        throw new Error("请输入 JSON 内容。");
    }
    return JSON.parse(raw);
}
function formatJson() {
    try {
        const parsed = parseInput();
        const indent = Number(indentEl.value || 2);
        outputEl.value = JSON.stringify(parsed, null, indent);
        setStatus("格式化成功。");
    }
    catch (error) {
        setStatus(`格式化失败：${getErrorMessage(error)}`, true);
    }
}
function minifyJson() {
    try {
        const parsed = parseInput();
        outputEl.value = JSON.stringify(parsed);
        setStatus("压缩成功。");
    }
    catch (error) {
        setStatus(`压缩失败：${getErrorMessage(error)}`, true);
    }
}
async function copyOutput() {
    const content = outputEl.value;
    if (!content) {
        setStatus("没有可复制的内容。", true);
        return;
    }
    try {
        await navigator.clipboard.writeText(content);
        setStatus("输出内容已复制。");
    }
    catch (error) {
        setStatus(`复制失败：${getErrorMessage(error)}`, true);
    }
}
function clearAll() {
    inputEl.value = "";
    outputEl.value = "";
    setStatus("已清空输入与输出。");
}
function fillSample() {
    const sample = {
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
inputEl.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "enter") {
        formatJson();
    }
});
