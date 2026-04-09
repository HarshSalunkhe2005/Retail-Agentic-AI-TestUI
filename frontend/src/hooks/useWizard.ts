import { useCallback } from 'react';
import { useWizardStore } from '../store/wizardStore';
import type { WizardStep } from '../store/wizardStore';

export function useWizard() {
  // Subscribe only to currentStep to avoid re-rendering Wizard.tsx on every
  // unrelated state change (e.g. processingProgress, modelResults updates).
  const currentStep = useWizardStore((s) => s.currentStep);

  // All callbacks read state via getState() at call-time so they never need
  // the store object in their dependency arrays — each callback is stable.
  const goToStep = useCallback((step: WizardStep) => {
    useWizardStore.getState().setStep(step);
  }, []);

  const canGoNext = useCallback(() => {
    const s = useWizardStore.getState();
    switch (s.currentStep) {
      case 1:
        return s.csvFile !== null && s.csvData.length > 0;
      case 2:
        return true;
      case 3:
        return s.selectedModels.length > 0;
      case 4:
        return !s.isProcessing;
      default:
        return false;
    }
  }, []);

  const canGoPrev = useCallback(() => {
    const s = useWizardStore.getState();
    return s.currentStep > 1 && s.currentStep < 5;
  }, []);

  const steps = [
    { id: 1, label: 'Upload', description: 'Upload CSV data' },
    { id: 2, label: 'Preview', description: 'Preview & segment' },
    { id: 3, label: 'Models', description: 'Select models' },
    { id: 4, label: 'Execute', description: 'Run analysis' },
    { id: 5, label: 'Results', description: 'View results' },
  ];

  return {
    currentStep,
    goToStep,
    canGoNext,
    canGoPrev,
    steps,
  };
}
