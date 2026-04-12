import { getErrorMessage, getRequiredElement } from "../../shared/dom.js";

type CronField = "minute" | "hour" | "dayOfMonth" | "month" | "dayOfWeek";

type CronFieldConfig = {
  key: CronField;
  label: string;
  min: number;
  max: number;
};

type CronParsed = {
  expression: string;
  minute: Set<number>;
  hour: Set<number>;
  dayOfMonth: Set<number>;
  month: Set<number>;
  dayOfWeek: Set<number>;
  minuteAny: boolean;
  hourAny: boolean;
  dayOfMonthAny: boolean;
  monthAny: boolean;
  dayOfWeekAny: boolean;
};

const CRON_FIELDS: CronFieldConfig[] = [
  { key: "minute", label: "分钟", min: 0, max: 59 },
  { key: "hour", label: "小时", min: 0, max: 23 },
  { key: "dayOfMonth", label: "日期", min: 1, max: 31 },
  { key: "month", label: "月份", min: 1, max: 12 },
  { key: "dayOfWeek", label: "星期", min: 0, max: 7 },
];

const cronExpressionEl = getRequiredElement<HTMLInputElement>("cron-expression");
const cronMinuteEl = getRequiredElement<HTMLInputElement>("cron-minute");
const cronHourEl = getRequiredElement<HTMLInputElement>("cron-hour");
const cronDayOfMonthEl = getRequiredElement<HTMLInputElement>("cron-day-of-month");
const cronMonthEl = getRequiredElement<HTMLInputElement>("cron-month");
const cronDayOfWeekEl = getRequiredElement<HTMLInputElement>("cron-day-of-week");
const cronOutputEl = getRequiredElement<HTMLTextAreaElement>("cron-output");
const statusCronEl = getRequiredElement<HTMLDivElement>("status-cron");

const cronValidateBtn = getRequiredElement<HTMLButtonElement>("cron-validate-btn");
const cronPreviewBtn = getRequiredElement<HTMLButtonElement>("cron-preview-btn");
const cronSampleBtn = getRequiredElement<HTMLButtonElement>("cron-sample-btn");
const cronClearBtn = getRequiredElement<HTMLButtonElement>("cron-clear-btn");
const cronBuildBtn = getRequiredElement<HTMLButtonElement>("cron-build-btn");

function setStatus(message: string, isError = false): void {
  statusCronEl.textContent = message;
  statusCronEl.className = isError ? "status" : "status ok";
}

function normalizeDayOfWeekValue(value: number): number {
  return value === 7 ? 0 : value;
}

function parseCronFieldToken(
  token: string,
  config: CronFieldConfig,
): number[] {
  const slashParts = token.split("/");
  if (slashParts.length > 2) {
    throw new Error(`${config.label}字段不合法：${token}`);
  }

  const [basePart, stepPart] = slashParts;
  const hasStep = slashParts.length === 2;
  const step = hasStep ? Number(stepPart) : 1;
  if (!Number.isInteger(step) || step <= 0) {
    throw new Error(`${config.label}字段步长必须是正整数：${token}`);
  }

  let rangeStart = config.min;
  let rangeEnd = config.max;

  if (basePart !== "*") {
    const rangeParts = basePart.split("-");
    if (rangeParts.length === 1) {
      const value = Number(rangeParts[0]);
      if (!Number.isInteger(value)) {
        throw new Error(`${config.label}字段不是整数：${token}`);
      }
      rangeStart = value;
      rangeEnd = value;
    } else if (rangeParts.length === 2) {
      rangeStart = Number(rangeParts[0]);
      rangeEnd = Number(rangeParts[1]);
      if (!Number.isInteger(rangeStart) || !Number.isInteger(rangeEnd)) {
        throw new Error(`${config.label}字段范围非法：${token}`);
      }
      if (rangeStart > rangeEnd) {
        throw new Error(`${config.label}字段范围起点不能大于终点：${token}`);
      }
    } else {
      throw new Error(`${config.label}字段范围格式错误：${token}`);
    }
  }

  if (rangeStart < config.min || rangeEnd > config.max) {
    throw new Error(
      `${config.label}字段超出范围（${config.min}-${config.max}）：${token}`,
    );
  }

  const values: number[] = [];
  for (let value = rangeStart; value <= rangeEnd; value += step) {
    values.push(
      config.key === "dayOfWeek" ? normalizeDayOfWeekValue(value) : value,
    );
  }

  if (values.length === 0) {
    throw new Error(`${config.label}字段解析为空：${token}`);
  }
  return values;
}

function parseCronField(raw: string, config: CronFieldConfig): Set<number> {
  const content = raw.trim();
  if (!content) {
    throw new Error(`${config.label}字段不能为空。`);
  }

  const tokens = content.split(",");
  const values = new Set<number>();
  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) {
      throw new Error(`${config.label}字段包含空项：${raw}`);
    }
    for (const parsed of parseCronFieldToken(trimmed, config)) {
      values.add(parsed);
    }
  }

  if (values.size === 0) {
    throw new Error(`${config.label}字段解析为空：${raw}`);
  }
  return values;
}

function parseCronExpression(expression: string): CronParsed {
  const normalized = expression.trim().replace(/\s+/g, " ");
  if (!normalized) {
    throw new Error("请输入 cron 表达式。");
  }

  const parts = normalized.split(" ");
  if (parts.length !== 5) {
    throw new Error("cron 表达式必须是 5 段：分 时 日 月 周。");
  }

  const minuteRaw = parts[0];
  const hourRaw = parts[1];
  const dayOfMonthRaw = parts[2];
  const monthRaw = parts[3];
  const dayOfWeekRaw = parts[4];

  return {
    expression: normalized,
    minute: parseCronField(minuteRaw, CRON_FIELDS[0]),
    hour: parseCronField(hourRaw, CRON_FIELDS[1]),
    dayOfMonth: parseCronField(dayOfMonthRaw, CRON_FIELDS[2]),
    month: parseCronField(monthRaw, CRON_FIELDS[3]),
    dayOfWeek: parseCronField(dayOfWeekRaw, CRON_FIELDS[4]),
    minuteAny: minuteRaw === "*",
    hourAny: hourRaw === "*",
    dayOfMonthAny: dayOfMonthRaw === "*",
    monthAny: monthRaw === "*",
    dayOfWeekAny: dayOfWeekRaw === "*",
  };
}

function setToSortedString(values: Set<number>): string {
  return [...values].sort((a, b) => a - b).join(", ");
}

function formatDate(date: Date): string {
  const weekNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute} ${weekNames[date.getDay()]}`;
}

function isCronMatch(parsed: CronParsed, date: Date): boolean {
  const minute = date.getMinutes();
  const hour = date.getHours();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1;
  const dayOfWeek = date.getDay();

  if (!parsed.minute.has(minute)) {
    return false;
  }
  if (!parsed.hour.has(hour)) {
    return false;
  }
  if (!parsed.month.has(month)) {
    return false;
  }

  const dayOfMonthMatch = parsed.dayOfMonth.has(dayOfMonth);
  const dayOfWeekMatch = parsed.dayOfWeek.has(dayOfWeek);

  if (parsed.dayOfMonthAny && parsed.dayOfWeekAny) {
    return true;
  }
  if (parsed.dayOfMonthAny) {
    return dayOfWeekMatch;
  }
  if (parsed.dayOfWeekAny) {
    return dayOfMonthMatch;
  }
  return dayOfMonthMatch || dayOfWeekMatch;
}

function getNextRunTimes(
  parsed: CronParsed,
  count: number,
  fromDate: Date,
): Date[] {
  const results: Date[] = [];
  const cursor = new Date(fromDate.getTime());
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  const maxIterations = 24 * 60 * 366 * 5;
  let iteration = 0;

  while (results.length < count && iteration < maxIterations) {
    if (isCronMatch(parsed, cursor)) {
      results.push(new Date(cursor.getTime()));
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
    iteration += 1;
  }

  return results;
}

function fillCronFieldsFromExpression(expression: string): void {
  const parts = expression.trim().replace(/\s+/g, " ").split(" ");
  if (parts.length !== 5) {
    return;
  }
  cronMinuteEl.value = parts[0];
  cronHourEl.value = parts[1];
  cronDayOfMonthEl.value = parts[2];
  cronMonthEl.value = parts[3];
  cronDayOfWeekEl.value = parts[4];
}

function buildCronExpressionFromFields(): string {
  const values = [
    cronMinuteEl.value.trim() || "*",
    cronHourEl.value.trim() || "*",
    cronDayOfMonthEl.value.trim() || "*",
    cronMonthEl.value.trim() || "*",
    cronDayOfWeekEl.value.trim() || "*",
  ];
  return values.join(" ");
}

function renderCronValidation(parsed: CronParsed): void {
  const lines = [
    `表达式：${parsed.expression}`,
    "校验：通过",
    "",
    `分钟: ${setToSortedString(parsed.minute)}`,
    `小时: ${setToSortedString(parsed.hour)}`,
    `日期: ${setToSortedString(parsed.dayOfMonth)}`,
    `月份: ${setToSortedString(parsed.month)}`,
    `星期: ${setToSortedString(parsed.dayOfWeek)}`,
  ];
  cronOutputEl.value = lines.join("\n");
}

function validateCronExpression(): void {
  try {
    const parsed = parseCronExpression(cronExpressionEl.value);
    fillCronFieldsFromExpression(parsed.expression);
    renderCronValidation(parsed);
    setStatus("Cron 表达式校验通过。");
  } catch (error: unknown) {
    setStatus(`Cron 校验失败：${getErrorMessage(error)}`, true);
  }
}

function previewCronRuns(): void {
  try {
    const parsed = parseCronExpression(cronExpressionEl.value);
    fillCronFieldsFromExpression(parsed.expression);

    const nextRuns = getNextRunTimes(parsed, 5, new Date());
    if (nextRuns.length === 0) {
      throw new Error("在可搜索范围内未找到匹配时间，请检查表达式。");
    }

    const lines = [
      `表达式：${parsed.expression}`,
      "未来 5 次执行时间：",
      ...nextRuns.map((date, index) => `${index + 1}. ${formatDate(date)}`),
    ];
    cronOutputEl.value = lines.join("\n");
    setStatus("已生成未来执行时间。");
  } catch (error: unknown) {
    setStatus(`预览失败：${getErrorMessage(error)}`, true);
  }
}

function fillCronSample(): void {
  const sampleExpression = "*/15 9-18 * * 1-5";
  cronExpressionEl.value = sampleExpression;
  fillCronFieldsFromExpression(sampleExpression);
  setStatus("Cron 示例已填充。");
}

function clearCron(): void {
  cronExpressionEl.value = "";
  cronMinuteEl.value = "*";
  cronHourEl.value = "*";
  cronDayOfMonthEl.value = "*";
  cronMonthEl.value = "*";
  cronDayOfWeekEl.value = "*";
  cronOutputEl.value = "";
  setStatus("Cron 输入已清空。");
}

function buildCronFromFields(): void {
  try {
    const expression = buildCronExpressionFromFields();
    const parsed = parseCronExpression(expression);
    cronExpressionEl.value = parsed.expression;
    renderCronValidation(parsed);
    setStatus("已从字段生成并校验 Cron 表达式。");
  } catch (error: unknown) {
    setStatus(`生成失败：${getErrorMessage(error)}`, true);
  }
}

export function initCronTool(): void {
  cronValidateBtn.addEventListener("click", validateCronExpression);
  cronPreviewBtn.addEventListener("click", previewCronRuns);
  cronSampleBtn.addEventListener("click", fillCronSample);
  cronClearBtn.addEventListener("click", clearCron);
  cronBuildBtn.addEventListener("click", buildCronFromFields);

  cronExpressionEl.addEventListener("keydown", (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "enter") {
      previewCronRuns();
    }
  });
}
