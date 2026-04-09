import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWizardStore } from '../../store/wizardStore';
import Button from '../Common/Button';
import { Check, Table2 } from 'lucide-react';

const SEGMENT_OPTIONS = [
  {
    id: 'champions',
    label: 'Champions',
    description: 'High RFM score, best customers',
    color: 'purple',
  },
  {
    id: 'loyal',
    label: 'Loyal Customers',
    description: 'Regular buyers, good value',
    color: 'cyan',
  },
  {
    id: 'potential',
    label: 'Potential Loyalists',
    description: 'Recent customers with good frequency',
    color: 'green',
  },
  {
    id: 'at_risk',
    label: 'At Risk',
    description: 'Used to be active, declining',
    color: 'orange',
  },
  {
    id: 'cant_lose',
    label: "Can't Lose Them",
    description: 'High value but inactive',
    color: 'pink',
  },
  {
    id: 'hibernating',
    label: 'Hibernating',
    description: 'Last purchase was long ago',
    color: 'slate',
  },
];

const colorMap: Record<string, string> = {
  purple: 'border-purple-500/40 bg-purple-500/10 hover:border-purple-400',
  cyan: 'border-cyan-500/40 bg-cyan-500/10 hover:border-cyan-400',
  green: 'border-green-500/40 bg-green-500/10 hover:border-green-400',
  orange: 'border-orange-500/40 bg-orange-500/10 hover:border-orange-400',
  pink: 'border-pink-500/40 bg-pink-500/10 hover:border-pink-400',
  slate: 'border-slate-500/40 bg-slate-500/10 hover:border-slate-400',
};

const badgeMap: Record<string, string> = {
  purple: 'bg-purple-500/20 text-purple-300',
  cyan: 'bg-cyan-500/20 text-cyan-300',
  green: 'bg-green-500/20 text-green-300',
  orange: 'bg-orange-500/20 text-orange-300',
  pink: 'bg-pink-500/20 text-pink-300',
  slate: 'bg-slate-500/20 text-slate-300',
};

export default function StepPreview() {
  const { csvData, csvHeaders, selectedSegments, setSelectedSegments, nextStep, prevStep } =
    useWizardStore();
  const [tab, setTab] = useState<'data' | 'segments'>('data');

  const toggleSegment = (id: string) => {
    setSelectedSegments(
      selectedSegments.includes(id)
        ? selectedSegments.filter((s) => s !== id)
        : [...selectedSegments, id]
    );
  };

  const previewRows = csvData.slice(0, 10);

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl font-bold text-white mb-2">Preview & Select Segments</h2>
        <p className="text-slate-400">
          Review your data and choose which customer segments to analyze
        </p>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Rows', value: csvData.length.toLocaleString() },
          { label: 'Columns', value: csvHeaders.length.toString() },
          { label: 'Segments', value: `${selectedSegments.length} selected` },
        ].map(({ label, value }) => (
          <div key={label} className="glass rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { id: 'data', label: 'Data Preview', icon: Table2 },
          { id: 'segments', label: 'Segment Selection', icon: Check },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as typeof tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${tab === id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'data' ? (
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
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 gap-3"
        >
          {SEGMENT_OPTIONS.map((seg) => {
            const selected = selectedSegments.includes(seg.id);
            return (
              <motion.button
                key={seg.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleSegment(seg.id)}
                className={`relative text-left p-4 rounded-2xl border transition-all duration-200
                  ${selected ? colorMap[seg.color] : 'border-white/10 bg-white/3 hover:bg-white/5'}`}
              >
                {selected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center ${badgeMap[seg.color]}`}
                  >
                    <Check className="w-3 h-3" />
                  </motion.div>
                )}
                <p className="font-semibold text-white text-sm mb-1">{seg.label}</p>
                <p className="text-xs text-slate-400">{seg.description}</p>
              </motion.button>
            );
          })}
        </motion.div>
      )}

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
