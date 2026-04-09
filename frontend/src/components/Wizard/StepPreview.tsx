import { motion } from 'framer-motion';
import { useWizardStore } from '../../store/wizardStore';
import { useShallow } from 'zustand/react/shallow';
import Button from '../Common/Button';

export default function StepPreview() {
  const { csvData, csvHeaders, nextStep, prevStep } =
    useWizardStore(
      useShallow((s) => ({
        csvData: s.csvData,
        csvHeaders: s.csvHeaders,
        nextStep: s.nextStep,
        prevStep: s.prevStep,
      }))
    );

  const previewRows = csvData.slice(0, 10);

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl font-bold text-white mb-2">Data Preview</h2>
        <p className="text-slate-400">
          Review your uploaded dataset before selecting models
        </p>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: 'Total Rows', value: csvData.length.toLocaleString() },
          { label: 'Columns', value: csvHeaders.length.toString() },
        ].map(({ label, value }) => (
          <div key={label} className="glass rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass rounded-2xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                {csvHeaders.slice(0, 8).map((h) => (
                  <th
                    key={h}
                    className="px-3 py-3 text-left text-slate-400 font-semibold uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
                {csvHeaders.length > 8 && (
                  <th className="px-3 py-3 text-left text-slate-500">+{csvHeaders.length - 8} more</th>
                )}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  {csvHeaders.slice(0, 8).map((h) => (
                    <td key={h} className="px-3 py-2.5 text-slate-300 whitespace-nowrap max-w-32 truncate">
                      {String(row[h] ?? '')}
                    </td>
                  ))}
                  {csvHeaders.length > 8 && <td className="px-3 py-2.5 text-slate-500">...</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {csvData.length > 10 && (
          <p className="px-4 py-2 text-xs text-slate-500 border-t border-white/5">
            Showing 10 of {csvData.length.toLocaleString()} rows
          </p>
        )}
      </motion.div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="secondary" onClick={prevStep}>
          ← Back
        </Button>
        <Button onClick={nextStep}>
          Select Models →
        </Button>
      </div>
    </div>
  );
}
