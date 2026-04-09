import { motion, AnimatePresence } from 'framer-motion';
import { useWizard } from '../hooks/useWizard';
import StepUpload from '../components/Wizard/StepUpload';
import StepPreview from '../components/Wizard/StepPreview';
import StepSelectModels from '../components/Wizard/StepSelectModels';
import StepExecute from '../components/Wizard/StepExecute';
import StepResults from '../components/Wizard/StepResults';
import { Check } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Upload' },
  { id: 2, label: 'Preview' },
  { id: 3, label: 'Models' },
  { id: 4, label: 'Execute' },
  { id: 5, label: 'Results' },
];

export default function WizardPage() {
  const { currentStep } = useWizard();

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <StepUpload />;
      case 2: return <StepPreview />;
      case 3: return <StepSelectModels />;
      case 4: return <StepExecute />;
      case 5: return <StepResults />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen pt-8 pb-16">
      <div className="max-w-5xl mx-auto px-6">
        {/* Step indicator */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center mb-12"
        >
          {STEPS.map((step, i) => {
            const isDone = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
                      ${isDone
                        ? 'bg-green-500 text-white'
                        : isCurrent
                        ? 'bg-gradient-to-br from-purple-600 to-cyan-500 text-white shadow-lg shadow-purple-900/40'
                        : 'bg-white/10 text-slate-500'
                      }`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : step.id}
                  </div>
                  <span
                    className={`text-xs font-medium transition-colors ${
                      isCurrent ? 'text-white' : isDone ? 'text-green-400' : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 w-16 mx-2 mb-4 rounded-full transition-all duration-500 ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-white/10'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </motion.div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
