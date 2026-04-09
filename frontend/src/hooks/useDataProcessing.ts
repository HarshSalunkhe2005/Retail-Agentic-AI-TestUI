import { useCallback, useRef } from 'react';
import { useWizardStore } from '../store/wizardStore';
import type { ModelKey, KPIMetrics } from '../store/wizardStore';

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
    // Guard: don't start a new run if one is already in progress.
    // This handles React Strict Mode's double-invocation of effects.
    if (useWizardStore.getState().isProcessing) return;

    cancelRef.current = false;

    const { selectedModels, startProcessing } = useWizardStore.getState();
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

    const zeroKpi: KPIMetrics = {
      fillRate: 0,
      inventoryTurns: 0,
      stockoutRate: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
      activeCustomers: 0,
    };
    useWizardStore.getState().setResults(zeroKpi, [], []);

    useWizardStore.setState({ isProcessing: false, processingProgress: 100 });
    setTimeout(() => {
      if (!cancelRef.current) useWizardStore.getState().nextStep();
    }, 800);
  }, []); // stable reference — no store subscription

  const cancelModels = useCallback(() => {
    cancelRef.current = true;
    // Reset processing flag so the effect can cleanly re-run when needed
    // (handles React Strict Mode double-invocation and navigation away mid-run).
    useWizardStore.setState({ isProcessing: false });
  }, []);

  return { runModels, cancelModels };
}
