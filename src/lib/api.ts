/**
 * API client for the EcoSort backend (yolo-service, port 8000 by default).
 * The backend owns the PostgreSQL database (Neon or Supabase, via DATABASE_URL)
 * and exposes /db/* REST endpoints.
 * Every call returns { ok, data?, error? } and fails fast when the backend
 * is offline so the UI never hangs.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_YOLO_SERVICE_URL ?? "http://127.0.0.1:8000";

export interface ApiResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

const REQUEST_TIMEOUT_MS = 8000;

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        if (typeof body?.detail === "string") detail = body.detail;
      } catch {
        // ignore parse errors
      }
      return { ok: false, error: detail };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === "AbortError";
    return {
      ok: false,
      error: aborted
        ? "Backend request timed out"
        : "Backend offline — is the yolo-service running?",
    };
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get<T>(path: string) {
    return request<T>(path);
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  put<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "PUT",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  patch<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  del<T>(path: string) {
    return request<T>(path, { method: "DELETE" });
  },
};

// ---------------------------------------------------------------------------
// Typed helpers for the frontend stores
// ---------------------------------------------------------------------------

export interface ScanDto {
  id: string;
  timestamp: number;
  source: "upload" | "camera";
  wasteType: string;
  wasteTypeConfidence: number;
  binSuggestion: string;
  binConfidence: number;
  imageUrl: string;
  detections?: { label: string; confidence: number }[];
}

export async function fetchScans(): Promise<ScanDto[]> {
  const res = await api.get<{ scans: ScanDto[] }>("/db/scans");
  return res.ok && res.data ? res.data.scans : [];
}

export async function saveScan(
  scan: Omit<ScanDto, "id" | "timestamp"> & Partial<Pick<ScanDto, "id" | "timestamp">>
): Promise<ScanDto | null> {
  const res = await api.post<ScanDto>("/db/scans", scan);
  return res.ok && res.data ? res.data : null;
}
