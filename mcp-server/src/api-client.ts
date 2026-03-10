import { config } from "./config.js";

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`API error ${status}: ${body}`);
    this.name = "ApiError";
  }
}

async function request(
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const url = `${config.apiBaseUrl}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.apiTimeout);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    const text = await res.text();
    if (!res.ok) throw new ApiError(res.status, text);

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } finally {
    clearTimeout(timer);
  }
}

export function apiGet(
  path: string,
  params?: Record<string, string | undefined>,
): Promise<unknown> {
  const url = new URL(path, "http://placeholder");
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, v);
    }
  }
  const fullPath = url.pathname + url.search;
  return request(fullPath);
}

export function apiPost(
  path: string,
  body: unknown,
): Promise<unknown> {
  return request(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
