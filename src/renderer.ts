import { getRequiredElement } from "./shared/dom.js";
import { initCronTool } from "./tools/cron/cron-tool.js";
import { initJarTool } from "./tools/jar/jar-tool.js";
import { initJsonTool } from "./tools/json/json-tool.js";

const tabJsonBtn = getRequiredElement<HTMLButtonElement>("tab-json");
const tabCronBtn = getRequiredElement<HTMLButtonElement>("tab-cron");
const tabJarBtn = getRequiredElement<HTMLButtonElement>("tab-jar");
const panelJsonEl = getRequiredElement<HTMLDivElement>("panel-json");
const panelCronEl = getRequiredElement<HTMLDivElement>("panel-cron");
const panelJarEl = getRequiredElement<HTMLDivElement>("panel-jar");

function switchTab(target: "json" | "cron" | "jar"): void {
  tabJsonBtn.classList.toggle("active", target === "json");
  tabCronBtn.classList.toggle("active", target === "cron");
  tabJarBtn.classList.toggle("active", target === "jar");
  panelJsonEl.classList.toggle("active", target === "json");
  panelCronEl.classList.toggle("active", target === "cron");
  panelJarEl.classList.toggle("active", target === "jar");
}

initJsonTool();
initCronTool();
initJarTool();

tabJsonBtn.addEventListener("click", () => switchTab("json"));
tabCronBtn.addEventListener("click", () => switchTab("cron"));
tabJarBtn.addEventListener("click", () => switchTab("jar"));
