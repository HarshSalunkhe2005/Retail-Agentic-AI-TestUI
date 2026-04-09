import { useCallback, useRef } from 'react';
import { useWizardStore } from '../store/wizardStore';
import type { ModelKey, KPIMetrics, SegmentData, InventoryItem } from '../store/wizardStore';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

// ── helpers ───────────────────────────────────────────────────────────────────

function buildFormData(file: File): FormData {
  const fd = new FormData();
  fd.append('file', file);
  return fd;
}

async function callModel(endpoint: string, file: File): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    body: buildFormData(file),
  });
  const json = await response.json();
  return json as Record<string, unknown>;
}

// ── KPI + segment builders from API responses ────────────────────────────────

function buildKpiFromResponses(
  results: Partial<Record<ModelKey, Record<string, unknown>>>
): KPIMetrics {
  const kpi: KPIMetrics = {
    fillRate: 0,
    inventoryTurns: 0,
    stockoutRate: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    activeCustomers: 0,
  };

  // Demand model → total revenue estimate from forecast
  const demand = results.demand;
  if (demand?.status === 'success') {
    const forecastData = demand.forecast_data as Array<{ forecast: number; actual: number | null }> | undefined;
    if (forecastData) {
      const actuals = forecastData
        .filter((r): r is { forecast: number; actual: number } => r.actual !== null)
        .map((r) => r.actual);
      kpi.totalRevenue = actuals.length > 0 ? Math.round(actuals.reduce((a, b) => a + b, 0)) : 0;
    }
  }

  // Churn model → activeCustomers, avgOrderValue
  const churn = results.churn;
  if (churn?.status === 'success') {
    const summary = churn.summary as Record<string, unknown> | undefined;
    if (summary) {
      kpi.activeCustomers = (summary.total_customers as number) ?? 0;
    }
    const data = churn.data as Array<{ segment: string; churn_risk: number; monetary: number }> | undefined;
    if (data && data.length > 0) {
      kpi.avgOrderValue = Math.round(data.reduce((acc, r) => acc + (r.monetary ?? 0), 0) / data.length);
    }
  }

  // Pricing model → fill-rate proxy (% of products with hold/increase action = "healthy pricing")
  const pricing = results.pricing;
  if (pricing?.status === 'success') {
    const summary = pricing.summary as Record<string, number> | undefined;
    if (summary) {
      const total = summary.total_products ?? 0;
      const good = (summary.hold_count ?? 0) + (summary.increase_count ?? 0);
      kpi.fillRate = total > 0 ? Math.round((good / total) * 100 * 10) / 10 : 0;
    }
  }

  return kpi;
}

function buildSegmentsFromChurn(
  churnResult: Record<string, unknown> | undefined
): SegmentData[] {
  if (!churnResult || churnResult.status !== 'success') return [];
  const summary = churnResult.summary as Record<string, unknown> | undefined;
  if (!summary) return [];

  const dist = (summary.segment_distribution ?? {}) as Record<string, number>;

  return Object.entries(dist).map(([segment, customers]) => {
    const data = (churnResult.data as Array<{ segment: string; churn_risk: number }>) ?? [];
    const segRisks = data.filter((r) => r.segment === segment).map((r) => r.churn_risk);
    const avgRisk = segRisks.length > 0
      ? segRisks.reduce((a, b) => a + b, 0) / segRisks.length
      : 0;
    return {
      segment,
      customers,
      oldRevenue: customers * 500,
      newRevenue: customers * 550,
      churnRisk: Math.round(avgRisk * 10) / 10,
    };
  });
}

// ── main hook ─────────────────────────────────────────────────────────────────

export function useDataProcessing() {
  const cancelRef = useRef(false);

  const runModels = useCallback(async () => {
    if (useWizardStore.getState().isProcessing) return;

    cancelRef.current = false;

    const { selectedModels, csvFile, startProcessing } = useWizardStore.getState();
    startProcessing();

    let completed = 0;
    const total = selectedModels.length;

    const MODEL_ENDPOINTS: Partial<Record<ModelKey, string>> = {
      pricing:   '/models/pricing',
      churn:     '/models/churn',
      demand:    '/models/demand',
      basket:    '/models/basket?limit=100',
    };

    const apiResults: Partial<Record<ModelKey, Record<string, unknown>>> = {};

    const modelPromises = selectedModels.map(async (model) => {
      useWizardStore.getState().updateModelResult(model, { status: 'running' });

      const endpoint = MODEL_ENDPOINTS[model];

      if (!endpoint || !csvFile) {
        // inventory or no file — mark done with empty data
        useWizardStore.getState().updateModelResult(model, {
          status: 'done',
          data: { processed: true, model, timestamp: Date.now() },
        });
      } else {
        try {
          const result = await callModel(endpoint, csvFile);
          if (cancelRef.current) return;

          apiResults[model] = result;
          useWizardStore.getState().updateModelResult(model, {
            status: result.status === 'error' ? 'error' : 'done',
            data: result,
          });
        } catch (err) {
          if (cancelRef.current) return;
          useWizardStore.getState().updateModelResult(model, {
            status: 'error',
            data: { error: String(err), model },
          });
        }
      }

      completed++;
      useWizardStore.setState({ processingProgress: Math.round((completed / total) * 100) });
    });

    await Promise.all(modelPromises);

    if (cancelRef.current) return;

    const kpi = buildKpiFromResponses(apiResults);
    const segments = buildSegmentsFromChurn(apiResults.churn);
    const inventory: InventoryItem[] = [];

    useWizardStore.getState().setResults(kpi, segments, inventory);

    useWizardStore.setState({ isProcessing: false, processingProgress: 100 });
    setTimeout(() => {
      if (!cancelRef.current) useWizardStore.getState().nextStep();
    }, 800);
  }, []); // stable reference — no store subscription

  const cancelModels = useCallback(() => {
    cancelRef.current = true;
    useWizardStore.setState({ isProcessing: false });
  }, []);

  return { runModels, cancelModels };
}
