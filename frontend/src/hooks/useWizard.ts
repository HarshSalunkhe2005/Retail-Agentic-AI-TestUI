import { useCallback } from 'react';
import { useWizardStore } from '../store/wizardStore';
import type { WizardStep } from '../store/wizardStore';

export function useWizard() {
  const store = useWizardStore();

  const goToStep = useCallback(
    (step: WizardStep) => {
      store.setStep(step);
    },
    [store]
  );

  const canGoNext = useCallback(() => {
    switch (store.currentStep) {
      case 1:
        return store.csvFile !== null && store.csvData.length > 0;
      case 2:
        return true;
      case 3:
        return store.selectedModels.length > 0;
      case 4:
        return !store.isProcessing;
      default:
        return false;
    }
  }, [store]);

  const canGoPrev = useCallback(() => {
    return store.currentStep > 1 && store.currentStep < 5;
  }, [store]);

  const steps = [
    { id: 1, label: 'Upload', description: 'Upload CSV data' },
    { id: 2, label: 'Preview', description: 'Preview & segment' },
    { id: 3, label: 'Models', description: 'Select models' },
    { id: 4, label: 'Execute', description: 'Run analysis' },
    { id: 5, label: 'Results', description: 'View results' },
  ];

  return {
    ...store,
    goToStep,
    canGoNext,
    canGoPrev,
    steps,
  };
}
