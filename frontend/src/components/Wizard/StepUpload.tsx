import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useWizardStore } from '../../store/wizardStore';
import { useShallow } from 'zustand/react/shallow';
import { parseCSV } from '../../utils/csvParser';
import { checkCompatibleModels } from '../../utils/api';
import type { ModelKey } from '../../store/wizardStore';
import Button from '../Common/Button';

const MODEL_LABELS: Record<string, string> = {
  churn: 'Churn',
  demand: 'Demand',
  basket: 'Basket',
  pricing: 'Pricing',
};

export default function StepUpload() {
  const { setCsvFile, setCsvData, nextStep, csvFile, setCompatibleModels, setSelectedModels } = useWizardStore(
    useShallow((s) => ({
      setCsvFile: s.setCsvFile,
      setCsvData: s.setCsvData,
      nextStep: s.nextStep,
      csvFile: s.csvFile,
      setCompatibleModels: s.setCompatibleModels,
      setSelectedModels: s.setSelectedModels,
    }))
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedModels, setDetectedModels] = useState<string[] | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.csv')) {
        setError('Please upload a CSV file (.csv)');
        return;
      }
      const maxBytes = 100 * 1024 * 1024; // 100 MB
      if (file.size > maxBytes) {
        setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 100 MB.`);
        return;
      }
      setError(null);
      setDetectedModels(null);
      setIsLoading(true);
      const { data, headers, errors } = await parseCSV(file);
      setIsLoading(false);
      if (errors.length > 0) {
        setError(`Parse warning: ${errors[0]}`);
      }
      setCsvFile(file);
      setCsvData(data, headers);

      // Auto-detect compatible models
      setIsDetecting(true);
      try {
        const result = await checkCompatibleModels(file);
        const compatible = (result.compatible_models ?? []) as ModelKey[];
        setDetectedModels(compatible);
        setCompatibleModels(compatible);
        // Pre-select all compatible models
        if (compatible.length > 0) setSelectedModels(compatible);
      } catch (err) {
        // Detection failure is non-fatal — user can still proceed
        setCompatibleModels(null);
      } finally {
        setIsDetecting(false);
      }
    },
    [setCsvFile, setCsvData, setCompatibleModels, setSelectedModels]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clearFile = () => {
    setCsvFile(null);
    setCsvData([], []);
    setCompatibleModels(null);
    setDetectedModels(null);
    setError(null);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl font-bold text-white mb-2">Upload Your Data</h2>
        <p className="text-slate-400">Upload a CSV file with your retail sales and customer data</p>
      </motion.div>

      {/* Drop zone */}
      <AnimatePresence mode="wait">
        {!csvFile ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`relative border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-300 cursor-pointer
              ${isDragging
                ? 'border-purple-400 bg-purple-500/10'
                : 'border-white/20 bg-white/5 hover:border-purple-400/60 hover:bg-white/8'
              }`}
            onClick={() => document.getElementById('csv-input')?.click()}
          >
            <input
              id="csv-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={onInputChange}
            />
            <motion.div
              animate={{ y: isDragging ? -8 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/30 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center">
                <Upload className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-lg">
                  {isDragging ? 'Drop it here!' : 'Drag & drop your CSV'}
                </p>
                <p className="text-slate-400 text-sm mt-1">or click to browse files</p>
              </div>
              <div className="flex gap-3 text-xs text-slate-500">
                <span className="px-2 py-1 rounded bg-white/5 border border-white/10">CSV</span>
                <span className="px-2 py-1 rounded bg-white/5 border border-white/10">UTF-8</span>
                <span className="px-2 py-1 rounded bg-white/5 border border-white/10">Max 100MB</span>
              </div>
            </motion.div>

            {isLoading && (
              <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <div className="flex items-center gap-3 text-white">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Parsing CSV...</span>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="file-preview"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="glass rounded-2xl p-6 border border-green-500/30 bg-green-500/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{csvFile.name}</p>
                <p className="text-slate-400 text-sm">
                  {(csvFile.size / 1024).toFixed(1)} KB · CSV file loaded
                </p>
              </div>
              <button
                onClick={clearFile}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Compatible models detection */}
            <div className="mt-4 pt-4 border-t border-white/10">
              {isDetecting ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Detecting compatible models…</span>
                </div>
              ) : detectedModels !== null ? (
                <div>
                  <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Compatible models</p>
                  <div className="flex flex-wrap gap-2">
                    {(['churn', 'demand', 'basket', 'pricing'] as const).map((key) => {
                      const isCompatible = detectedModels.includes(key);
                      return (
                        <span
                          key={key}
                          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                            isCompatible
                              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                              : 'bg-white/5 text-slate-500 border border-white/10'
                          }`}
                        >
                          {isCompatible ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <span className="w-3 h-3 flex items-center justify-center text-slate-600">✕</span>
                          )}
                          {MODEL_LABELS[key]}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next button */}
      {csvFile && !isDetecting && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mt-8"
        >
          <Button size="lg" onClick={nextStep}>
            Preview Data →
          </Button>
        </motion.div>
      )}
    </div>
  );
}
