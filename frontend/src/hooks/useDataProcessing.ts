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
  // runIdRef is a generation counter. Every call to runModels increments it
  // and captures the new value as `runId`. Every async checkpoint compares the
  // live counter against `runId`; if they differ it means a newer run (or a
  // cancelModels call) has superseded this one, so we bail out.
  //
  // This correctly handles React StrictMode's double-invoke pattern:
  //   1. Mount   → runId = 1, timers check runId === 1
  //   2. Cleanup → cancelModels() increments counter to 2, runId-1 timers bail
  //   3. Remount → runId = 3, fresh timers check runId === 3
  // The stale timers from step 1 see counter=3 ≠ 1 and do nothing.
  const runIdRef = useRef(0);

  // runModels has an empty dependency array so its reference is stable.
  // All store access is done via useWizardStore.getState() to read the
  // latest state at call-time without subscribing to the store here.
  const runModels = useCallback(async () => {
    const runId = ++runIdRef.current;

    const { selectedModels, csvData, startProcessing } = useWizardStore.getState();
    startProcessing();

    let completed = 0;
    const total = selectedModels.length;

    const modelPromises = selectedModels.map(async (model) => {
      const duration = MODEL_DURATIONS[model] + Math.random() * 800;
      useWizardStore.getState().updateModelResult(model, { status: 'running' });

      await new Promise<void>((r) => setTimeout(r, duration));

      if (runIdRef.current !== runId) return;

      useWizardStore.getState().updateModelResult(model, {
        status: 'done',
        data: { processed: true, model, timestamp: Date.now() },
      });

      completed++;
      useWizardStore.setState({ processingProgress: Math.round((completed / total) * 100) });
    });

    await Promise.all(modelPromises);

    if (runIdRef.current !== runId) return;

    const { kpi, segments, inventory } = generateMockResults(csvData);
    useWizardStore.getState().setResults(kpi, segments, inventory);

    useWizardStore.setState({ isProcessing: false, processingProgress: 100 });
    setTimeout(() => {
      if (runIdRef.current === runId) useWizardStore.getState().nextStep();
    }, 800);
  }, []); // stable reference — no store subscription

  const cancelModels = useCallback(() => {
    runIdRef.current++;
  }, []);

  return { runModels, cancelModels };
}
