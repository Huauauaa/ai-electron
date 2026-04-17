const DEFAULT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const MAX_REDIRECTS = 20;

function cookieHeaderFromJar(jar: Map<string, string>): string {
  return [...jar.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function mergeSetCookies(response: Response, jar: Map<string, string>): void {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const lines =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : splitSetCookieFallback(response.headers.get("set-cookie"));
  for (const line of lines) {
    const pair = line.split(";")[0]?.trim();
    if (!pair || !pair.includes("=")) {
      continue;
    }
    const eq = pair.indexOf("=");
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (name) {
      jar.set(name, value);
    }
  }
}

function splitSetCookieFallback(raw: string | null): string[] {
  if (!raw) {
    return [];
  }
  return [raw];
}

/**
 * GET with redirect handling and a mutable cookie jar (Set-Cookie merged each hop).
 */
export async function fetchWithCookieJar(
  startUrl: string,
  jar: Map<string, string>,
  accept: string,
): Promise<Response> {
  let currentUrl = startUrl;
  for (let i = 0; i < MAX_REDIRECTS; i++) {
    const cookieHeader = cookieHeaderFromJar(jar);
    const res = await fetch(currentUrl, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent": DEFAULT_UA,
        Accept: accept,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });
    mergeSetCookies(res, jar);

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) {
        throw new Error(`HTTP ${res.status} 响应缺少 Location。`);
      }
      await res.arrayBuffer().catch(() => undefined);
      currentUrl = new URL(loc, currentUrl).href;
      continue;
    }

    return res;
  }
  throw new Error(`重定向超过 ${MAX_REDIRECTS} 次。`);
}

export async function fetchLoginPage(loginUrl: string, jar: Map<string, string>): Promise<void> {
  const res = await fetchWithCookieJar(
    loginUrl,
    jar,
    "text/html,application/json,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  );
  if (res.status >= 400) {
    throw new Error(`登录页请求失败：HTTP ${res.status}`);
  }
  await res.text().catch(() => "");
}

export async function fetchWorkHourJson(
  workHourUrl: string,
  loginPageUrl: string,
  jar: Map<string, string>,
): Promise<unknown> {
  const cookieHeader = cookieHeaderFromJar(jar);
  let referer: string;
  try {
    referer = new URL(loginPageUrl).origin + "/";
  } catch {
    referer = loginPageUrl;
  }
  const res = await fetch(workHourUrl, {
    method: "GET",
    headers: {
      "User-Agent": DEFAULT_UA,
      Accept: "application/json, text/plain, */*",
      Referer: referer,
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`工时接口请求失败：HTTP ${res.status}`);
  }
  return (await res.json()) as unknown;
}

export function normalizeToRecordArray(parsed: unknown): Record<string, unknown>[] {
  if (Array.isArray(parsed)) {
    return parsed as Record<string, unknown>[];
  }
  if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as { data?: unknown }).data)
  ) {
    return (parsed as { data: Record<string, unknown>[] }).data;
  }
  throw new Error("接口返回不是 JSON 数组（也不包含 data 数组）。");
}
