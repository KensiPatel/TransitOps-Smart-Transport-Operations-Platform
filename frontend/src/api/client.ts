// ============================================================
// fetch wrapper
//
// Auth is COOKIE-BASED. The backend (auth.routes.ts) sets an httpOnly
// "session" cookie on login/signup. Browsers send it automatically as long
// as every request uses `credentials: "include"`. There is no readable JWT
// to attach as a header — httpOnly cookies are invisible to JS by design.
//
// The backend CORS is configured with credentials + origin http://localhost:5173,
// which is why vite.config.ts pins the dev server to that port.
// ============================================================

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type Query = Record<string, unknown>;

function buildQuery(query?: Query): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function request<T>(
  method: string,
  path: string,
  opts: { body?: unknown; query?: Query } = {}
): Promise<T> {
  const init: RequestInit = {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}${buildQuery(opts.query)}`, init);
  } catch {
    throw new ApiError(
      "Can't reach the server. Is the backend running on " + BASE_URL + "?",
      0
    );
  }

  const contentType = res.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await res.json().catch(() => null)
    : await res.text().catch(() => null);

  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return payload as T;
}

export const http = {
  get: <T>(path: string, query?: object) =>
    request<T>("GET", path, { query: query as Query | undefined }),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, { body }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>("PATCH", path, { body }),
  del: <T>(path: string) => request<T>("DELETE", path),
};

export { BASE_URL };
