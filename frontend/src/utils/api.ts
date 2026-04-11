/**
 * API client for the Retail Agentic AI backend.
 * Base URL: http://localhost:8000/api  (overridable via VITE_API_URL)
 *
 * VITE_API_URL may be set to either:
 *   - just the origin:  https://my-backend.up.railway.app
 *   - with /api suffix: https://my-backend.up.railway.app/api
 * Both are normalized to always end with /api so routes resolve correctly
 * in both local dev and Railway deployments without manual URL editing.
 */
function normalizeApiBase(url: string): string {
  const trimmed = url.replace(/\/+$/, ''); // strip any trailing slashes
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export const API_BASE_URL = normalizeApiBase(
  import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
);

const TIMEOUT_MS = 60_000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout = TIMEOUT_MS
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        (json as { message?: string } | null)?.message ?? `HTTP ${res.status}`;
      throw new Error(message);
    }
    return json as Record<string, unknown>;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('Request timed out after 60 seconds');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST /api/compatible-models
 * Returns { compatible_models: string[], missing_columns: Record<string, string[]>, detected_columns: string[] }
 */
export async function checkCompatibleModels(
  file: File
): Promise<{ compatible_models: string[]; missing_columns: Record<string, string[]>; detected_columns: string[] }> {
  const fd = new FormData();
  fd.append('file', file);
  const result = await fetchWithTimeout(`${API_BASE_URL}/compatible-models`, {
    method: 'POST',
    body: fd,
  });
  return result as { compatible_models: string[]; missing_columns: Record<string, string[]>; detected_columns: string[] };
}

/**
 * POST /api/models/{modelName}
 * Returns the model's JSON response.
 */
export async function runModel(
  modelName: string,
  file: File
): Promise<Record<string, unknown>> {
  const fd = new FormData();
  fd.append('file', file);
  return fetchWithTimeout(`${API_BASE_URL}/models/${modelName}`, {
    method: 'POST',
    body: fd,
  });
}
