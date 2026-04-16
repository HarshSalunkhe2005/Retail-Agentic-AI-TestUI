/**
 * API client for the Retail Agentic AI backend.
 * Base URL: http://localhost:8000/api  (overridable via VITE_API_URL)
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

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

export interface AIInsightsRequest {
  churn_results: Record<string, unknown> | null;
  demand_results: Record<string, unknown> | null;
  pricing_results: Record<string, unknown> | null;
  basket_results: Record<string, unknown> | null;
  user_question: string;
}

export interface AIInsightsResponse {
  response: string;
  model_used: string;
}

export async function getAIInsights(payload: AIInsightsRequest): Promise<AIInsightsResponse> {
  const controller = new AbortController();
  const timeoutMs = 30_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;

  try {
    res = await fetch(`${API_BASE_URL}/ai-insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('AI request timed out after 30 seconds. Please try a shorter question and try again.');
    }
    throw new Error('Unable to connect to AI service. Please ensure backend and Ollama are running.');
  } finally {
    clearTimeout(timer);
  }

  let responseData: Record<string, unknown> | null = null;
  let jsonParseFailed = false;
  try {
    responseData = (await res.json()) as Record<string, unknown>;
  } catch {
    jsonParseFailed = true;
  }

  if (!res.ok) {
    if (jsonParseFailed) {
      throw new Error(`AI service returned HTTP ${res.status} with an invalid JSON payload.`);
    }

    const aiErrorResult = responseData as { response?: string; message?: string } | null;
    const backendMessage = aiErrorResult?.message ?? aiErrorResult?.response;

    if (res.status === 503) {
      throw new Error(
        backendMessage ??
          'Ollama is not available (503). Please start Ollama locally and try again.'
      );
    }
    if (res.status === 504) {
      throw new Error(backendMessage ?? 'AI request timed out (504). Please ask a shorter question.');
    }
    if (res.status === 500) {
      throw new Error(backendMessage ?? 'AI service failed (500). Please retry in a moment.');
    }

    throw new Error(backendMessage ?? `AI request failed (HTTP ${res.status}).`);
  }

  if (jsonParseFailed) {
    throw new Error('AI service returned an invalid JSON response.');
  }

  const parsedResult = responseData ?? {};

  return {
    response: String((parsedResult as { response?: string }).response ?? ''),
    model_used: String((parsedResult as { model_used?: string }).model_used ?? 'mistral'),
  };
}
