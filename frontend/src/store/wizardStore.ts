import { create } from 'zustand';

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export interface CSVRow {
  [key: string]: string | number;
}

export type ModelKey = 'pricing' | 'churn' | 'demand' | 'basket';

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
  totalRevenue: number;
  avgOrderValue: number;
  activeCustomers: number;
}

export interface WizardState {
  currentStep: WizardStep;
  csvFile: File | null;
  csvData: CSVRow[];
  csvHeaders: string[];
  selectedModels: ModelKey[];
  compatibleModels: ModelKey[] | null;
  modelResults: Record<ModelKey, ModelResult>;
  inventoryResult: ModelResult;
  kpiMetrics: KPIMetrics | null;
  segmentData: SegmentData[];
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
  setInventoryResult: (result: Partial<ModelResult>) => void;
  setResults: (kpi: KPIMetrics, segments: SegmentData[]) => void;
  reset: () => void;
}

const defaultModelResults: Record<ModelKey, ModelResult> = {
  pricing: { name: 'Pricing Intelligence', status: 'idle', data: null },
  churn: { name: 'Customer Churn', status: 'idle', data: null },
  demand: { name: 'Demand Forecasting', status: 'idle', data: null },
  basket: { name: 'Market Basket Analysis', status: 'idle', data: null },
};

const defaultInventoryResult: ModelResult = {
  name: 'Inventory Reorder',
  status: 'idle',
  data: null,
};

const defaultSelectedModels: ModelKey[] = ['pricing', 'churn', 'demand', 'basket'];

export const useWizardStore = create<WizardState>((set) => ({
  currentStep: 1,
  csvFile: null,
  csvData: [],
  csvHeaders: [],
  selectedModels: defaultSelectedModels,
  compatibleModels: null,
  modelResults: defaultModelResults,
  inventoryResult: defaultInventoryResult,
  kpiMetrics: null,
  segmentData: [],
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
      inventoryResult: defaultInventoryResult,
    }),
  updateModelResult: (model, result) =>
    set((s) => ({
      modelResults: {
        ...s.modelResults,
        [model]: { ...s.modelResults[model], ...result },
      },
    })),
  setInventoryResult: (result) =>
    set((s) => ({
      inventoryResult: { ...s.inventoryResult, ...result },
    })),
  setResults: (kpi, segments) =>
    set({ kpiMetrics: kpi, segmentData: segments }),
  reset: () =>
    set({
      currentStep: 1,
      csvFile: null,
      csvData: [],
      csvHeaders: [],
      selectedModels: defaultSelectedModels,
      compatibleModels: null,
      modelResults: defaultModelResults,
      inventoryResult: defaultInventoryResult,
      kpiMetrics: null,
      segmentData: [],
      isProcessing: false,
      processingProgress: 0,
    }),
}));
