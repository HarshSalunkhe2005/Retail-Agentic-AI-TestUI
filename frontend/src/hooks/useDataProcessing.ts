import { useCallback } from 'react';
import { useWizardStore } from '../store/wizardStore';
import { generateMockResults } from '../utils/chartUtils';
import type { ModelKey } from '../store/wizardStore';

const MODEL_DURATIONS: Record<ModelKey, number> = {
  pricing: 2200,
  churn: 2800,
  demand: 3400,
  basket: 2600,
  inventory: 1900,
};

export function useDataProcessing() {
  const store = useWizardStore();

  const runModels = useCallback(async () => {
    const { selectedModels, csvData } = store;
    store.startProcessing();

    let completed = 0;
    const total = selectedModels.length;

    const modelPromises = selectedModels.map(async (model) => {
      const duration = MODEL_DURATIONS[model] + Math.random() * 800;
      store.updateModelResult(model, { status: 'running' });

      await new Promise((r) => setTimeout(r, duration));

      store.updateModelResult(model, {
        status: 'done',
        data: { processed: true, model, timestamp: Date.now() },
      });

      completed++;
      useWizardStore.setState({ processingProgress: Math.round((completed / total) * 100) });
    });

    await Promise.all(modelPromises);

    const { kpi, segments, inventory } = generateMockResults(csvData);
    store.setResults(kpi, segments, inventory);

    useWizardStore.setState({ isProcessing: false, processingProgress: 100 });
    setTimeout(() => store.nextStep(), 800);
  }, [store]);

  return { runModels };
}
