import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWizardStore } from '../../store/wizardStore';
import { useShallow } from 'zustand/react/shallow';
import { useDataProcessing } from '../../hooks/useDataProcessing';
import { CheckCircle, Loader2, Clock, AlertCircle } from 'lucide-react';
import Button from '../Common/Button';

const MODEL_ICONS: Record<string, string> = {
  pricing: '📈',
  churn: '👥',
  demand: '📊',
  basket: '🛒',
};

export default function StepExecute() {
  const { modelResults, selectedModels, isProcessing, processingProgress, prevStep } =
    useWizardStore(
      useShallow((s) => ({
        modelResults: s.modelResults,
        selectedModels: s.selectedModels,
        isProcessing: s.isProcessing,
        processingProgress: s.processingProgress,
        prevStep: s.prevStep,
      }))
    );
  const { runModels, cancelModels } = useDataProcessing();

  useEffect(() => {
    runModels();
    return () => cancelModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allDone = selectedModels.length > 0 && selectedModels.every((m) => modelResults[m]?.status === 'done');

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl font-bold text-white mb-2">
          {allDone ? '✅ Analysis Complete!' : '⚡ Running Analysis...'}
        </h2>
        <p className="text-slate-400">
          {allDone
            ? 'All models have finished processing your data.'
            : 'Your AI models are processing the data. Please wait.'}
        </p>
      </motion.div>

      {/* Overall progress bar */}
      <div className="glass rounded-2xl p-5 mb-6">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-slate-400 font-medium">Overall Progress</span>
          <span className="text-sm font-bold text-white">{processingProgress}%</span>
        </div>
        <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-600 to-cyan-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${processingProgress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {selectedModels.filter((m) => modelResults[m].status === 'done').length} of{' '}
          {selectedModels.length} models complete
        </p>
      </div>

      {/* Model status cards */}
      <div className="space-y-3">
        <AnimatePresence>
          {selectedModels.map((modelKey, i) => {
            const result = modelResults[modelKey];
            const icon = MODEL_ICONS[modelKey] ?? '🔮';

            return (
              <motion.div
                key={modelKey}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500
                  ${result.status === 'done'
                    ? 'border-green-500/30 bg-green-500/5'
                    : result.status === 'running'
                    ? 'border-purple-500/30 bg-purple-500/5'
                    : result.status === 'error'
                    ? 'border-red-500/30 bg-red-500/5'
                    : 'border-white/10 bg-white/3'
                  }`}
              >
                {/* Icon */}
                <div className="text-2xl w-10 text-center">{icon}</div>

                {/* Label */}
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${result.status === 'idle' ? 'text-slate-400' : 'text-white'}`}>
                    {result.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 capitalize">
                    {result.status === 'running' ? 'Processing...' : result.status}
                  </p>
                </div>

                {/* Status icon */}
                <div>
                  {result.status === 'done' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500 }}
                    >
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    </motion.div>
                  )}
                  {result.status === 'running' && (
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                  )}
                  {result.status === 'idle' && (
                    <Clock className="w-6 h-6 text-slate-500" />
                  )}
                  {result.status === 'error' && (
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="secondary" onClick={prevStep} disabled={isProcessing}>
          ← Back
        </Button>
        {allDone && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Button size="lg" onClick={() => useWizardStore.getState().nextStep()}>
              View Results →
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
