import { create } from 'zustand';

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export interface CSVRow {
  [key: string]: string | number;
}

export type ModelKey = 'pricing' | 'churn' | 'demand' | 'basket' | 'inventory';

export interface ModelResult {
  name: string;
  status: 'idle' | 'running' | 'done' | 'error';
  data: Record<string, unknown> | null;
}

export interface SegmentData {
  segment: string;
  oldRevenue: number;
  newRevenue: number;
  customers: number;
  churnRisk: number;
}

export interface KPIMetrics {
  fillRate: number;
  inventoryTurns: number;
  stockoutRate: number;
  totalRevenue: number;
  avgOrderValue: number;
  activeCustomers: number;
}

export interface InventoryItem {
  sku: string;
  name: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  stockLevel: number;
  reorderPoint: number;
  daysToStockout: number;
}

export interface WizardState {
  currentStep: WizardStep;
  csvFile: File | null;
  csvData: CSVRow[];
  csvHeaders: string[];
  selectedModels: ModelKey[];
  compatibleModels: ModelKey[] | null;
  modelResults: Record<ModelKey, ModelResult>;
  kpiMetrics: KPIMetrics | null;
  segmentData: SegmentData[];
  inventoryItems: InventoryItem[];
  isProcessing: boolean;
  processingProgress: number;

  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setCsvFile: (file: File | null) => void;
  setCsvData: (data: CSVRow[], headers: string[]) => void;
  toggleModel: (model: ModelKey) => void;
  setSelectedModels: (models: ModelKey[]) => void;
  setCompatibleModels: (models: ModelKey[] | null) => void;
  startProcessing: () => void;
  updateModelResult: (model: ModelKey, result: Partial<ModelResult>) => void;
  setResults: (kpi: KPIMetrics, segments: SegmentData[], inventory: InventoryItem[]) => void;
  reset: () => void;
}

const defaultModelResults: Record<ModelKey, ModelResult> = {
  pricing: { name: 'Pricing Intelligence', status: 'idle', data: null },
  churn: { name: 'Customer Churn', status: 'idle', data: null },
  demand: { name: 'Demand Forecasting', status: 'idle', data: null },
  basket: { name: 'Market Basket Analysis', status: 'idle', data: null },
  inventory: { name: 'Inventory Reorder', status: 'idle', data: null },
};

export const useWizardStore = create<WizardState>((set) => ({
  currentStep: 1,
  csvFile: null,
  csvData: [],
  csvHeaders: [],
  selectedModels: ['pricing', 'churn', 'demand', 'basket', 'inventory'],
  compatibleModels: null,
  modelResults: defaultModelResults,
  kpiMetrics: null,
  segmentData: [],
  inventoryItems: [],
  isProcessing: false,
  processingProgress: 0,

  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((s) => ({ currentStep: Math.min(5, s.currentStep + 1) as WizardStep })),
  prevStep: () => set((s) => ({ currentStep: Math.max(1, s.currentStep - 1) as WizardStep })),
  setCsvFile: (file) => set({ csvFile: file }),
  setCsvData: (data, headers) => set({ csvData: data, csvHeaders: headers }),
  toggleModel: (model) =>
    set((s) => ({
      selectedModels: s.selectedModels.includes(model)
        ? s.selectedModels.filter((m) => m !== model)
        : [...s.selectedModels, model],
    })),
  setSelectedModels: (models) => set({ selectedModels: models }),
  setCompatibleModels: (models) => set({ compatibleModels: models }),
  startProcessing: () =>
    set({
      isProcessing: true,
      processingProgress: 0,
      modelResults: defaultModelResults,
    }),
  updateModelResult: (model, result) =>
    set((s) => ({
      modelResults: {
        ...s.modelResults,
        [model]: { ...s.modelResults[model], ...result },
      },
    })),
  setResults: (kpi, segments, inventory) =>
    set({ kpiMetrics: kpi, segmentData: segments, inventoryItems: inventory }),
  reset: () =>
    set({
      currentStep: 1,
      csvFile: null,
      csvData: [],
      csvHeaders: [],
      selectedModels: ['pricing', 'churn', 'demand', 'basket', 'inventory'],
      compatibleModels: null,
      modelResults: defaultModelResults,
      kpiMetrics: null,
      segmentData: [],
      inventoryItems: [],
      isProcessing: false,
      processingProgress: 0,
    }),
}));
