import { appBase } from "./router";

type ATPConfig = {
  mode?: "remote" | "demo";
  apiBase?: string;
  anonKey?: string;
  build?: string;
};

const SESSION_KEY = "atp-v69-session";
const CUSTOMER_PREFIX = "atp-v69-customer:";

function cleanCode(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase().replace(/\/+|\s+/g, "-");
}
function customerKey(code: string) { return `${CUSTOMER_PREFIX}${cleanCode(code)}`; }
function currentTrackingCode() {
  const query = new URLSearchParams(window.location.search).get("code");
  if (query) return cleanCode(query);
  const parts = window.location.pathname.split("/").filter(Boolean);
  const at = parts.indexOf("track");
  return cleanCode(at >= 0 ? parts[at + 1] : "");
}

async function readConfig(): Promise<ATPConfig> {
  try {
    const response = await fetch(`${appBase}atp-config.json`, { cache: "no-store" });
    if (!response.ok) return { mode: "demo" };
    return await response.json() as ATPConfig;
  } catch {
    return { mode: "demo" };
  }
}

function rawHeaders(input: RequestInfo | URL, init: RequestInit) {
  const source = input instanceof Request ? input.headers : undefined;
  return new Headers(init.headers ?? source ?? undefined);
}

function apiRoute(url: URL) {
  const path = url.pathname;
  const marker = "/api/";
  const at = path.indexOf(marker);
  return at >= 0 ? path.slice(at + 1).replace(/^\/+/, "") : "";
}

function cloneJsonResponse(body: unknown, source: Response) {
  const headers = new Headers(source.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status: source.status, statusText: source.statusText, headers });
}

function rememberReturnedCredentials(route: string, method: string, body: any, response: Response, result: any) {
  const session = response.headers.get("x-atp-session") || result?.sessionToken || result?.data?.sessionToken;
  if (session && ["api/team/login", "api/staff/status"].includes(route)) sessionStorage.setItem(SESSION_KEY, session);
  if (["api/owner/logout", "api/admin/logout"].includes(route) && response.ok) sessionStorage.removeItem(SESSION_KEY);

  if (route === "api/workflow/public" && response.ok) {
    const returnedCode = cleanCode(result?.data?.code);
    const requestedCode = cleanCode(body?.code);
    const token = result?.data?.accessToken;
    if (token) {
      if (returnedCode) localStorage.setItem(customerKey(returnedCode), token);
      if (requestedCode) localStorage.setItem(customerKey(requestedCode), token);
    }
  }
}

export async function installRemoteApi() {
  const config = await readConfig();
  if (config.mode !== "remote" || !/^https:\/\//i.test(config.apiBase?.trim() ?? "")) return false;

  const apiBase = config.apiBase.replace(/\/+$/, "");
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const original = new URL(raw, window.location.href);
    const route = apiRoute(original);
    if (!route) return nativeFetch(input, init);

    const method = (init.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const target = new URL(apiBase);
    target.searchParams.set("route", route);
    original.searchParams.forEach((value, key) => target.searchParams.append(key, value));

    // Published project file URLs do not need to leak the project code into the rendered DOM.
    // Add the current customer reference only when a customer is actually viewing a file.
    if (route === "api/workflow/files" && method === "GET" && !target.searchParams.get("code")) {
      const pageCode = currentTrackingCode();
      if (pageCode) target.searchParams.set("code", pageCode);
    }

    const headers = rawHeaders(input, init);
    headers.set("x-atp-client-version", config.build || "V69");
    if (config.anonKey) headers.set("apikey", config.anonKey);

    const session = sessionStorage.getItem(SESSION_KEY);
    if (session) headers.set("authorization", `Bearer ${session}`);

    let requestBody: BodyInit | null | undefined = init.body;
    let parsedBody: any = null;
    if (typeof requestBody === "string" && headers.get("content-type")?.includes("application/json")) {
      try { parsedBody = JSON.parse(requestBody); } catch { parsedBody = null; }
    }

    if (route.startsWith("api/workflow/public") || (route === "api/workflow/files" && method === "GET")) {
      const code = cleanCode(parsedBody?.code || original.searchParams.get("code") || currentTrackingCode());
      const token = code ? localStorage.getItem(customerKey(code)) : null;
      if (token) headers.set("x-atp-customer-token", token);
    }

    const response = await nativeFetch(target, {
      ...init,
      method,
      headers,
      body: requestBody,
      cache: "no-store",
      credentials: "omit",
    });

    if (response.status === 401 && ["api/owner/data", "api/admin/data", "api/workflow"].includes(route)) {
      sessionStorage.removeItem(SESSION_KEY);
      window.setTimeout(() => window.location.replace(appBase), 0);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) return response;

    let result: any;
    try { result = await response.clone().json(); }
    catch { return response; }

    rememberReturnedCredentials(route, method, parsedBody, response, result);
    return cloneJsonResponse(result, response);
  };

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("a") : null;
    const href = target instanceof HTMLAnchorElement ? target.getAttribute("href") : null;
    if (!href || !href.includes("/api/workflow/files")) return;
    event.preventDefault();
    void (async () => {
      try {
        const response = await window.fetch(href, { cache: "no-store" });
        if (!response.ok) throw new Error("Project file could not be opened.");
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      } catch (error) {
        console.error("ATP file open failed", error);
      }
    })();
  });

  return true;
}

export function customerAccessToken(code: string) {
  return localStorage.getItem(customerKey(code));
}

export function clearCustomerAccess(code: string) {
  localStorage.removeItem(customerKey(code));
}
