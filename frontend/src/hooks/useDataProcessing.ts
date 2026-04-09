import { useCallback, useRef } from 'react';
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
  // cancelRef lets the cleanup function (on unmount) stop in-flight timers
  const cancelRef = useRef(false);

  // runModels has an empty dependency array so its reference is stable.
  // All store access is done via useWizardStore.getState() to read the
  // latest state at call-time without subscribing to the store here, which
  // previously caused useCallback to recreate runModels on every state
  // change, which in turn triggered the useEffect in StepExecute on every
  // render — creating an infinite model-execution loop.
  const runModels = useCallback(async () => {
    cancelRef.current = false;

    const { selectedModels, csvData, startProcessing } = useWizardStore.getState();
    startProcessing();

    let completed = 0;
    const total = selectedModels.length;

    const modelPromises = selectedModels.map(async (model) => {
      const duration = MODEL_DURATIONS[model] + Math.random() * 800;
      useWizardStore.getState().updateModelResult(model, { status: 'running' });

      await new Promise<void>((r) => setTimeout(r, duration));

      if (cancelRef.current) return;

      useWizardStore.getState().updateModelResult(model, {
        status: 'done',
        data: { processed: true, model, timestamp: Date.now() },
      });

      completed++;
      useWizardStore.setState({ processingProgress: Math.round((completed / total) * 100) });
    });

    await Promise.all(modelPromises);

    if (cancelRef.current) return;

    const { kpi, segments, inventory } = generateMockResults(csvData);
    useWizardStore.getState().setResults(kpi, segments, inventory);

    useWizardStore.setState({ isProcessing: false, processingProgress: 100 });
    setTimeout(() => {
      if (!cancelRef.current) useWizardStore.getState().nextStep();
    }, 800);
  }, []); // stable reference — no store subscription

  const cancelModels = useCallback(() => {
    cancelRef.current = true;
  }, []);

  return { runModels, cancelModels };
}
